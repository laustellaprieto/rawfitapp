/** Gráficas livianas (SVG y HTML, sin Recharts): van en el paquete principal de la app. */

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
