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

      const subtotal = orderData.subtotal_price || total;
      const shipping = orderData.shipping_lines && orderData.shipping_lines.length > 0
        ? orderData.shipping_lines.reduce((acc: number, line: any) => acc + parseFloat(line.price || 0), 0).toFixed(2)
        : '0.00';

      let productsRows = '';
      if (orderData.line_items && orderData.line_items.length > 0) {
        productsRows = orderData.line_items.map((item: any) => {
          const thumb = item.image_url 
            ? `<img src="${item.image_url}" width="48" height="48" style="border-radius: 8px; object-fit: contain; margin-right: 16px; border: 1px solid #eaeaea;" />`
            : `<div style="width: 48px; height: 48px; border-radius: 8px; background-color: #f5f5f7; margin-right: 16px; display: inline-block; vertical-align: middle;"></div>`;

          return `
          <tr>
            <td style="padding: 16px 0; border-bottom: 1px solid #eaeaea; display: flex; align-items: center;">
              ${thumb}
              <div>
                <p style="margin: 0; font-weight: bold; color: #333; line-height: 1.2;">${item.title}</p>
                <p style="margin: 4px 0 0; font-size: 12px; color: #777;">SKU: ${item.sku || 'N/A'} | Q.tà: ${item.quantity}</p>
              </div>
            </td>
            <td style="padding: 16px 0; border-bottom: 1px solid #eaeaea; text-align: right; color: #0066cc; font-weight: bold; vertical-align: middle;">
              €${parseFloat(item.price).toFixed(2)}
            </td>
          </tr>
        `}).join('');
      }

      const htmlContent = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #f0f0f0;">
          <div style="background-color: #f5f5f7; padding: 24px; text-align: center; border-bottom: 1px solid #eaeaea;">
            <h2 style="margin: 0; color: #1d1d1f; font-size: 24px;">Dettaglio Ordine #${orderNumber}</h2>
          </div>
          <div style="padding: 24px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
              <div style="background-color: #fafafa; padding: 16px; border-radius: 8px; width: 48%;">
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #86868b; text-transform: uppercase; letter-spacing: 0.5px;">Dati Cliente</p>
                <p style="margin: 0; font-weight: 600; color: #1d1d1f;">${customer}</p>
                <p style="margin: 4px 0 0; font-size: 14px; color: #515154;">${email}</p>
              </div>
            </div>

            <h3 style="font-size: 16px; color: #1d1d1f; margin: 0 0 16px 0;">Prodotti Acquistati</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              ${productsRows}
            </table>

            <div style="text-align: right; border-top: 1px solid #eaeaea; padding-top: 16px;">
              <p style="margin: 0 0 8px 0; color: #515154; font-size: 14px;">Subtotale: <span style="display: inline-block; width: 80px;">€${subtotal}</span></p>
              <p style="margin: 0 0 16px 0; color: #515154; font-size: 14px;">Spedizione: <span style="display: inline-block; width: 80px;">€${shipping}</span></p>
              <p style="margin: 0; color: #1d1d1f; font-size: 20px; font-weight: 700;">Totale: <span style="display: inline-block; width: 80px;">€${total}</span></p>
            </div>
          </div>
          <div style="background-color: #f5f5f7; padding: 16px; text-align: center; font-size: 12px; color: #86868b;">
            Questa notifica è generata automaticamente. L'ordine è in fase di sincronizzazione con Zucchetti.
          </div>
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
