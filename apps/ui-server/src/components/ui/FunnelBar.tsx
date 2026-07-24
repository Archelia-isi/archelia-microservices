import './FunnelBar.css';

export interface FunnelBarProps {
  visits: number;
  carts: number;
  abandoned: number;
  purchases: number;
}

export default function FunnelBar({ visits, carts, abandoned, purchases }: FunnelBarProps) {
  // Normalize everything to 100% of visits
  const total = Math.max(visits, 1);

  // For the visual bar, we want to show the distribution of the users that arrived.
  // Actually a funnel bar is better represented as absolute segments if they sum up to total, 
  // but in a funnel, purchases + abandoned = carts. 
  // So the bar can be: [ Dropoff (Visits - Carts) | Abandoned | Purchases ]
  const dropoff = Math.max(total - carts, 0);
  const pDropoff = (dropoff / total) * 100;
  const pAbandoned = (abandoned / total) * 100;
  const pPurchases = (purchases / total) * 100;

  return (
    <div className="ui-funnel-bar">
      <div className="ui-funnel-labels">
        <span>Visite Totali: {visits.toLocaleString()}</span>
        <span>Tasso di Conversione: {((purchases / total) * 100).toFixed(1)}%</span>
      </div>
      
      <div className="ui-funnel-track">
        {pDropoff > 0 && (
          <div 
            className="ui-funnel-segment visits" 
            style={{ width: `${pDropoff}%` }}
            data-tooltip={`Solo Visita: ${dropoff.toLocaleString()} (${pDropoff.toFixed(1)}%)`}
          />
        )}
        {pAbandoned > 0 && (
          <div 
            className="ui-funnel-segment abandoned" 
            style={{ width: `${pAbandoned}%` }}
            data-tooltip={`Carrelli Abbandonati: ${abandoned.toLocaleString()} (${pAbandoned.toFixed(1)}%)`}
          />
        )}
        {pPurchases > 0 && (
          <div 
            className="ui-funnel-segment purchases" 
            style={{ width: `${pPurchases}%` }}
            data-tooltip={`Acquisti: ${purchases.toLocaleString()} (${pPurchases.toFixed(1)}%)`}
          />
        )}
      </div>

      <div className="ui-funnel-legend">
        <div className="ui-funnel-legend-item">
          <div className="ui-funnel-legend-color" style={{ background: '#3b82f6' }} />
          Nessun Carrello
        </div>
        <div className="ui-funnel-legend-item">
          <div className="ui-funnel-legend-color" style={{ background: '#ef4444' }} />
          Carrelli Abbandonati
        </div>
        <div className="ui-funnel-legend-item">
          <div className="ui-funnel-legend-color" style={{ background: '#10b981' }} />
          Acquisti
        </div>
      </div>
    </div>
  );
}
