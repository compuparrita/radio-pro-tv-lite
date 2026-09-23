# Contexto técnico del proyecto

Radio FM es una aplicación de streaming de radio y televisión construida con React 18, TypeScript y Vite, con empaquetado móvil mediante Capacitor para Android.

## Componentes principales

- **Frontend (`src/`)**: `main.tsx` inicia la aplicación y `App.tsx` compone la interfaz. `components/` contiene reproductor, lista y gestión de emisoras, navegación y chat; `context/RadioContext.tsx` centraliza el estado de reproducción, estaciones, preferencias y persistencia, mientras `ChatContext.tsx` gestiona el chat. Los hooks encapsulan reproducción (`usePlayer`, `useVideoPlayer`) y controles remotos (`useTVRemote`). `services/` integra Socket.IO y Supabase; `data/` y `types/` reúnen datos y modelos.
- **Reproducción multimedia**: Video.js y HLS.js cubren streams de audio y video. `public/stations.json` aporta datos de emisoras y recursos estáticos como manifiesto PWA, service worker e imágenes.
- **Backend (`server/`)**: servidor Node.js con Express y Socket.IO para chat en tiempo real, presencia de oyentes y endpoint de salud. Mantiene historial breve en memoria, limita la frecuencia de mensajes y sanitiza entradas. También expone proxies para streams y sirve el build web.
- **Build y configuración**: Vite configura el desarrollo, proxies de streams y división de bundles; TypeScript valida el código. `scripts/prepare-tv-lite.js` prepara la variante TV Lite, y `capacitor.config.ts` configura la app Android.
- **Plataformas y artefactos**: `android/` contiene el proyecto nativo de Capacitor. `dist/`, `dist-tv-lite/` y `server/dist/` son artefactos compilados, no fuentes principales. `legacy_backup/` es respaldo legado.

## Comandos útiles

- `npm run dev`: servidor frontend de desarrollo (puerto 3000 según Vite).
- `npm run build`: chequeo TypeScript y build de producción.
- `cd server && npm run dev`: backend en desarrollo (puerto 3001 por defecto).
- `npm run build:tv-lite`: prepara el bundle TV Lite y sincroniza Android.

El proyecto raíz declara React/Capacitor y librerías multimedia y de interfaz; el backend tiene su propio `package.json` y dependencias.
