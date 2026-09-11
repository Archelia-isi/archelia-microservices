'use client';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

export default function ClientElmarkLogo() {
  const pathname = usePathname();
  
  if (pathname !== '/elmark') return null;
  
  return (
    <div className="hidden md:flex items-center ml-4">
      <Image 
        src="/logo-elmark.png" 
        alt="Elmark" 
        width={150} 
        height={42} 
        className="object-contain h-10 w-auto"
      />
    </div>
  );
}
