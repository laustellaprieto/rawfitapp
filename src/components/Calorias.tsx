import { useState } from 'react';
import { ACTIVIDADES, calcularCalorias, calcularMacros, kcal, METAS, opcionesRango, textoMeta, valido, type ResultadoCalorias, type ResultadoMacros } from '../lib/calorias';
import { guardarPerfil, type MetaCalorias, type NivelActividad, type Perfil, type Sexo } from '../lib/db';
import { num, numTxt, parseNum } from '../lib/format';
import { Icon } from './Icon';

/** Datos de texto del formulario (los números se guardan como texto mientras se escriben). */
export interface DatosCaloriasTxt {
  sexo?: Sexo;
  edad: string;
  peso: string;
  estatura: string;
  actividad: NivelActividad;
  meta: MetaCalorias;
  porcentaje: number;
  proteinaGkg?: number;
  grasaPct?: number;
}

const Opcion = ({ activa, onClick, children, className = '' }: { activa: boolean; onClick: () => void; children: React.ReactNode; className?: string }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={activa}
    className={`rounded-xl border px-3 py-2.5 text-sm transition active:scale-[0.98] ${activa ? 'border-dorado bg-dorado/12 text-champagne' : 'bg-campo text-texto border-transparent'} ${className}`}
  >
    {children}
  </button>
);

/** Pregunta el nivel de actividad, la meta y el %; los datos corporales se piden en otro lado. */
export function SelectorMeta({ datos, onChange }: { datos: DatosCaloriasTxt; onChange: (d: Partial<DatosCaloriasTxt>) => void }) {
  const meta = METAS.find((m) => m.valor === datos.meta)!;
  return (
    <div className="flex flex-col gap-5">
      <div>
        <span className="etiqueta">Nivel de actividad</span>
        <div className="flex flex-col gap-1.5">
          {ACTIVIDADES.map((a) => (
            <Opcion key={a.valor} activa={datos.actividad === a.valor} onClick={() => onChange({ actividad: a.valor })} className="flex items-center justify-between gap-2 text-left">
              <span className="font-semibold">{a.nombre}</span>
              <span className="text-suave text-right text-xs">{a.detalle}</span>
            </Opcion>
          ))}
        </div>
      </div>

      <div>
        <span className="etiqueta">Tu meta</span>
        <div className="grid grid-cols-3 gap-1.5">
          {METAS.map((m) => (
            <Opcion key={m.valor} activa={datos.meta === m.valor} onClick={() => onChange({ meta: m.valor, porcentaje: m.porDefecto, proteinaGkg: undefined, grasaPct: undefined })} className="text-center">
              <span className="block font-semibold">{m.nombre}</span>
              <span className="text-suave block text-[10px] leading-tight">{m.detalle}</span>
            </Opcion>
          ))}
        </div>
      </div>

      {meta.porcentajes.length > 0 && (
        <div>
          <span className="etiqueta">{datos.meta === 'definicion' ? 'Déficit de calorías' : 'Superávit de calorías'}</span>
          <div className="grid grid-cols-4 gap-1.5">
            {meta.porcentajes.map((p) => (
              <Opcion key={p} activa={datos.porcentaje === p} onClick={() => onChange({ porcentaje: p })} className="text-center font-semibold tabular-nums">
                {datos.meta === 'definicion' ? '−' : '+'}
                {p} %
              </Opcion>
            ))}
          </div>
          <p className="text-suave mt-2 text-xs">
            {datos.meta === 'definicion'
              ? 'Entre 10 y 20 % es un ritmo sostenible. 25 % es agresivo: úsalo por poco tiempo.'
              : 'Entre 5 y 10 % ayuda a ganar músculo con poca grasa. Más de 10 % acelera, pero suma más grasa.'}
          </p>
        </div>
      )}
    </div>
  );
}

/** Tarjeta con el resultado: basales, mantenimiento y calorías objetivo. */
export function ResultadoCaloriasTarjeta({ r }: { r: ResultadoCalorias }) {
  return (
    <div className="border-dorado/25 rounded-2xl border bg-gradient-to-br from-[#231f17] to-[#1C1C1C] p-4">
      <p className="text-dorado text-[11px] font-semibold tracking-wider uppercase">Tus calorías diarias</p>
      <p className="titulo text-champagne mt-1 text-5xl leading-none">
        {r.objetivo.toLocaleString('es')}
        <span className="text-suave ml-1.5 font-sans text-base font-medium">kcal</span>
      </p>
      <p className="text-suave mt-1 text-sm">{textoMeta(r)}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/5 pt-3 text-sm">
        <div>
          <p className="text-suave text-xs">Basales (en reposo)</p>
          <p className="font-semibold tabular-nums">{kcal(r.basales)}</p>
        </div>
        <div>
          <p className="text-suave text-xs">Mantenimiento</p>
          <p className="font-semibold tabular-nums">{kcal(r.mantenimiento)}</p>
        </div>
      </div>
      <p className="text-suave mt-3 flex items-start gap-1.5 text-[11px]">
        <Icon name="info" size={13} className="mt-px shrink-0" />
        Estimación con la fórmula Mifflin-St Jeor. Ajústala según tu progreso de 2–3 semanas.
      </p>
    </div>
  );
}

export const resultadoDe = (d: DatosCaloriasTxt, parse: (s: string) => number | undefined) =>
  calcularCalorias({ sexo: d.sexo, edad: parse(d.edad), peso: parse(d.peso), estatura: parse(d.estatura), actividad: d.actividad, meta: d.meta, porcentaje: d.porcentaje });

/** Editor completo (datos corporales + meta) para Ajustes y Hoy. Guarda en el perfil. */
export function EditorCalorias({ perfil, onCerrar }: { perfil: Perfil; onCerrar: () => void }) {
  const [d, setD] = useState<DatosCaloriasTxt>({
    sexo: perfil.sexo,
    edad: numTxt(perfil.edad),
    peso: numTxt(perfil.peso),
    estatura: numTxt(perfil.estatura),
    actividad: perfil.actividad ?? 'ligera',
    meta: perfil.meta ?? 'mantenimiento',
    porcentaje: perfil.porcentaje ?? 0,
    proteinaGkg: perfil.proteinaGkg,
    grasaPct: perfil.grasaPct,
  });
  const cambiar = (x: Partial<DatosCaloriasTxt>) => setD((v) => ({ ...v, ...x }));
  const edad = parseNum(d.edad);
  const peso = parseNum(d.peso);
  const estatura = parseNum(d.estatura);
  const ok = !!d.sexo && valido.edad(edad) && valido.peso(peso) && valido.estatura(estatura);
  const r = ok ? resultadoDe(d, parseNum) : undefined;
  const m = r && peso ? calcularMacros(r.objetivo, peso, r.meta, d.proteinaGkg, d.grasaPct) : undefined;

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ok) return;
    await guardarPerfil({
      sexo: d.sexo,
      edad,
      peso,
      estatura,
      actividad: d.actividad,
      meta: d.meta,
      porcentaje: d.porcentaje,
      proteinaGkg: m?.proteinaGkg,
      grasaPct: m?.grasaPct,
    });
    onCerrar();
  };

  return (
    <form onSubmit={guardar} className="flex flex-col gap-5">
      <div>
        <span className="etiqueta">Sexo (solo para el cálculo)</span>
        <div className="grid grid-cols-2 gap-2">
          {(['mujer', 'hombre'] as Sexo[]).map((s) => (
            <Opcion key={s} activa={d.sexo === s} onClick={() => cambiar({ sexo: s })} className="text-center font-semibold">
              {s === 'mujer' ? 'Mujer' : 'Hombre'}
            </Opcion>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {(
          [
            ['edad', 'Edad', 'años', 'numeric'],
            ['estatura', 'Estatura', 'cm', 'decimal'],
            ['peso', 'Peso', 'kg', 'decimal'],
          ] as const
        ).map(([k, t, u, modo]) => (
          <div key={k}>
            <label className="etiqueta" htmlFor={`cal-${k}`}>
              {t} <span className="normal-case opacity-70">({u})</span>
            </label>
            <input id={`cal-${k}`} inputMode={modo} value={d[k]} onChange={(e) => cambiar({ [k]: e.target.value })} className="campo text-center tabular-nums" />
          </div>
        ))}
      </div>
      {!ok && <p className="text-suave -mt-3 text-xs">Completa sexo, edad (14–100), estatura (100–250 cm) y peso (30–300 kg).</p>}
      <SelectorMeta datos={d} onChange={cambiar} />
      {r && <ResultadoCaloriasTarjeta r={r} />}
      {m && <Macros m={m} onChange={cambiar} />}
      <button className="btn-oro w-full" disabled={!ok}>
        Guardar
      </button>
    </form>
  );
}

const COLORES_MACRO = { proteina: '#C9A96E', carbos: '#F2F2F2', grasa: '#8C8C8C' } as const;
const fmt = (n: number) => num(n, 1);

/** Macros del día con su rango recomendado según la meta. Si recibe onChange, se pueden ajustar. */
export function Macros({ m, onChange }: { m: ResultadoMacros; onChange?: (d: Partial<DatosCaloriasTxt>) => void }) {
  const { rango } = m;
  const filas = [
    {
      clave: 'proteina' as const,
      nombre: 'Proteína',
      macro: m.proteina,
      detalle: `${fmt(m.proteina.gPorKg)} g/kg`,
      rangoTxt: `${fmt(rango.proteina.min)}–${fmt(rango.proteina.max)} g por kg de peso`,
      opciones: opcionesRango(rango.proteina),
      elegido: m.proteinaGkg,
      formato: (v: number) => v.toLocaleString('es', { minimumFractionDigits: 1 }),
      cambiar: (v: number) => onChange?.({ proteinaGkg: v }),
    },
    {
      clave: 'carbos' as const,
      nombre: 'Carbohidratos',
      macro: m.carbos,
      detalle: `${fmt(m.carbos.gPorKg)} g/kg`,
      rangoTxt: `${fmt(rango.carbos.min)}–${fmt(rango.carbos.max)} g por kg de peso`,
    },
    {
      clave: 'grasa' as const,
      nombre: 'Grasa',
      macro: m.grasa,
      detalle: `${fmt(m.grasa.gPorKg)} g/kg`,
      rangoTxt: `${rango.grasa.min}–${rango.grasa.max} % de las calorías`,
      opciones: opcionesRango(rango.grasa),
      elegido: m.grasaPct,
      formato: (v: number) => `${v} %`,
      cambiar: (v: number) => onChange?.({ grasaPct: v }),
    },
  ];

  return (
    <div className="bg-campo/40 rounded-2xl border border-white/5 p-4">
      <p className="text-dorado text-[11px] font-semibold tracking-wider uppercase">Tus macros del día</p>

      {/* Reparto de calorías */}
      <div className="mt-3 flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={`Proteína ${m.proteina.pct} %, carbohidratos ${m.carbos.pct} %, grasa ${m.grasa.pct} %`}>
        {filas.map((f) => (
          <div key={f.clave} style={{ width: `${f.macro.pct}%`, background: COLORES_MACRO[f.clave] }} className="transition-all duration-500" />
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {filas.map((f) => (
          <div key={f.clave}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span className="size-2.5 rounded-full" style={{ background: COLORES_MACRO[f.clave] }} />
                {f.nombre}
              </span>
              <span className="titulo text-2xl leading-none">
                {f.macro.gramos}
                <span className="text-suave ml-0.5 font-sans text-xs font-medium">g</span>
              </span>
            </div>
            <p className="text-suave mt-0.5 text-xs">
              {f.detalle} · {f.macro.kcal.toLocaleString('es')} kcal · {f.macro.pct} %
            </p>
            <p className="mt-1 text-xs">
              <span className="text-suave">Rango recomendado: </span>
              <span className="text-texto">{f.rangoTxt}</span>
              {f.clave === 'carbos' && (
                <span
                  className={`ml-1.5 inline-block rounded-full px-1.5 py-px text-[10px] font-semibold ${
                    m.estadoCarbos === 'ok' ? 'bg-baja/10 text-baja' : 'bg-dorado/10 text-dorado'
                  }`}
                >
                  {m.estadoCarbos === 'ok' ? 'dentro del rango' : m.estadoCarbos === 'bajo' ? 'por debajo' : 'por encima'}
                </span>
              )}
            </p>
            {onChange && f.opciones && (
              <div className="mt-2 flex gap-1.5">
                {f.opciones.map((v) => (
                  <Opcion key={v} activa={Math.abs((f.elegido ?? 0) - v) < 1e-9} onClick={() => f.cambiar!(v)} className="flex-1 !py-1.5 text-center text-xs font-semibold tabular-nums">
                    {f.formato!(v)}
                  </Opcion>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-suave mt-4 text-[11px] leading-relaxed">
        {onChange ? 'Elige la proteína y la grasa dentro del rango; los carbohidratos completan tus calorías. ' : ''}
        {m.estadoCarbos === 'bajo' && 'Tus carbohidratos quedan bajos para tu meta: si entrenas fuerte, considera menos grasa o un déficit menor. '}
        Rangos según ISSN (Jäger et al., 2017), Institute of Medicine y ACSM (Thomas et al., 2016).
      </p>
    </div>
  );
}
