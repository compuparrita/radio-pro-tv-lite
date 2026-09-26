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

## Filosofía del proyecto

> **Si se la complicamos, la gente jala de aquí.**

Toda nueva función debe priorizar simplicidad para el usuario y reutilización del código existente.
