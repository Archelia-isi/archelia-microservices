import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { User, Lock, ArrowRight, Loader } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: () => void;
  wallpaper: string;
}

export default function LoginScreen({ onLoginSuccess, wallpaper }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Inserisci username e password');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        toast.success(`Benvenuto ${data.user.displayName || data.user.username}`);
        onLoginSuccess();
      } else {
        toast.error(data.error || 'Credenziali non valide');
      }
    } catch (err) {
      toast.error('Errore di connessione al server');
    } finally {
      setIsLoading(false);
    }
  };

  const formattedTime = time.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const formattedDate = time.toLocaleDateString('it-IT', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `url(${wallpaper})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      }}
    >
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.2)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)'
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ color: 'white', textAlign: 'center', textShadow: '0 2px 10px rgba(0,0,0,0.3)', marginBottom: '40px' }}>
          <div style={{ fontSize: '80px', fontWeight: 200, letterSpacing: '-2px', lineHeight: 1 }}>{formattedTime}</div>
          <div style={{ fontSize: '20px', fontWeight: 400, marginTop: '8px', opacity: 0.9, textTransform: 'capitalize' }}>{formattedDate}</div>
        </div>

        <div 
          style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '32px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
          }}
        >
          <User size={64} color="white" strokeWidth={1.5} />
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '300px' }}>
          <div style={{ position: 'relative' }}>
            <User size={18} color="rgba(255,255,255,0.7)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 16px 14px 44px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                color: 'white',
                fontSize: '15px',
                outline: 'none',
                transition: 'all 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
              onBlur={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={18} color="rgba(255,255,255,0.7)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 16px 14px 44px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                color: 'white',
                fontSize: '15px',
                outline: 'none',
                transition: 'all 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
              onBlur={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            style={{
              marginTop: '8px',
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: 'white',
              color: 'black',
              fontSize: '15px',
              fontWeight: 600,
              cursor: isLoading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              opacity: isLoading ? 0.8 : 1
            }}
          >
            {isLoading ? <Loader size={18} className="spin" /> : <>Accedi <ArrowRight size={18} /></>}
          </button>
        </form>
      </div>

      <style>
        {`
          @keyframes spin {
            100% { transform: rotate(360deg); }
          }
          .spin {
            animation: spin 1s linear infinite;
          }
        `}
      </style>
    </div>
  );
}
