import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/components/CartBadge.tsx', 'utf8');

const oldHandle = `    const handleCartUpdate = (event: any) => {
      if (event.detail && typeof event.detail.count === 'number') {
        setCount(event.detail.count);
      } else {
        // Fallback or optimistic increment
        setCount((prev) => prev + 1);
      }
    };`;

const newHandle = `    const handleCartUpdate = (event: any) => {
      if (event.detail && typeof event.detail.count === 'number') {
        if (event.detail.cartType === 'ELMARK') {
          setElCountState(event.detail.count);
        } else {
          setStandardCount(event.detail.count);
        }
      } else if (typeof event.detail === 'number') {
        setStandardCount(event.detail);
      }
    };`;

content = content.replace(oldHandle, newHandle);

fs.writeFileSync('apps/b2b-storefront/src/components/CartBadge.tsx', content);
