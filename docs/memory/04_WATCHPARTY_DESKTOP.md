# WatchParty Desktop independiente

## Estado

Concepto de producto futuro. No es una funcionalidad implementada ni una decisión tecnológica cerrada.

## Objetivo

Explorar una pequeña ventana profesional para compartir contenido durante demos comerciales, presentaciones de productos y sesiones con clientes.

## Concepto

Cliente o ventana desktop minimalista, wide/rectangular, centrada en el contenido y sin apariencia de navegador. Debe sentirse como una aplicación pequeña y profesional, no como una página web.

## UX / funcionamiento previsto

- Permitir arrastrar un archivo MP4.
- Permitir mostrar una presentación.
- Permitir introducir una URL de YouTube.
- Ofrecer controles mínimos: inicialmente play/pause y los estrictamente necesarios.
- Mantener el contenido como foco principal.
- Reutilizar la tecnología WatchParty existente cuando sea conveniente.

## Decisiones cerradas

- El producto deseado es una ventana de escritorio minimalista y ancha, sin cromado visual de navegador.
- La reutilización de WatchParty es una preferencia cuando resulte conveniente, no una obligación que resuelva todas las decisiones técnicas.

## Pendientes

- Validar necesidades del caso de uso y del flujo de demos.
- Determinar formatos, límites y controles indispensables.
- Elegir la tecnología de empaquetado solo en una fase posterior informada.

## No implementar todavía

- No elegir todavía Electron, Tauri, JavaScript puro, otro lenguaje o framework.
- No prometer soporte de archivos, presentaciones o servicios externos hasta definir una fase concreta.
- No alterar la aplicación web o el protocolo WatchParty existente para anticipar el empaquetado.

## Relación con el proyecto actual

RadioFM ya tiene tecnología WatchParty en la aplicación actual. La futura ventana podría reutilizarla, pero la compatibilidad, arquitectura y límites aún deben investigarse antes de implementar.
