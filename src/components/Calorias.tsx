import { useState } from 'react';
import { ACTIVIDADES, calcularCalorias, kcal, METAS, textoMeta, valido, type ResultadoCalorias } from '../lib/calorias';
import { guardarPerfil, type MetaCalorias, type NivelActividad, type Perfil, type Sexo } from '../lib/db';
import { numTxt, parseNum } from '../lib/format';
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
}

const Opcion = ({ activa, onClick, children, className = '' }: { activa: boolean; onClick: () => void; children: React.ReactNode; className?: string }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={activa}
    className={`rounded-xl border px-3 py-2.5 text-left text-sm transition active:scale-[0.98] ${activa ? 'border-dorado bg-dorado/12 text-champagne' : 'bg-campo text-texto border-transparent'} ${className}`}
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
            <Opcion key={a.valor} activa={datos.actividad === a.valor} onClick={() => onChange({ actividad: a.valor })} className="flex items-center justify-between gap-2">
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
            <Opcion key={m.valor} activa={datos.meta === m.valor} onClick={() => onChange({ meta: m.valor, porcentaje: m.porDefecto })} className="text-center">
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
  });
  const cambiar = (x: Partial<DatosCaloriasTxt>) => setD((v) => ({ ...v, ...x }));
  const edad = parseNum(d.edad);
  const peso = parseNum(d.peso);
  const estatura = parseNum(d.estatura);
  const ok = !!d.sexo && valido.edad(edad) && valido.peso(peso) && valido.estatura(estatura);
  const r = ok ? resultadoDe(d, parseNum) : undefined;

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ok) return;
    await guardarPerfil({ sexo: d.sexo, edad, peso, estatura, actividad: d.actividad, meta: d.meta, porcentaje: d.porcentaje });
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
      <button className="btn-oro w-full" disabled={!ok}>
        Guardar
      </button>
    </form>
  );
}
