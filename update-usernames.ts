import { PrismaClient } from '@archelia/b2b-database';
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.b2BUser.findMany();
  for(let i=0; i<users.length; i++){
    const u = users[i];
    if(!u.username) {
       await prisma.b2BUser.update({
          where: { id: u.id },
          data: { username: (u.email ? u.email.split('@')[0] : 'user') + '_' + i }
       });
    }
  }
  console.log("Updated", users.length, "users.");
}
main();
