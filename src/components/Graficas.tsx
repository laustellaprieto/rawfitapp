import { Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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

/** Dos líneas en la misma escala (ej. cintura y abdomen, ambas en cm), con leyenda. */
export function GraficaDosLineas({
  datos,
  series,
  unidad,
  alto = 210,
}: {
  datos: Record<string, string | number | undefined>[];
  series: { clave: string; nombre: string; color: string; punteada?: boolean }[];
  unidad: string;
  alto?: number;
}) {
  const ys = datos.flatMap((d) => series.map((s) => d[s.clave])).filter((v): v is number => typeof v === 'number');
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const margen = Math.max((max - min) * 0.15, 0.5);
  return (
    <div>
      <div className="mb-2 flex gap-4 text-xs">
        {series.map((s) => (
          <span key={s.clave} className="text-suave inline-flex items-center gap-1.5">
            <svg width="18" height="6" aria-hidden>
              <line x1="0" y1="3" x2="18" y2="3" stroke={s.color} strokeWidth="2.5" strokeDasharray={s.punteada ? '4 3' : undefined} />
            </svg>
            {s.nombre}
          </span>
        ))}
      </div>
      <div style={{ height: alto }} className="-ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={datos} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#2B2B2B" strokeDasharray="3 4" vertical={false} />
            <XAxis dataKey="x" tick={EJE} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis
              tick={EJE}
              tickLine={false}
              axisLine={false}
              width={40}
              domain={[Math.floor(min - margen), Math.ceil(max + margen)]}
              tickFormatter={(v: number) => num(v, 0)}
            />
            <Tooltip
              cursor={{ stroke: '#C9A96E', strokeOpacity: 0.4 }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div className="bg-campo rounded-xl border border-white/10 px-3 py-2 shadow-xl">
                    <p className="text-suave text-[11px]">{label}</p>
                    {payload.map((p) => (
                      <p key={String(p.dataKey)} className="text-texto text-sm font-semibold tabular-nums">
                        <span className="text-suave font-normal">{p.name}:</span> {num(p.value as number)} {unidad}
                      </p>
                    ))}
                  </div>
                ) : null
              }
            />
            {series.map((s) => (
              <Line
                key={s.clave}
                type="monotone"
                dataKey={s.clave}
                name={s.nombre}
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray={s.punteada ? '6 4' : undefined}
                dot={{ r: 3, fill: s.color, stroke: '#1C1C1C', strokeWidth: 2 }}
                activeDot={{ r: 5, stroke: '#1C1C1C', strokeWidth: 2 }}
                connectNulls
                animationDuration={700}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Mini-gráfica sin ejes para la evolución de un récord. */
export function MiniLinea({ valores, ancho = 84, alto = 32 }: { valores: number[]; ancho?: number; alto?: number }) {
  if (valores.length < 2) return <div style={{ width: ancho, height: alto }} />;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const rango = max - min || 1;
  const pts = valores.map((v, i) => [(i / (valores.length - 1)) * (ancho - 6) + 3, alto - 3 - ((v - min) / rango) * (alto - 6)]);
  const [ux, uy] = pts[pts.length - 1];
  return (
    <svg width={ancho} height={alto} aria-hidden>
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="#C9A96E" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={ux} cy={uy} r={3} fill="#E8D9B5" />
    </svg>
  );
}

/** Barras horizontales (ej. volumen por grupo muscular). */
export function BarrasHorizontales({ datos, formato }: { datos: { nombre: string; valor: number }[]; formato: (v: number) => string }) {
  const max = Math.max(...datos.map((d) => d.valor), 1);
  return (
    <div className="flex flex-col gap-2.5">
      {datos.map((d) => (
        <div key={d.nombre} className="group" title={`${d.nombre}: ${formato(d.valor)}`}>
          <div className="mb-1 flex justify-between gap-2 text-xs">
            <span className="truncate">{d.nombre}</span>
            <span className="text-champagne shrink-0 font-semibold tabular-nums">{formato(d.valor)}</span>
          </div>
          <div className="bg-campo h-2.5 overflow-hidden rounded-full">
            <div className="bg-dorado group-hover:bg-champagne h-full rounded-full transition-all duration-700" style={{ width: `${(d.valor / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
