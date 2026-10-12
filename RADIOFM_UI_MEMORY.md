# RadioFM — memoria de continuidad UI

> Índice breve del estado actual y de las decisiones arquitectónicas activas. Las visiones y conceptos de largo plazo están separados en capítulos autónomos bajo [`docs/memory/`](docs/memory/00_INDEX.md).
>
> Proyecto: `C:\radiofm` · Actualizado: 2026-10-12
>
> Esta memoria complementa `ARCHITECTURE.md`: ese documento describe la arquitectura técnica general; esta raíz resume continuidad de UI/UX y enlaza los capítulos temáticos.

## Estado actual y decisiones activas

### Paneles

- La arquitectura de superficies contextuales es `App → PanelHost → PanelShell → vista activa`.
- `PanelHost` decide la superficie activa; `PanelShell` aporta la infraestructura transversal y cada vista conserva su contenido y lógica.
- WatchParty, General Help, Chat Help y Profile están migrados a `PanelShell` y la fase principal de migración quedó cerrada.
- `UserProfileGate` / registro inicial es una entrada de pantalla completa y permanece fuera de `PanelShell`. `StationManager` también permanece fuera; su guía es una vista interna.
- Panel contextual derecho significa contexto de la actividad; el menú global izquierdo utiliza `PanelHost` y `PanelShell` para navegación y preferencias globales.
- No todo modal, overlay, menú, popover, lightbox o guía debe convertirse en `PanelShell`.

### Temas y componentes

- Hay exactamente tres identificadores internos: `dark`, `light` y `youth`.
- Apariencias acordadas: `youth` = Black; `light` = Claro; `dark` = apariencia Juvenil azul/naranja. El selector mantiene `dark → light → youth → dark` y muestra el siguiente destino.
- Sin `localStorage.theme`, el valor predeterminado es `youth` (apariencia Black). Una preferencia guardada se respeta. Eliminar el perfil no elimina la preferencia de tema.
- Nuevos componentes deben utilizar tokens temáticos semánticos existentes; evitar estilos visuales aislados.

### Tamaño global del texto

- El selector global está implementado en `GlobalMenu`: Pequeño `0.90`, Normal `1.00` y Grande `1.10`. Normal es el valor predeterminado y debe conservar los tamaños base actuales.
- `App.tsx` persiste la preferencia `textSize` en `localStorage` con niveles `1`, `2` y `3`, restaura la selección y la aplica mediante `document.documentElement.dataset.textSize`.
- `src/index.css` define `--reading-text-scale`; la clase optativa `.reading-text` marca los textos que participan. La variable en `:root` también está disponible en paneles y modales renderizados mediante portales.
- El alcance es explícito: no escalar indiscriminadamente botones, iconos, campos, navegación, controles del reproductor ni dimensiones estructurales. Ayuda conserva sus reglas responsivas y Perfil sus reglas tipográficas dedicadas.
- Los mensajes del chat conservan `break-words`/`break-all`; el contenido de lectura marcado puede escalar sin cambiar la lógica ni el formato del chat.
- Archivos de la fase: `src/index.css`, `src/App.tsx`, `src/components/GlobalMenu.tsx`, `src/components/GeneralHelpModal.tsx`, `src/components/ProfilePanel.tsx`, `src/components/panels/PanelShell.tsx`, `src/components/UserProfileForm.tsx`, `src/components/SidebarInfo.tsx`, `src/components/StationList.tsx`, `src/components/Player.tsx`, `src/components/StationManager.tsx`, `src/components/RoomChatTicker.css`, `src/components/GuestCinemaLayout.tsx`, `src/components/HelpModal.tsx`, `src/components/WatchPartyModal.tsx` y `src/components/ChatModal.tsx`. En `ChatModal.tsx` se añadieron marcas a textos legibles; se preservaron sus cambios locales preexistentes y no se rediseñó el chat.
- Validación técnica: `npx tsc --noEmit --pretty false` sin errores; `npm run build` correcto con salida temporal (Vite mostró aviso de chunk grande); `git diff --check` código 0 con avisos LF/CRLF.
- Chromium aislado: en móvil de 390 px, Ayuda midió `10.8 / 12 / 13.2 px` y Perfil `12.6 / 14 / 15.4 px` para niveles `1 / 2 / 3`. En escritorio de 1280 px, Ayuda y Perfil midieron `12.6 / 14 / 15.4 px`. Se confirmó persistencia tras recarga y no hubo desbordamiento horizontal en esas muestras.
- La prueba del usuario confirmó controles concretos en Dark, Light y Youth y el flujo aprobado en móvil; esto no se presenta como una revisión integral de todas las listas/tarjetas ni de mensajes largos. Cualquier otra verificación debe formar parte de una futura regresión acotada.

### Botones

- El sistema global `.btn` está implementado y cerrado en `src/index.css`; centraliza base, variantes semánticas y modificadores, manteniendo `border-radius: 0`.
- Se migraron acciones convencionales de Profile, formulario de perfil, ayudas, WatchParty, Footer, Header/Cine-Sala, MobileNav y StationManager.
- No se deben absorber automáticamente todos los `<button>`. Player, QualitySelector, controles especializados de Chat, filas compactas de StationManager, Audio/TV segmentado, cierres especializados y drag handles permanecen fuera mientras no haya una razón concreta.
- Pendiente futuro de StationManager: evaluar tokens semánticos para rojo de Borrar/Eliminar y azul de Editar, preservando su geometría; no crear una variante global solo para eso.

### Navegación de emisoras y tema móvil

- `#root` es el scroller real también en móvil; `.station-scroll` no tiene altura acotada. En escritorio, SidebarInfo y los filtros de escritorio comparten `.station-list-sticky` debajo del Header. En móvil, SidebarInfo se oculta; la fila de filtros conserva sticky por separado y usa la altura medida con ResizeObserver del wrapper sticky del reproductor más el área segura superior. La caja de filtros usa `--dark-bg`. El usuario probó los filtros Radios, Favoritos y TV & YT y aprobó su ubicación y persistencia en móvil; un borde fino entre reproductor y filtros se considera aceptable.
- `SidebarInfo` conserva saludo, hora y estado/conteo de conexión; no tiene acciones. Su superficie y fila secundaria usan tokens de tema y el margen inferior es compacto.
- MobileNav conserva el botón Tema inferior izquierdo conectado al mismo `onThemeClick` global (`dark → light → youth → dark`). El botón de menú global sigue en Header.
- Header: Chat, Cine y Perfil comparten `btn-primary` y texto blanco. El fondo toma el token primario activo (Dark `#0077FF`, Light `#2867b2`, Youth `#FF6829`); hover, active, focus-visible y disabled provienen del sistema `.btn`. Los filtros permanecen intactos.
- La búsqueda global de emisoras/YouTube/Google reside en Header; conserva el estado compartido con StationList y sus controladores existentes.
- Tipografía: se retiró la integración de Inter; `body` no fuerza `font-family`, y Tailwind vuelve a su configuración predeterminada. La utilidad `font-mono` se mantiene solo donde se declara explícitamente. TV Lite sigue independiente.
- El título de marca de Header lleva `.reading-text` para participar en la escala global sin modificar el tamaño base del encabezado ni su icono; el usuario confirmó que responde al selector Normal/Small/Large.
- Auditoría de historial (2026-10): cada inicialización se suscribe a Realtime y luego consulta los últimos 50 mensajes en orden cronológico. La reconciliación deduplica por id, ordena por timestamp y conserva eventos realtime/pending que llegan durante la consulta. Fallos de consulta ahora rechazan la promesa en vez de presentarse como un historial vacío.
- Favoritos siguen usando la misma consulta y combinación local/nube; los errores ahora se propagan al catch de RadioContext, por lo que no se tratan como una nube vacía ni disparan el respaldo local. La identidad remota usa teléfono si el perfil lo tiene; el fallback `chatUserId` vive en localStorage y no sincroniza automáticamente dispositivos distintos.
- El panel de Chat General y el visor de imágenes se montan mediante portales en `document.body`; las capturas quedan visibles por encima del chat y cerrar el visor mantiene abierto el chat. El usuario verificó el scroll del chat sin desplazar el fondo y el arrastre/reposición sin limitar artificialmente el borde derecho. La implementación captura el puntero desde el asa de arrastre y limpia la interacción ante `pointerup`, `pointercancel` o `lostpointercapture`; la eliminación de la comprobación global de selección es una explicación del código, no una causa reproducida de forma aislada.
- El usuario probó recientemente el historial en Windows y móvil y considera aceptable la coincidencia actual de mensajes; la carga inicial conserva la estrategia documentada de 50 mensajes + Realtime y reconciliación por ID/tiempo. No implica cambios al esquema ni a las políticas de Supabase.

### Perfil y registro

- El registro obligatorio se presenta con `UserProfileGate` y el formulario reutilizable `UserProfileForm`; Profile usa el mismo formulario dentro de su panel, sin duplicar el flujo.
- Regla central: si se elimina el perfil, `hasProfile` pasa a falso y la aplicación vuelve al registro; crear un perfil nuevamente debe funcionar sin recarga. No es un sistema de autenticación externa.

### Alcance y continuidad

- Las fases de UI/UX se abren, delimitan, implementan y validan una por una. Las ideas futuras de los capítulos no son tareas aprobadas ni funcionalidades actuales.
- Antes de editar, revisar el estado real de Git y preservar cambios locales ajenos. No incluirlos en commits de documentación o UI sin decisión explícita.
- Para una sesión nueva, leer este resumen y luego únicamente el capítulo de `docs/memory/` relevante. Consultar `ARCHITECTURE.md` cuando la tarea dependa de arquitectura técnica general.

### Roadmap de UI activo

1. **Selector global de texto:** implementación técnica completada.
2. **Cobertura del texto escalable:** el título del Header responde al selector Normal/Small/Large y el usuario lo aprobó. El selector global conserva `0.90 / 1.00 / 1.10`; ampliar la verificación a otros nodos solo en una futura regresión general, sin cambiar las escalas aprobadas sin autorización.
3. **Formato de lectura del chat:** fase futura independiente. Preservar la identidad naranja-violeta y las esquinas cuadradas; mejorar tipografía, mensajes largos, párrafos, listas, sangrías y ajuste de URL; conservar remitentes, marcas de tiempo, notas de audio, previsualizaciones de YouTube, reacciones, menciones, grabación, envío y comportamiento WatchParty.
4. **Modo Cine de escritorio:** dirección de producto a largo plazo, fuera del trabajo actual; ventana compacta centrada en el vídeo, controles externos de reproducción, chat integrado y logística de WatchParty.

## Cierre de sesión — 12 de octubre de 2026

- Inter fue retirada y se restauró la pila tipográfica predeterminada del navegador/sistema; TV Lite conserva su independencia.
- El usuario aprobó manualmente Dark, Light y Youth; Chat/Cine/Perfil; filtros; selector de tema de MobileNav; ocultación de SidebarInfo en móvil; sticky bajo los controles externos y el pequeño borde contiguo aceptado; y el título del Header conectado al tamaño global.
- El usuario verificó en móvil las correcciones visuales y ejecutó su build. Codex informó previamente TypeScript, `git diff --check` y build temporal correctos. No se repitió build durante el cierre.
- Las búsquedas de emisoras, YouTube y Google, y el historial reciente entre Windows y móvil, se consideran aceptables según las pruebas del usuario.
- Mantener una lista de regresión móvil/desktop. No reabrir decisiones aprobadas sin un defecto reproducible; un ajuste futuro del borde de un píxel queda para una revisión general de espaciado.

## Índice de memoria modular

| Capítulo | Contenido | Naturaleza |
|---|---|---|
| [00 — Índice](docs/memory/00_INDEX.md) | Mapa de capítulos, cómo consultar la memoria y diferencia entre estado y visión | Guía |
| [01 — Arquitectura UI](docs/memory/01_UI_ARCHITECTURE.md) | PanelHost/PanelShell, paneles, límites y decisiones UI cerradas | Estado y arquitectura activa |
| [02 — Chat y personalización](docs/memory/02_CHAT_AND_PERSONALIZATION.md) | Chat compartido, historial, scroll/portales y preferencia global de texto | Estado + visión futura |
| [03 — Menú global](docs/memory/03_GLOBAL_MENU.md) | Menú izquierdo implementado y navegación/preferencias globales | Estado actual |
| [04 — WatchParty Desktop](docs/memory/04_WATCHPARTY_DESKTOP.md) | Dirección futura para una ventana desktop independiente | Visión futura |
| [05 — RadioFM SaaS](docs/memory/05_RADIOFM_SAAS.md) | Propuesta de servicio para emisoras y experiencia de oyentes | Visión estratégica |
| [06 — Publicidad y monetización](docs/memory/06_ADVERTISING_AND_MONETIZATION.md) | Espacios publicitarios, administración y posible monetización | Visión estratégica |
| [07 — Ideas futuras](docs/memory/07_FUTURE_IDEAS.md) | Ideas aún sin definición suficiente, separadas de decisiones y tareas | Buzón de ideas |

## Registro de mantenimiento

Esta raíz evita una bitácora cronológica extensa. La historia detallada anterior se conserva en el historial Git; los capítulos modulares conservan las decisiones vigentes, los objetivos, los pendientes y los límites de implementación.
