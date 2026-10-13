import { Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { num } from '../lib/format';

const EJE = { fill: '#8C8C8C', fontSize: 11 };

function Globo({ active, payload, label, unidad, dec = 1 }: { active?: boolean; payload?: { value: number }[]; label?: string; unidad?: string; dec?: number }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-campo rounded-xl border border-white/10 px-3 py-2 shadow-xl">
      <p className="text-suave text-[11px]">{label}</p>
      <p className="text-texto text-sm font-semibold tabular-nums">
        {num(payload[0].value, dec)} {unidad}
      </p>
    </div>
  );
}

/** Línea con área suave para la evolución de una medida. */
export function GraficaLinea({ datos, unidad, meta, alto = 200 }: { datos: { x: string; y: number }[]; unidad: string; meta?: number; alto?: number }) {
  const ys = datos.map((d) => d.y).concat(meta !== undefined ? [meta] : []);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const margen = Math.max((max - min) * 0.15, 0.5);
  return (
    <div style={{ height: alto }} className="-ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={datos} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="relleno" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C9A96E" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#C9A96E" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#2B2B2B" strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="x" tick={EJE} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis
            tick={EJE}
            tickLine={false}
            axisLine={false}
            width={40}
            domain={[Math.floor((min - margen) * 10) / 10, Math.ceil((max + margen) * 10) / 10]}
            tickFormatter={(v: number) => num(v, 1)}
          />
          {meta !== undefined && (
            <ReferenceLine y={meta} stroke="#E8D9B5" strokeDasharray="5 5" strokeOpacity={0.6} label={{ value: 'Meta', fill: '#E8D9B5', fontSize: 10, position: 'insideTopRight' }} />
          )}
          <Tooltip content={<Globo unidad={unidad} />} cursor={{ stroke: '#C9A96E', strokeOpacity: 0.4 }} />
          <Area
            type="monotone"
            dataKey="y"
            stroke="#C9A96E"
            strokeWidth={2}
            fill="url(#relleno)"
            dot={datos.length <= 20 ? { r: 3, fill: '#C9A96E', stroke: '#1C1C1C', strokeWidth: 2 } : false}
            activeDot={{ r: 5, fill: '#E8D9B5', stroke: '#1C1C1C', strokeWidth: 2 }}
            isAnimationActive
            animationDuration={700}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Barras simples (ej. entrenos por semana). */
export function GraficaBarras({ datos, unidad, alto = 180, dec = 0 }: { datos: { x: string; y: number }[]; unidad: string; alto?: number; dec?: number }) {
  return (
    <div style={{ height: alto }} className="-ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#2B2B2B" strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="x" tick={EJE} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={8} />
          <YAxis tick={EJE} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
          <Tooltip content={<Globo unidad={unidad} dec={dec} />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="y" fill="#C9A96E" radius={[4, 4, 0, 0]} maxBarSize={28} animationDuration={700} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
