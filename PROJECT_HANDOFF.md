# RADIO PRO — PROJECT HANDOFF

> Documento de relevo entre sesiones de ChatGPT, Codex y otros entornos.
> No reemplaza ARCHITECTURE.md; únicamente registra el estado operativo del proyecto.

---

## Estado del repositorio

- **Proyecto:** RADIO PRO / Centro Multimedia
- **Rama:** main
- **HEAD:** `dfbaed2`
- **Árbol de trabajo:** ✅ Limpio
- **ARCHITECTURE.md:** SSOT vigente

---

## Última fase completada

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

### Fase 10 — Sincronización avanzada (Drift 2.0)

Pendientes:

1. Actualizar `stateVersion` al aplicar acciones remotas.
2. Separar VOD y Live para la corrección de posición.
3. Revisar heartbeats (3 s) y drift.
4. Pruebas por tipo de medio:
   - Audio en vivo
   - HLS en vivo
   - YouTube
   - Video bajo demanda
5. Medir desfase real antes de modificar tolerancias.

> Importante: esta fase fue pospuesta deliberadamente y aún no debe mezclarse con cambios de UX.

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