import { PrismaClient } from '@prisma/client';

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const prodUrl = "postgresql://neondb_owner:npg_QnzJT1yAcP3K@ep-mute-dew-ag6lwn81.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const devUrl = "postgresql://neondb_owner:npg_QnzJT1yAcP3K@ep-still-surf-ag5oqx54.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const poolProd = new Pool({ connectionString: prodUrl });
const adapterProd = new PrismaPg(poolProd);
const prismaProd = new PrismaClient({ adapter: adapterProd });

const poolDev = new Pool({ connectionString: devUrl });
const adapterDev = new PrismaPg(poolDev);
const prismaDev = new PrismaClient({ adapter: adapterDev });

async function main() {
  console.log('Leggo ordini dalla produzione...');
  const prodOrders = await prismaProd.zelShopifyOrder.findMany({
    include: { zucchettiQueue: true }
  });
  console.log(`Trovati ${prodOrders.length} ordini in produzione.`);

  console.log('Copio ordini in v2-development...');
  let copied = 0;
  for (const order of prodOrders) {
    try {
      await prismaDev.zelShopifyOrder.upsert({
        where: { shopifyOrderId: order.shopifyOrderId },
        update: {
          orderNumber: order.orderNumber,
          totalPrice: order.totalPrice,
          shopifyCustomerId: order.shopifyCustomerId,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt
        },
        create: {
          id: order.id,
          shopifyOrderId: order.shopifyOrderId,
          orderNumber: order.orderNumber,
          totalPrice: order.totalPrice,
          shopifyCustomerId: order.shopifyCustomerId,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt
        }
      });

      if (order.zucchettiQueue) {
        await prismaDev.zelZucchettiOrderQueue.upsert({
          where: { shopifyOrderId: order.shopifyOrderId },
          update: {
            payload: order.zucchettiQueue.payload as any,
            totalPrice: order.zucchettiQueue.totalPrice,
            status: order.zucchettiQueue.status,
            attempts: order.zucchettiQueue.attempts,
            lastError: order.zucchettiQueue.lastError,
            createdAt: order.zucchettiQueue.createdAt,
            updatedAt: order.zucchettiQueue.updatedAt
          },
          create: {
            id: order.zucchettiQueue.id,
            shopifyOrderId: order.shopifyOrderId,
            payload: order.zucchettiQueue.payload as any,
            totalPrice: order.zucchettiQueue.totalPrice,
            status: order.zucchettiQueue.status,
            attempts: order.zucchettiQueue.attempts,
            lastError: order.zucchettiQueue.lastError,
            createdAt: order.zucchettiQueue.createdAt,
            updatedAt: order.zucchettiQueue.updatedAt
          }
        });
      }
      copied++;
    } catch (e: any) {
      console.error(`Errore copia ordine ${order.shopifyOrderId}:`, e.message);
    }
  }

  console.log(`Copiati con successo ${copied} ordini.`);
}

main().catch(console.error).finally(async () => {
  await prismaProd.$disconnect();
  await prismaDev.$disconnect();
});
