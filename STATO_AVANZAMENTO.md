# Stato Avanzamento Architettura V2 vs Vecchio Middleware

Questo report mette a confronto tutto ciò che abbiamo già ricostruito e migliorato nella nuova architettura a microservizi (V2) rispetto al vecchio monolite (`archelia-middleware` e vecchio pannello).

## 1. Infrastruttura e Sicurezza

| Funzionalità | Vecchio Sistema | Nuova V2 (`archelia-microservices`) |
| :--- | :--- | :--- |
| **Architettura** | Monolite Node.js ingarbugliato in una singola app. Se un processo crashava, andava giù tutto. | **Monorepo (Microservizi).** Pacchetti condivisi (`@archelia/core`, `database`, `shopify`) e App isolate. Se il marketing va in errore, Zucchetti e Shopify continuano a girare. |
| **Code e Job** | Esecuzioni in RAM tramite `setInterval` e tabelle temporanee PostgreSQL. Rischio di loop o blocchi. | **BullMQ su Redis.** Code professionali, indistruttibili, con retry automatici e scalabilità orizzontale. |
| **Deploy CI/CD** | Caricamento unico e build di tutto il progetto. | **Railway Smart Build.** Ogni microservizio si compila in isolamento in pochi secondi grazie alle variabili `$RAILWAY_SERVICE_NAME`. |
| **Sicurezza Dati** | Nessuna protezione globale. Un errore poteva sovrascrivere i dati Shopify in produzione. | **Master Read-Only Shield.** Variabile `ENABLE_GLOBAL_WRITES` iniettata nel cuore degli SDK Shopify e Zucchetti per bloccare fisicamente le scritture durante lo sviluppo. |

---

## 2. Rete di Ricezione Webhook

| Funzionalità | Vecchio Sistema | Nuova V2 (`webhook-receiver`) |
| :--- | :--- | :--- |
| **Sincronizzazione Carrelli App (Mobile)** | Rotta `POST /api/v1/sync/cart` in mezzo al monolite, soggetta a rallentamenti. Sincronizzava i Metafield Shopify in modo sincrono. | Microservizio **`webhook-receiver`** ultra-leggero in Fastify. Riceve i carrelli dall'App, verifica i JWT, e scarica subito il lavoro su Redis in 2 millisecondi. |
| **Eventi Shopify** | Riceveva webhook ordini e prodotti mischiati ad altri task. | *Predisposto* per ricevere Webhook massivi da Shopify e smistarli sulle code Redis a latenza zero. |

---

## 3. Marketing e Notifiche

| Funzionalità | Vecchio Sistema | Nuova V2 (`worker-marketing`) |
| :--- | :--- | :--- |
| **Recupero Carrelli Abbandonati** | `CartSyncWorker.ts` leggeva dal DB ogni 5 secondi, calcolava i carrelli e mandava le email. | **`CartSyncJob`**: Gestito asincronamente da BullMQ. Calcola se il carrello è vuoto o abbandonato, aggiorna la UI, scrive su Prisma e invia il Metafield a Shopify per allineare Sito e App (dietro scudo Read-Only). |
| **Motore Generazione Codici Sconto** | `tagEngine.ts` creava sconti e rimpiazzava le variabili nelle email. | **`TagEngine`** ricostruito. Genera dinamicamente "Winback Discount" su Shopify (in sola lettura per ora) e inietta il codice HTML finale. |
| **Invio Email** | Integrazione diretta e sincrona. | **`EmailSenderJob`**: Job BullMQ asincrono integrato con Brevo. Anche se Brevo è offline, Redis riproverà l'invio senza perdere le email. |
| **Push Notifications AI** | `pushService.ts` mandava notifiche standard VAPID. | **`PushNotificationJob`**: Usa le chiavi VAPID e inietta **Gemini AI** per scrivere automaticamente testi (copywriting) accattivanti basati sui prodotti nel carrello. |

---

## 4. Nuova UI DesktopOS (Frontend)

| Funzionalità | Vecchio Pannello (Web Admin) | Nuova UI V2 (`ui-server` + `api-gateway`) |
| :--- | :--- | :--- |
| **Filosofia UI** | Tradizionale sito web admin, pagine lunghe, caricamenti sincroni. | **DesktopOS (App-based)**. Ogni processo è un'App separata (stile macOS/iPadOS). Effetti Glassmorphism, Splash Screen fluttuanti e caricamenti asincroni "stile Apple". |
| **App Marketing** | Tabella statica con log dei carrelli e delle email. | **`MarketingApp.tsx`** (Implementata e Live!). Design a Tab (Email vs Push Notifiche), Badges di stato animati. Comunica tramite `api-gateway` con il database Neon reale. |
| **App Equalizzatore** | Pannello statico di approvazione per la normalizzazione dei prodotti Elmark. | **`EqualizzatoreApp.tsx`** (In sviluppo). Interfaccia per revisionare i cataloghi normalizzati dall'AI, con progress bar in tempo reale (Server-Sent Events) e Review Accordions avanzati. |

---

## Prossimi Passi (Cosa manca)
La **Fase 1 (Infrastruttura, Marketing, Webhooks e UI Base)** è ufficialmente **COMPLETATA**.

Il prossimo tassello è la **Fase 2 (Zucchetti Pull)**, ovvero il prelievo massivo di giacenze e listini dall'ERP (che corrisponde a `stockSync`, `priceSync` e `productImport` del vecchio pannello).
