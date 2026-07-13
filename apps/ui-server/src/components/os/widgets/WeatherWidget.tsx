import { useState, useEffect } from 'react';
import { type DesktopWidget } from '../../../store/useWidgetStore';

export default function WeatherWidget({ widget }: { widget: DesktopWidget }) {
  const [weatherData, setWeatherData] = useState<any>(null);
  const city = widget.config?.city || 'Roma';
  
  // Per semplicità qui facciamo finta di fare una fetch, in produzione andrebbe chiamata geocoding + open-meteo
  useEffect(() => {
    // Fake fetch for now to demonstrate layout
    setTimeout(() => {
      setWeatherData({
        current: { temp: 24, condition: 'Soleggiato', icon: '🌤' },
        details: { humidity: '45%', wind: '12 km/h', uv: 'Alto', feels: '26°C' },
        forecast: [
          { day: 'Mar', temp: '25°', icon: '☀️' },
          { day: 'Mer', temp: '22°', icon: '⛅' },
          { day: 'Gio', temp: '19°', icon: '🌧' },
          { day: 'Ven', temp: '21°', icon: '🌤' },
        ]
      });
    }, 500);
  }, [city]);

  if (!weatherData) return <div className="widget weather-widget flex-center">Caricamento...</div>;

  return (
    <div className="widget weather-widget" style={{ width: '100%', height: '100%', padding: '16px', display: 'flex', flexDirection: 'column' }}>
      
      {/* HEADER: sempre presente */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{city}</h2>
        <span style={{ fontSize: '1.2rem' }}>{weatherData.current.icon}</span>
      </div>

      {(!widget.size || widget.size === 'small') && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <h1 style={{ fontSize: '3.5rem', margin: '0', fontWeight: 300 }}>{weatherData.current.temp}°</h1>
          <p style={{ margin: 0, opacity: 0.8, fontSize: '1rem' }}>{weatherData.current.condition}</p>
        </div>
      )}

      {widget.size === 'medium' && (
        <div style={{ display: 'flex', flex: 1, alignItems: 'center' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h1 style={{ fontSize: '3rem', margin: '0', fontWeight: 300 }}>{weatherData.current.temp}°</h1>
            <p style={{ margin: 0, opacity: 0.8, fontSize: '0.9rem' }}>{weatherData.current.condition}</p>
          </div>
          <div style={{ width: '1px', height: '80%', background: 'var(--color-border-glass)', margin: '0 16px' }} />
          <div style={{ flex: 1.5, display: 'flex', justifyContent: 'space-between' }}>
            {weatherData.forecast.map((f: any, i: number) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>{f.day}</span>
                <span style={{ fontSize: '1.2rem', margin: '4px 0' }}>{f.icon}</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{f.temp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {widget.size === 'large' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', flex: 1 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <h1 style={{ fontSize: '4rem', margin: '0', fontWeight: 300 }}>{weatherData.current.temp}°</h1>
              <p style={{ margin: 0, opacity: 0.8, fontSize: '1rem' }}>{weatherData.current.condition}</p>
            </div>
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', alignContent: 'center' }}>
              <div><div style={{fontSize:'0.7rem', opacity:0.7}}>Umidità</div><div style={{fontWeight:600}}>{weatherData.details.humidity}</div></div>
              <div><div style={{fontSize:'0.7rem', opacity:0.7}}>Vento</div><div style={{fontWeight:600}}>{weatherData.details.wind}</div></div>
              <div><div style={{fontSize:'0.7rem', opacity:0.7}}>Indice UV</div><div style={{fontWeight:600}}>{weatherData.details.uv}</div></div>
              <div><div style={{fontSize:'0.7rem', opacity:0.7}}>Percepita</div><div style={{fontWeight:600}}>{weatherData.details.feels}</div></div>
            </div>
          </div>
          <div style={{ height: '1px', width: '100%', background: 'var(--color-border-glass)', margin: '16px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {weatherData.forecast.map((f: any, i: number) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>{f.day}</span>
                <span style={{ fontSize: '1.5rem', margin: '8px 0' }}>{f.icon}</span>
                <span style={{ fontSize: '1rem', fontWeight: 600 }}>{f.temp}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
