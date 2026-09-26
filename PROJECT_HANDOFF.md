# RADIO PRO — PROJECT HANDOFF

> Documento de relevo entre sesiones de ChatGPT, Codex y otros entornos.
> No reemplaza ARCHITECTURE.md; únicamente registra el estado operativo del proyecto.

---

## Estado del repositorio

- **Proyecto:** RADIO PRO / Centro Multimedia
- **Rama:** main
- **HEAD de Fase 10.0:** `f1eaf5c`
- **Árbol de trabajo:** ✅ Limpio
- **ARCHITECTURE.md:** SSOT vigente

---

## Última fase completada

### Fase 10.0 — Drift 2.0: sincronización inteligente

**Commit de implementación:** `f1eaf5c`

- `stateVersion` del heartbeat se toma del estado de sala vigente y solo se aceptan heartbeats con versión coincidente y posición válida.
- Los medios live (audio, HLS y TV embebida) conservan la corrección hacia el live edge.
- YouTube y VOD usan la posición del anfitrión; drift menor de 250 ms se ignora, de 250 ms a menos de 2 s se corrige suavemente y desde 2 s se hace seek directo.
- El intervalo de heartbeat permanece en 3 segundos.

### Fase 9 — Chat contextual de WatchParty

**Commit final:** `dfbaed2`

Se reutiliza un único `ChatModal`.

- Chat global fuera de una sala.
- Chat contextual por `roomCode` dentro de WatchParty.
- Historial en memoria asociado a la sala mediante Socket.IO.
- Rate limit por usuario implementado en servidor.
- No se creó una segunda interfaz de chat.

---

## Funcionalidades terminadas

- ✅ WatchParty estable
- ✅ Perfil unificado
- ✅ Guest Cinema
- ✅ Salir ≠ Abandonar
- ✅ QR SVG dinámico
- ✅ Deep Links (`?room=`)
- ✅ Chat contextual por sala

---

## Próxima fase

### Fase 10.1 — Validación multiprotocolo

Validar sincronización con audio live, HLS live, TV, YouTube y video bajo demanda; medir el desfase real sin cambiar los umbrales hasta completar las pruebas.

> La fase 10.1 se limita a validación y no requiere cambios de UX.

---

## Reglas arquitectónicas vigentes

- `App.tsx` decide los layouts.
- Nunca ocultar componentes mediante CSS.
- Un solo Player.
- Un solo ChatModal.
- Un solo UserProfileForm.
- `WatchPartyContext` es la fuente de verdad de la sala.

---

## Riesgos conocidos

- La sincronización todavía presenta pequeños desfases en algunos medios.
- Los heartbeats funcionan, pero falta validar la estrategia definitiva de Drift 2.0.
- Debian 32 bits: evitar dependencias nativas siempre que sea posible.

---

## Incidentes históricos

### HLS-001 (Resuelto)

**Síntoma**
El reproductor mostraba controles LIVE pero no video al abrir la aplicación.

**Causa**
VideoJS se inicializaba sobre un elemento <video> oculto que React reemplazaba durante el bootstrap.

**Solución**
Esperar al nodo visible antes de crear la instancia y descartar cualquier instancia asociada al nodo anterior.

Commit: 4f9369e

### WP-SYNC-001 (Resuelto)

**Síntoma**
Al recargar el navegador en canales de video/TV y dar play salía pantalla negra con letras (se escuchaba pero no se veía). Además, en WatchParty los invitados comenzaban a recargar el reproductor en bucle cada 3 segundos.

**Causa**
1. `Player.tsx` condicionaba el contenedor con `{hasVideo && isPlaying ?`, desmontando el reproductor en pausa e inicializando VideoJS sobre nodos efímeros con doble asignación de `player.src`.
2. `WatchPartyContext.tsx` permitía a los invitados ejecutar `changeMedia` en cada render de heartbeat cada 3 segundos, forzando `setCurrentStation` en bucle.
3. Se asumía erróneamente que YouTube siempre era live stream, disparando `goLive` forzado y buscando al final del video.

**Solución**
1. Mantener el reproductor montado de forma continua para medios con video (`{hasVideo ?`), controlando pausa/play a través de la API del reproductor sin desmontar el DOM ni asignar doble `src`.
2. Restringir `changeMedia` exclusivamente al anfitrión (`isHost`) tanto en frontend como en el servidor Socket.io.
3. Corregir la detección de transmisiones en vivo y aplicar ajuste suave de tasa de reproducción (`playbackRate`) para micro-desfases de 250ms a 1.5s, reservando seek directo para desfases mayores o pausas.

---

## Filosofía del proyecto

> **Si se la complicamos, la gente jala de aquí.**

Toda nueva función debe priorizar simplicidad para el usuario y reutilización del código existente.
