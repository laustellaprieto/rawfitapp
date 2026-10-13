import { Encabezado, Vacio } from '../components/ui';
import type { IconName } from '../components/Icon';

export default function Proximamente({ titulo, icono }: { titulo: string; icono: IconName }) {
  return (
    <>
      <Encabezado titulo={titulo} />
      <Vacio icono={icono} titulo="En construcción" texto="Esta sección llega en la siguiente parte." />
    </>
  );
}
