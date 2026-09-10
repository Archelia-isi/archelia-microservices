import { redis } from './redis';
import { prisma } from '@archelia/b2b-database';

export interface RedisCartItem {
  id: string; // cuid
  sku: string;
  quantity: number;
  extraDiscount: number | null;
  extraDiscountMinQty: number | null;
}

export interface RedisCart {
  id: string; // cuid of the cart in Postgres
  userId: string;
  status: 'ACTIVE' | 'REVIEW';
  linkedOrderId: string | null;
  items: RedisCartItem[];
}

const getCartKey = (userId: string, status: 'ACTIVE' | 'REVIEW', linkedOrderId?: string) => {
  if (status === 'REVIEW' && linkedOrderId) {
    return `b2b_cart:${userId}:REVIEW:${linkedOrderId}`;
  }
  return `b2b_cart:${userId}:ACTIVE`;
};

// Generates a simple CUID-like ID for temporary assignment before Postgres sync
function generateId() {
  return 'c' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

export async function getCart(userId: string, status: 'ACTIVE' | 'REVIEW' = 'ACTIVE', linkedOrderId?: string): Promise<RedisCart> {
  const key = getCartKey(userId, status, linkedOrderId);
  const data = await redis.get(key);
  
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      // JSON parse failed, proceed to fallback
    }
  }

  // Fallback to Postgres
  let dbCart = await prisma.b2BCart.findFirst({
    where: { 
      userId, 
      status, 
      ...(status === 'REVIEW' && linkedOrderId ? { linkedOrderId } : {})
    },
    include: { items: true }
  });

  if (!dbCart) {
    dbCart = await prisma.b2BCart.create({
      data: {
        userId,
        status,
        linkedOrderId: status === 'REVIEW' ? linkedOrderId : null
      },
      include: { items: true }
    });
  }

  const redisCart: RedisCart = {
    id: dbCart.id,
    userId: dbCart.userId!,
    status: dbCart.status as 'ACTIVE' | 'REVIEW',
    linkedOrderId: dbCart.linkedOrderId,
    items: dbCart.items.map(item => ({
      id: item.id,
      sku: item.sku,
      quantity: item.quantity,
      extraDiscount: item.extraDiscount,
      extraDiscountMinQty: item.extraDiscountMinQty
    }))
  };

  // Save to Redis (TTL 30 days)
  await redis.set(key, JSON.stringify(redisCart), 'EX', 60 * 60 * 24 * 30);
  
  return redisCart;
}

export async function saveCartToRedis(cart: RedisCart): Promise<void> {
  const key = getCartKey(cart.userId, cart.status, cart.linkedOrderId || undefined);
  await redis.set(key, JSON.stringify(cart), 'EX', 60 * 60 * 24 * 30);
  
  // Trigger background sync
  syncCartToPostgres(cart).catch(err => {
    console.error('Failed to sync cart to Postgres:', err);
  });
}

export async function syncCartToPostgres(cart: RedisCart): Promise<void> {
  // Sync the cart items to Postgres
  // This operation is expected to run asynchronously without blocking the UI
  
  // Upsert all items
  const operations = [];
  
  // First, delete items in DB that are no longer in Redis
  const existingItems = await prisma.b2BCartItem.findMany({
    where: { cartId: cart.id },
    select: { id: true, sku: true }
  });
  
  const redisItemSkus = new Set(cart.items.map(i => i.sku));
  const itemsToDelete = existingItems.filter(i => !redisItemSkus.has(i.sku));
  
  if (itemsToDelete.length > 0) {
    operations.push(
      prisma.b2BCartItem.deleteMany({
        where: { id: { in: itemsToDelete.map(i => i.id) } }
      })
    );
  }

  // Upsert current items
  for (const item of cart.items) {
    operations.push(
      prisma.b2BCartItem.upsert({
        where: { cartId_sku: { cartId: cart.id, sku: item.sku } },
        update: {
          quantity: item.quantity,
          extraDiscount: item.extraDiscount,
          extraDiscountMinQty: item.extraDiscountMinQty
        },
        create: {
          id: item.id,
          cartId: cart.id,
          sku: item.sku,
          quantity: item.quantity,
          extraDiscount: item.extraDiscount,
          extraDiscountMinQty: item.extraDiscountMinQty
        }
      })
    );
  }
  
  if (operations.length > 0) {
    await prisma.$transaction(operations);
  }
}

export function generateItemId() {
  return generateId();
}
