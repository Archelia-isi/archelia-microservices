import { useState, useEffect } from 'react';
import { type DesktopWidget } from '../../../store/useWidgetStore';

const cityToTz: Record<string, string> = {
  'londra': 'Europe/London',
  'parigi': 'Europe/Paris',
  'berlino': 'Europe/Berlin',
  'madrid': 'Europe/Madrid',
  'mosca': 'Europe/Moscow',
  'pechino': 'Asia/Shanghai',
  'tokyo': 'Asia/Tokyo',
  'new york': 'America/New_York',
  'los angeles': 'America/Los_Angeles',
  'san francisco': 'America/Los_Angeles',
  'sidney': 'Australia/Sydney',
  'sydney': 'Australia/Sydney',
  'dubai': 'Asia/Dubai',
  'roma': 'Europe/Rome',
  'milano': 'Europe/Rome',
  'napoli': 'Europe/Rome',
  'benevento': 'Europe/Rome'
};

function resolveTimezone(input: string): string {
  if (!input) return 'Europe/Rome';
  const cleanInput = input.trim().toLowerCase();
  
  if (cityToTz[cleanInput]) return cityToTz[cleanInput];
  
  try {
    const allTzs = Intl.supportedValuesOf('timeZone');
    
    const exactMatch = allTzs.find(tz => {
      const cityPart = tz.split('/').pop()?.toLowerCase().replace(/_/g, ' ');
      return cityPart === cleanInput;
    });
    if (exactMatch) return exactMatch;
    
    const partialMatch = allTzs.find(tz => tz.toLowerCase().includes(cleanInput.replace(/ /g, '_')));
    if (partialMatch) return partialMatch;
  } catch (e) {
    // browser old
  }
  
  return 'Europe/Rome';
}

export default function ClockWidget({ widget }: { widget: DesktopWidget }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const tz1 = widget.config?.tz1 || 'Roma';
  const tz2 = widget.config?.tz2 || 'New York';
  const tz3 = widget.config?.tz3 || 'Tokyo';
  const tz4 = widget.config?.tz4 || 'Londra';

  const renderClock = (rawInput: string) => {
    const validTz = resolveTimezone(rawInput);
    let formatter;
    try {
      formatter = new Intl.DateTimeFormat('it-IT', {
        timeZone: validTz,
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      formatter = new Intl.DateTimeFormat('it-IT', {
        timeZone: 'Europe/Rome',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    
    const cleanLabel = rawInput || validTz.split('/').pop()?.replace('_', ' ') || 'Roma';

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
          <div style={{ width: '1px', background: 'var(--color-border-glass)', margin: '0 16px' }} />
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
