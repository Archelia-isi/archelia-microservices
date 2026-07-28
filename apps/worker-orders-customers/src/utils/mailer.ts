import { env, log } from '@archelia/core';
import fetch from 'node-fetch';

export class OrderMailer {
  private static get brevoKey(): string {
    return process.env.BREVO_API_KEY || '';
  }

  static async sendNewOrderEmails(emails: string[], orderData: any): Promise<boolean> {
    if (!this.brevoKey) {
      log.warn('[OrderMailer] BREVO_API_KEY mancante.');
      return false;
    }
    if (!emails || emails.length === 0) {
      log.warn('[OrderMailer] Nessuna email di destinazione configurata.');
      return false;
    }

    try {
      const orderNumber = orderData.order_number || orderData.id;
      const total = orderData.total_price || '0.00';
      const customer = orderData.customer 
        ? `${orderData.customer.first_name || ''} ${orderData.customer.last_name || ''}`.trim()
        : 'Cliente Sconosciuto';
      const email = orderData.customer?.email || 'Nessuna email';

      const htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; padding: 20px;">
          <h2 style="color: #0066cc;">Nuovo Ordine Ricevuto! 🎉</h2>
          <p>È appena arrivato un nuovo ordine su Archelia Store.</p>
          <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
          <p><strong>Ordine:</strong> #${orderNumber}</p>
          <p><strong>Totale:</strong> €${total}</p>
          <p><strong>Cliente:</strong> ${customer}</p>
          <p><strong>Email Cliente:</strong> ${email}</p>
          <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888;">Questa notifica è stata generata automaticamente dal sistema di Gestione Ordini.</p>
        </div>
      `;

      const toArray = emails.map(e => ({ email: e }));

      const payload = {
        sender: { name: 'Archelia Notifiche', email: 'info@archelia.it' },
        to: toArray,
        subject: `[Archelia] Nuovo Ordine #${orderNumber}`,
        htmlContent: htmlContent
      };

      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': this.brevoKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        log.error(`[OrderMailer] Errore Brevo (${res.status}): ${errText}`);
        return false;
      }

      log.info(`[OrderMailer] ✅ Email di notifica inviata a ${emails.length} destinatari per ordine #${orderNumber}`);
      return true;
    } catch (error: any) {
      log.error(`[OrderMailer] Eccezione durante l'invio email: ${error.message}`);
      return false;
    }
  }
}
