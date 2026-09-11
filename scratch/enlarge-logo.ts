import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/app/layout.tsx', 'utf8');

const oldLogo = `                <Image 
                  src="/logo-izzo.png" 
                  alt="Izzo Distribuzione" 
                  width={180} 
                  height={60} 
                  className="object-contain h-14 md:h-16 w-auto"
                  priority
                />`;

const newLogo = `                <Image 
                  src="/logo-izzo.png" 
                  alt="Izzo Distribuzione" 
                  width={240} 
                  height={80} 
                  className="object-contain h-[64px] md:h-[80px] w-auto scale-110 md:scale-125 origin-left"
                  priority
                />`;

content = content.replace(oldLogo, newLogo);
fs.writeFileSync('apps/b2b-storefront/src/app/layout.tsx', content);
