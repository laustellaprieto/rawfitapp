import { useRef, useState } from 'react';
import { enviarOpinion, MAX_TEXTO_OPINION, TIPOS_OPINION, type TipoOpinion } from '../lib/feedback';
import { useBlobURL } from '../lib/hooks';
import { Icon } from './Icon';
import { Sheet } from './Sheet';

/** Tarjeta de Ajustes con el botón "Danos tu opinión" (para todas las personas, con o sin cuenta). */
export function TarjetaOpinion({ nombre, pantalla }: { nombre: string; pantalla: () => string }) {
  const [abierto, setAbierto] = useState(false);
  const [desde, setDesde] = useState('');
  return (
    <section className="tarjeta animate-entrada !border-dorado/25 mb-4">
      <h2 className="titulo text-2xl">¿Cómo te va con la app?</h2>
      <p className="text-suave mt-1 mb-3 text-sm">Estamos construyendo RawFit contigo. Cuéntanos qué te gustó, qué te confundió o qué le agregarías.</p>
      <button
        className="btn-oro w-full"
        onClick={() => {
          setDesde(pantalla());
          setAbierto(true);
        }}
      >
        💬 Danos tu opinión
      </button>
      <Sheet formulario abierto={abierto} onCerrar={() => setAbierto(false)} titulo="Tu opinión">
        {abierto && <FormOpinion nombre={nombre} pantalla={desde} onCerrar={() => setAbierto(false)} />}
      </Sheet>
    </section>
  );
}

function FormOpinion({ nombre, pantalla, onCerrar }: { nombre: string; pantalla: string; onCerrar: () => void }) {
  const [estrellas, setEstrellas] = useState(0);
  const [tipo, setTipo] = useState<TipoOpinion>();
  const [texto, setTexto] = useState('');
  const [captura, setCaptura] = useState<File>();
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviada, setEnviada] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const url = useBlobURL(captura);

  const elegir = (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return setError('La captura debe ser una imagen.');
    setError('');
    setCaptura(f);
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estrellas || !tipo || !texto.trim()) return;
    setEnviando(true);
    setError('');
    try {
      await enviarOpinion({ nombre, tipo, estrellas, texto, captura, pantalla });
      setEnviada(true);
    } catch (err) {
      setError((err as Error).message || 'No se pudo enviar. Inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  if (enviada)
    return (
      <div className="animate-entrada flex flex-col items-center py-6 text-center" role="status">
        <span className="mb-3 text-5xl">💛</span>
        <p className="titulo text-champagne text-3xl leading-none">¡Gracias!</p>
        <p className="text-texto mt-2 max-w-xs">Tu opinión nos ayuda a construir RawFit 💛</p>
        <button className="btn-oro mt-6 w-full" onClick={onCerrar}>
          Cerrar
        </button>
      </div>
    );

  return (
    <form onSubmit={enviar} className="flex flex-col gap-5">
      <div>
        <span className="etiqueta">¿Qué tanto te gusta la app?</span>
        <div className="flex gap-1" role="radiogroup" aria-label="Calificación">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={estrellas === n}
              aria-label={`${n} ${n === 1 ? 'estrella' : 'estrellas'}`}
              onClick={() => setEstrellas(n)}
              className={`grid size-11 place-items-center rounded-xl text-3xl leading-none transition active:scale-90 ${n <= estrellas ? 'text-dorado' : 'text-[#444]'}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="etiqueta">¿Sobre qué es?</span>
        <div className="grid grid-cols-2 gap-2">
          {TIPOS_OPINION.map((t) => (
            <button
              key={t.valor}
              type="button"
              aria-pressed={tipo === t.valor}
              onClick={() => setTipo(t.valor)}
              className={`rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition ${tipo === t.valor ? 'border-dorado/60 bg-dorado/10 text-dorado' : 'bg-campo text-texto border-transparent'}`}
            >
              <span className="mr-1.5">{t.emoji}</span>
              {t.texto}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="etiqueta" htmlFor="op-texto">Cuéntanos</label>
        <textarea
          id="op-texto"
          value={texto}
          onChange={(e) => setTexto(e.target.value.slice(0, MAX_TEXTO_OPINION))}
          maxLength={MAX_TEXTO_OPINION}
          className="campo min-h-32 resize-none"
          placeholder={tipo === 'error' ? '¿Qué estabas haciendo y qué pasó?' : 'Escribe aquí lo que quieras contarnos…'}
          required
        />
        <p className={`mt-1 text-right text-xs ${texto.length >= MAX_TEXTO_OPINION ? 'text-sube' : 'text-suave'}`}>
          {texto.length}/{MAX_TEXTO_OPINION}
        </p>
      </div>

      <div>
        <span className="etiqueta">Captura de pantalla (opcional)</span>
        {url ? (
          <div className="relative w-fit">
            <img src={url} alt="Captura adjunta" className="max-h-48 rounded-xl border border-white/10" />
            <button type="button" onClick={() => setCaptura(undefined)} className="absolute top-1.5 right-1.5 grid size-8 place-items-center rounded-full bg-black/70" aria-label="Quitar captura">
              <Icon name="cerrar" size={16} />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => input.current?.click()} className="btn-sec w-full border border-dashed border-white/10">
            <Icon name="fotos-galeria" size={18} /> Adjuntar captura
          </button>
        )}
        <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => (elegir(e.target.files?.[0]), (e.target.value = ''))} />
      </div>

      <p className="text-suave -mt-2 text-xs">{nombre.trim() ? `Se enviará con tu nombre (${nombre.trim()}), ` : 'Se enviará '}junto con la versión de la app y la pantalla desde la que la abriste.</p>

      {error && <p className="bg-sube/10 text-sube rounded-xl px-3 py-2 text-sm">{error}</p>}

      <div className="flex gap-2">
        <button type="button" onClick={onCerrar} className="btn-sec">
          Cancelar
        </button>
        <button className="btn-oro flex-1" disabled={enviando || !estrellas || !tipo || !texto.trim()}>
          {enviando ? 'Enviando…' : 'Enviar'}
        </button>
      </div>
    </form>
  );
}
