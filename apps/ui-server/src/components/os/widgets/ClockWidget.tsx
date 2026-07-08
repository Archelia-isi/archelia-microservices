import { useState, useEffect } from 'react';
import { type DesktopWidget } from '../../../store/useWidgetStore';

export default function ClockWidget({ widget }: { widget: DesktopWidget }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const tz1 = widget.config?.tz1 || 'Europe/Rome';
  const tz2 = widget.config?.tz2 || 'America/New_York';
  const tz3 = widget.config?.tz3 || 'Asia/Tokyo';
  const tz4 = widget.config?.tz4 || 'Europe/London';

  const renderClock = (tz: string) => {
    let formatter;
    let validTz = tz;
    try {
      formatter = new Intl.DateTimeFormat('it-IT', {
        timeZone: validTz,
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      // Fallback in caso di fuso orario non valido (es. l'utente sta ancora digitando o ha sbagliato)
      validTz = 'Europe/Rome';
      formatter = new Intl.DateTimeFormat('it-IT', {
        timeZone: validTz,
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    
    // Rimuoviamo il fuso orario dal label per pulizia, prendendo l'ultima parte
    const cleanLabel = validTz.split('/').pop()?.replace('_', ' ') || validTz;

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ margin: '0 0 4px 0', fontSize: '0.8rem', opacity: 0.7, textTransform: 'uppercase', fontWeight: 600 }}>{cleanLabel}</p>
        <h1 style={{ fontSize: widget.size === 'small' ? '3.5rem' : '2.5rem', fontWeight: 200, margin: 0, letterSpacing: '-0.05em' }}>
          {formatter.format(time)}
        </h1>
      </div>
    );
  };

  return (
    <div className="widget clock-widget" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '16px' }}>
      {(!widget.size || widget.size === 'small') && (
        <>
          {renderClock(tz1)}
          <p style={{ fontSize: '1rem', fontWeight: 500, margin: '8px 0 0 0', opacity: 0.8, textAlign: 'center' }}>
            {(() => {
              try {
                return new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz1 }).format(time);
              } catch (e) {
                return new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Rome' }).format(time);
              }
            })()}
          </p>
        </>
      )}

      {widget.size === 'medium' && (
        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
          {renderClock(tz1)}
          <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)', margin: '0 16px' }} />
          {renderClock(tz2)}
        </div>
      )}

      {widget.size === 'large' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', width: '100%', height: '100%', gap: '16px' }}>
          {renderClock(tz1)}
          {renderClock(tz2)}
          {renderClock(tz3)}
          {renderClock(tz4)}
        </div>
      )}
    </div>
  );
}
