import type {
  AgentDiscountRule,
  DiscountCalculationMode,
  DiscountClientScope,
  DiscountExpiryType,
  DiscountTargetClientMeta,
  DiscountTargetProductMeta,
  DiscountTargetType,
} from './discountRulesEngine';

const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? 'https://api-gateway-production-2ec6.up.railway.app'
    : 'http://localhost:3000');

function authHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  };
}

export interface CommercialCategoryOption {
  code: string;
  label: string;
  discount: number;
}

export interface AgentManagedClient {
  id: string;
  hasB2BAccount: boolean;
  zucchettiCode: string;
  companyName: string;
  vatNumber: string;
  codiceFiscale: string;
  formaGiuridica: string;
  firstName: string;
  lastName: string;
  address: string;
  zip: string;
  city: string;
  province: string;
  phone: string;
  telefonoFisso: string;
  email: string;
  pec: string;
  codiceDestinatario: string;
  username: string;
  tempPassword: string;
  mustChangePassword: boolean;
  customerType: string;
  categoriaCode: string;
  discount: number;
  fido: number;
  codicePagamento: string;
  isElmarkCustomer: boolean;
  elmarkDiscounts: Record<string, number>;
  isActive: boolean;
  ordersCount: number;
  createdAt: string;
  agentId?: string;
  agentCode?: string;
  agentName?: string;
}

export interface CatalogFacetOption {
  code: string;
  label: string;
  count: number;
}

export type WarehouseFilterMode = 'ALL_WAREHOUSES' | 'MAIN_2GG' | 'EXTERNAL_7GG';

export type CatalogSourceMode = 'ZUCCHETTI' | 'ELMARK' | 'ALL';

export type CatalogPriceMode = 'LIST_AND_NET' | 'NET_ONLY' | 'LIST_ONLY' | 'NO_PRICE';

export type CatalogStockMode = 'BADGE_ONLY' | 'HIDE_STOCK' | 'EXACT_QTY';

export type CatalogSortMode =
  | 'TAXONOMY_ASC'
  | 'INSERTION_ORDER'
  | 'STOCK_DESC'
  | 'SKU_ASC'
  | 'PRICE_ASC'
  | 'PRICE_DESC'
  | 'TITLE_ASC';

export interface CatalogSearchFilters {
  catalogSource: CatalogSourceMode;
  query: string;
  warehouse: WarehouseFilterMode;
  includeZeroStock?: boolean;
  brands: string[];
  productGroups: string[];
  families: string[];
  categories: string[];
  sortBy: CatalogSortMode;
  limit?: number;
}

export interface CatalogProductItem {
  id: string;
  sku: string;
  title: string;
  originalName: string;
  brand: string;
  brandLabel: string;
  productGroup: string;
  productGroupLabel: string;
  family: string;
  familyLabel: string;
  category: string;
  categoryLabel: string;
  technicalDesc: string;
  description: string;
  unit: string;
  listPrice: number;
  discgroup: string;
  stockMain: number;
  stockEk: number;
  stockTotal: number;
  imageUrl: string;
  catalogSource: 'zucchetti' | 'elmark';
}

export interface CatalogSearchResponse {
  success: boolean;
  error?: string;
  totalFound: number;
  products: CatalogProductItem[];
  facets: {
    brands: CatalogFacetOption[];
    productGroups: CatalogFacetOption[];
    families: CatalogFacetOption[];
    categories: CatalogFacetOption[];
  };
}

export interface SaveDiscountRuleInput {
  id?: string;
  name?: string;
  clientScope: DiscountClientScope;
  clients?: DiscountTargetClientMeta[];
  clientsMeta?: DiscountTargetClientMeta[];
  clientIds?: string[];
  clientCodes?: string[];
  clientId?: string | null;
  clientCode?: string | null;
  clientName?: string | null;
  clientCategories?: string[];
  targetType: DiscountTargetType;
  targetSkus?: string[];
  targetProductsMeta?: DiscountTargetProductMeta[];
  targetBrands?: string[];
  targetProductGroups?: string[];
  targetFamilies?: string[];
  targetCategories?: string[];
  calculationMode: DiscountCalculationMode;
  discountValue: number;
  isActive?: boolean;
  expiryType?: DiscountExpiryType;
  expiresAt?: string | null;
}

export async function getAgentDiscountManagementInitData(): Promise<{
  success: boolean;
  error?: string;
  agentName: string;
  agentCode: string;
  clients: AgentManagedClient[];
  clientCategories: CommercialCategoryOption[];
  facets: {
    brands: CatalogFacetOption[];
    productGroups: CatalogFacetOption[];
    families: CatalogFacetOption[];
    categories: CatalogFacetOption[];
  };
  rules: AgentDiscountRule[];
}> {
  const res = await fetch(`${API_URL}/api/admin/b2b-discounts/init`, {
    headers: authHeaders(),
  });
  return res.json();
}

export async function saveAgentDiscountRuleAction(
  input: SaveDiscountRuleInput
): Promise<{
  success: boolean;
  error?: string;
  rule?: AgentDiscountRule;
  rules?: AgentDiscountRule[];
}> {
  const res = await fetch(`${API_URL}/api/admin/b2b-discounts/save`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  return res.json();
}

export async function toggleAgentDiscountRuleAction(
  ruleId: string,
  isActive: boolean
): Promise<{
  success: boolean;
  error?: string;
  rules?: AgentDiscountRule[];
}> {
  const res = await fetch(`${API_URL}/api/admin/b2b-discounts/toggle`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ ruleId, isActive }),
  });
  return res.json();
}

export async function deleteAgentDiscountRuleAction(
  ruleId: string
): Promise<{
  success: boolean;
  error?: string;
  rules?: AgentDiscountRule[];
}> {
  const res = await fetch(`${API_URL}/api/admin/b2b-discounts/delete`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ ruleId }),
  });
  return res.json();
}

export async function removeDiscountFromClientAction(
  ruleId: string,
  clientId: string,
  clientCode?: string
): Promise<{
  success: boolean;
  error?: string;
  rules?: AgentDiscountRule[];
}> {
  const res = await fetch(`${API_URL}/api/admin/b2b-discounts/remove-from-client`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ ruleId, clientId, clientCode }),
  });
  return res.json();
}

export async function getAgentCatalogInitData(): Promise<{
  success: boolean;
  error?: string;
  agentName: string;
  agentCode: string;
  clients: AgentManagedClient[];
  discountRules: AgentDiscountRule[];
  initialSearch: CatalogSearchResponse;
}> {
  const res = await fetch(`${API_URL}/api/admin/b2b-catalog/init`, {
    headers: authHeaders(),
  });
  return res.json();
}

export async function searchAgentCatalogProducts(
  filters: CatalogSearchFilters
): Promise<CatalogSearchResponse> {
  const res = await fetch(`${API_URL}/api/admin/b2b-catalog/search`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(filters),
  });
  return res.json();
}

export async function searchCatalogPredictiveAction(
  query: string,
  warehouse: WarehouseFilterMode = 'ALL_WAREHOUSES',
  includeZeroStock = false
): Promise<{ success: boolean; totalFound: number; products: CatalogProductItem[] }> {
  const res = await fetch(`${API_URL}/api/admin/b2b-catalog/predictive`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ query, warehouse, includeZeroStock }),
  });
  return res.json();
}

export async function generateAgentCatalogPdfAction(
  input: any
): Promise<{
  success: boolean;
  error?: string;
  fileName?: string;
  pdfFileName?: string;
  pdfBase64?: string;
}> {
  const res = await fetch(`${API_URL}/api/admin/b2b-catalog/generate-pdf`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  return res.json();
}
