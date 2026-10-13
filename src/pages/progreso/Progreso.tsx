import { useState } from 'react';
import type { Perfil } from '../../lib/db';
import { Encabezado, Segmentos } from '../../components/ui';
import Fotos from './Fotos';
import Medidas from './Medidas';

type Pestana = 'medidas' | 'fotos';

export default function Progreso({ perfil, accion }: { perfil: Perfil; accion?: string }) {
  const [pestana, setPestana] = useState<Pestana>(accion === 'fotos' ? 'fotos' : 'medidas');
  return (
    <>
      <Encabezado subtitulo="Lo que se mide, se mejora" titulo="Progreso" />
      <div className="mb-4">
        <Segmentos
          opciones={[
            { valor: 'medidas' as const, texto: 'Medidas' },
            { valor: 'fotos' as const, texto: 'Fotos' },
          ]}
          valor={pestana}
          onChange={setPestana}
        />
      </div>
      {pestana === 'medidas' ? <Medidas perfil={perfil} abrirForm={accion === 'medicion'} /> : <Fotos perfil={perfil} />}
    </>
  );
}
