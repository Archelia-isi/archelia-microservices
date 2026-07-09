import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { logger } from '@archelia/core';
import { typesenseClient, PRODUCTS_COLLECTION_NAME } from '@archelia/typesense';

let genAI: GoogleGenerativeAI | null = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

async function fetchImageForGemini(imageUrl: string | null | undefined): Promise<any> {
  if (!imageUrl) return null;
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Str = buffer.toString('base64');
    let mimeType = 'image/jpeg';
    if (imageUrl.toLowerCase().endsWith('.png')) mimeType = 'image/png';
    else if (imageUrl.toLowerCase().endsWith('.webp')) mimeType = 'image/webp';
    return {
      inlineData: {
        data: base64Str,
        mimeType: mimeType
      }
    };
  } catch (err) {
    logger.warn(`[ElmarkAi] Fallito download immagine per Gemini: ${(err as any).message}`);
    return null;
  }
}

// ==========================
// SCHEMI PER I 3 STEP
// ==========================

const Step1Schema = {
  type: SchemaType.OBJECT,
  description: "Dati di classificazione e specifiche tecniche estratti dai dati grezzi",
  properties: {
    productGroup: { type: SchemaType.STRING, description: "Codice ESATTO del Gruppo merceologico estratto dal dizionario. Lascia vuoto se non trovi corrispondenza." },
    family: { type: SchemaType.STRING, description: "Codice ESATTO della Famiglia estratto dal dizionario. Lascia vuoto se non trovi corrispondenza." },
    category: { type: SchemaType.STRING, description: "Codice ESATTO della Categoria Omogenea estratto dal dizionario. Lascia vuoto se non trovi corrispondenza." },
    brand: { type: SchemaType.STRING, description: "Codice ESATTO della Marca estratto dal dizionario. Lascia vuoto se non trovi corrispondenza." },
    unit: { type: SchemaType.STRING, description: "Codice dell'Unità di misura (es. 'PZ')" },
    technicalDesc: { type: SchemaType.STRING, description: "Attributi tecnici nel formato 'chiave: valore; chiave: valore;'" },
    status: { type: SchemaType.STRING, description: "Obbligatorio: 'compatible' se mappato con successo, 'pending_review' se non hai trovato corrispondenze esatte e hai lasciato campi vuoti." }
  },
  required: ["productGroup", "family", "category", "brand", "unit", "technicalDesc", "status"]
};

const Step2Schema = {
  type: SchemaType.OBJECT,
  description: "Dati di copywriting commerciale",
  properties: {
    originalName: { type: SchemaType.STRING, description: "Descrizione breve. Tassativamente massimo 40 caratteri." },
    description: { type: SchemaType.STRING, description: "Descrizione commerciale in HTML (es. <b>, <ul>, <li>), persuasiva." }
  },
  required: ["originalName", "description"]
};

const Step3Schema = {
  type: SchemaType.OBJECT,
  description: "Dati di ottimizzazione SEO",
  properties: {
    title: { type: SchemaType.STRING, description: "Meta title per il sito, ottimizzato in ottica SEO." },
    metaDescription: { type: SchemaType.STRING, description: "Meta description SEO per Google (max 160 char)." },
    semanticTags: {
      type: SchemaType.ARRAY,
      description: "Array di 5-10 tag semantici o parole chiave per la ricerca.",
      items: { type: SchemaType.STRING }
    }
  },
  required: ["title", "metaDescription", "semanticTags"]
};

async function withRetry<T>(operation: () => Promise<T>, maxRetries = 5, baseDelayMs = 5000): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (error: any) {
      attempt++;
      if (attempt >= maxRetries || !error?.message?.includes("503")) {
        throw error;
      }
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      logger.warn(`[Elmark AI] Errore 503 ricevuto. Tentativo ${attempt}/${maxRetries} fallito. Ritento tra ${delay/1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries exceeded");
}

const Phase1Schema = {
  type: SchemaType.OBJECT,
  description: "Dati di base per la fase 1",
  properties: {
    productGroup: { type: SchemaType.STRING, description: "Codice ESATTO del Gruppo merceologico estratto dal dizionario. Lascia vuoto se non trovi corrispondenza." },
    brandCode: { type: SchemaType.STRING, description: "Codice ESATTO della Marca dal dizionario, o un codice inventato se non esiste (max 4 caratteri uppercase)." },
    brandName: { type: SchemaType.STRING, description: "Nome della Marca dal dizionario, o un nuovo nome se non esiste." },
    isBrandNew: { type: SchemaType.BOOLEAN, description: "True se la marca non era nel dizionario ed è stata inventata, False altrimenti." }
  },
  required: ["productGroup", "brandCode", "brandName", "isBrandNew"]
};

export class ElmarkAi {
  static async processPhase1(
    elmarkProduct: any,
    productCategories: { code: string; name: string }[],
    brands: { code: string; name: string }[],
    elmarkId: string
  ): Promise<{ productGroup: string, brandCode: string, brandName: string, isBrandNew: boolean }> {
    if (!genAI) {
      throw new Error("GEMINI_API_KEY mancante. Impossibile usare AI per Elmark.");
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite-preview",
      generationConfig: { responseMimeType: "application/json", responseSchema: Phase1Schema as any, temperature: 0.1 }
    });

    const prompt = `Sei un rigoroso Data Analyst e-commerce. Devi classificare il Macro-Gruppo di un prodotto Elmark e individuare la Marca (Brand).
    
REGOLA TASSATIVA:
1. IL GRUPPO MERCEOLOGICO E' SACRO E INTOCCABILE: NON PUOI MAI INVENTARE UN productGroup. Scegli SEMPRE e OBBLIGATORIAMENTE un 'code' presente nel dizionario 'Product Categories'. Se non trovi corrispondenza esatta, scegli il più affine.
2. Per il Brand, controlla il dizionario 'Brands'. Se il brand del prodotto è presente, restituisci il suo 'code' in brandCode, il suo 'name' in brandName e metti isBrandNew a false.
3. Se il brand del prodotto NON esiste nel dizionario, INVENTA un brandCode (max 4 lettere maiuscole), metti il nome reale del brand in brandName e metti isBrandNew a true.

DATI DEL NUOVO PRODOTTO ELMARK:
${JSON.stringify(elmarkProduct, null, 2)}

DIZIONARI TASSONOMICI:
- Product Categories (Gruppi Merceologici, OBBLIGATORIO sceglierne uno): ${JSON.stringify(productCategories)}
- Brands: ${JSON.stringify(brands)}

COMPITO:
Scegli 'productGroup' (OBBLIGATORIAMENTE un codice esistente). Determina 'brandCode', 'brandName' e 'isBrandNew'. Restituisci JSON puro.`;

    const res = await withRetry(() => model.generateContent(prompt));
    return JSON.parse(res.response.text());
  }

  static async processPhase2(
    elmarkProduct: any
  ): Promise<{ translatedTitle: string, translatedFeatures: string, semanticTags: string[], embedding: number[] }> {
    if (!genAI) {
      throw new Error("GEMINI_API_KEY mancante. Impossibile usare AI per Elmark.");
    }

    const Phase2Schema = {
      type: SchemaType.OBJECT,
      description: "Traduzione e Tag Semantici per la fase 2",
      properties: {
        translatedTitle: { type: SchemaType.STRING, description: "Titolo tradotto in italiano" },
        translatedFeatures: { type: SchemaType.STRING, description: "Caratteristiche o descrizione tradotte in italiano" },
        semanticTags: { 
          type: SchemaType.ARRAY, 
          items: { type: SchemaType.STRING },
          description: "Array di 10-15 tag semantici in italiano che descrivono tecnicamente il prodotto (es: 'faretto', 'led', 'incasso', '3000k', '20W')"
        }
      },
      required: ["translatedTitle", "translatedFeatures", "semanticTags"]
    };

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite-preview",
      generationConfig: { responseMimeType: "application/json", responseSchema: Phase2Schema as any, temperature: 0.2 }
    });

    const prompt = `Sei un traduttore e analista tecnico. 
Devi analizzare i dati grezzi di questo prodotto Elmark (spesso in inglese o misto), e produrre:
1. Una traduzione accurata in italiano del titolo.
2. Una traduzione in italiano delle caratteristiche tecniche/descrizione.
3. Un elenco di 10-15 tag semantici in italiano (parole chiave che descrivono a fondo la tipologia, uso, materiali, specifiche).

PRODOTTO:
${JSON.stringify(elmarkProduct, null, 2)}

Restituisci solo JSON puro.`;

    const res = await withRetry(() => model.generateContent(prompt));
    const data = JSON.parse(res.response.text());

    // Generazione Embedding Vettoriale 3072d (gemini-embedding-2)
    const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
    const textToEmbed = `${data.translatedTitle}. ${data.translatedFeatures}. Keywords: ${data.semanticTags.join(', ')}`;
    const embedResult = await withRetry(() => embeddingModel.embedContent(textToEmbed));
    
    return {
      translatedTitle: data.translatedTitle,
      translatedFeatures: data.translatedFeatures,
      semanticTags: data.semanticTags,
      embedding: embedResult.embedding.values
    };
  }

  static async generateEmbedding(text: string): Promise<number[]> {
    if (!genAI) {
      throw new Error("GEMINI_API_KEY mancante. Impossibile usare AI.");
    }
    const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
    const embedResult = await withRetry(() => embeddingModel.embedContent(text));
    return embedResult.embedding.values;
  }

  static async generateProductSynonyms(
    translatedTitle: string,
    semanticTags: string[],
    imageUrl?: string | null
  ): Promise<{ productType: string, synonyms: string[] }> {
    if (!genAI) throw new Error("GEMINI_API_KEY mancante.");

    const SynonymSchema = {
      type: SchemaType.OBJECT,
      description: "Identificazione precisa del prodotto e dei suoi sinonimi nel mercato italiano",
      properties: {
        productType: { type: SchemaType.STRING, description: "La tipologia esatta e tecnica del prodotto (es. 'Sezionatore', 'Interruttore Magnetotermico', 'Plafoniera LED')" },
        synonyms: { 
          type: SchemaType.ARRAY, 
          items: { type: SchemaType.STRING },
          description: "Nomi d'uso comune, sinonimi commerciali e gergo tecnico in Italia (es. per Interruttore di manovra -> ['Sezionatore', 'Interruttore sezionatore'])"
        }
      },
      required: ["productType", "synonyms"]
    };

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite-preview",
      generationConfig: { responseMimeType: "application/json", responseSchema: SynonymSchema as any, temperature: 0.2 },
      tools: [{ googleSearch: {} } as any]
    });

    const prompt = `Sei un esperto di materiale elettrico e illuminazione in Italia.
Fai una RICERCA WEB per identificare ESATTAMENTE di che prodotto si tratta.
Spesso i cataloghi internazionali usano traduzioni letterali (es. "Interruttore di manovra a camme"). Devi capire qual è il VERO NOME usato dagli elettricisti e dai grossisti in Italia (es. "Sezionatore").

PRODOTTO:
- Titolo Originale/Tradotto: ${translatedTitle}
- Tag Semantici: ${semanticTags.join(', ')}

COMPITO:
1. Usa la ricerca web per identificare la natura esatta del prodotto (specialmente se l'immagine è disponibile).
2. Determina il "productType" preciso.
3. Fornisci un array di "synonyms" (sinonimi, nomi alternativi, gergo commerciale) usati in Italia per questo prodotto.
Restituisci JSON puro.`;

    const promptParts: any[] = [];
    const imagePart = await fetchImageForGemini(imageUrl);
    if (imagePart) promptParts.push(imagePart);
    promptParts.push(prompt);

    const res = await withRetry(() => model.generateContent(promptParts));
    return JSON.parse(res.response.text());
  }

  static async processPhase3(
    elmarkId: string,
    semanticTags: string[],
    translatedTitle: string,
    productGroup: string,
    families: { code: string; name: string }[],
    imageUrl?: string | null,
    ragContext?: string,
    synonyms: string[] = []
  ): Promise<{ family: string, newFamilyName?: string, confidenceScore: number }> {
    if (!genAI) {
      throw new Error("GEMINI_API_KEY mancante.");
    }
    const Phase3Schema = {
      type: SchemaType.OBJECT,
      description: "Assegnazione Famiglia Zucchetti",
      properties: {
        family: { type: SchemaType.STRING, description: "Codice ESATTO della Famiglia dal dizionario fornito. Se il prodotto è alieno a TUTTE le famiglie, inserisci un NUOVO codice di 3 lettere maiuscole. SE SEI INCERTO, inserisci 'UNKNOWN'." },
        newFamilyName: { type: SchemaType.STRING, description: "Solo se hai inventato un nuovo codice 'family', scrivi qui il nome descrittivo. Altrimenti ometti o stringa vuota." },
        confidenceScore: { type: SchemaType.NUMBER, description: "Valore da 0 a 100 che indica la tua certezza nell'assegnazione di questa famiglia. Sii severo: usa <80 se sei incerto." }
      },
      required: ["family", "confidenceScore"]
    };

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite-preview",
      generationConfig: { responseMimeType: "application/json", responseSchema: Phase3Schema as any, temperature: 0.1 }
    });

    const prompt = `Sei un rigoroso Data Analyst Elmark/Zucchetti. Devi assegnare la Famiglia Zucchetti corretta a questo prodotto.

PRODOTTO:
- Titolo Originale/Tradotto: ${translatedTitle}
- Tipo Prodotto e Sinonimi Commerciali: ${synonyms.join(', ')}
- Tag Semantici: ${semanticTags.join(', ')}
- Macro-Gruppo già assegnato: ${productGroup}

${ragContext}

DIZIONARIO FAMIGLIE ESISTENTI (CODICE E NOME):
${JSON.stringify(families)}

REGOLE DI ASSEGNAZIONE:
1. INNANZI TUTTO: Verifica accuratamente gli 'ESEMPI DAL DATABASE ZUCCHETTI (RAG)' qui sopra. Se trovi un prodotto simile, copia la sua famiglia. NON farti distrarre dalle caratteristiche tecniche specifiche o dai nomi precisi: un magnetotermico da 10A e uno da 25A sono la stessa cosa. Concentrati sulla NATURA FONDAMENTALE del prodotto.
2. TENTA di assegnare una delle famiglie esistenti nel dizionario, ma SOLO SE è semanticamente calzante. (es. un Magnetotermico o un Teleruttore DEVE andare in 'AU - AUTOMAZIONE' se disponibile).
3. ATTENZIONE ALLE FORZATURE: NON inserire un prodotto in una famiglia sbagliata solo perché condivide una parola. (Esempio: NON inserire un lampadario d'arredo in 'Illuminazione da Cartongesso' o 'Illuminazione Industriale' solo perché contengono la parola 'illuminazione'). La famiglia deve rispecchiare il prodotto vero e proprio.
4. SE la famiglia esatta o logicamente corretta NON ESISTE nel dizionario, SEI AUTORIZZATO a CREARE una nuova famiglia.
5. IN CASO DI CREAZIONE:
   - Metti in 'family' un nuovo codice logico di 3 o 4 lettere maiuscole (es. ILA, VNT).
   - Metti in 'newFamilyName' il nome completo della nuova categoria.
6. EVITA DUPLICATI: Crea una nuova famiglia SOLO se non c'è già una categoria sufficientemente adatta.
7. IN CASO DI INCERTEZZA (Confidence < 80): Se non sei sicuro, non forzare un'assegnazione errata. Imposta 'family' a 'UNKNOWN' e dai un 'confidenceScore' basso.

COMPITO:
Scegli 'family' (e opzionalmente 'newFamilyName'). Restituisci JSON puro.`;

    const promptParts: any[] = [];
    const imagePart = await fetchImageForGemini(imageUrl);
    if (imagePart) {
      promptParts.push(imagePart);
    }
    promptParts.push(prompt);

    const res = await withRetry(() => model.generateContent(promptParts));
    return JSON.parse(res.response.text());
  }

  static async processPhase3FallbackSearch(
    elmarkId: string,
    semanticTags: string[],
    translatedTitle: string,
    productGroup: string,
    families: { code: string; name: string }[],
    imageUrl?: string | null
  ): Promise<{ family: string, newFamilyName?: string, confidenceScore: number }> {
    if (!genAI) throw new Error("GEMINI_API_KEY mancante.");

    const Phase3Schema = {
      type: SchemaType.OBJECT,
      description: "Assegnazione Famiglia Zucchetti con Google Search",
      properties: {
        family: { type: SchemaType.STRING, description: "Codice ESATTO della Famiglia dal dizionario fornito. Se alieno, NUOVO codice inventato da te di 3 lettere maiuscole." },
        newFamilyName: { type: SchemaType.STRING, description: "Solo se hai inventato un nuovo codice 'family', scrivi qui il nome descrittivo. Altrimenti ometti o stringa vuota." },
        confidenceScore: { type: SchemaType.NUMBER, description: "Valore da 0 a 100 che indica la certezza dopo aver cercato." }
      },
      required: ["family", "confidenceScore"]
    };

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite-preview",
      generationConfig: { responseMimeType: "application/json", responseSchema: Phase3Schema as any, temperature: 0.1 },
      tools: [{ googleSearch: {} } as any]
    });

    const prompt = `Sei un rigoroso Data Analyst Elmark/Zucchetti. Il tentativo precedente di assegnare la famiglia a questo prodotto ha dato un risultato incerto.
FAI UNA RICERCA SUL WEB usando il tool googleSearch per capire esattamente che tipo di prodotto è e in che ambito si usa.
GUARDA ATTENTAMENTE L'IMMAGINE ALLEGATA (se presente). L'immagine è CRUCIALE per distinguere ad esempio un lampadario d'arredo (che NON deve finire in 'Illuminazione da Cartongesso' o 'Industriale') da un faretto tecnico o componente.

PRODOTTO:
- Titolo Originale/Tradotto: ${translatedTitle}
- Tag Semantici: ${semanticTags.join(', ')}
- Macro-Gruppo: ${productGroup}

DIZIONARIO FAMIGLIE ESISTENTI:
${JSON.stringify(families)}

REGOLE FONDAMENTALI:
1. Usa Google Search per capire la vera natura del prodotto, unita all'evidenza visiva (L'IMMAGINE HA LA PRIORITA').
2. Se l'immagine o la descrizione puntano a un prodotto estetico/decorativo, usa famiglie come 'ILL - ILLUMINAZIONE' (o creane una consona). NON metterlo in famiglie tecniche.
3. Tenta di assegnare una famiglia ESISTENTE (nel dizionario) che si adatta all'ambito di utilizzo.
4. Se nessuna famiglia esiste adatta, CREA un nuovo codice di 3 o 4 lettere e un nome.
5. Assegna un confidenceScore dopo esserti informato.`;

    const promptParts: any[] = [];
    const imagePart = await fetchImageForGemini(imageUrl);
    if (imagePart) promptParts.push(imagePart);
    promptParts.push(prompt);

    const res = await withRetry(() => model.generateContent(promptParts));
    return JSON.parse(res.response.text());
  }

  static async processPhase3Review(
    clusterLeader: any,
    clusterMembers: any[],
    families: { code: string; name: string }[]
  ): Promise<{ family: string, newFamilyName?: string }> {
    if (!genAI) throw new Error("GEMINI_API_KEY mancante.");

    const ReviewSchema = {
      type: SchemaType.OBJECT,
      description: "Revisione Famiglia per Cluster di Prodotti",
      properties: {
        family: { type: SchemaType.STRING, description: "Il codice famiglia unificato per tutto il cluster." },
        newFamilyName: { type: SchemaType.STRING, description: "Nome della nuova famiglia (se non esiste nel dizionario)." }
      },
      required: ["family"]
    };

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite-preview",
      generationConfig: { responseMimeType: "application/json", responseSchema: ReviewSchema as any, temperature: 0.1 }
    });

    const prompt = `Sei un Revisore Tassonomico Zucchetti.
Ti sto passando un gruppo di prodotti (cluster) che sono vettorialmente molto simili tra loro.
Tuttavia, nei passaggi precedenti, l'AI potrebbe aver assegnato a questi prodotti famiglie (nuove o esistenti) diverse, creando frammentazione e incongruenze.

IL TUO COMPITO:
Scegliere UNA SOLA "family" (ed eventualmente un "newFamilyName") da applicare a TUTTI i prodotti in questo cluster, unificandoli.

PRODOTTI NEL CLUSTER:
${clusterMembers.map((m, i) => `Prodotto ${i+1}: Titolo: ${m.title}, Famiglia Assegnata Precedentemente: ${m.predictedFamily} (${m.predictedFamilyName || 'N/A'})`).join('\n')}

DIZIONARIO FAMIGLIE ESISTENTI:
${JSON.stringify(families)}

REGOLE:
1. Se c'è una famiglia ESISTENTE (nel dizionario) che si adatta bene al cluster, usala prioritariamente!
2. Se i prodotti richiedono davvero una nuova famiglia inventata, assicurati di unificarli sotto UNA SOLA nuova famiglia (stesso codice e nome per tutti) invece di avere N famiglie nuove diverse.
3. Restituisci il codice 'family' unificato.`;

    const res = await withRetry(() => model.generateContent(prompt));
    return JSON.parse(res.response.text());
  }

  static async processPhase3NomenclatureReview(
    nomenclatureMap: any,
    families: { code: string; name: string }[]
  ): Promise<{ mapping: Record<string, string>, newFamilies: Record<string, string> }> {
    if (!genAI) throw new Error("GEMINI_API_KEY mancante.");

    const ReviewSchema = {
      type: SchemaType.OBJECT,
      description: "Lista di correzione e unificazione delle famiglie",
      properties: {
        mappingList: { 
          type: SchemaType.ARRAY, 
          description: "Lista di regole di mapping dalle vecchie alle nuove famiglie. TUTTE le famiglie in input devono avere una regola.",
          items: {
            type: SchemaType.OBJECT,
            properties: {
              oldCode: { type: SchemaType.STRING, description: "Codice famiglia originale (es. ILP)" },
              newCode: { type: SchemaType.STRING, description: "Codice famiglia unificato o Zucchetti (es. ILL o un codice esistente)" },
              newName: { type: SchemaType.STRING, description: "Solo se newCode è inventato e non esiste nel dizionario, metti qui il nome (es. ILLUMINAZIONE D'INTERNO)" }
            },
            required: ["oldCode", "newCode"]
          }
        }
      },
      required: ["mappingList"]
    };

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite-preview",
      generationConfig: { responseMimeType: "application/json", responseSchema: ReviewSchema as any, temperature: 0.1 }
    });

    const prompt = `Sei un Revisore Tassonomico Zucchetti. 
Ho elaborato un batch di prodotti e l'AI ha assegnato alcune famiglie in modo frammentato. Alcune famiglie sono ufficiali Zucchetti, altre sono state inventate (es. ILL, ILP, PLD per indicare vari tipi di illuminazione decorativa).

IL TUO COMPITO:
1. Leggi la mappa delle Nomenclature qui sotto, che raggruppa le famiglie assegnate e i relativi esempi di prodotti.
2. Identifica le famiglie "inventate" che sono ridondanti o troppo specifiche (es. Lampadari divisi in sospensione, plafoniere, ecc.).
3. UNIFICALE in un'unica macro-famiglia coerente.
4. ATTENZIONE: Se esiste una famiglia ufficiale Zucchetti ADATTA, usala. MA SE NON ESISTE (es. mancano "Lampadari" nel dizionario e ci sono solo "Faretti"), NON FORZARE l'inserimento in una categoria sbagliata! INVENTA una nuova famiglia generica (es. "LAD" -> "LAMPADARI E SOSPENSIONI" oppure "ILL" -> "ILLUMINAZIONE D'INTERNO").
5. Restituisci una "mapping" da Famiglia Assegnata a Famiglia Unificata per TUTTE le famiglie presenti nella mappa.

DIZIONARIO FAMIGLIE UFFICIALI ZUCCHETTI (usale solo se davvero pertinenti):
${JSON.stringify(families)}

MAPPA DELLE NOMENCLATURE ASSEGNATE NEL BATCH:
${JSON.stringify(nomenclatureMap, null, 2)}

Genera la mappa di correzione, assicurandoti che i nomi delle famiglie inventate abbiano senso per tutto il gruppo.`;

    const res = await withRetry(() => model.generateContent(prompt));
    const data = JSON.parse(res.response.text());
    
    const mapping: Record<string, string> = {};
    const newFamilies: Record<string, string> = {};
    
    if (data.mappingList) {
      for (const item of data.mappingList) {
        mapping[item.oldCode] = item.newCode;
        if (item.newName) {
          newFamilies[item.newCode] = item.newName;
        }
      }
    }
    
    return { mapping, newFamilies };
  }

  static async processPhase4(
    elmarkId: string,
    semanticTags: string[],
    translatedTitle: string,
    productGroup: string,
    family: string,
    categories: { code: string; name: string }[],
    imageUrl?: string | null
  ): Promise<{ category: string, newCategoryName?: string }> {
    if (!genAI) {
      throw new Error("GEMINI_API_KEY mancante.");
    }

    // 1. Typesense RAG Search (Recinto ristretto: Gruppo + Famiglia)
    let ragContext = "";
    try {
      const queryText = `${translatedTitle} ${semanticTags.join(' ')}`.substring(0, 200).trim();
      const { typesenseClient, PRODUCTS_COLLECTION_NAME } = require('../typesense/typesenseClient.js');

      let filters = [];
      if (productGroup) filters.push(`product_group:=${productGroup}`);
      if (family) filters.push(`family:=${family}`);
      const filterStr = filters.join(' && ');

      const searchRes = await typesenseClient.collections(PRODUCTS_COLLECTION_NAME).documents().search({
        q: queryText,
        query_by: 'title,semantic_tags,category,family,product_group',
        filter_by: filterStr,
        per_page: 3
      });

      if (searchRes && searchRes.hits && searchRes.hits.length > 0) {
        const topHits = searchRes.hits.map((h: any) => h.document);
        ragContext = `
ESEMPI DAL DATABASE ZUCCHETTI (RAG):
Questi sono i prodotti più simili già presenti nel catalogo per Gruppo: ${productGroup} e Famiglia: ${family}.
SE IL PRODOTTO E' SIMILE A QUESTI ESEMPI, DEVI COPIARE ESATTAMENTE E TASSATIVAMENTE la stessa 'category'.
Esempi:
${topHits.map((h: any, i: number) => `Esempio ${i+1}:
- Titolo: ${h.title || ''}
- Categoria Zucchetti (category): ${h.category || ''}`).join('\n')}
`;
      }
    } catch (ragError: any) {
      logger.warn(`[Elmark] [${elmarkId}] Fallita ricerca RAG in Phase 4: ${ragError.message}`);
    }

    const Phase4Schema = {
      type: SchemaType.OBJECT,
      description: "Assegnazione Categoria Zucchetti",
      properties: {
        category: { type: SchemaType.STRING, description: "Codice ESATTO della Categoria dal dizionario fornito. Se il prodotto è alieno a TUTTE le categorie, inserisci qui un NUOVO codice inventato da te di 3 o 4 lettere maiuscole." },
        newCategoryName: { type: SchemaType.STRING, description: "Solo se hai inventato un nuovo codice 'category', scrivi qui il nome descrittivo. Altrimenti ometti o stringa vuota." }
      },
      required: ["category"]
    };

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite-preview",
      generationConfig: { responseMimeType: "application/json", responseSchema: Phase4Schema as any, temperature: 0.1 }
    });

    const prompt = `Sei un rigoroso Data Analyst Elmark/Zucchetti. Devi chiudere l'albero tassonomico assegnando la Categoria Zucchetti corretta.

PRODOTTO:
- Titolo Originale/Tradotto: ${translatedTitle}
- Tag Semantici: ${semanticTags.join(', ')}
- Macro-Gruppo: ${productGroup}
- Famiglia: ${family}

${ragContext}

DIZIONARIO CATEGORIE ESISTENTI (CODICE E NOME):
${JSON.stringify(categories)}

REGOLE DI ASSEGNAZIONE:
1. INNANZI TUTTO: Verifica accuratamente gli 'ESEMPI DAL DATABASE ZUCCHETTI (RAG)' qui sopra. Se trovi un prodotto simile, copia la sua categoria.
2. LA CATEGORIA DEVE ESSERE PRECISA: La "Categoria" rappresenta la natura specifica del prodotto (es. un trapano va in TRAPANI, una tagliapiastrelle va in TAGLIAPIASTRELLE). NON forzare un prodotto in una categoria sbagliata (es. non mettere una tagliapiastrelle in "taglia polisterolo"). 
3. CREAZIONE CONSENTITA: Se nel dizionario NON ESISTE la categoria esatta per il tipo di prodotto che stai analizzando, SEI OBBLIGATO a CREARE una nuova categoria.
4. IN CASO DI CREAZIONE:
   - Metti in 'category' un nuovo codice logico di 3 o 4 lettere maiuscole (es. TGP, TRAP, PLAF).
   - Metti in 'newCategoryName' il nome completo della nuova categoria (es. "TAGLIAPIASTRELLE").
5. EVITA DUPLICATI INUTILI: Crea una nuova categoria SOLO se il prodotto è effettivamente un tipo di strumento/oggetto diverso da quelli presenti. Se esiste già una categoria semanticamente identica (es. "LAMPADE" per un lampadario), usala.

COMPITO:
Scegli 'category' (e opzionalmente 'newCategoryName'). Restituisci JSON puro.`;

    const promptParts: any[] = [];
    const imagePart = await fetchImageForGemini(imageUrl);
    if (imagePart) {
      promptParts.push(imagePart);
    }
    promptParts.push(prompt);

    const res = await withRetry(() => model.generateContent(promptParts));
    return JSON.parse(res.response.text());
  }

  static async processPhase4NomenclatureReview(
    nomenclatureMap: any,
    categories: { code: string; name: string }[]
  ): Promise<{ mapping: Record<string, string>, newCategories: Record<string, string> }> {
    if (!genAI) throw new Error("GEMINI_API_KEY mancante.");

    const ReviewSchema = {
      type: SchemaType.OBJECT,
      description: "Lista di correzione e unificazione delle Categorie Omogenee",
      properties: {
        mappingList: { 
          type: SchemaType.ARRAY, 
          description: "Lista di regole di mapping dalle vecchie alle nuove categorie. TUTTE le categorie in input devono avere una regola.",
          items: {
            type: SchemaType.OBJECT,
            properties: {
              oldCode: { type: SchemaType.STRING, description: "Codice categoria originale (es. TGP)" },
              newCode: { type: SchemaType.STRING, description: "Codice categoria unificata o Zucchetti (es. TRAP o un codice esistente)" },
              newName: { type: SchemaType.STRING, description: "Solo se newCode è inventato e non esiste nel dizionario, metti qui il nome (es. TRAPANI E AVVITATORI)" }
            },
            required: ["oldCode", "newCode"]
          }
        }
      },
      required: ["mappingList"]
    };

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite-preview",
      generationConfig: { responseMimeType: "application/json", responseSchema: ReviewSchema as any, temperature: 0.1 }
    });

    const prompt = `Sei un Revisore Tassonomico Zucchetti. 
Ho elaborato un batch di prodotti e l'AI ha assegnato alcune 'Categorie Omogenee' in modo frammentato. Alcune categorie sono ufficiali Zucchetti, altre sono state inventate (es. TGP, TRAP, AVV per indicare vari tipi di utensili).

IL TUO COMPITO:
1. Leggi la mappa delle Nomenclature qui sotto, che raggruppa le categorie assegnate e i relativi esempi di prodotti.
2. Identifica le categorie "inventate" che sono ridondanti o troppo specifiche.
3. UNIFICALE in un'unica categoria omogenea coerente.
4. ATTENZIONE: Se esiste una categoria ufficiale Zucchetti ADATTA, usala. MA SE NON ESISTE, NON FORZARE l'inserimento in una categoria sbagliata! INVENTA una nuova categoria omogenea generica (es. "TRAP" -> "TRAPANI E AVVITATORI").
5. Restituisci una "mapping" da Categoria Assegnata a Categoria Unificata per TUTTE le categorie presenti nella mappa.

DIZIONARIO CATEGORIE UFFICIALI ZUCCHETTI (usale solo se davvero pertinenti):
${JSON.stringify(categories)}

MAPPA DELLE NOMENCLATURE ASSEGNATE NEL BATCH:
${JSON.stringify(nomenclatureMap, null, 2)}

Genera la mappa di correzione, assicurandoti che i nomi delle categorie inventate abbiano senso per tutto il gruppo.`;

    const res = await withRetry(() => model.generateContent(prompt));
    const data = JSON.parse(res.response.text());
    
    const mapping: Record<string, string> = {};
    const newCategories: Record<string, string> = {};
    
    if (data.mappingList) {
      for (const item of data.mappingList) {
        mapping[item.oldCode] = item.newCode;
        if (item.newName) {
          newCategories[item.newCode] = item.newName;
        }
      }
    }
    
    return { mapping, newCategories };
  }

  static async processPhase5(
    elmarkProduct: any,
    translatedTitle: string,
    productGroup: string,
    family: string,
    category: string
  ): Promise<{ title: string }> {
    if (!genAI) {
      throw new Error("GEMINI_API_KEY mancante.");
    }

    const Phase5Schema = {
      type: SchemaType.OBJECT,
      description: "Generazione Titolo (Descrizione) Zucchetti",
      properties: {
        title: { type: SchemaType.STRING, description: "Il titolo pulito, professionale e formattato del prodotto in italiano." }
      },
      required: ["title"]
    };

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite-preview",
      generationConfig: { responseMimeType: "application/json", responseSchema: Phase5Schema as any, temperature: 0.3 }
    });

    const prompt = `Sei un Copywriter tecnico B2B. Devi generare il titolo (Descrizione) ufficiale di questo prodotto per il gestionale Zucchetti.

DATI DI BASE:
- Titolo Originale (Inglese): ${elmarkProduct.name || elmarkProduct.title || ''}
- Titolo Tradotto grezzo: ${translatedTitle}
- Tassonomia: ${productGroup} > ${family} > ${category}
- Specifiche Originali: ${elmarkProduct.description || elmarkProduct.technicalDesc || ''}

REGOLE PER IL TITOLO:
1. Deve essere in italiano perfetto.
2. Niente codici prodotto nel titolo (il codice lo mettiamo altrove).
3. Deve essere chiaro e professionale (es. "Interruttore Magnetotermico 2P 16A 6kA").
4. Se ci sono misure, potenza, o colori fondamentali, includili.
5. Usa le maiuscole correttamente (Title Case o stile professionale, ma non TUTTO MAIUSCOLO).

COMPITO:
Genera il 'title'. Restituisci JSON puro.`;

    const res = await withRetry(() => model.generateContent(prompt));
    return JSON.parse(res.response.text());
  }

  static async processPhase6(
    elmarkId: string,
    elmarkProduct: any,
    translatedTitle: string,
    productGroup: string,
    family: string,
    category: string,
    semanticTags: string[]
  ): Promise<{ technicalDesc: string }> {
    if (!genAI) throw new Error("GEMINI_API_KEY mancante.");

    // Typesense RAG per trovare come gli altri prodotti simili formattano la stringa tecnica
    let ragContext = "";
    try {
      const queryText = `${translatedTitle} ${semanticTags.join(' ')}`.substring(0, 200).trim();
      const { typesenseClient, PRODUCTS_COLLECTION_NAME } = require('../typesense/typesenseClient.js');

      let filters = [];
      if (productGroup) filters.push(`product_group:=${productGroup}`);
      if (family) filters.push(`family:=${family}`);
      if (category) filters.push(`category:=${category}`);
      const filterStr = filters.join(' && ');

      const searchRes = await typesenseClient.collections(PRODUCTS_COLLECTION_NAME).documents().search({
        q: queryText,
        query_by: 'title,semantic_tags,category,family,product_group',
        filter_by: filterStr,
        per_page: 3
      });

      if (searchRes && searchRes.hits && searchRes.hits.length > 0) {
        const topHits = searchRes.hits.map((h: any) => h.document);
        ragContext = `
ESEMPI DI FORMATTAZIONE TECNICA DAL DATABASE ZUCCHETTI (RAG):
${topHits.map((h: any, i: number) => `Esempio ${i+1} (${h.title}):
- Descrizione Supplementare: ${h.technical_description || ''}`).join('\n')}

REGOLA DITTATORIALE:
Guarda gli esempi sopra. Se vedi che usano etichette specifiche come "Tipo: XYZ; Poli: 2P;", DEVI TASSATIVAMENTE usare LE STESSE ETICHETTE (stesse parole, stesso maiuscolo/minuscolo) per il nuovo prodotto.
`;
      }
    } catch (e: any) {
      logger.warn(`[Elmark] [${elmarkId}] Fallita ricerca RAG in Phase 6: ${e.message}`);
    }

    const Phase6Schema = {
      type: SchemaType.OBJECT,
      description: "Generazione Descrizione Supplementare (Tecnica)",
      properties: {
        technicalDesc: { type: SchemaType.STRING, description: "Stringa di attributi tecnici separati da punto e virgola, es: 'Tipo: Interruttore; Poli: 2P; Corrente: 16A;'" }
      },
      required: ["technicalDesc"]
    };

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite-preview",
      generationConfig: { responseMimeType: "application/json", responseSchema: Phase6Schema as any, temperature: 0.1 }
    });

    const prompt = `Sei un Ingegnere Elettrotecnico incaricato di compilare la scheda tecnica per il gestionale Zucchetti.

PRODOTTO:
- Titolo Originale: ${elmarkProduct.name || elmarkProduct.title || ''}
- Dati Tecnici Originali: ${JSON.stringify(elmarkProduct.attributes || elmarkProduct.features || elmarkProduct.technicalDesc || '')}
- Tassonomia: ${productGroup} > ${family} > ${category}

${ragContext}

REGOLE DI FORMATTAZIONE:
1. Il risultato DEVE essere una singola riga.
2. Ogni attributo deve avere il formato "Chiave: Valore;". (Nota il punto e virgola e lo spazio).
3. Esempio corretto: "Tipo: Magnetotermico; Poli: 2P; Potenza di interruzione: 6kA; Curva: C; Corrente Nominale: 16A; Tensione: 230V;"
4. Traduici le chiavi in italiano (es. "Rated current" -> "Corrente Nominale").
5. Non omettere attributi importanti, ma mantieni la stringa compatta e pulita.

COMPITO:
Genera la 'technicalDesc'. Restituisci JSON puro.`;

    const res = await withRetry(() => model.generateContent(prompt));
    return JSON.parse(res.response.text());
  }

  static async processPhase7(
    elmarkProduct: any,
    translatedTitle: string,
    technicalDesc: string,
    brand: string
  ): Promise<{ seoTitle: string, seoDescription: string, friendlyUrl: string }> {
    if (!genAI) throw new Error("GEMINI_API_KEY mancante.");

    const Phase7Schema = {
      type: SchemaType.OBJECT,
      description: "Generazione Dati SEO",
      properties: {
        seoTitle: { type: SchemaType.STRING, description: "Max 60 caratteri. Orientato alle vendite B2B." },
        seoDescription: { type: SchemaType.STRING, description: "Max 160 caratteri. Includi brand e specifiche chiave." },
        friendlyUrl: { type: SchemaType.STRING, description: "Slug URL pulito, senza caratteri speciali, minuscolo, separato da trattini." }
      },
      required: ["seoTitle", "seoDescription", "friendlyUrl"]
    };

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite-preview",
      generationConfig: { responseMimeType: "application/json", responseSchema: Phase7Schema as any, temperature: 0.4 }
    });

    const prompt = `Sei un Esperto SEO B2C.

DATI PRODOTTO:
- Titolo: ${translatedTitle}
- Dati Tecnici: ${technicalDesc}
- Marchio: ${brand}

COMPITO:
1. Crea un seoTitle (max 60 car).
2. Crea un seoDescription (max 160 car) accattivante, orientata al B2C e al cliente finale. EVITA di iniziare con parole banali come "Acquista", "Compra" o "Scopri". Usa un tono persuasivo ma diretto che metta in risalto l'utilità, i vantaggi e le specifiche tecniche del prodotto.
3. Crea un friendlyUrl (solo lettere, numeri, trattini, lowercase).
Restituisci JSON puro.`;

    const res = await withRetry(() => model.generateContent(prompt));
    return JSON.parse(res.response.text());
  }

  static async processPhase8(
    elmarkProduct: any,
    translatedTitle: string,
    technicalDesc: string,
    brand: string
  ): Promise<{ commercialDescHtml: string }> {
    if (!genAI) throw new Error("GEMINI_API_KEY mancante.");

    const Phase8Schema = {
      type: SchemaType.OBJECT,
      description: "Generazione Descrizione Commerciale HTML",
      properties: {
        commercialDescHtml: { type: SchemaType.STRING, description: "Markup HTML contenente paragrafi, elenchi puntati e grassetti." }
      },
      required: ["commercialDescHtml"]
    };

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite-preview",
      generationConfig: { responseMimeType: "application/json", responseSchema: Phase8Schema as any, temperature: 0.5 }
    });

    const prompt = `Sei un Copywriter Esperto per E-Commerce B2C di fascia alta. Il tuo obiettivo è scrivere descrizioni prodotto estremamente dettagliate, lunghe, coinvolgenti e professionali (circa 4000 caratteri di testo utile) per convincere i clienti finali (B2C) ad acquistare.

DATI PRODOTTO:
- Titolo Originale esteso: ${elmarkProduct.description || elmarkProduct.name || ''}
- Titolo Italiano: ${translatedTitle}
- Specifiche Tecniche: ${technicalDesc}
- Marchio: ${brand}

REGOLE HTML E FORMATTAZIONE:
1. Crea una descrizione commerciale ESTREMAMENTE LUNGA E DETTAGLIATA in HTML puro.
2. Struttura: Inizia con 2-3 paragrafi introduttivi molto discorsivi e persuasivi che descrivono il prodotto, il design, le funzionalità e i vantaggi per l'utente finale (B2C).
3. Continua inserendo OBBLIGATORIAMENTE ALMENO 2 LISTE NON ORDINATE DISTINTE (<ul> e <li>): 
   - La prima lista deve esplorare in dettaglio i **Vantaggi Principali** e i casi d'uso.
   - La seconda lista (introdotta da un nuovo titolo <h3>/<h4>) deve sviscerare tutte le **Specifiche Tecniche e Dettagli Costruttivi**.
4. Usa i tag <p> per i paragrafi. Usa <strong> con generosità per evidenziare le parole chiave, i vantaggi principali e le specifiche tecniche più importanti.
5. Usa i tag <h3> o <h4> per dividere il testo in sezioni logiche (es. "Design e Funzionalità", "I Vantaggi", "Dettagli Tecnici", "Perché Sceglierlo").
6. TASSATIVO: Niente tag <html>, <head>, <body>, <h1> o <h2>. Il markup deve poter essere iniettato direttamente all'interno di un div esistente.
7. Evita call to action (es. "Acquista ora", "Scopri") visto che il sito ha già i suoi bottoni.
8. ESTETICA B2C: Abbellisci il testo inserendo in modo strategico ma professionale delle EMOJI pertinenti (es. 💡, ⚡, 🏠, ✨, 🛡️, 🌿) all'inizio dei titoli <h3>/<h4>, nei punti elenco <li> o all'interno dei paragrafi per rendere la lettura più leggera, visivamente accattivante e moderna.
9. TRADUZIONE CODICI (MANDATORIO): Non stampare MAI codici grezzi o sigle incomprensibili! Se vedi "EK", trasformalo sempre in "Elmark". Se vedi "ST", in "Stellar". Se vedi codici colore come "WH", "BK", "GR", trasformali in "Bianco", "Nero", "Grigio". Sostituisci sistematicamente i codici con i loro nomi completi, in particolare usa SEMPRE il nome per esteso del brand e mai l'abbreviazione.

TONO DI VOCE E CONTENUTO:
- Orientato al B2C (consumatore finale). Usa un tono caldo, emozionale ma autorevole e tecnico.
- Spiega i casi d'uso (es. perfetto per salotto, giardino, ufficio) e l'impatto visivo o funzionale.
- DEVI scrivere molto, approfondire ogni dettaglio menzionato nelle specifiche tecniche, enfatizzando la qualità del marchio.
- L'output finale deve essere ancora più corposo (almeno 500-600 parole).

COMPITO:
Genera 'commercialDescHtml' rispettando rigorosamente le indicazioni. Restituisci JSON puro.`;

    const res = await withRetry(() => model.generateContent(prompt));
    return JSON.parse(res.response.text());
  }

  static async processPipeline(
    elmarkProduct: any,
    taxonomies: {
      productCategories: { code: string; name: string }[];
      families: { code: string; name: string }[];
      categories: { code: string; name: string }[];
      brands: { code: string; name: string }[];
      unitsCsv: string;
      techKeys: string[];
    },
    sampleProduct: any,
    elmarkId: string,
    progressText: string
  ): Promise<any> {
    if (!genAI) {
      throw new Error("GEMINI_API_KEY mancante. Impossibile usare AI per Elmark.");
    }

    try {
      // ----------------------------------------------------------------------
      // STEP 1: Data Analyst (Classificazione e Specifiche Tecniche)
      // ----------------------------------------------------------------------
      const modelStep1 = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-lite-preview",
        generationConfig: { responseMimeType: "application/json", responseSchema: Step1Schema as any, temperature: 0.1 }
      });

      // --- PRE-STEP: Traduzione Veloce per RAG (Inglese -> Italiano) ---
      let translatedSearchTerm = "";
      try {
        const rawTitle = elmarkProduct.name || elmarkProduct.title || '';
        if (rawTitle) {
          const modelTranslate = genAI.getGenerativeModel({
            model: "gemini-3.1-flash-lite-preview",
            generationConfig: { temperature: 0.1 }
          });
          const translatePrompt = `Sei un traduttore tecnico specializzato in materiale elettrico e illuminazione. 
Traduci il seguente nome di prodotto dall'inglese all'italiano.
Restituisci SOLO E SOLTANTO la traduzione, senza punteggiatura, virgolette o spiegazioni aggiuntive.

Prodotto: ${rawTitle}`;
          
          const resTranslation = await withRetry(() => modelTranslate.generateContent(translatePrompt));
          translatedSearchTerm = resTranslation.response.text().trim();
          logger.info(`[Elmark] [${elmarkId}] Traduzione per RAG: "${rawTitle}" -> "${translatedSearchTerm}"`);
        }
      } catch (tError: any) {
        logger.warn(`[Elmark] [${elmarkId}] Errore nella traduzione del titolo per RAG: ${tError.message}`);
      }

      // --- RAG: Cerca prodotti simili in Zucchetti tramite Typesense usando il termine tradotto ---
      let ragContext = "";
      try {
        const queryText = translatedSearchTerm || (`${elmarkProduct.name || elmarkProduct.title || ''}`).substring(0, 150).trim();
        if (queryText) {
          const searchRes = await typesenseClient.collections(PRODUCTS_COLLECTION_NAME).documents().search({
            q: queryText,
            query_by: 'title,semantic_tags,category,family,product_group',
            per_page: 3
          });
          
          if (searchRes && searchRes.hits && searchRes.hits.length > 0) {
            const topHits = searchRes.hits.map((h: any) => h.document);
            ragContext = `
ESEMPI DAL DATABASE ESISTENTE (RAG ZUCCHETTI):
Questi sono i ${topHits.length} prodotti più simili già presenti nel nostro catalogo.
SE IL PRODOTTO ELMARK E' DELLA STESSA TIPOLOGIA DI QUESTI ESEMPI (es. è un interruttore magnetotermico come l'esempio), DEVI COPIARE ESATTAMENTE E TASSATIVAMENTE la stessa 'family', 'category' e 'productGroup'.
Esempi:
${topHits.map((h: any, i: number) => `Esempio ${i+1}:
- Titolo: ${h.title || ''}
- Gruppo Merceologico (productGroup): ${h.product_group || ''}
- Famiglia (family): ${h.family || ''}
- Categoria (category): ${h.category || ''}`).join('\n')}
`;
          }
        }
      } catch (ragError: any) {
        logger.warn(`[Elmark] [${elmarkId}] Fallita la ricerca RAG in Typesense, procedo senza: ${ragError.message}`);
      }

      const promptStep1 = `Sei un rigoroso Data Analyst e-commerce. Devi classificare un prodotto Elmark e standardizzare le sue specifiche tecniche.

REGOLE TASSATIVE DI CLASSIFICAZIONE:
1. IL GRUPPO MERCEOLOGICO E' SACRO E INTOCCABILE: NON PUOI MAI INVENTARE UN productGroup. Scegli SEMPRE e OBBLIGATORIAMENTE un 'code' presente nel dizionario 'Product Categories'. Se non trovi corrispondenza esatta, scegli il più affine, ma DEVE essere uno di quelli in elenco.
2. Per 'family' e 'category', usa ESCLUSIVAMENTE i 'code' presenti nei dizionari se c'è corrispondenza o stretta affinità. SOLO come EXTREMA RATIO (se strettamente necessario), hai il permesso di inventare una nuova nomenclatura. In tal caso, restituisci un nome breve, chiaro e descrittivo (non un codice incomprensibile). Devi comunque impegnarti al massimo per far rientrare il prodotto nelle categorie esistenti.
3. REGOLA DI BUON SENSO: Le famiglie generiche come "Accessori" (o simili) devono essere usate SOLO ED ESCLUSIVAMENTE per i veri accessori. Ad esempio, una lampada "applique" NON è un accessorio (è illuminazione da parete) e non deve finire in quella famiglia.

DATI DEL NUOVO PRODOTTO ELMARK:
${JSON.stringify(elmarkProduct, null, 2)}
${ragContext}
DIZIONARI TASSONOMICI:
- Product Categories (Gruppi Merceologici, OBBLIGATORIO sceglierne uno): ${JSON.stringify(taxonomies.productCategories)}
- Famiglie: ${JSON.stringify(taxonomies.families)}
- Categorie Omogenee: ${JSON.stringify(taxonomies.categories)}
- Brands: ${JSON.stringify(taxonomies.brands)}

UNITA DI MISURA CONSENTITE (Codice;Descrizione):
${taxonomies.unitsCsv}

DIZIONARIO CARATTERISTICHE TECNICHE CONSENTITE:
${JSON.stringify(taxonomies.techKeys)}

COMPITO:
1. Scegli 'productGroup' (OBBLIGATORIAMENTE un codice esistente).
2. Scegli 'family' e 'category' (usa i codici esistenti, e dai priorità assoluta alla nomenclatura usata negli "ESEMPI DAL DATABASE ESISTENTE" se presenti e pertinenti).
3. Se hai usato SOLO codici esistenti per family e category, imposta status = "compatible". Se sei stato costretto a inventare nuove nomenclature per family o category, imposta status = "pending_review".
4. Scegli il "Codice" TASSATIVAMENTE corretto per l'unità di misura (unit) leggendolo dalla prima colonna (es. 'PZ'). In caso di dubbio usa SEMPRE 'PZ'.
5. technicalDesc: formato TASSATIVO 'chiave: valore; chiave: valore;'. Usa preferibilmente le chiavi dal DIZIONARIO CARATTERISTICHE TECNICHE.`;

      logger.info(`[Elmark] [${elmarkId}] ${progressText} Fase 1: Classificazione AI & Specifiche Tecniche...`);
      const res1 = await withRetry(() => modelStep1.generateContent(promptStep1));
      const step1Data = JSON.parse(res1.response.text());

      // ----------------------------------------------------------------------
      // STEP 2: Copywriter (Titolo Corto e Descrizione Commerciale)
      // ----------------------------------------------------------------------
      const modelStep2 = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-lite-preview",
        generationConfig: { responseMimeType: "application/json", responseSchema: Step2Schema as any, temperature: 0.7 }
      });


      const promptStep2 = `Sei un abile Copywriter E-commerce. Basandoti sui dati grezzi di un prodotto e sulle sue specifiche tecniche, devi scrivere testi commerciali persuasivi.

DATI DEL PRODOTTO:
Dati Grezzi originali: ${JSON.stringify(elmarkProduct)}
Specifiche Tecniche Estratte: ${step1Data.technicalDesc}
${sampleProduct ? `Prodotto Simile (Ispirazione stile HTML): ${JSON.stringify(sampleProduct)}` : ''}

COMPITO:
1. originalName (Descrizione Breve): TASSATIVAMENTE massimo 40 caratteri. Sintetico ed essenziale.
2. description (Descrizione Commerciale): Scrivila in formato HTML (usando p, b, ul, li). DEVI generare un testo corposo, dettagliato e professionale, lungo almeno il 50% in più del normale (MINIMO 3-4 paragrafi ben sviluppati, seguiti da un lungo elenco puntato con i vantaggi specifici). Deve essere estremamente persuasiva e descrivere esaustivamente i benefici e le caratteristiche tecniche in modo discorsivo.`;

      logger.info(`[Elmark] [${elmarkId}] ${progressText} Fase 2: Elaborazione Copywriter (Titolo & Descrizione)...`);
      const res2 = await withRetry(() => modelStep2.generateContent(promptStep2));
      const step2Data = JSON.parse(res2.response.text());

      // ----------------------------------------------------------------------
      // STEP 3: SEO Specialist (Meta Title, Meta Description, Tags)
      // ----------------------------------------------------------------------
      const modelStep3 = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-lite-preview",
        generationConfig: { responseMimeType: "application/json", responseSchema: Step3Schema as any, temperature: 0.4 }
      });


      const promptStep3 = `Sei un Senior SEO Specialist. Basandoti sul nome del prodotto e sulla sua descrizione commerciale, genera i meta-dati ottimizzati per i motori di ricerca.

DATI DEL PRODOTTO:
Nome Prodotto: ${step2Data.originalName}
Descrizione Commerciale:
${step2Data.description}

COMPITO:
1. title: Meta title altamente ottimizzato per clic e rilevanza.
2. metaDescription: Meta description persuasiva (max 160 caratteri) con Call to Action.
3. semanticTags: Array di 5-10 tag semantici (es. "illuminazione led", "faretto incasso").`;

      logger.info(`[Elmark] [${elmarkId}] ${progressText} Fase 3: Analisi SEO Specialist (Meta Tags)...`);
      const res3 = await withRetry(() => modelStep3.generateContent(promptStep3));
      const step3Data = JSON.parse(res3.response.text());

      // ======================================================================
      // MERGE FINALE E RITORNO AL SERVICE
      // ======================================================================
      return {
        ...step1Data,
        ...step2Data,
        ...step3Data
      };

    } catch (e: any) {
      logger.error(`[Elmark] [${elmarkId}] Errore in Elmark AI Pipeline: ${e.message}`);
      throw e;
    }
  }
}
