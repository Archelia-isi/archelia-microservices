import { FastifyInstance } from 'fastify';
import { prisma } from '@archelia/database';

export default async function customersRoutes(app: FastifyInstance) {
  // GET /api/v1/customers
  // Ritorna i clienti con paginazione e ricerca
  app.get<{
    Querystring: { search?: string; page?: string; limit?: string };
  }>('/', async (request, reply) => {
    const { search, page = '1', limit = '20' } = request.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
        { zucchettiCode: { contains: search, mode: 'insensitive' } },
        { shopifyCustomerId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customerMapping.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
      }),
      prisma.customerMapping.count({ where }),
    ]);

    return {
      success: true,
      data: customers.map(c => ({
        shopifyId: c.shopifyCustomerId,
        zucchettiArcId: c.zucchettiCode,
        email: c.email,
        firstName: c.fullName?.split(' ')[0] || '',
        lastName: c.fullName?.split(' ').slice(1).join(' ') || '',
        phone: null,
        updatedAt: c.updatedAt
      })),
      meta: {
        total,
        page: parseInt(page),
        limit: take,
        totalPages: Math.ceil(total / take)
      }
    };
  });

  // GET /api/v1/customers/:id/details
  // Ritorna i dettagli 360° (Ordini, Carrello, Email)
  app.get<{
    Params: { id: string };
  }>('/:id/details', async (request, reply) => {
    const { id } = request.params;
    
    // Il cliente nel DB v2-development
    const customer = await prisma.customerMapping.findUnique({
      where: { shopifyCustomerId: id }
    });

    if (!customer) {
      return reply.status(404).send({ success: false, error: 'Customer not found' });
    }

    // Ricerca ordini
    const orders = await prisma.orderQueue.findMany({
      where: {
        payload: {
          path: ['customer', 'id'],
          equals: parseInt(customer.shopifyCustomerId)
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Cerca eventuali carrelli abbandonati in CartSyncQueue
    const cart = await prisma.cartSyncQueue.findUnique({
      where: { customerId: customer.shopifyCustomerId }
    });

    return {
      success: true,
      data: {
        customer: {
          shopifyId: customer.shopifyCustomerId,
          zucchettiArcId: customer.zucchettiCode,
          email: customer.email,
          firstName: customer.fullName?.split(' ')[0] || '',
          lastName: customer.fullName?.split(' ').slice(1).join(' ') || '',
          phone: null,
          updatedAt: customer.updatedAt
        },
        recentOrders: orders.map(o => ({
          id: o.id,
          shopifyOrderName: o.shopifyOrderName,
          status: o.status,
          totalPrice: o.totalPrice,
          createdAt: o.createdAt,
          lastError: o.lastError
        })),
        abandonedCart: cart ? {
          status: cart.status,
          updatedAt: cart.updatedAt,
          payload: cart.cartPayload
        } : null
      }
    };
  });

  // POST /api/v1/customers
  // Crea o aggiorna un mapping localmente
  app.post<{
    Body: { shopifyCustomerId: string; zucchettiCode: string; email?: string; fullName?: string };
  }>('/', async (request, reply) => {
    const { shopifyCustomerId, zucchettiCode, email, fullName } = request.body;

    if (!shopifyCustomerId || !zucchettiCode) {
      return reply.status(400).send({ success: false, error: 'Missing required fields' });
    }

    const customer = await prisma.customerMapping.upsert({
      where: { shopifyCustomerId },
      update: {
        zucchettiCode,
        email: email || null,
        fullName: fullName || null,
      },
      create: {
        shopifyCustomerId,
        zucchettiCode,
        email: email || null,
        fullName: fullName || null,
      }
    });

    return { success: true, data: customer };
  });

  // PUT /api/v1/customers/:id
  // Aggiorna un mapping esistente
  app.put<{
    Params: { id: string };
    Body: { zucchettiCode?: string; email?: string; fullName?: string };
  }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const { zucchettiCode, email, fullName } = request.body;

    const data: any = {};
    if (zucchettiCode !== undefined) data.zucchettiCode = zucchettiCode;
    if (email !== undefined) data.email = email;
    if (fullName !== undefined) data.fullName = fullName;

    const customer = await prisma.customerMapping.update({
      where: { id },
      data
    });

    return { success: true, data: customer };
  });
}
