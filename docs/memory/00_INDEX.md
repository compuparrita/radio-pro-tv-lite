# Memoria modular de RadioFM

## Estado

La memoria de continuidad está dividida por áreas para consultar solo el contexto necesario. `RADIOFM_UI_MEMORY.md` es el índice breve y resumen del estado actual; los capítulos describen arquitectura activa o visión futura según se indica abajo.

## Objetivo

Preservar decisiones y conceptos de RadioFM sin mantener un documento único extenso ni tratar automáticamente las ideas estratégicas como trabajo aprobado.

## Concepto

Cada capítulo debe poder leerse por separado. Distingue lo implementado de lo propuesto, registra decisiones cerradas y límites, y evita inventar decisiones técnicas que aún no existen.

## UX / funcionamiento previsto

Leer primero [`RADIOFM_UI_MEMORY.md`](../../RADIOFM_UI_MEMORY.md). Después, abrir únicamente el capítulo que corresponda a la tarea. Consultar más capítulos solo cuando exista una dependencia concreta.

| Archivo | Contenido | Clasificación |
|---|---|---|
| [`01_UI_ARCHITECTURE.md`](01_UI_ARCHITECTURE.md) | PanelHost, PanelShell, navegación de paneles, límites y decisiones cerradas | Estado actual y arquitectura activa |
| [`02_CHAT_AND_PERSONALIZATION.md`](02_CHAT_AND_PERSONALIZATION.md) | Chat compartido, legibilidad de mensajes y personalización futura | Estado actual + propuestas |
| [`03_GLOBAL_MENU.md`](03_GLOBAL_MENU.md) | Menú lateral global izquierdo y sus posibles destinos | Visión futura |
| [`04_WATCHPARTY_DESKTOP.md`](04_WATCHPARTY_DESKTOP.md) | Cliente/ventana desktop minimalista para presentaciones y contenido compartido | Visión futura |
| [`05_RADIOFM_SAAS.md`](05_RADIOFM_SAAS.md) | Servicio configurable para emisoras y experiencia de oyentes | Visión estratégica |
| [`06_ADVERTISING_AND_MONETIZATION.md`](06_ADVERTISING_AND_MONETIZATION.md) | Gestión de anuncios y posible monetización | Visión estratégica |
| [`07_FUTURE_IDEAS.md`](07_FUTURE_IDEAS.md) | Ideas todavía insuficientemente definidas | Buzón de ideas |

## Decisiones cerradas

- La raíz `RADIOFM_UI_MEMORY.md` se mantiene como resumen activo e índice, no como cronología exhaustiva.
- Los capítulos 01 y 02 pueden contener estado vigente; los capítulos 03–07 registran conceptos futuros y no describen funcionalidades implementadas.
- En todos los capítulos, “Pendientes” no equivale a una tarea autorizada. Una fase concreta requiere alcance y decisión propios.

## Pendientes

- Cuando una idea se convierta en decisión o tarea, actualizar primero el capítulo relevante y el resumen raíz si afecta el estado activo.
- Mantener capítulos concisos y autónomos; evitar copiar la misma especificación completa entre capítulos.

## No implementar todavía

No iniciar una idea solo porque esté documentada aquí. No deducir frameworks, protocolos, modelos de datos, estrategia comercial o compromisos de producto que no hayan sido decididos.

## Relación con el proyecto actual

La arquitectura técnica general permanece en `ARCHITECTURE.md`. Esta memoria cubre continuidad de UI/UX y visión de producto. El código y las validaciones actuales prevalecen sobre descripciones históricas cuando exista una discrepancia; documentar la diferencia sin reescribir historia útil.
