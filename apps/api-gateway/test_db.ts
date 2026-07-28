import { prisma } from '@archelia/database';

async function test() {
  try {
    const visits = await prisma.trackingSession.count();
    console.log('TrackingSessions:', visits);
    
    const carts = await prisma.cartSyncQueue.count();
    console.log('CartSyncQueue:', carts);
    
    const orders = await prisma.zelZucchettiOrderQueue.count();
    console.log('Orders:', orders);
    
    console.log('Success!');
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await prisma.$disconnect();
  }
}
test();
