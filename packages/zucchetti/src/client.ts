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

  async query(queryName: string, params: Record<string, string> = {}, company?: string, options?: { silent?: boolean }): Promise<unknown> {
    const { zucchettiAuth } = await import('./auth.js');
    const rawUrl = `${env.ZUCCHETTI_BASE_URL}/servlet/api/SPVQRProducer/${queryName}`;
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch (e) {
      logger.error(`Invalid URL: "${rawUrl}"`);
      throw new Error(`Invalid URL: ${rawUrl}`);
    }

    url.searchParams.set('sp_company', company || env.ZUCCHETTI_SP_COMPANY_ISI || env.ZUCCHETTI_SP_COMPANY);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    if (!options?.silent) {
      logger.debug({ queryName, params }, `Query Zucchetti: ${queryName}`);
    }

    const response = await zFetch(url.toString(), {
      method: 'GET',
      headers: {
        authorization: zucchettiAuth.getBasicAuthHeader(),
      },
    });

    if (!response.ok) {
      const body = await response.text();
      logger.error({ status: response.status, body, queryName }, 'Errore query Zucchetti');
      throw new Error(`Query Zucchetti ${queryName} fallita: HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    const body = await response.text();

    if (contentType.includes('xml') || body.trim().startsWith('<')) {
      return xmlParser.parse(body);
    }

    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
}

export const zucchettiClient = new ZucchettiClientService();
