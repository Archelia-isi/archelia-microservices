import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '@archelia/database';
import { requireAdmin } from '../auth.js';

// Mappa nome tabella → modello Prisma e configurazione colonne
const TABLE_CONFIG: Record<string, {
  model: any;
  label: string;
  idField: string;
  searchFields: string[];
  include?: any;
}> = {
  products: {
    model: prisma.product,
    label: 'Prodotti',
    idField: 'id',
    searchFields: ['sku', 'title', 'originalName', 'brand', 'family', 'category'],
  },
  brands: {
    model: prisma.brand,
    label: 'Marche',
    idField: 'code',
    searchFields: ['code', 'name'],
  },
  product_categories: {
    model: prisma.productCategory,
    label: 'Categorie',
    idField: 'code',
    searchFields: ['code', 'name'],
  },
  families: {
    model: prisma.family,
    label: 'Famiglie',
    idField: 'code',
    searchFields: ['code', 'name'],
  },
  homogeneous_categories: {
    model: prisma.homogeneousCategory,
    label: 'Cat. Omogenee',
    idField: 'code',
    searchFields: ['code', 'name'],
  },
  sync_logs: {
    model: prisma.syncLog,
    label: 'Log Sync',
    idField: 'id',
    searchFields: ['type', 'status'],
  },
  product_mappings: {
    model: prisma.productMapping,
    label: 'Mapping Prodotti',
    idField: 'id',
    searchFields: ['shopifyProductId', 'zucchettiSku'],
  },
  customer_mappings: {
    model: prisma.customerMapping,
    label: 'Mapping Clienti',
    idField: 'id',
    searchFields: ['email', 'fullName', 'zucchettiCode'],
  },
  zel_shopify_customers: {
    model: prisma.zelShopifyCustomer,
    label: 'CRM Shopify (DB1)',
    idField: 'shopifyId',
    searchFields: ['email', 'firstName', 'lastName', 'phone', 'zucchettiArcId'],
    include: { zucchettiQueue: true },
  },
  zel_shopify_orders: {
    model: prisma.zelShopifyOrder,
    label: 'Ordini Shopify (DB1)',
    idField: 'shopifyOrderId',
    searchFields: ['shopifyOrderId', 'orderNumber', 'shopifyCustomerId'],
    include: { zucchettiQueue: true },
  },
  zel_zucchetti_queue: {
    model: prisma.zelZucchettiCustomerQueue,
    label: 'Coda Zucchetti ERP (DB2)',
    idField: 'arcId',
    searchFields: ['arcId', 'shopifyId', 'status', 'lastError'],
  },
  cart_sync_queue: {
    model: prisma.cartSyncQueue,
    label: 'Carrelli (Sync)',
    idField: 'id',
    searchFields: ['customerId', 'source', 'status'],
  }
};

export async function adminDatabaseRoutes(app: FastifyInstance) {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  // Lista di tutte le tabelle configurate
  fastify.get('/api/admin/tables', { 
    preHandler: [requireAdmin],
    schema: {
      response: { 200: z.array(z.any()) }
    }
  }, async () => {
    const counts = await Promise.all(
      Object.entries(TABLE_CONFIG).map(async ([key, config]) => ({
        key,
        label: config.label,
        count: await config.model.count(),
      }))
    );
    return counts;
  });

  // Lista record di una specifica tabella
  fastify.get('/api/admin/tables/:table', { 
    preHandler: [requireAdmin],
    schema: {
      params: z.object({ table: z.string() }),
      querystring: z.object({
        page: z.coerce.number().default(1),
        limit: z.coerce.number().default(25),
        search: z.string().optional(),
        sort: z.string().optional(),
        order: z.string().optional()
      }),
      response: {
        200: z.object({
          data: z.array(z.any()),
          pagination: z.object({
            page: z.number(),
            limit: z.number(),
            total: z.number(),
            totalPages: z.number()
          })
        }),
        404: z.object({ error: z.string() })
      }
    }
  }, async (request, reply) => {
    const { table } = request.params;
    const config = TABLE_CONFIG[table];
    if (!config) return reply.status(404).send({ error: `Tabella "${table}" non trovata` });

    const { page, limit, search, sort, order } = request.query;
    const sortField = sort || config.idField;
    const sortOrder = order === 'desc' ? 'desc' : 'asc';

    let where: any = undefined;
    if (search && config.searchFields.length > 0) {
      where = {
        OR: config.searchFields.map(field => ({
          [field]: { contains: search, mode: 'insensitive' },
        })),
      };
    }

    const [data, total] = await Promise.all([
      config.model.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortField]: sortOrder },
      }),
      config.model.count({ where }),
    ]);

    return reply.status(200).send({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  // Dettaglio record specifico
  fastify.get('/api/admin/tables/:table/:id', { 
    preHandler: [requireAdmin],
    schema: {
      params: z.object({ table: z.string(), id: z.string() }),
      response: {
        200: z.any(),
        404: z.object({ error: z.string() })
      }
    }
  }, async (request, reply) => {
    const { table, id } = request.params;
    const config = TABLE_CONFIG[table];
    if (!config) return reply.status(404).send({ error: `Tabella "${table}" non trovata` });

    const record = await config.model.findUnique({ 
      where: { [config.idField]: id },
      ...(config.include ? { include: config.include } : {})
    });
    
    if (!record) return reply.status(404).send({ error: 'Record non trovato' });
    
    return reply.status(200).send(record);
  });
}
