'use server';

import { prisma } from '@archelia/b2b-database';
import { getProductById } from '@archelia/typesense/dist/search.js';
import { getAvailableStock } from '@/lib/stock';
import {
  parseSavedOrderStockMeta,
  serializeSavedOrderNotes,
  SavedOrderStockMeta
} from '@/lib/savedOrdersStock';

export async function syncSavedOrdersStockForUser(userId: string) {
  if (!userId) {
    return {
      orders: [],
      hasAnyAdjustments: false,
      adjustedOrdersCount: 0,
      adjustedByMode: { ZUCCHETTI: 0, ELMARK: 0 }
    };
  }

  try {
    const savedOrders = await prisma.b2BOrder.findMany({
      where: {
        userId,
        status: 'DRAFT',
        createdById: userId
      },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          orderBy: { id: 'asc' }
        }
      }
    });

    let adjustedOrdersCount = 0;
    const adjustedByMode: { ZUCCHETTI: number; ELMARK: number } = {
      ZUCCHETTI: 0,
      ELMARK: 0
    };

    const updatedOrders = [];

    for (const order of savedOrders) {
      const storeMode = (order.storeMode === 'ELMARK' ? 'ELMARK' : 'ZUCCHETTI') as 'ZUCCHETTI' | 'ELMARK';
      const { cleanNotes, meta } = parseSavedOrderStockMeta(order.notes);

      const nextMeta: SavedOrderStockMeta = {
        origQty: {},
        adjusted: {}
      };

      let dbNeedsUpdate = false;
      const itemUpdates: { id: string; quantity: number }[] = [];

      for (const item of order.items) {
        const skuKey = item.sku.toUpperCase();
        const prevOrig = meta.origQty[skuKey];
        const originalQty = typeof prevOrig === 'number' && prevOrig > 0 ? prevOrig : Math.max(1, item.quantity);
        nextMeta.origQty[skuKey] = originalQty;

        const product = (await getProductById(item.sku)) as any;
        const availableStock = product ? getAvailableStock(product, storeMode) : 0;

        let targetQty = originalQty;
        if (availableStock < originalQty) {
          targetQty = Math.max(0, availableStock);
          nextMeta.adjusted[skuKey] = {
            sku: item.sku,
            originalQty,
            currentQty: targetQty,
            availableStock
          };
        }

        if (item.quantity !== targetQty) {
          dbNeedsUpdate = true;
          itemUpdates.push({ id: item.id, quantity: targetQty });
          item.quantity = targetQty;
        }
      }

      const serializedNotes = serializeSavedOrderNotes(
        cleanNotes || (storeMode === 'ELMARK' ? 'ORDINE ELMARK - Salvato dal cliente' : 'Ordine salvato dal cliente'),
        nextMeta
      );

      if (serializedNotes !== order.notes) {
        dbNeedsUpdate = true;
      }

      if (dbNeedsUpdate) {
        for (const upd of itemUpdates) {
          await prisma.b2BOrderItem.update({
            where: { id: upd.id },
            data: { quantity: upd.quantity }
          });
        }

        const totalAmount = order.items.reduce(
          (acc, i) => acc + i.finalPrice * i.quantity,
          0
        );
        const totalIva = totalAmount * 0.22;

        await prisma.b2BOrder.update({
          where: { id: order.id },
          data: {
            totalAmount,
            totalIva,
            notes: serializedNotes
          }
        });

        order.totalAmount = totalAmount;
        order.totalIva = totalIva;
        order.notes = serializedNotes;
      }

      const hasAdjustments = Object.keys(nextMeta.adjusted).length > 0;
      if (hasAdjustments) {
        adjustedOrdersCount++;
        adjustedByMode[storeMode]++;
      }

      updatedOrders.push(order);
    }

    return {
      orders: updatedOrders,
      hasAnyAdjustments: adjustedOrdersCount > 0,
      adjustedOrdersCount,
      adjustedByMode
    };
  } catch (error) {
    console.error('syncSavedOrdersStockForUser error:', error);
    return {
      orders: [],
      hasAnyAdjustments: false,
      adjustedOrdersCount: 0,
      adjustedByMode: { ZUCCHETTI: 0, ELMARK: 0 }
    };
  }
}

export async function syncSavedOrdersStockForAgent(agentId: string) {
  if (!agentId) {
    return {
      orders: [],
      hasAnyAdjustments: false,
      adjustedOrdersCount: 0,
      adjustedByMode: { ZUCCHETTI: 0, ELMARK: 0 }
    };
  }

  try {
    const rawDrafts = await prisma.b2BOrder.findMany({
      where: {
        status: 'DRAFT',
        user: {
          agentId
        }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
        items: {
          orderBy: { id: 'asc' }
        }
      }
    });

    // Solo gli ordini salvati dal cliente (createdById === userId o non impostato)
    const savedOrders = rawDrafts.filter(
      (o) => !o.createdById || o.createdById === o.userId
    );

    let adjustedOrdersCount = 0;
    const adjustedByMode: { ZUCCHETTI: number; ELMARK: number } = {
      ZUCCHETTI: 0,
      ELMARK: 0
    };

    const updatedOrders = [];

    for (const order of savedOrders) {
      const storeMode = (order.storeMode === 'ELMARK' ? 'ELMARK' : 'ZUCCHETTI') as 'ZUCCHETTI' | 'ELMARK';
      const { cleanNotes, meta } = parseSavedOrderStockMeta(order.notes);

      const nextMeta: SavedOrderStockMeta = {
        origQty: {},
        adjusted: {}
      };

      let dbNeedsUpdate = false;
      const itemUpdates: { id: string; quantity: number }[] = [];

      for (const item of order.items) {
        const skuKey = item.sku.toUpperCase();
        const prevOrig = meta.origQty[skuKey];
        const originalQty = typeof prevOrig === 'number' && prevOrig > 0 ? prevOrig : Math.max(1, item.quantity);
        nextMeta.origQty[skuKey] = originalQty;

        const product = (await getProductById(item.sku)) as any;
        const availableStock = product ? getAvailableStock(product, storeMode) : 0;

        let targetQty = originalQty;
        if (availableStock < originalQty) {
          targetQty = Math.max(0, availableStock);
          nextMeta.adjusted[skuKey] = {
            sku: item.sku,
            originalQty,
            currentQty: targetQty,
            availableStock
          };
        }

        if (item.quantity !== targetQty) {
          dbNeedsUpdate = true;
          itemUpdates.push({ id: item.id, quantity: targetQty });
          item.quantity = targetQty;
        }
      }

      const serializedNotes = serializeSavedOrderNotes(
        cleanNotes || (storeMode === 'ELMARK' ? 'ORDINE ELMARK - Salvato dal cliente' : 'Ordine salvato dal cliente'),
        nextMeta
      );

      if (serializedNotes !== order.notes) {
        dbNeedsUpdate = true;
      }

      if (dbNeedsUpdate) {
        for (const upd of itemUpdates) {
          await prisma.b2BOrderItem.update({
            where: { id: upd.id },
            data: { quantity: upd.quantity }
          });
        }

        const totalAmount = order.items.reduce(
          (acc, i) => acc + i.finalPrice * i.quantity,
          0
        );
        const totalIva = totalAmount * 0.22;

        await prisma.b2BOrder.update({
          where: { id: order.id },
          data: {
            totalAmount,
            totalIva,
            notes: serializedNotes
          }
        });

        order.totalAmount = totalAmount;
        order.totalIva = totalIva;
        order.notes = serializedNotes;
      }

      const hasAdjustments = Object.keys(nextMeta.adjusted).length > 0;
      if (hasAdjustments) {
        adjustedOrdersCount++;
        adjustedByMode[storeMode]++;
      }

      updatedOrders.push(order);
    }

    return {
      orders: updatedOrders,
      hasAnyAdjustments: adjustedOrdersCount > 0,
      adjustedOrdersCount,
      adjustedByMode
    };
  } catch (error) {
    console.error('syncSavedOrdersStockForAgent error:', error);
    return {
      orders: [],
      hasAnyAdjustments: false,
      adjustedOrdersCount: 0,
      adjustedByMode: { ZUCCHETTI: 0, ELMARK: 0 }
    };
  }
}

