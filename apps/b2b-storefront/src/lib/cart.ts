import { redis } from './redis';
import { verifySession } from './session';

export interface CartItem {
  sku: string;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
}

const getCartKey = (userId: string) => `b2b_cart:${userId}`;

export async function getCart(): Promise<Cart> {
  const session = await verifySession();
  if (!session) return { items: [] };

  const key = getCartKey(session.userId);
  const data = await redis.get(key);
  
  if (!data) return { items: [] };
  try {
    return JSON.parse(data);
  } catch {
    return { items: [] };
  }
}

export async function saveCart(cart: Cart): Promise<void> {
  const session = await verifySession();
  if (!session) throw new Error('Not authenticated');

  const key = getCartKey(session.userId);
  // Scade dopo 30 giorni di inattività
  await redis.set(key, JSON.stringify(cart), 'EX', 60 * 60 * 24 * 30);
}

export async function clearCart(): Promise<void> {
  const session = await verifySession();
  if (!session) return;
  const key = getCartKey(session.userId);
  await redis.del(key);
}
