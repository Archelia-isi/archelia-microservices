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
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { zucchettiArcId: { contains: search, mode: 'insensitive' } },
        { shopifyId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.zelShopifyCustomer.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
      }),
      prisma.zelShopifyCustomer.count({ where }),
    ]);

    return {
      success: true,
      data: customers.map(c => ({
        shopifyId: c.shopifyId,
        zucchettiArcId: c.zucchettiArcId,
        email: c.email,
        firstName: c.firstName || '',
        lastName: c.lastName || '',
        phone: c.phone,
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
    const customer = await prisma.zelShopifyCustomer.findUnique({
      where: { shopifyId: id }
    });

    if (!customer) {
      return reply.status(404).send({ success: false, error: 'Customer not found' });
    }

    // Ricerca TUTTI gli ordini (senza limite)
    const orders = await prisma.orderQueue.findMany({
      where: {
        payload: {
          path: ['customer', 'id'],
          equals: parseInt(customer.shopifyId)
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Cerca eventuali carrelli abbandonati in CartSyncQueue
    const cart = await prisma.cartSyncQueue.findUnique({
      where: { customerId: customer.shopifyId }
    });

    // Cerca le notifiche marketing se ha un'email
    let emailNotifications: any[] = [];
    let pushNotifications: any[] = [];
    
    if (customer.email) {
      emailNotifications = await prisma.marketingJob.findMany({
        where: {
          event: {
            customerEmail: customer.email
          }
        },
        include: {
          template: true
        },
        orderBy: { scheduledFor: 'desc' }
      });

      // Trova i device id dalla tracking session
      const sessions = await prisma.trackingSession.findMany({
        where: { customerEmail: customer.email },
        select: { deviceId: true }
      });
      const deviceIds = sessions.map(s => s.deviceId);

      if (deviceIds.length > 0) {
        pushNotifications = await prisma.pushJob.findMany({
          where: {
            deviceId: { in: deviceIds }
          },
          orderBy: { scheduledFor: 'desc' }
        });
      }
    }

    return {
      success: true,
      data: {
        customer: {
          shopifyId: customer.shopifyId,
          zucchettiArcId: customer.zucchettiArcId,
          email: customer.email,
          firstName: customer.firstName || '',
          lastName: customer.lastName || '',
          phone: customer.phone,
          billingAddress: customer.billingAddress,
          addresses: customer.addresses,
          fiscalData: customer.fiscalData,
          updatedAt: customer.updatedAt
        },
        orders: orders.map(o => ({
          id: o.id,
          shopifyOrderName: o.shopifyOrderName,
          status: o.status,
          totalPrice: o.totalPrice,
          createdAt: o.createdAt,
          payload: o.payload,
          lastError: o.lastError
        })),
        abandonedCart: cart ? {
          status: cart.status,
          updatedAt: cart.updatedAt,
          payload: cart.cartPayload
        } : null,
        notifications: [
          ...emailNotifications.map(n => ({
            id: n.id,
            type: 'EMAIL',
            jobType: n.jobType,
            status: n.status,
            scheduledFor: n.scheduledFor,
            templateName: n.template?.name,
            templateSubject: n.template?.subject,
            htmlContent: n.template?.htmlContent,
          })),
          ...pushNotifications.map(p => ({
            id: p.id,
            type: 'PUSH',
            jobType: p.jobType,
            status: p.status,
            scheduledFor: p.scheduledFor,
            payload: p.payload
          }))
        ].sort((a, b) => new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime())
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
