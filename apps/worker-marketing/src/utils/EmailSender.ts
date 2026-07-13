import { log, env } from '@archelia/core';

export interface BrevoEmailPayload {
  to: Array<{ email: string; name?: string }>;
  templateId?: number;
  subject?: string;
  htmlContent?: string;
  // Variabili dinamiche da iniettare nei Template HTML (es. {{ params.sconto }})
  params?: Record<string, any>; 
}

/**
 * Controller per la spedizione delle Email Transazionali e Promozionali.
 * Utilizza le API v3 di Brevo tramite chiamate HTTPS native.
 */
export class EmailSender {
  private static readonly BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
  
  static async send(payload: BrevoEmailPayload): Promise<boolean> {
    const apiKey = (env as any).BREVO_API_KEY || process.env.BREVO_API_KEY;
    
    if (!apiKey) {
      log.warn("BREVO_API_KEY non trovata nel file .env. Skipo invio effettivo.", { module: 'worker-marketing' });
      // Per evitare crash in dev se non c'è la chiave, diamo l'OK simulato
      return true;
    }

    try {
      const bodyParams = {
        sender: { 
          name: "Archelia", 
          email: "info@archelia.it" 
        },
        to: payload.to,
        ...(payload.templateId ? { templateId: payload.templateId } : {}),
        ...(payload.htmlContent ? { htmlContent: payload.htmlContent } : {}),
        ...(payload.subject && !payload.templateId ? { subject: payload.subject } : {}),
        ...(payload.params ? { params: payload.params } : {})
      };

      const response = await fetch(this.BREVO_API_URL, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify(bodyParams)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Rifiuto API Brevo (HTTP ${response.status}): ${errorText}`);
      }

      const responseData = await response.json() as any;
      log.info(`🚀 Email sparata con successo! Pila: ${responseData.messageId}`, { module: 'worker-marketing' });
      return true;

    } catch (error: any) {
      log.error(`Errore critico invio Brevo: ${error.message}`, { error, module: 'worker-marketing' });
      throw error;
    }
  }
}
