import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/app/layout.tsx', 'utf8');

// 1. Import StoreSwitcher
content = content.replace(
  "import ClientElmarkLogo from '@/components/ClientElmarkLogo';",
  "import StoreSwitcher from '@/components/StoreSwitcher';"
);

// 2. Read cookie
content = content.replace(
  'const cookieStore = cookies();',
  "const cookieStore = cookies();\n  const storeMode = (cookieStore.get('b2b_store_mode')?.value as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI';"
);

// 3. Add class to body
content = content.replace(
  '<body className={`${assistant.className} bg-gray-50 text-gray-900 min-h-screen flex flex-col overflow-x-hidden`}>',
  '<body className={`${assistant.className} bg-gray-50 text-gray-900 min-h-screen flex flex-col overflow-x-hidden ${storeMode === \'ELMARK\' ? \'theme-elmark\' : \'\'}`}>'
);

// 4. Update Header Logo
content = content.replace(
  '<Image \n                  src="/logo-izzo.png" \n                  alt="Izzo Distribuzione" \n                  width={240} \n                  height={80} \n                  className="object-contain h-[64px] md:h-[80px] w-auto scale-110 md:scale-125 origin-left"\n                  priority\n                />',
  `{storeMode === 'ELMARK' ? (
                <Image 
                  src="/logo-elmark.png" 
                  alt="Elmark" 
                  width={200} 
                  height={60} 
                  className="object-contain h-[50px] md:h-[64px] w-auto origin-left"
                  priority
                />
              ) : (
                <Image 
                  src="/logo-izzo.png" 
                  alt="Izzo Distribuzione" 
                  width={240} 
                  height={80} 
                  className="object-contain h-[64px] md:h-[80px] w-auto scale-110 md:scale-125 origin-left"
                  priority
                />
              )}`
);

// 5. Replace border-green-600 with border-brand-border
content = content.replace(
  'border-green-600 relative',
  'border-brand-border relative'
);

// 6. Remove <ClientElmarkLogo /> from the end of the header and the old hardcoded Catalogo Elmark link
content = content.replace(/<ClientElmarkLogo \/>/g, '');
content = content.replace(
  /\{session\?\.user\?\.isElmarkCustomer && \(\s+<Link prefetch=\{true\} href="\/elmark" className="text-blue-400 hover:text-blue-300 transition-colors font-bold">\s+Catalogo Elmark\s+<\/Link>\s+\)\}/g,
  ''
);

// 7. Add StoreSwitcher to Nav
content = content.replace(
  '<nav className="flex space-x-3 md:space-x-6 items-center font-medium shrink-0 overflow-x-auto">',
  '<nav className="flex space-x-3 md:space-x-6 items-center font-medium shrink-0 overflow-x-auto">\n              {session?.user?.isElmarkCustomer && <StoreSwitcher currentMode={storeMode} />}'
);

fs.writeFileSync('apps/b2b-storefront/src/app/layout.tsx', content);
