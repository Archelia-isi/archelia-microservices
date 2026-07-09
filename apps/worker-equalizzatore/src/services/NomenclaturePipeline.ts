import { prisma } from '@archelia/database';
import { logger, env } from '@archelia/core';

export class NomenclaturePipeline {
  
  /**
   * FASE 1: Estrazione Massiva
   * Legge tutti i prodotti da EqualizzatoreStaging (con phase3 completata)
   * e genera le proposte di classificazione salvandole in TaxonomyStaging.
   */
  static async runPhase1Staging() {
    logger.info('[Nomenclature] Avvio Fase 1: Staging proposte (Map-Reduce su Cesti Elmark)');
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

    const { Prisma } = await import('@prisma/client');
    const products = await prisma.equalizzatoreStaging.findMany({
      where: {
        reviewStatus: { in: ['PENDING_TEXT', 'PENDING_NOMENCLATURE'] }
      }
    });

    logger.info(`[Nomenclature] Trovati ${products.length} prodotti da classificare. Preparazione cesti...`);
    const { ProgressEmitter } = await import('./ProgressEmitter.js');
    await ProgressEmitter.emit({
      isActive: true,
      type: 'NOMENCLATURE',
      progress: 0,
      total: 100,
      message: `Fase 1/4: Costruzione cesti...`
    });

    // Fetch raw data in chunks to get native categories
    const rawMap = new Map();
    const CHUNK_SIZE = 1000;
    for (let i = 0; i < products.length; i += CHUNK_SIZE) {
      const chunk = products.slice(i, i + CHUNK_SIZE);
      const raws = await prisma.elmarkRawProduct.findMany({
        where: { elmarkId: { in: chunk.map(p => p.sourceId) } }
      });
      for (const r of raws) rawMap.set(r.elmarkId, r);
    }

    // Map into buckets
    const buckets: Record<string, any[]> = {};
    for (const prod of products) {
      const existing = await prisma.taxonomyStaging.findUnique({ where: { sourceId: prod.sourceId } });
      if (existing) continue; // Skip already staged

      const raw = rawMap.get(prod.sourceId);
      const cat = (raw?.rawData as any)?.category || 'UNKNOWN';
      if (!buckets[cat]) buckets[cat] = [];
      buckets[cat].push(prod);
    }

    const zGroups = await prisma.productCategory.findMany();
    const zFamilies = await prisma.family.findMany();
    const zHomoCats = await prisma.homogeneousCategory.findMany();

    const allowedGroups = zGroups.map(g => g.name).join(', ');
    const allowedFamilies = zFamilies.map(f => f.name).join(', ');
    const allowedHomoCats = zHomoCats.map(h => h.name).join(', ');

    const bucketKeys = Object.keys(buckets);
    logger.info(`[Nomenclature] Creati ${bucketKeys.length} cesti da processare.`);
    
    await ProgressEmitter.emit({
      isActive: true,
      type: 'NOMENCLATURE',
      progress: 0,
      total: bucketKeys.length,
      message: `Fase 1/4: Analisi cesti (0/${bucketKeys.length})...`
    });

    let completed = 0;

    for (const cat of bucketKeys) {
      const bucketProds = buckets[cat];
      if (bucketProds.length === 0) continue;

      const productItems = bucketProds.map(p => {
        const p1 = p.phase1Payload as any;
        const p3 = p.phase3Payload as any;
        const raw = rawMap.get(p.sourceId);
        return {
          id: p.sourceId,
          title: p3?.technicalB2BTitle || p3?.seoTitle || (raw?.rawData as any)?.title || "Sconosciuto",
          details: p1?.technicalDetails || (raw?.rawData as any)?.description || ""
        };
      });

      const prompt = `Ecco i prodotti di una specifica famiglia merceologica.
Trova il "gruppoMerceologico" più generico (es. ILLUMINAZIONE) e la "famiglia" comune (es. SORGENTI LUMINOSE) validi per tutti.
Poi, cerca nei titoli e nei dettagli la discriminante tecnica principale (es. attacco GU10 vs E27, o dimensioni, o poli) e suddividili in "categorieOmogenee".

REGOLA D'ORO PER LA SCELTA DEI NOMI:
Ti vengono forniti qui sotto gli elenchi delle voci già esistenti a sistema.
- Gruppi Esistenti: [${allowedGroups}]
- Famiglie Esistenti: [${allowedFamilies}]
- Categorie Omogenee Esistenti: [${allowedHomoCats}]

DEVI DARE ASSOLUTA PRIORITÀ a queste liste. Cerca il termine più appropriato tra quelli forniti.
SE, E SOLO SE, il prodotto non rientra in nessuna di queste voci preesistenti, sei autorizzato a coniare e creare un nome nuovo per uno qualsiasi dei tre livelli.

DATI PRODOTTI:
${JSON.stringify(productItems)}

REGOLE:
Restituisci ESCLUSIVAMENTE un JSON con questo esatto formato:
{
  "gruppoMerceologico": "...",
  "famiglia": "...",
  "categorieOmogenee": [
    {
      "nomeCategoria": "...",
      "productIds": ["id1", "id2"]
    }
  ]
}
Assicurati che tutti gli ID forniti nei dati vengano assegnati a una categoria omogenea.

Devi identificare:
1. "gruppoMerceologico": (es. Illuminazione, Elettricita')
2. "famiglia": (es. Lampadine, Interruttori Magnetotermici)
3. "categorieOmogenee": Raggruppa i prodotti in categorie tecniche.
   REGOLA IMPORTANTE: Prodotti con specifiche tecniche fondamentali diverse NON possono stare nella stessa categoria omogenea (es. Lampadine GU10 e Lampadine E27 devono avere categorie omogenee diverse).
   TUTTAVIA, non essere eccessivamente specifico per gli accessori dello stesso sistema. Ad esempio, "Accessori per Canalina PVC - Angolo" e "Accessori per Canalina PVC - Giunto" devono essere unificati in un'unica categoria "Accessori per Canalina PVC", perché identifica già bene il prodotto di base. Meno frammentazione per gli accessori, più rigore per le differenze tecniche!
`;

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        });

        if (response.text) {
          const res = JSON.parse(response.text);
          const processedIds = new Set<string>(); // Filtro anti-doppioni
          
          for (const homoCat of res.categorieOmogenee || []) {
            for (const pid of homoCat.productIds || []) {
              if (processedIds.has(pid)) {
                logger.warn(`[Nomenclature] Doppione trovato ignorato: ${pid}`);
                continue;
              }
              processedIds.add(pid);
              
              await prisma.taxonomyStaging.create({
                data: {
                  sourceId: pid,
                  proposedGroup: res.gruppoMerceologico,
                  proposedFamily: res.famiglia,
                  proposedCategory: homoCat.nomeCategoria,
                  status: 'PENDING'
                }
              });
            }
          }
          logger.info(`[Nomenclature] Processato cesto ${cat} con ${bucketProds.length} prodotti`);
        }
      } catch (e: any) {
        logger.error(`[Nomenclature] Errore Fase 1 per cesto ${cat}: ${e.message}`);
      }
      
      completed++;
      await ProgressEmitter.emit({
        isActive: true,
        type: 'NOMENCLATURE',
        progress: completed,
        total: bucketKeys.length,
        message: `Fase 1/4: Analisi cesti (${completed}/${bucketKeys.length})...`
      });
    }
  }

  /**
   * FASE 2: Deduplicazione (Clustering)
   * Analizza tutte le proposte PENDING in TaxonomyStaging e le unifica.
   */
  static async runPhase2Clustering() {
    logger.info('[Nomenclature] Avvio Fase 2: Clustering');
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

    // Prendi tutti i PENDING
    const pending = await prisma.taxonomyStaging.findMany({
      where: { status: 'PENDING' }
    });

    if (pending.length === 0) {
      logger.info('[Nomenclature] Nessun record PENDING da clusterizzare.');
      return;
    }

    const { ProgressEmitter } = await import('./ProgressEmitter.js');
    await ProgressEmitter.emit({
      isActive: true,
      type: 'NOMENCLATURE',
      progress: 0,
      total: pending.length,
      message: `Fase 2/4: Clustering di ${pending.length} proposte...`
    });

    // Estrai le triple uniche
    const uniqueTriples = new Map<string, any>();
    for (const p of pending) {
      const key = `${p.proposedGroup}|${p.proposedFamily}|${p.proposedCategory}`;
      if (!uniqueTriples.has(key)) {
        uniqueTriples.set(key, { group: p.proposedGroup, family: p.proposedFamily, category: p.proposedCategory });
      }
    }

    const triplesArray = Array.from(uniqueTriples.values());
    logger.info(`[Nomenclature] Trovate ${triplesArray.length} triple uniche da normalizzare.`);

    // Raggruppa le triple per famiglia per evitare il limite di token JSON
    const familyBuckets = new Map<string, any[]>();
    for (const triple of triplesArray) {
      if (!familyBuckets.has(triple.family)) familyBuckets.set(triple.family, []);
      familyBuckets.get(triple.family)!.push(triple);
    }

    logger.info(`[Nomenclature] Divise in ${familyBuckets.size} blocchi/famiglie per l'elaborazione.`);
    
    // Prepara i dizionari Zucchetti per la Fase 2
    const zGroups = await prisma.productCategory.findMany();
    const zFamilies = await prisma.family.findMany();
    const zHomoCats = await prisma.homogeneousCategory.findMany();

    const allowedGroups = zGroups.map(g => g.name).join(', ');
    const allowedFamilies = zFamilies.map(f => f.name).join(', ');
    const allowedHomoCats = zHomoCats.map(h => h.name).join(', ');

    let processedFamilies = 0;

    for (const [family, chunkTriples] of familyBuckets.entries()) {
      // Invia all'AI per il clustering
      const prompt = `Ecco un array di classificazioni (Gruppo, Famiglia, Categoria) proposte per dei prodotti della famiglia "${family}".
Devi normalizzare e unificare i sinonimi (es. "cavi" e "cavo" diventano "Cavo Elettrico", "Magnetotermici" diventa "Magnetotermico", ecc.) per tutti e tre i livelli.

REGOLA D'ORO PER LA NORMALIZZAZIONE:
Quando unifichi i sinonimi, DEVI DARE ASSOLUTA PRECEDENZA ai nomi ufficiali di Zucchetti elencati qui sotto. Se trovi un sinonimo che corrisponde a una di queste voci, usa la voce Zucchetti esatta.
- Gruppi Zucchetti: [${allowedGroups}]
- Famiglie Zucchetti: [${allowedFamilies}]
- Categorie Zucchetti: [${allowedHomoCats}]

ATTENZIONE REGOLA SEVERA SULLA CATEGORIA OMOGENEA:
L'unificazione per il livello "category" deve essere RIGIDA per preservare l'identità del prodotto.
- NON unificare MAI categorie con differenze tecniche fondamentali (es. NON unificare "Lampadine LED GU10" con "Lampadine LED E27").
- Unifica SOLO sinonimi linguistici puri e banali (es. "Lampade GU10" e "Lampadine GU10").
- ECCEZIONE ACCESSORI: Se si tratta di semplici varianti di un accessorio (es. "Accessori per Canalina PVC - Angolo" vs "Accessori per Canalina PVC - Giunto"), UNIFICALI sotto un'unica categoria più generica (es. "Accessori per Canalina PVC"), per evitare frammentazione eccessiva.

DATI IN INGRESSO:
${JSON.stringify(chunkTriples, null, 2)}

REGOLE:
Restituisci ESCLUSIVAMENTE un JSON array di oggetti con questo formato:
[
  {
    "original": { "group": "...", "family": "...", "category": "..." },
    "normalized": { "group": "...", "family": "...", "category": "..." }
  }
]
Ogni elemento in ingresso deve avere una corrispondenza esatta nell'oggetto "original".
Le stringhe "normalized" devono essere ben formattate (Title Case) e al singolare/plurale coerente.`;

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        });

        if (response.text) {
          const mapping = JSON.parse(response.text);
          
          // Applica il mapping a tutti i pending che corrispondono a questo chunk
          for (const item of pending) {
            const match = mapping.find((m: any) => 
              m.original.group === item.proposedGroup &&
              m.original.family === item.proposedFamily &&
              m.original.category === item.proposedCategory
            );

            if (match) {
              await prisma.taxonomyStaging.update({
                where: { id: item.id },
                data: {
                  proposedGroup: match.normalized.group,
                  proposedFamily: match.normalized.family,
                  proposedCategory: match.normalized.category,
                  status: 'CLUSTERED'
                }
              });
            }
          }
          logger.info(`[Nomenclature] Fase 2: Elaborato blocco famiglia "${family}" (${chunkTriples.length} triple)`);
        }
      } catch (e: any) {
        logger.error(`[Nomenclature] Errore Fase 2 per famiglia "${family}": ${e.message}`);
      }
      
      processedFamilies++;
      await ProgressEmitter.emit({
        isActive: true,
        type: 'NOMENCLATURE',
        progress: processedFamilies,
        total: familyBuckets.size,
        message: `Fase 2/4: Clustering a blocchi (${processedFamilies}/${familyBuckets.size})...`
      });
    }
    
    logger.info(`[Nomenclature] Fase 2 completata. Tutti i blocchi processati.`);
  }

  /**
   * FASE 3: Semantic Matching
   * Confronta i cluster con il DB Neon e assegna codici a 3 lettere.
   */
  static async runPhase3Match() {
    logger.info('[Nomenclature] Avvio Fase 3: Semantic Matching');
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

    // 1. Leggi tutti i record CLUSTERED
    const clustered = await prisma.taxonomyStaging.findMany({
      where: { status: 'CLUSTERED' }
    });

    if (clustered.length === 0) {
      logger.info('[Nomenclature] Nessun record CLUSTERED da processare in Fase 3.');
      return;
    }

    const { ProgressEmitter } = await import('./ProgressEmitter.js');
    await ProgressEmitter.emit({
      isActive: true,
      type: 'NOMENCLATURE',
      progress: 0,
      total: clustered.length,
      message: `Fase 3/4: Semantic Matching di ${clustered.length} cluster...`
    });

    // Estrai nomi univoci
    const uniqueGroups = Array.from(new Set(clustered.map(c => c.proposedGroup).filter(Boolean)));
    const uniqueFamilies = Array.from(new Set(clustered.map(c => c.proposedFamily).filter(Boolean)));
    const uniqueCategories = Array.from(new Set(clustered.map(c => c.proposedCategory).filter(Boolean)));

    // 2. Leggi le nomenclature esistenti dal DB Neon
    const existingGroups = await prisma.productCategory.findMany();
    const existingFamilies = await prisma.family.findMany();
    const existingCategories = await prisma.homogeneousCategory.findMany();

    const prompt = `Devi mappare le classificazioni generate dall'AI con quelle già esistenti nel Database.

REGOLE PER LE FAMIGLIE (Family):
- Sii ELASTICO. Se trovi una corrispondenza logica o funzionale (es. "Sistemi di Canalizzazione" vs l'esistente "CANALINE E TUBI RK"), DEVI usare il codice esistente.
- Evita di creare nuovi codici se esiste già una famiglia che copre lo stesso tipo di prodotto! Genera un nuovo codice SOLO se la voce è completamente estranea a tutte quelle presenti.

ATTENZIONE REGOLA SEVERA SULLA CATEGORIA OMOGENEA:
Il matching per la Categoria Omogenea deve essere RIGIDO per preservare la variante del prodotto.
- NON fare match tra categorie con differenze tecniche fondamentali (es. "Lampadine GU10" su un esistente "Lampadine E27" -> SBAGLIATO. Genera un NUOVO codice per GU10).
- Fai match se si tratta di sinonimi linguistici identici tecnicamente (es. "Accessori per Canaline PVC" può fare match con "CANALINE" se ritieni che in Zucchetti gli accessori vadano nella stessa categoria base, altrimenti crea un codice nuovo).

=== GRUPPI MERCEOLOGICI (ProductCategory) ===
Esistenti nel DB: ${JSON.stringify(existingGroups)}
Da mappare: ${JSON.stringify(uniqueGroups)}
(NOTA: Per i gruppi merceologici DEVI TASSATIVAMENTE usare un codice esistente, non puoi crearne di nuovi.)

=== FAMIGLIE (Family) ===
Esistenti nel DB: ${JSON.stringify(existingFamilies)}
Da mappare: ${JSON.stringify(uniqueFamilies)}

=== CATEGORIE OMOGENEE (HomogeneousCategory) ===
Esistenti nel DB: ${JSON.stringify(existingCategories)}
Da mappare: ${JSON.stringify(uniqueCategories)}

REGOLE DI RISPOSTA:
Restituisci ESCLUSIVAMENTE un JSON con 3 chiavi ("groups", "families", "categories").
Ogni chiave contiene un array di oggetti con questo formato:
[
  {
    "originalName": "Il nome da mappare",
    "matchedCode": "Il codice alfanumerico breve (esistente, o inventane uno nuovo di massimo 4 caratteri)",
    "matchedName": "Il nome (o esistente o uno pulito per la nuova entry)",
    "isNew": true o false // true se hai generato un nuovo codice
  }
]
`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });

      if (response.text) {
        const mapping = JSON.parse(response.text);

        // 3. Salva i nuovi codici nel DB Neon se isNew == true (NON PER I GRUPPI, SONO FISSI!)
        // Non inseriamo nulla in ProductCategory.

        for (const f of mapping.families || []) {
          if (f.isNew) {
            await prisma.family.upsert({
              where: { code: f.matchedCode },
              update: {},
              create: { code: f.matchedCode, name: f.matchedName, source: 'AI_GENERATED' }
            });
            logger.info(`[Nomenclature] Creata nuova Famiglia: ${f.matchedCode} - ${f.matchedName}`);
          }
        }
        for (const c of mapping.categories || []) {
          if (c.isNew) {
            await prisma.homogeneousCategory.upsert({
              where: { code: c.matchedCode },
              update: {},
              create: { code: c.matchedCode, name: c.matchedName, source: 'AI_GENERATED' }
            });
            logger.info(`[Nomenclature] Creata nuova Categoria: ${c.matchedCode} - ${c.matchedName}`);
          }
        }

        // 4. Aggiorna TaxonomyStaging con i codici finali
        for (const item of clustered) {
          const gMatch = mapping.groups?.find((x: any) => x.originalName === item.proposedGroup);
          const fMatch = mapping.families?.find((x: any) => x.originalName === item.proposedFamily);
          const cMatch = mapping.categories?.find((x: any) => x.originalName === item.proposedCategory);

          await prisma.taxonomyStaging.update({
            where: { id: item.id },
            data: {
              finalGroupCode: gMatch?.matchedCode,
              finalFamilyCode: fMatch?.matchedCode,
              finalCategoryCode: cMatch?.matchedCode,
              status: 'MATCHED'
            }
          });
        }
        logger.info(`[Nomenclature] Fase 3 completata. Record aggiornati a MATCHED.`);
      }
    } catch (e: any) {
      logger.error(`[Nomenclature] Errore critico: ${e.message}`);
    }
  }

  /**
   * FASE 4: Consolidamento
   * Applica i codici finali a EqualizzatoreStaging.
   */
  static async runPhase4Finalize() {
    logger.info('[Nomenclature] Avvio Fase 4: Consolidamento');

    const matched = await prisma.taxonomyStaging.findMany({
      where: { status: 'MATCHED' }
    });

    if (matched.length === 0) {
      logger.info('[Nomenclature] Nessun record MATCHED da consolidare.');
      return;
    }

    const { ProgressEmitter } = await import('./ProgressEmitter.js');
    await ProgressEmitter.emit({
      isActive: true,
      type: 'NOMENCLATURE',
      progress: 0,
      total: matched.length,
      message: `Fase 4/4: Consolidamento di ${matched.length} record...`
    });
    let completed = 0;

    for (const item of matched) {
      if (!item.finalGroupCode || !item.finalFamilyCode || !item.finalCategoryCode) {
        logger.warn(`[Nomenclature] Impossibile consolidare ${item.sourceId}, mancano codici finali.`);
        continue;
      }

      const eq = await prisma.equalizzatoreStaging.findUnique({
        where: { sourceId: item.sourceId }
      });

      if (eq && eq.phase1Payload) {
        const p1 = eq.phase1Payload as any;
        
        // Sovrascriviamo le vecchie stringhe estese con i codici a 3 lettere ufficiali
        p1.productGroup = item.finalGroupCode;
        p1.family = item.finalFamilyCode;
        p1.category = item.finalCategoryCode;

        await prisma.equalizzatoreStaging.update({
          where: { id: eq.id },
          data: { phase1Payload: p1 }
        });

        // Opzionale: aggiornare lo stato per dire che è tutto finito
        await prisma.taxonomyStaging.update({
          where: { id: item.id },
          data: { status: 'DONE' }
        });
      }
      completed++;
      await ProgressEmitter.emit({
        isActive: true,
        type: 'NOMENCLATURE',
        progress: completed,
        total: matched.length,
        message: `Fase 4/4: Consolidamento (${completed}/${matched.length})...`
      });
    }

    await ProgressEmitter.emit({
      isActive: false,
      type: 'NOMENCLATURE',
      progress: matched.length,
      total: matched.length,
      message: `Nomenclatura generata con successo!`
    });

    logger.info(`[Nomenclature] Fase 4 completata. Prodotti consolidati in EqualizzatoreStaging.`);
  }
}
