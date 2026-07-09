import { Agent } from 'undici';
import { env, logger } from '@archelia/core';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';

export class ZucchettiImportError extends Error {
  constructor(message: string, public xmlLog?: string) {
    super(message);
    this.name = 'ZucchettiImportError';
  }
}

const zucchettiDispatcher = new Agent({ connect: { rejectUnauthorized: false } });

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

async function zFetch(url: string | URL, options: RequestInit = {}): Promise<Response> {
  const urlStr = url.toString();
  const fetchOptions = { ...options, dispatcher: zucchettiDispatcher } as unknown as RequestInit;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fetch(urlStr, fetchOptions);
    } catch (err: any) {
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        logger.warn(`⚠️ zFetch tentativo ${attempt}/${MAX_RETRIES} fallito — retry tra ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        logger.error(`zFetch FAILED dopo ${MAX_RETRIES} tentativi — url: "${urlStr}" — error: ${err.message}\n${err.stack}`);
        throw err;
      }
    }
  }

  throw new Error('zFetch: max retries exceeded');
}

export const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: '_text',
});

export const xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  format: true,
  suppressEmptyNode: true,
});

export class ZucchettiClientService {
  async importData(token: string, xmlPayload: string, instance: string = 'SERVLET'): Promise<string> {
    const url = `${env.ZUCCHETTI_BASE_URL}/api/importData`;
    const formData = new URLSearchParams();
    formData.set('instance', instance);
    formData.set('xml_import', xmlPayload);

    logger.debug(`📤 Zucchetti Import Data URL: ${url}`);
    
    const response = await zFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'authorization': token
      },
      body: formData.toString()
    });

    const responseText = await response.text();

    if (!response.ok) {
      logger.error(`❌ Errore HTTP da Zucchetti (${response.status}): ${responseText}`);
      throw new ZucchettiImportError(`HTTP ${response.status}: ${responseText}`);
    }

    try {
      const parsed = xmlParser.parse(responseText);
      const isOk = parsed?.out?.result === 'ok';

      if (!isOk) {
        logger.error(`❌ Zucchetti Import restituito Errore Logico.`);
        throw new ZucchettiImportError(`Zucchetti XML Error: ${parsed?.out?.log || 'Errore sconosciuto'}`, parsed?.out?.log);
      }

      logger.info(`✅ Zucchetti Import completato con successo.`);
      return responseText;
    } catch (e: any) {
      if (e instanceof ZucchettiImportError) throw e;
      logger.error(`❌ Errore parsing risposta Zucchetti: ${e.message}`);
      throw new Error(`Errore parsing Zucchetti: ${e.message}`);
    }
  }

  // Aggiungeremo gli altri metodi (queryData, getArticoli, ecc.) man mano che servono.
}

export const zucchettiClient = new ZucchettiClientService();
