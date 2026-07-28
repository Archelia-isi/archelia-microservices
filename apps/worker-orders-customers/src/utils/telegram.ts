import { env, log } from '@archelia/core';
import fetch from 'node-fetch';

export class TelegramNotifier {
  private static get token(): string {
    return process.env.TELEGRAM_BOT_TOKEN || '';
  }

  static async sendNewOrderMessage(chatId: string, orderData: any): Promise<boolean> {
    if (!this.token) {
      log.warn('[Telegram] Impossibile inviare notifica: TELEGRAM_BOT_TOKEN mancante.');
      return false;
    }
    if (!chatId) {
      log.warn('[Telegram] Impossibile inviare notifica: Chat ID mancante.');
      return false;
    }

    try {
      const orderNumber = orderData.order_number || orderData.id;
      const total = orderData.total_price || '0.00';
      const customer = orderData.customer 
        ? `${orderData.customer.first_name || ''} ${orderData.customer.last_name || ''}`.trim()
        : 'Cliente Sconosciuto';
      const email = orderData.customer?.email || 'Nessuna email';

      const message = `
🛍 <b>NUOVO ORDINE RICEVUTO!</b>
<i>Archelia Store</i>

<b>Ordine:</b> #${orderNumber}
<b>Cliente:</b> ${customer}
<b>Email:</b> ${email}
<b>Totale:</b> €${total}

<i>L'ordine è in fase di sincronizzazione con Zucchetti.</i>
      `.trim();

      const url = `https://api.telegram.org/bot${this.token}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        log.error(`[Telegram] Errore API Telegram (${response.status}): ${errorText}`);
        return false;
      }

      log.info(`[Telegram] ✅ Notifica per ordine #${orderNumber} inviata con successo.`);
      return true;
    } catch (error: any) {
      log.error(`[Telegram] Eccezione durante l'invio: ${error.message}`);
      return false;
    }
  }
}
