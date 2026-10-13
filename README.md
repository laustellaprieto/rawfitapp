# RawFit App

App web instalable (PWA) de **Stella Prieto · Entrenadora deportiva · [@rawfit.stella](https://instagram.com/rawfit.stella)** para registrar hábitos, medidas, fotos de progreso y entrenamientos desde el celular.

- **Sin cuenta ni servidor:** todo (fotos incluidas) se guarda en el dispositivo con IndexedDB (Dexie).
- **Funciona sin internet** una vez abierta o instalada.
- **Copia de seguridad:** en Ajustes se exporta un archivo JSON con todos los datos y las fotos (en base64) y se importa en otro celular.

## Secciones

| Sección | Qué hace |
|---|---|
| Onboarding | Nombre, fecha de inicio, sexo, edad, estatura, peso, objetivo, cálculo de calorías (basales, mantenimiento y meta: definición, mantenimiento o volumen con su %) y macros con rangos recomendados según la meta y los 10 hábitos (editables) |
| Hoy | Saludo con el día del reto, checklist, anillo de % del día, racha (≥ 80 %) con logros y felicitaciones (1, 7, 15, 30 días y cada mes), calorías y macros del día, accesos rápidos y aviso de foto cada 15 días |
| Hábitos | Cuadrícula mensual hábitos × días, % por hábito, por día y del mes |
| Progreso | Peso, cintura y abdomen; resumen, gráficas, análisis automático, cintura/estatura; check-ins de fotos (frente, perfil, espalda) con comparador antes/después |
| Entreno | Sesiones con ejercicios del banco, series con reps, kg y RIR; volumen, historial, récords y volumen por grupo muscular |
| Ejercicios | Banco de 112 ejercicios con filtros y buscador; ejercicios propios |
| Ajustes | Datos, calorías, hábitos, copia de seguridad, borrar datos y aviso de salud |

## Archivos que puedes editar sin programar

- `src/data/ejercicios.ts` — el banco de ejercicios (nombre, grupo, equipo y nivel).
- `src/data/habitos.ts` — los 10 hábitos iniciales, los emojis disponibles, el pie de página y el aviso de salud.

Puedes editarlos directo en GitHub (ícono del lápiz ✏️ → “Commit changes”). Vercel o Netlify publican el cambio solos en un par de minutos.

---

## Cómo publicarla gratis y compartirla en tu bio de Instagram

No necesitas instalar nada en tu computadora: todo se hace desde el navegador. El código ya está en GitHub (`laustellaprieto/rawfitapp`).

> **Antes de empezar:** el código de la app está en la rama `claude/rawfit-tracking-pwa-3su4rn`. Pásalo a la rama principal (`main`): en GitHub entra al repositorio, toca **“Compare & pull request”** (o *Pull requests → New pull request*, eligiendo esa rama), luego **“Create pull request”** y **“Merge pull request”**. Así Vercel/Netlify publicarán siempre la versión final.

### Opción A: Vercel (recomendada)

1. Entra a **vercel.com** y toca **Sign Up** → **Continue with GitHub**. Acepta los permisos.
2. Elige el plan **Hobby** (gratis) y escribe tu nombre.
3. Toca **Add New… → Project**.
4. En la lista aparece **rawfitapp**: toca **Import**. (Si no aparece, toca *Adjust GitHub App Permissions* y dale acceso a ese repositorio).
5. Vercel detecta todo solo (Framework: *Vite*). No cambies nada y toca **Deploy**.
6. Espera 1–2 minutos. Verás confeti 🎉 y un link tipo `rawfitapp.vercel.app`. ¡Esa es tu app!
7. *(Opcional)* Para un nombre más bonito: en el proyecto, **Settings → Domains → Edit** y cámbialo, por ejemplo, a `rawfit-app.vercel.app` (si está libre).

### Opción B: Netlify

1. Entra a **netlify.com** → **Sign up** → **GitHub**.
2. Toca **Add new site → Import an existing project → GitHub** y elige **rawfitapp**.
3. Netlify lee la configuración del archivo `netlify.toml` (Build command `npm run build`, Publish directory `dist`). Toca **Deploy**.
4. En 1–2 minutos tendrás un link tipo `nombre-raro.netlify.app`. Cámbialo en **Site configuration → Change site name** (por ejemplo, `rawfit-app`).

### Ponerla en tu bio de Instagram

1. Abre Instagram → tu perfil → **Editar perfil → Enlaces → Agregar enlace externo**.
2. Pega el link (por ejemplo, `https://rawfit-app.vercel.app`) y ponle de título **“RawFit App”**.
3. Guarda. ¡Listo!

### Qué decirle a tu comunidad para instalarla

- **iPhone:** abrir el link en **Safari** → botón **Compartir** → **“Agregar a inicio”**.
- **Android:** abrir el link en **Chrome** → menú **⋮** → **“Instalar app”**.
- Queda como una app más, con el ícono de RawFit, y funciona sin internet.
- Recuérdales **exportar una copia** desde Ajustes de vez en cuando: los datos viven solo en su celular.

### Cuando hagas cambios

Cada vez que se guarde un cambio en la rama `main` de GitHub, Vercel/Netlify vuelven a publicar la app solos. Las personas que ya la instalaron reciben la nueva versión la próxima vez que la abran con internet, sin perder sus datos.

---

## Para desarrolladores

```bash
npm install
npm run dev       # servidor de desarrollo
npm run build     # verificación de tipos + build de producción en dist/
npm run preview   # sirve el build (con service worker)
npm run icons     # regenera los íconos de la PWA a partir de assets/logo.png
```

Stack: React + Vite + TypeScript + Tailwind CSS v4, Dexie, Recharts y vite-plugin-pwa. Fuentes (Bebas Neue e Inter) incluidas localmente para funcionar sin conexión.

Estructura:

```
src/
├── data/        ejercicios.ts (banco) · habitos.ts (hábitos iniciales y textos)
├── lib/         db (Dexie) · fechas · habitos (%, racha) · progreso · entreno · copia · celebraciones
├── components/  Icon, Sheet, Anillo, Delta, Gráficas, Racha, Celebracion, EditorHabitos…
└── pages/       Onboarding · Hoy · Habitos · progreso/ · entreno/ · Ejercicios · Ajustes
```
