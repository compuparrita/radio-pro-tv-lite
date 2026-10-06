# Arquitectura de UI

## Estado

La arquitectura contextual actual es `App → PanelHost → PanelShell → vista activa`. La migración de las cuatro superficies principales está cerrada: WatchParty, General Help, Chat Help y Profile.

## Objetivo

Compartir el comportamiento transversal de paneles relevantes y mantener navegación global separada del contexto de una actividad.

## Concepto

- `PanelHost` determina qué panel está activo a partir del estado que recibe.
- `PanelShell` es infraestructura común de presentación e interacción; no es el lugar de la lógica particular de WatchParty, Profile o Help.
- La vista activa contiene el contenido y la lógica específica.
- Panel derecho = contexto de la actividad. Una futura variante izquierda = navegación global y preferencias.

## UX / funcionamiento previsto

PanelShell centraliza portal, superficie, header, cierre/regreso, Escape, gestión del foco, inert durante el cierre, scroll interno, safe areas, dimensiones responsive, animaciones, backdrop y conexión con tokens de tema. La vista interna puede navegar sin crear otro panel o backdrop cuando el flujo lo requiera.

En el uso previsto, cerrar una vista interna de ayuda regresa a la vista anterior; cerrar el panel es una acción distinta. `X` cierra la superficie y la flecha de regreso navega dentro de ella.

## Decisiones cerradas

- WatchParty, General Help, Chat Help y Profile utilizan PanelHost/PanelShell.
- `UserProfileGate` / registro permanece fuera: es una entrada obligatoria de pantalla completa, no un panel contextual.
- `StationManager` permanece fuera; su guía es un estado/vista interna del gestor.
- No todo modal, overlay, menú, popover, lightbox o guía debe convertirse en PanelShell.
- No abrir una migración general nueva sin una necesidad concreta.
- Las esquinas actuales son rectas (`border-radius: 0` en el sistema global de botones); no introducir radios locales por trabajo puntual.
- El scrollbar principal es independiente de los paneles. No ocultarlo ni bloquearlo para corregir capas, ni ajustar z-index a ciegas; investigar el elemento de scroll y los stacking contexts antes de cambiar composición.

## Pendientes

- La variante izquierda de PanelShell todavía es una dirección futura para el menú global, no una capacidad que deba darse por implementada.
- Validar cada cambio de composición o navegación con su propia fase y comprobarlo en el navegador cuando corresponda.
- Los controles especializados pueden consumir tokens temáticos sin convertirse en `.btn`.

## No implementar todavía

- No migrar indiscriminadamente superficies al sistema de paneles.
- No duplicar PanelShell/backdrop ni trasladar lógica de dominio al PanelHost.
- No cambiar protocolo, sincronización o autoridad Host/Guest de WatchParty como parte de trabajo de arquitectura UI.

## Relación con el proyecto actual

El sistema global de botones está implementado en `src/index.css` y cerrado. Acciones convencionales migradas: ProfilePanel, UserProfileForm, General Help, Help Chat, WatchParty, Footer, Header/Cine-Sala, MobileNav y acciones convencionales de StationManager. No todos los elementos `<button>` pertenecen a `.btn`.

Se mantienen especializados Player, QualitySelector, controles especializados de Chat, acciones compactas de filas de StationManager, selector Audio/TV, cierres especializados y drag handles. En StationManager queda como trabajo futuro evaluar tokens semánticos para los rojos de Borrar/Eliminar y los azules de Editar, conservando geometría; no se justifica una nueva variante global solo para esos controles.
