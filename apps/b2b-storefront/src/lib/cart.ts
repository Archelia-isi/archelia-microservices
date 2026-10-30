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
  id: string;
  cartType: 'ZUCCHETTI' | 'ELMARK'; // cuid of the cart in Postgres
  userId: string;
  status: 'ACTIVE' | 'REVIEW';
  linkedOrderId: string | null;
  items: RedisCartItem[];
}

const getCartKey = (
  userId: string,
  status: 'ACTIVE' | 'REVIEW',
  linkedOrderId?: string,
  cartType: string = 'ZUCCHETTI'
) => {
  if (status === 'REVIEW' && linkedOrderId) {
    return `b2b_cart_v2:${userId}:REVIEW:${linkedOrderId}:${cartType}`;
  }
  return `b2b_cart_v2:${userId}:ACTIVE:${cartType}`;
};

function generateId() {
  return 'c' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

export async function getCart(
  userId: string,
  status: 'ACTIVE' | 'REVIEW' = 'ACTIVE',
  linkedOrderId?: string,
  cartType: 'ZUCCHETTI' | 'ELMARK' = 'ZUCCHETTI'
): Promise<RedisCart> {
  const key = getCartKey(userId, status, linkedOrderId, cartType);
  let data = null;
  try {
    data = await redis.get(key);
  } catch (error) {
    console.error('Redis GET failed, falling back to Prisma:', error);
  }

  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      // JSON parse failed, proceed to fallback
    }
  }

  // Fallback to Postgres (supports both active b2b_users and b2b_promo_prospects)
  let dbCart = await prisma.b2BCart.findFirst({
    where: {
      OR: [{ userId }, { promoProspectId: userId }],
      status,
      cartType,
      ...(status === 'REVIEW' && linkedOrderId ? { linkedOrderId } : {}),
    },
    include: { items: true },
  });

  if (!dbCart) {
    const existingActiveUser = await prisma.b2BUser.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    dbCart = await prisma.b2BCart.create({
      data: {
        userId: existingActiveUser ? userId : null,
        promoProspectId: existingActiveUser ? null : userId,
        status,
        cartType,
        linkedOrderId: status === 'REVIEW' ? linkedOrderId : null,
      },
      include: { items: true },
    });
  }

  const resolvedOwnerId = dbCart.userId || dbCart.promoProspectId || userId;

  const redisCart: RedisCart = {
    id: dbCart.id,
    cartType: (dbCart.cartType as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI',
    userId: resolvedOwnerId,
    status: dbCart.status as 'ACTIVE' | 'REVIEW',
    linkedOrderId: dbCart.linkedOrderId,
    items: dbCart.items.map(item => ({
      id: item.id,
      sku: item.sku,
      quantity: item.quantity,
      extraDiscount: item.extraDiscount,
      extraDiscountMinQty: item.extraDiscountMinQty,
    })),
  };

  try {
    await redis.set(key, JSON.stringify(redisCart), 'EX', 60 * 60 * 24 * 30);
  } catch (error) {
    console.error('Redis SET failed:', error);
  }

  return redisCart;
}

export async function saveCartToRedis(cart: RedisCart): Promise<void> {
  const key = getCartKey(
    cart.userId,
    cart.status,
    cart.linkedOrderId || undefined,
    cart.cartType || 'ZUCCHETTI'
  );
  try {
    await redis.set(key, JSON.stringify(cart), 'EX', 60 * 60 * 24 * 30);
  } catch (error) {
    console.error('Redis SET failed:', error);
  }

  syncCartToPostgres(cart).catch(err => {
    console.error('Failed to sync cart to Postgres:', err);
  });
}

export async function syncCartToPostgres(cart: RedisCart): Promise<void> {
  const operations = [];

  const existingItems = await prisma.b2BCartItem.findMany({
    where: { cartId: cart.id },
    select: { id: true, sku: true },
  });

  const redisItemSkus = new Set(cart.items.map(i => i.sku));
  const itemsToDelete = existingItems.filter(i => !redisItemSkus.has(i.sku));

  if (itemsToDelete.length > 0) {
    operations.push(
      prisma.b2BCartItem.deleteMany({
        where: { id: { in: itemsToDelete.map(i => i.id) } },
      })
    );
  }

  for (const item of cart.items) {
    operations.push(
      prisma.b2BCartItem.upsert({
        where: { cartId_sku: { cartId: cart.id, sku: item.sku } },
        update: {
          quantity: item.quantity,
          extraDiscount: item.extraDiscount,
          extraDiscountMinQty: item.extraDiscountMinQty,
        },
        create: {
          id: item.id,
          cartId: cart.id,
          sku: item.sku,
          quantity: item.quantity,
          extraDiscount: item.extraDiscount,
          extraDiscountMinQty: item.extraDiscountMinQty,
        },
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
