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

      const subtotal = orderData.subtotal_price || total;
      const shipping = orderData.shipping_lines && orderData.shipping_lines.length > 0
        ? orderData.shipping_lines.reduce((acc: number, line: any) => acc + parseFloat(line.price || 0), 0).toFixed(2)
        : '0.00';

      let productsList = '';
      if (orderData.line_items && orderData.line_items.length > 0) {
        productsList = '\\n<b>Prodotti Acquistati:</b>\\n' + orderData.line_items.map((item: any) => {
          return `- ${item.quantity}x ${item.title} (${item.sku || 'Nessun SKU'}) - €${item.price}`;
        }).join('\\n') + '\\n';
      }

      const message = `
🛍 <b>NUOVO ORDINE RICEVUTO!</b>
<i>Archelia Store</i>

<b>Ordine:</b> #${orderNumber}
<b>Cliente:</b> ${customer}
<b>Email:</b> ${email}
${productsList}
<b>Subtotale:</b> €${subtotal}
<b>Spedizione:</b> €${shipping}
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
