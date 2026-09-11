import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/components/AddToCartButton.tsx', 'utf8');
content = content.replace(/import { useTransition } from 'react';/, "import { useTransition, useState } from 'react';");
content = content.replace(/const \[isPending, startTransition\] = useTransition\(\);/, "const [isPending, startTransition] = useTransition();\n  const [isSuccess, setIsSuccess] = useState(false);");
content = content.replace(/alert\(\`Aggiunto al carrello\!\`\);/, "window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { count: res.cartItemCount } }));\n        setIsSuccess(true);\n        setTimeout(() => setIsSuccess(false), 2000);");
content = content.replace(/className={\`\${isPending \|\| disabled \? 'bg-gray-400 cursor-not-allowed opacity-80' : ''} \${finalClassName}\`}/, "className={`${isPending || disabled ? 'bg-gray-400 cursor-not-allowed opacity-80' : ''} ${isSuccess ? 'bg-green-600 text-white' : finalClassName}`}");
content = content.replace(/\{!className && <svg/, "{!className && !isSuccess && <svg");
content = content.replace(/\{text\}/, "{isSuccess ? 'Aggiunto ✓' : text}");
fs.writeFileSync('apps/b2b-storefront/src/components/AddToCartButton.tsx', content);

