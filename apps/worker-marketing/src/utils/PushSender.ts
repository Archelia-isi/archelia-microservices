import webpush from 'web-push';
import { log, env } from '@archelia/core';
import { prisma } from '@archelia/database';

// Inizializzazione VAPID
const vapidPublicKey = env.VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = env.VAPID_PRIVATE_KEY || '';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:contatti@izzodistribuzione.com',
    vapidPublicKey,
    vapidPrivateKey
  );
} else {
  log.warn('⚠️ VAPID Keys non configurate. Le notifiche Push falliranno.', { module: 'worker-marketing' });
}

export class PushSender {
  static async sendPush(deviceId: string, title: string, body: string, url: string = '/') {
    try {
      log.info(`[PushSender] Preparazione invio push per device ${deviceId}`, { module: 'worker-marketing' });
      const sub = await prisma.webPushSubscription.findUnique({ where: { deviceId } });
      if (!sub) {
        log.warn(`Push fallito: Sottoscrizione non trovata per Device ${deviceId}`, { module: 'worker-marketing' });
        return false;
      }

      const pushConfig = {
        endpoint: sub.endpoint,
        keys: sub.keys as any
      };

      const payload = JSON.stringify({
        title,
        body,
        icon: 'https://cdn.shopify.com/s/files/1/0854/8273/3872/files/logo_archelia_nero.png?v=1716913490',
        url
      });

      await webpush.sendNotification(pushConfig, payload);
      log.info(`[PushSender] ✅ Push inviata con successo al Device ${deviceId}`, { module: 'worker-marketing' });
      return true;

    } catch (e: any) {
      if (e.statusCode === 410 || e.statusCode === 404) {
        log.warn(`Push esaurito o revocato per ${deviceId}. Elimino sottoscrizione...`, { module: 'worker-marketing' });
        await prisma.webPushSubscription.delete({ where: { deviceId } }).catch(() => {});
      } else {
        log.error(`Errore invio Push a ${deviceId}: ${e.message}`, { error: e, module: 'worker-marketing' });
      }
      return false;
    }
  }

  static async generateAiCopy(contextParams: { jobType: string, payload: any }): Promise<{ title: string, body: string }> {
    const { jobType, payload } = contextParams;
    
    // Fallback statico
    let fallbackTitle = "Novità su Archelia!";
    let fallbackBody = "Scopri i nostri migliori prodotti.";

    if (jobType === 'ABANDONED_CART_PUSH') {
      fallbackTitle = "Hai dimenticato qualcosa?";
      fallbackBody = "Il tuo carrello è ancora qui e ti aspetta. Non farti scappare i prodotti!";
    } else if (jobType === 'PROMO_PUSH') {
      fallbackTitle = "Sconti Speciali Attivati!";
      fallbackBody = "Abbiamo appena abbassato i prezzi. Entra e scopri la nuova collezione!";
    }

    try {
      const apiKey = env.GEMINI_API_KEY;
      if (!apiKey) return { title: fallbackTitle, body: fallbackBody };

      const prompt = `Devi scrivere un testo breve per NOTIFICA PUSH SMARTPHONE (stile AIDA).
Contesto: ${jobType}. Dati: ${JSON.stringify(payload)}.
Regole rigorose:
- Titolo max 30 caratteri (usa 1 emoji iniziale).
- Body max 80 caratteri (Call to action diretta).
Ritorna SOLO un mini-JSON valido: {"title": "...", "body": "..."}. Mettilo su un rigo, nudo e crudo senza apici markdown.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
          })
      });

      const data = await response.json() as any;
      const txt = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!txt) throw new Error("Risposta vuota da Gemini");
      
      const cleaned = txt.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const parsed = JSON.parse(cleaned);
      if (parsed.title && parsed.body) {
        return parsed;
      }
      throw new Error("Formato json da AI malformato");
    } catch(err: any) {
      log.error(`Fallita AI dinamica Push: ${err.message}. Uso fallback.`, { module: 'worker-marketing' });
      return { title: fallbackTitle, body: fallbackBody };
    }
  }
}
