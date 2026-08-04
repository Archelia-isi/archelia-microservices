import { prisma } from './index';

async function main() {
  const users = await prisma.adminUser.findMany();
  console.log("Current users:");
  users.forEach(u => console.log(`ID: ${u.id}, Username: ${u.username}, Role: ${u.role}`));
  
  // Find Salvatore
  const salvatore = users.find(u => u.username.toLowerCase() === 'salvatore' || u.username.toLowerCase().includes('salvatore'));
  if (salvatore) {
    console.log(`Found Salvatore: ${salvatore.username}`);
    // Promote Salvatore to Root Master
    await prisma.adminUser.update({
      where: { id: salvatore.id },
      data: {
        role: 'MASTER',
        isRoot: true,
        permissions: { allowedStores: ["RETAIL", "B2B"] }
      }
    });
    console.log("Promoted Salvatore to ROOT MASTER");
    
    // Delete all others
    const others = users.filter(u => u.id !== salvatore.id);
    for (const other of others) {
      await prisma.adminUser.delete({ where: { id: other.id } });
      console.log(`Deleted user: ${other.username}`);
    }
  } else {
    console.log("Salvatore not found! Please check usernames.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
