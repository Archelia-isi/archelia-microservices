import { prisma } from './packages/database/src/index.js';

async function run() {
  try {
    const endD = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    console.log("Querying db...");
    const trackingFilter = { startedAt: { gte: sevenDaysAgo, lte: endD } };
    const visits = await prisma.trackingSession.count({ where: trackingFilter });
    console.log("Visits:", visits);

    const orderFilter = { createdAt: { gte: sevenDaysAgo, lte: endD } };
    const [totalOrders, revenueAgg] = await Promise.all([
      prisma.zelZucchettiOrderQueue.count({ where: orderFilter }),
      prisma.zelZucchettiOrderQueue.aggregate({
        where: orderFilter,
        _sum: { totalPrice: true }
      })
    ]);
    console.log("Orders:", totalOrders, "Revenue:", revenueAgg._sum.totalPrice);

    const [trendVisits, trendOrders] = await Promise.all([
      prisma.trackingSession.findMany({
        where: { startedAt: { gte: sevenDaysAgo, lte: endD } },
        select: { startedAt: true }
      }),
      prisma.zelZucchettiOrderQueue.findMany({
        where: { createdAt: { gte: sevenDaysAgo, lte: endD } },
        select: { createdAt: true, totalPrice: true }
      })
    ]);
    
    console.log("trendVisits:", trendVisits.length, "trendOrders:", trendOrders.length);
    
    const abandonedCarts = await prisma.cartSyncQueue.count({ where: { status: 'PENDING' } });
    console.log("Abandoned carts:", abandonedCarts);

    console.log("Success");
  } catch(e) {
    console.error("ERROR:", e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
