import { PrismaClient } from '@prisma/client-b2b';
const prisma = new PrismaClient();
async function main() {
  const c = await prisma.b2BUser.count();
  console.log("USERS:", c);
  if(c>0) {
     const users = await prisma.b2BUser.findMany();
     for(let u of users) {
        await prisma.b2BUser.update({
           where: { id: u.id },
           data: { username: u.email.split('@')[0] + Math.floor(Math.random()*1000) }
        }).catch(e => console.log(e));
     }
  }
}
main();
