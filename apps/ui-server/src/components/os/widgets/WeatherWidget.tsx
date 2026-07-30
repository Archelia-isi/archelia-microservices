import { useState, useEffect } from 'react';
import { type DesktopWidget } from '../../../store/useWidgetStore';

function getWeatherCodeDetails(code: number) {
  // WMO Weather interpretation codes
  if (code === 0) return { condition: 'Sereno', icon: '☀️' };
  if (code === 1 || code === 2) return { condition: 'Poco nuvoloso', icon: '🌤' };
  if (code === 3) return { condition: 'Coperto', icon: '☁️' };
  if (code >= 45 && code <= 48) return { condition: 'Nebbia', icon: '🌫' };
  if (code >= 51 && code <= 55) return { condition: 'Pioviggine', icon: '🌦' };
  if (code >= 61 && code <= 65) return { condition: 'Pioggia', icon: '🌧' };
  if (code >= 71 && code <= 77) return { condition: 'Neve', icon: '❄️' };
  if (code >= 80 && code <= 82) return { condition: 'Acquazzone', icon: '☔' };
  if (code >= 95 && code <= 99) return { condition: 'Temporale', icon: '⛈️' };
  return { condition: 'Sconosciuto', icon: '❓' };
}

export default function WeatherWidget({ widget }: { widget: DesktopWidget }) {
  const [weatherData, setWeatherData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const city = widget.config?.city || 'Roma';
  
  useEffect(() => {
    async function fetchWeather() {
      try {
        setError(null);
        // 1. Geocoding
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=it&format=json`);
        const geoData = await geoRes.json();
        
        if (!geoData.results || geoData.results.length === 0) {
          setError('Città non trovata');
          return;
        }
        
        const { latitude, longitude, name } = geoData.results[0];
        
        // 2. Weather
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max&timezone=auto`);
        const data = await weatherRes.json();
        
        const currentDetails = getWeatherCodeDetails(data.current.weather_code);
        
        const forecast = data.daily.time.slice(1, 5).map((dateStr: string, index: number) => {
          const date = new Date(dateStr);
          const dayName = new Intl.DateTimeFormat('it-IT', { weekday: 'short' }).format(date);
          const dailyDetails = getWeatherCodeDetails(data.daily.weather_code[index + 1]);
          const maxTemp = Math.round(data.daily.temperature_2m_max[index + 1]);
          return { day: dayName.charAt(0).toUpperCase() + dayName.slice(1), temp: `${maxTemp}°`, icon: dailyDetails.icon };
        });

        setWeatherData({
          cityName: name,
          current: { temp: Math.round(data.current.temperature_2m), condition: currentDetails.condition, icon: currentDetails.icon },
          details: { 
            humidity: `${data.current.relative_humidity_2m}%`, 
            wind: `${Math.round(data.current.wind_speed_10m)} km/h`, 
            uv: data.daily.uv_index_max[0] ? data.daily.uv_index_max[0].toFixed(1) : 'N/D', 
            feels: `${Math.round(data.current.apparent_temperature)}°C` 
          },
          forecast
        });
      } catch (err) {
        console.error('Weather fetch error:', err);
        setError('Errore connessione');
      }
    }
    
    fetchWeather();
    // Aggiorna ogni ora
    const interval = setInterval(fetchWeather, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [city]);

  if (error) return <div className="widget weather-widget flex-center" style={{ padding: '16px', textAlign: 'center', color: 'var(--color-danger)' }}>{error}</div>;
  if (!weatherData) return <div className="widget weather-widget flex-center">Caricamento...</div>;

  return (
    <div className="widget weather-widget" style={{ width: '100%', height: '100%', padding: '16px', display: 'flex', flexDirection: 'column' }}>
      
      {/* HEADER: sempre presente */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{weatherData.cityName}</h2>
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
