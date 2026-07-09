import { env } from '@archelia/core';

export function getZucchettiBasicAuth(): string {
  const credentials = `${env.ZUCCHETTI_USERNAME}:${env.ZUCCHETTI_PASSWORD}`;
  return Buffer.from(credentials).toString('base64');
}

export const ZUCCHETTI = {
  MAGAZZINO_PRINCIPALE: 'PR',
  TIPO_CONTO_CLIENTE: 'C',
  TIPO_ARTICOLO_PF: 'PF',
  CLASSE_DOC_ORDINE: 'OR',
  TIPO_DOC_ECOMMERCE: 'ORDCE',
  VENDITE: 'V',
  PAGAMENTO_RD: 'RD',
  MASTRO_CLIENTI: '01030201',
  CATCON_CLIENTI_ECOMMERCE: 'CLIBE',
} as const;
