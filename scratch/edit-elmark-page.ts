import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/app/elmark/page.tsx', 'utf8');

// Imports
content = content.replace(
  /import \{ redirect \} from 'next\/navigation';/,
  "import { redirect } from 'next/navigation';\nimport { prisma } from '@archelia/b2b-database';"
);

// Function name
content = content.replace(/export default async function CatalogPage/, "export default async function ElmarkCatalogPage");

// Auth and DB logic
content = content.replace(
  /const isAuthenticated = !!session;/,
  `const isAuthenticated = !!session;
  
  if (!isAuthenticated) redirect('/login');
  
  const user = await prisma.b2BUser.findUnique({
    where: { id: session.userId },
    select: { isElmarkCustomer: true, elmarkDiscounts: true }
  });
  
  if (!user?.isElmarkCustomer) {
    redirect('/'); // Non autorizzato
  }
  
  const elmarkDiscounts: any = user.elmarkDiscounts || {};
`
);

// Search
content = content.replace(
  /const results = await searchProducts\(query, \{/,
  "const results = await searchProducts(query, {\n    catalogSource: 'elmark',"
);

// Discount logic
content = content.replace(
  /const \{ getEffectiveDiscount, getExtraAgentDiscount \} = await import\('@\/lib\/discount'\);\n  const genericDiscount = await getEffectiveDiscount\(\);\n  const extraDiscount = await getExtraAgentDiscount\(\);/,
  ""
);

// Product mapping
content = content.replace(
  /if \(isAuthenticated\) \{[\s\S]*?\}\n    \n    return product;/,
  `if (isAuthenticated) {
      // Prezzo base è sempre il prezzo di listino
      product.originalPriceB2b = Number(product.price || 0);
      
      // Calcola sconto basato su discgroup
      const discGroup = product.discgroup;
      const discountPct = (discGroup && elmarkDiscounts[discGroup]) ? Number(elmarkDiscounts[discGroup]) : 0;
      
      let finalPrice = product.originalPriceB2b;
      if (discountPct > 0) {
        finalPrice = finalPrice * (1 - (discountPct / 100));
      }
      
      // IMPORTANT: In Elmark, NO agent extra discount is applied.
      product.price_b2b = finalPrice;
    }
    
    return product;`
);

// Title
content = content.replace(
  /<h1 className="text-2xl font-bold text-gray-900">Catalogo Prodotti<\/h1>/,
  `<h1 className="text-2xl font-bold text-[#0066cc]">Catalogo Elmark</h1>`
);
content = content.replace(
  /<p className="text-sm text-gray-500 mt-1">\n              Ciao, <span className="font-semibold text-gray-700">\{session\.user\.firstName \|\| session\.user\.email\}<\/span>\. Usa i filtri per trovare ciò che cerchi\.\n            <\/p>/,
  `<p className="text-sm text-gray-500 mt-1">
              Benvenuto nell'area riservata Elmark. Sconti personalizzati attivi.
            </p>`
);

// Form
content = content.replace(
  /action="\/catalog"/,
  'action="/elmark"'
);
content = content.replace(
  /bg-\[\#00C800\] text-white font-bold uppercase tracking-wider rounded-md hover:bg-green-600/,
  "bg-[#0066cc] text-white font-bold uppercase tracking-wider rounded-md hover:bg-blue-700"
);
content = content.replace(
  /focus:ring-\[\#00C800\]/,
  "focus:ring-[#0066cc]"
);

// Client
content = content.replace(
  /<CatalogClient initialProducts=\{products\} query=\{query\} isAuthenticated=\{isAuthenticated\} \/>/,
  `<CatalogClient initialProducts={products} query={query} isAuthenticated={isAuthenticated} cartType="ELMARK" />`
);

fs.writeFileSync('apps/b2b-storefront/src/app/elmark/page.tsx', content);
