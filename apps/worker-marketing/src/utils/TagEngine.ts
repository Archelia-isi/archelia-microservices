import { log, env } from '@archelia/core';
import { shopifyDiscountService } from '@archelia/shopify';
import { prisma } from '@archelia/database';

import mjml2html from 'mjml';

export class MarketingTagEngine {
  static async compileHtml(html: string, customerEmail: string, eventPayload: any): Promise<string> {
    if (!html) return "";
    let compiled = html;

    // Fallback MJML a HTML
    if (compiled.includes("<mjml>") || compiled.includes("<mj-body>") || compiled.includes("<mj-")) {
      try {
        let clean = compiled.trim();
        if (clean.startsWith("<mj-body") && clean.endsWith("</mj-body>") && clean.includes("<mj-head>")) {
           const firstClose = clean.indexOf(">");
           if (firstClose !== -1) {
               clean = clean.substring(firstClose + 1, clean.length - 10).trim();
           }
        }

        let mjmlToCompile = clean;
        if (!/<mjml/i.test(mjmlToCompile)) {
           if (!/<mj-body/i.test(mjmlToCompile)) {
              mjmlToCompile = `<mjml><mj-body>${mjmlToCompile}</mj-body></mjml>`;
           } else {
              mjmlToCompile = `<mjml>${mjmlToCompile}</mjml>`;
           }
        }
        const mjmlResult = (mjml2html as any)(mjmlToCompile, { validationLevel: 'soft' });
        if (mjmlResult && mjmlResult.html) {
          compiled = mjmlResult.html;
        }
      } catch (mjmlErr: any) {
        log.error(`[TagEngine] Fallback MJML Compiler error: ${mjmlErr.message}`, { module: 'worker-marketing' });
      }
    }

    try {
      let firstName = eventPayload?.customer?.first_name || eventPayload?.shipping_address?.first_name;
      let lastName = eventPayload?.customer?.last_name || eventPayload?.shipping_address?.last_name || "";
      
      // Fallback dal DB
      if (!firstName && customerEmail) {
        try {
           const mapping = await prisma.customerMapping.findFirst({
             where: { email: customerEmail }
           });
           if (mapping && mapping.fullName) {
             const parts = mapping.fullName.trim().split(' ');
             firstName = parts[0];
             if (parts.length > 1) lastName = parts.slice(1).join(' ');
           }
        } catch(e) {}
      }
      
      firstName = firstName || "Cliente";

      compiled = compiled.replace(/\{\{\s*Nome\s*\}\}/g, firstName);
      compiled = compiled.replace(/\{\{\s*Cognome\s*\}\}/g, lastName);
      compiled = compiled.replace(/\{\{\s*customer_name\s*\}\}/g, firstName);
      compiled = compiled.replace(/\{\{\s*customer_first_name\s*\}\}/g, firstName);
      compiled = compiled.replace(/\{\{\s*customer_last_name\s*\}\}/g, lastName);

      const shopName = "Archelia";
      compiled = compiled.replace(/\{\{\s*company_name\s*\}\}/g, shopName);

      const recoveryUrl = eventPayload?.abandoned_checkout_url || eventPayload?.checkout_url || `https://${env.SHOPIFY_STORE_URL}`;
      compiled = compiled.replace(/\{\{\s*LinkPagamento\s*\}\}/g, recoveryUrl);
      compiled = compiled.replace(/\{\{\s*cart_link\s*\}\}/g, recoveryUrl);
      
      const bottoneHtml = `<a href="${recoveryUrl}" style="display:inline-block; background-color:#3b82f6; color:#ffffff; padding:14px 28px; font-family:Arial,sans-serif; text-decoration:none; border-radius:6px; font-weight:bold; font-size:16px; margin: 20px 0;">Completa il tuo Ordine</a>`;
      compiled = compiled.replace(/\{\{\s*BottonePagaOra\s*\}\}/g, bottoneHtml);

      if (compiled.includes('{{TotaleCarrello}}') || compiled.includes('{{ TotaleCarrello }}')) {
         const totaleRaw = eventPayload?.total_price || eventPayload?.current_total_price || 0;
         const valuta = eventPayload?.currency || 'EUR';
         const totaleFormattato = new Intl.NumberFormat('it-IT', { style: 'currency', currency: valuta }).format(totaleRaw);
         compiled = compiled.replace(/\{\{\s*TotaleCarrello\s*\}\}/g, totaleFormattato);
      }

      if (compiled.includes('{{CodiceSconto}}') || compiled.includes('{{ CodiceSconto }}')) {
         try {
           const code = await shopifyDiscountService.generateWinbackDiscount();
           compiled = compiled.replace(/\{\{\s*CodiceSconto\s*\}\}/g, code);
         } catch (e) {
           log.error(`Fallimento engine sconti, rimpiazzato vuoto.`, { module: 'worker-marketing' });
           compiled = compiled.replace(/\{\{\s*CodiceSconto\s*\}\}/g, "SCONTO-BENVENUTO");
         }
      }

      if (compiled.includes('{{ScadenzaSconto}}')) {
         const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
         const formatDate = futureDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute:'2-digit' });
         compiled = compiled.replace(/\{\{\s*ScadenzaSconto\s*\}\}/g, formatDate);
      }

      if (compiled.includes('{{ProdottiDimenticati}}') || compiled.includes('{{ ProdottiDimenticati }}')) {
         let gridHtml = '';
         const lineItems = eventPayload?.line_items || eventPayload?.items || eventPayload?.viewedProducts || [];
         if (lineItems.length > 0) {
           gridHtml += `<table width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0;">`;
           lineItems.forEach((item: any) => {
             const title = item.title || "Prodotto salvato";
             const imgUrl = item.image || item.image_url || item.featured_image?.url || "https://via.placeholder.com/80/f4f4f5/9ca3af?text=🛍️"; 

             gridHtml += `
               <tr>
                 <td width="90" style="padding-bottom:15px;"><img src="${imgUrl}" width="80" height="80" style="border-radius:4px; object-fit:cover;" /></td>
                 <td style="padding-bottom:15px; font-family:Arial,sans-serif; color:#334155; font-size:15px;">
                   <strong>${title}</strong><br>
                   <span style="color:#64748b; font-size:13px;">Quantità: ${item.quantity || 1}</span>
                 </td>
               </tr>
             `;
           });
           gridHtml += `</table>`;
         } else {
           gridHtml = "<p>Non abbiamo potuto recuperare gli articoli archiviati.</p>";
         }
         compiled = compiled.replace(/\{\{\s*ProdottiDimenticati\s*\}\}/g, gridHtml);
      }

      compiled = compiled.replace(/\{\{\s*LinkSito\s*\}\}/g, `https://${env.SHOPIFY_STORE_URL}`);
      compiled = compiled.replace(/\{\{\s*LinkWhatsapp\s*\}\}/g, `https://wa.me/390000000000`);
      compiled = compiled.replace(/\{\{\s*LinkDisiscrizione\s*\}\}/g, `{{ unsubscribe }}`);
      
      const currentYear = new Date().getFullYear().toString();
      compiled = compiled.replace(/(\{\{\s*AnnoCorrente\s*\}\}|\[\s*Anno Corrente\s*\])/gi, currentYear);
      compiled = compiled.replace(/(\{\{\s*NomeAzienda\s*\}\}|\[\s*Nome Azienda\s*\])/gi, "Archelia");
      
      const emailLink = `<a href="mailto:info@archelia.it" target="_blank" style="color:#4f46e5; text-decoration:none;">info@archelia.it</a>`;
      compiled = compiled.replace(/(\{\{\s*EmailSupporto\s*\}\}|\[\s*Indirizzo Email Supporto\s*\])/gi, emailLink);
      
      const termsLink = `<a href="https://archelia.it/policies/terms-of-service" target="_blank" style="color:#64748b; text-decoration:underline;">Termini e Condizioni</a>`;
      compiled = compiled.replace(/(\{\{\s*LinkTermini\s*\}\}|\[\s*Link Termini e Condizioni\s*\])/gi, termsLink);
      
      const privacyLink = `<a href="https://archelia.it/policies/privacy-policy" target="_blank" style="color:#64748b; text-decoration:underline;">Informativa Privacy</a>`;
      compiled = compiled.replace(/(\{\{\s*LinkPrivacy\s*\}\}|\[\s*Link Informativa Privacy\s*\])/gi, privacyLink);
      
      const faqLink = `<a href="https://archelia.it/pages/faq" target="_blank" style="color:#4f46e5; text-decoration:none;">FAQ</a>`;
      compiled = compiled.replace(/(\{\{\s*LinkFAQ\s*\}\}|\[\s*Link alle FAQ\s*\])/gi, faqLink);

    } catch (e: any) {
      log.error(`[TagEngine] Errore di rendering Mail compilata: ${e.message}`, { module: 'worker-marketing' });
    }

    return compiled;
  }
}
