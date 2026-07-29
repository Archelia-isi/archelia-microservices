import * as Lucide from 'lucide-react';
import * as Fc from 'react-icons/fc';

const arr = Object.keys(Lucide)
  .filter(key => key[0] === key[0].toUpperCase())
  .map(key => ({
    id: key,
    icon: Lucide[key]
  }))
  .filter(item => typeof item.icon === 'function' || (typeof item.icon === 'object' && item.icon !== null && item.icon.$$typeof));
console.log("Lucide filtered length:", arr.length);

const arrFc = Object.keys(Fc)
  .filter(key => key.startsWith('Fc'))
  .map(key => ({
    id: key,
    icon: Fc[key]
  }))
  .filter(item => typeof item.icon === 'function' || (typeof item.icon === 'object' && item.icon !== null && item.icon.$$typeof));
console.log("Fc filtered length:", arrFc.length);
