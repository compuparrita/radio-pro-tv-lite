# RadioFM — memoria de continuidad UI

> Índice breve del estado actual y de las decisiones arquitectónicas activas. Las visiones y conceptos de largo plazo están separados en capítulos autónomos bajo [`docs/memory/`](docs/memory/00_INDEX.md).
>
> Proyecto: `C:\radiofm` · Actualizado: 2026-10-06
>
> Esta memoria complementa `ARCHITECTURE.md`: ese documento describe la arquitectura técnica general; esta raíz resume continuidad de UI/UX y enlaza los capítulos temáticos.

## Estado actual y decisiones activas

### Paneles

- La arquitectura de superficies contextuales es `App → PanelHost → PanelShell → vista activa`.
- `PanelHost` decide la superficie activa; `PanelShell` aporta la infraestructura transversal y cada vista conserva su contenido y lógica.
- WatchParty, General Help, Chat Help y Profile están migrados a `PanelShell` y la fase principal de migración quedó cerrada.
- `UserProfileGate` / registro inicial es una entrada de pantalla completa y permanece fuera de `PanelShell`. `StationManager` también permanece fuera; su guía es una vista interna.
- Panel contextual derecho significa contexto de la actividad. El panel global izquierdo es una dirección futura, no una implementación actual.
- No todo modal, overlay, menú, popover, lightbox o guía debe convertirse en `PanelShell`.

### Temas y componentes

- Hay exactamente tres identificadores internos: `dark`, `light` y `youth`.
- Apariencias acordadas: `youth` = Black; `light` = Claro; `dark` = apariencia Juvenil azul/naranja. El selector mantiene `dark → light → youth → dark` y muestra el siguiente destino.
- Sin `localStorage.theme`, el valor predeterminado es `youth` (apariencia Black). Una preferencia guardada se respeta. Eliminar el perfil no elimina la preferencia de tema.
- Nuevos componentes deben utilizar tokens temáticos semánticos existentes; evitar estilos visuales aislados.

### Botones

- El sistema global `.btn` está implementado y cerrado en `src/index.css`; centraliza base, variantes semánticas y modificadores, manteniendo `border-radius: 0`.
- Se migraron acciones convencionales de Profile, formulario de perfil, ayudas, WatchParty, Footer, Header/Cine-Sala, MobileNav y StationManager.
- No se deben absorber automáticamente todos los `<button>`. Player, QualitySelector, controles especializados de Chat, filas compactas de StationManager, Audio/TV segmentado, cierres especializados y drag handles permanecen fuera mientras no haya una razón concreta.
- Pendiente futuro de StationManager: evaluar tokens semánticos para rojo de Borrar/Eliminar y azul de Editar, preservando su geometría; no crear una variante global solo para eso.

### Perfil y registro

- El registro obligatorio se presenta con `UserProfileGate` y el formulario reutilizable `UserProfileForm`; Profile usa el mismo formulario dentro de su panel, sin duplicar el flujo.
- Regla central: si se elimina el perfil, `hasProfile` pasa a falso y la aplicación vuelve al registro; crear un perfil nuevamente debe funcionar sin recarga. No es un sistema de autenticación externa.

### Alcance y continuidad

- Las fases de UI/UX se abren, delimitan, implementan y validan una por una. Las ideas futuras de los capítulos no son tareas aprobadas ni funcionalidades actuales.
- Antes de editar, revisar el estado real de Git y preservar cambios locales ajenos. No incluirlos en commits de documentación o UI sin decisión explícita.
- Para una sesión nueva, leer este resumen y luego únicamente el capítulo de `docs/memory/` relevante. Consultar `ARCHITECTURE.md` cuando la tarea dependa de arquitectura técnica general.

## Índice de memoria modular

| Capítulo | Contenido | Naturaleza |
|---|---|---|
| [00 — Índice](docs/memory/00_INDEX.md) | Mapa de capítulos, cómo consultar la memoria y diferencia entre estado y visión | Guía |
| [01 — Arquitectura UI](docs/memory/01_UI_ARCHITECTURE.md) | PanelHost/PanelShell, paneles, límites y decisiones UI cerradas | Estado y arquitectura activa |
| [02 — Chat y personalización](docs/memory/02_CHAT_AND_PERSONALIZATION.md) | Chat compartido, ideas de legibilidad y preferencias visuales futuras | Estado + visión futura |
| [03 — Menú global](docs/memory/03_GLOBAL_MENU.md) | Menú izquierdo y navegación/preferencias globales | Visión futura |
| [04 — WatchParty Desktop](docs/memory/04_WATCHPARTY_DESKTOP.md) | Concepto de cliente/ventana desktop independiente | Visión futura |
| [05 — RadioFM SaaS](docs/memory/05_RADIOFM_SAAS.md) | Propuesta de servicio para emisoras y experiencia de oyentes | Visión estratégica |
| [06 — Publicidad y monetización](docs/memory/06_ADVERTISING_AND_MONETIZATION.md) | Espacios publicitarios, administración y posible monetización | Visión estratégica |
| [07 — Ideas futuras](docs/memory/07_FUTURE_IDEAS.md) | Ideas aún sin definición suficiente, separadas de decisiones y tareas | Buzón de ideas |

## Registro de mantenimiento

Esta raíz evita una bitácora cronológica extensa. La historia detallada anterior se conserva en el historial Git; los capítulos modulares conservan las decisiones vigentes, los objetivos, los pendientes y los límites de implementación.
