import { useState, useEffect } from 'react';
import DesktopLayout from './components/layout/DesktopLayout';
import MobileLayout from './components/layout/MobileLayout';

function App() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Smistamento logico assoluto: se è mobile carica il layout con Bottom Navigation
  // Se è desktop carica la Sidebar con i Pop-ups.
  return isMobile ? <MobileLayout /> : <DesktopLayout />;
}

export default App;
