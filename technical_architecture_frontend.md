# Documento Tecnico Architetturale Frontend: E-Commerce B2B Izzo Distribuzione

Questo documento definisce le specifiche tecniche, lo stack e le architetture di flusso dati per la realizzazione del nuovo frontend e-commerce B2B Headless per Izzo Distribuzione.

> [!NOTE]
> Il focus di questo documento è esclusivamente lato Frontend (Next.js su Railway). L'infrastruttura di popolamento dati (sincronizzazione DB -> Typesense via Webhook) è di competenza del team Backend ed è trasparente per il Frontend, il quale agirà da puro "consumatore" delle API messe a disposizione.

---

## 1. Stack Tecnologico Frontend

L'architettura è progettata per massimizzare le performance (SEO, TTFB), garantire la flessibilità per flussi B2B complessi e preparare il terreno per le future App Native (iOS/Android).

*   **Framework Core:** **Next.js (App Router)** - Scelto per il supporto nativo a SSR (Server-Side Rendering) e per il facile deploy su infrastrutture Node.js come Railway.
*   **Styling:** **Vanilla CSS (CSS Modules)** - Per mantenere i bundle leggeri, avere pieno controllo sul design system aziendale ("Izzo Design") e garantire alte performance di rendering di tabelle/griglie dense tipiche del B2B.
*   **State Management (Locale):** **Zustand** - Per la gestione dello stato UI dell'interfaccia (es. modali aperte, filtri attivi, stato di caricamento).
*   **Data Fetching & Caching (Client-Side):** **TanStack Query (React Query)** - Motore fondamentale per le chiamate in tempo reale verso l'API Gateway (prezzi live, stock live, carrello).
*   **Deploy:** **Railway** (Ambiente Node.js standard).
*   **Dominio:** Puntamento DNS di `izzodistribuzione.com` verso l'istanza Railway del frontend.

---

## 2. Flusso Dati e Fonti (Dove e Come prendere i dati)

Il frontend non comunica con un'unica entità, ma divide le letture pesanti da quelle transazionali (Approccio CQRS).

### 2.1 Letture Pesanti (Catalogo, Categorie, Ricerca)
Tutte le informazioni "fredde" o descrittive (Nome prodotto, immagini, schede tecniche, categorie, filtri laterali) provengono da **Typesense**.
*   **Dove:** Host Typesense tramite API pubblica.
*   **Come:** Tramite libreria `typesense-js` o fetch dirette. Le query sono effettuate principalmente lato server (Server Components di Next.js) per generare l'HTML della pagina, oppure lato client per la ricerca istantanea (search-as-you-type).
*   **Quando:** Al caricamento delle pagine di listato (Griglie Categoria) e per il rendering base della Pagina Prodotto.

### 2.2 Dati Transazionali (Prezzi B2B, Stock, Ordini)
I dati sensibili e critici vengono gestiti attraverso due modalità, per bilanciare performance assolute e rispetto delle logiche di business (CQRS esteso):

*   **Connessione Diretta al Database (Letture e Server Actions):** Sfruttando i Server Components di Next.js, il frontend web si connette *direttamente* al database **Neon Postgres** tramite un ORM (es. Prisma/Drizzle). Questa via super-veloce salta l'API Gateway ed è usata per letture istantanee (giacenze live, storico ordini) o semplici scritture (es. modifica indirizzo utente). Le credenziali risiedono sicure nel server Node.js di Next.
*   **API GraphQL (Business Logic Complessa e Mobile App):** Per operazioni transazionali pesanti (es. Check-out finale, ricalcolo carrello con sconti B2B a volume), il frontend interroga l'endpoint **GraphQL** aziendale. GraphQL permette di scaricare solo i dati strettamente necessari in un'unica richiesta (azzerando l'over-fetching). Questo stesso endpoint GraphQL sarà quello interrogato dalle future App Native.

---

## 3. Gestione Giacenze (Strategia Ibrida)

Garantire che l'utente non compri merce esaurita è la priorità assoluta, senza però sacrificare le performance.

> [!IMPORTANT]
> **Strategia di Riferimento:** Si predilige l'approccio "Stale-While-Revalidate" (Ping Invisibile) rispetto a costose connessioni WebSocket costanti.

*   **Griglie e Listati Prodotti (Es. 50 articoli):** 
    *   Il frontend mostra il dato di stock prelevato da *Typesense*. È un dato rapidissimo, sufficientemente fresco per scopi di browsing. Non si eseguono chiamate API massive per controllare lo stock di tutti i 50 prodotti contemporaneamente.
*   **Pagina Singolo Prodotto (Lettura Giacenza):** 
    *   Al caricamento del componente, React Query effettua un "Ping" utilizzando esclusivamente una **Server Action di Next.js con connessione diretta al DB Neon**. *Scelta migliore perché:* garantisce la massima velocità assoluta per il web, eliminando il passaggio attraverso l'API Gateway per una semplice lettura. Il numero si aggiorna istantaneamente.
*   **Azione "Aggiungi al Carrello" (Add-to-Cart):** 
    *   La pressione del tasto lancia una **Mutation GraphQL**. *Scelta migliore perché:* aggiungere al carrello non è una semplice lettura, ma innesca calcoli di business (sconti a volume B2B, ricalcolo totali) che devono essere centralizzati nell'API per poter essere riutilizzati identici dalla futura App Mobile.

---

## 4. Architettura del Carrello ("Cloud Cart" B2B)

A differenza dei piccoli e-commerce, il carrello B2B ha una vita lunga (giorni o settimane) e deve essere accessibile da più dispositivi. **È assolutamente vietato basare il carrello esclusivamente sul LocalStorage del browser.**

### 4.1 Persistenza e Sincronizzazione
*   **Dove:** Il carrello vive nel database Postgres (sul Backend).
*   **Come funziona:**
    1.  Il frontend recupera lo stato del carrello utilizzando esclusivamente una **Query GraphQL**. *Scelta migliore perché:* garantisce che il sito Web e la futura App Mobile ricevano esattamente lo stesso JSON con i totali già calcolati dal motore di business aziendale, senza duplicare logiche complesse.
    2.  Ogni aggiunta o modifica quantità lancia una **Mutation GraphQL** (es. `updateCartQuantity`) che aggiorna il server centrale in modo sicuro.
    3.  Zustand tiene in memoria una copia locale del carrello per evitare sfarfallii dell'interfaccia durante i caricamenti, mentre React Query assicura che il dato sia sincronizzato.

### 4.2 Gestione degli Esauriti a Lungo Termine (Regola dei 15 giorni)
Poiché il carrello può restare "in parcheggio" per molti giorni in attesa della soglia di spedizione gratuita:
1.  **Check in Apertura (Il Controllo):** Quando l'utente apre la pagina `/cart`, il controllo di validità dello stock avviene tramite una **Query GraphQL** eseguita velocissimamente lato server (SSR) da Next.js. *Scelta migliore perché:* Next.js interroga l'API GraphQL ad altissima velocità (server-to-server) e consegna al browser l'HTML del carrello già validato, senza far "sfarfallare" l'interfaccia sotto gli occhi dell'utente.
2.  **UX React:** Il frontend mapperà gli articoli restituiti dalla Query bloccando il checkout per quelli a stock `0` e mostrando un avviso visivo in rosso ("Prodotto esaurito mentre era nel tuo carrello, per favore rimuovilo").
3.  **Checkout Finale:** Al click su "Conferma Ordine", avviene l'ultima validazione server-side. Se approvata, l'ordine è registrato e il carrello viene svuotato.

---

## 5. Autenticazione e Sicurezza

Il contesto B2B richiede un sistema di permessi solido per la visibilità dei listini.

*   **Autenticazione:** Il backend emetterà un **Token JWT** al login corretto.
*   **Storage del Token:** Il Token **deve** essere memorizzato in un **Cookie Http-Only**. Questo protegge il token da attacchi XSS (lettura da script malevoli) e permette al framework Next.js di leggerlo comodamente lato server.
*   **CORS e Rate Limiting:** Il frontend dovrà gestire in modo elegante gli Status `429 Too Many Requests`. Se un utente esegue troppe operazioni rapide e il backend blocca la richiesta, il frontend utilizzerà React Query per intercettare l'errore e mostrare un messaggio amichevole (es. tramite un componente Toast) suggerendo di attendere qualche istante, bloccando l'interfaccia per prevenire crash applicativi.

---

> [!TIP]
> Questa architettura mista "Direct DB + GraphQL" garantisce performance ineguagliabili lato Web (sfruttando Next.js e Neon). Inoltre, annulla il lavoro di ri-progettazione logica per il futuro: quando implementerete le App Native iOS e Android, le App consumeranno esattamente le stesse queries e mutations **GraphQL** già pronte e collaudate.
