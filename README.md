# RawFit · Kit de Seguimiento

App web instalable (PWA) de [@rawfit.stella](https://instagram.com/rawfit.stella) para registrar hábitos, medidas, fotos de progreso y entrenamientos desde el celular. Es la versión app de la plantilla de Excel del kit.

- **Sin cuenta ni servidor:** todo (fotos incluidas) se guarda en el dispositivo con IndexedDB (Dexie).
- **Funciona sin internet** una vez abierta o instalada.
- **Copia de seguridad:** en *Ajustes* puedes exportar un archivo JSON con todos los datos y fotos (en base64) e importarlo en otro celular.

## Secciones

| Sección | Qué hace |
|---|---|
| Inicio | Saludo, frase del día, hábitos de hoy, racha, peso, recordatorios y gráfica de peso |
| Hábitos | Semana navegable, marcar/desmarcar con animación, rachas, mapa de constancia y % de los últimos 30 días; editar, ordenar, pausar o eliminar hábitos |
| Medidas | Peso, % grasa, cintura, cadera, pecho, brazo y muslo; gráfica por medida, cambio desde el inicio e historial (verde si baja, rojo si sube) |
| Fotos | Fotos por fecha y pose (frente, perfil, espalda), visor y comparador antes/después con deslizador |
| Entrenos | Tipo, duración, esfuerzo y ejercicios (series, reps, peso); entrenos por semana y resumen del mes |
| Ajustes | Perfil, objetivo, peso meta, unidades (kg/lb, cm/in), exportar/importar copia, borrar datos |

## Desarrollo

```bash
npm install
npm run dev       # servidor de desarrollo
npm run build     # verificación de tipos + build de producción en dist/
npm run preview   # sirve el build (con service worker)
npm run icons     # regenera los íconos PNG de la PWA
```

Stack: React + Vite + TypeScript + Tailwind CSS v4, Dexie, Recharts y vite-plugin-pwa. Las fuentes (Bebas Neue e Inter) están incluidas localmente para que funcionen sin conexión.

Para publicarla basta con subir la carpeta `dist/` a cualquier hosting estático con HTTPS (Netlify, Vercel, GitHub Pages, Cloudflare Pages…).
