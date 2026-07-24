import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import './LineChartGlass.css';

export interface LineChartGlassProps {
  title: string;
  subtitle?: string;
  data: any[];
  lines: { dataKey: string; stroke: string; fill: string; name: string }[];
}

export default function LineChartGlass({ title, subtitle, data, lines }: LineChartGlassProps) {
  return (
    <div className="ui-chart-glass">
      <div className="ui-chart-glass-header">
        <h3 className="ui-chart-glass-title">{title}</h3>
        {subtitle && <p className="ui-chart-glass-subtitle">{subtitle}</p>}
      </div>
      
      <div style={{ width: '100%', height: 'calc(100% - 60px)' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              {lines.map((line, index) => (
                <linearGradient key={`gradient-${index}`} id={`color-${line.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={line.fill} stopOpacity={0.4}/>
                  <stop offset="95%" stopColor={line.fill} stopOpacity={0}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.15)" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
              dx={-10}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '8px' }}
              wrapperClassName="ui-chart-tooltip"
              cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
            />
            {lines.map((line, index) => (
              <Area 
                key={index}
                type="monotone" 
                dataKey={line.dataKey} 
                name={line.name}
                stroke={line.stroke} 
                strokeWidth={3}
                fillOpacity={1} 
                fill={`url(#color-${line.dataKey})`} 
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
