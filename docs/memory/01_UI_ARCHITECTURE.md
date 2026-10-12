# Arquitectura de UI

## Estado

La arquitectura contextual actual es `App → PanelHost → PanelShell → vista activa`. WatchParty, General Help, Chat Help, Profile y el menú global izquierdo usan la infraestructura compartida; la variante izquierda de `PanelShell` mantiene la semántica de navegación global.

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
- GlobalMenu también se registra en PanelHost y se presenta mediante PanelShell con `side="left"`; no crea una segunda gestión de portal, backdrop o foco.
- `UserProfileGate` / registro permanece fuera: es una entrada obligatoria de pantalla completa, no un panel contextual.
- `StationManager` permanece fuera; su guía es un estado/vista interna del gestor.
- No todo modal, overlay, menú, popover, lightbox o guía debe convertirse en PanelShell.
- La escala global de texto es una preferencia de lectura optativa: `--reading-text-scale` vive en `:root` y `.reading-text` marca los nodos incluidos. Los portales heredan la variable; controles y dimensiones estructurales quedan fuera salvo decisión explícita.
- No abrir una migración general nueva sin una necesidad concreta.
- Las esquinas actuales son rectas (`border-radius: 0` en el sistema global de botones); no introducir radios locales por trabajo puntual.
- El scrollbar principal es independiente de los paneles. No ocultarlo ni bloquearlo para corregir capas, ni ajustar z-index a ciegas; investigar el elemento de scroll y los stacking contexts antes de cambiar composición.
- Chat General y su visor de capturas son overlays especializados montados en `document.body` mediante portales; el visor debe quedar por encima del panel del chat. No deben convertirse automáticamente a `PanelShell`.
- El panel de Chat General tiene su propio scroller de mensajes; la posición del panel es independiente del scrollbar principal de `#root`. El usuario confirmó manualmente el scroll y arrastre del chat sin mover el fondo y el movimiento del panel hasta el borde derecho.
- La interfaz principal no carga una fuente web propia ni fuerza `font-family` en `body`; conserva la pila de sistema predeterminada de Tailwind/navegador. TV Lite mantiene su tipografía independiente. El selector Pequeño/Normal/Grande y sus tamaños no cambian.
- La utilidad `font-mono` se conserva solo donde se solicita explícitamente para contenido técnico como códigos y tiempos.
- Los botones Chat, Cine y Perfil del Header comparten la variante primaria basada en tokens del tema y texto blanco, igualando su jerarquía entre Dark, Light y Youth. Los handlers e indicadores siguen iguales; la fila de filtros no se modifica.
- La búsqueda compartida para emisoras/YouTube/Google está en Header; los tres filtros de emisoras están junto a StationList. El usuario aprobó las búsquedas y la ubicación/funcionamiento de Radios, Favoritos y TV & YT.
- En móvil, `SidebarInfo` se oculta y los filtros quedan sticky inmediatamente debajo de los controles externos del reproductor. El usuario acepta por ahora el borde fino contiguo entre ambos módulos. MobileNav conserva su control original de tema en la esquina inferior izquierda; el menú global permanece en Header.
- El usuario probó y aprobó el tratamiento de Dark, Light y Youth, Chat/Cine/Perfil, así como la respuesta del título de marca del Header al selector Normal/Small/Large. No reabrir esos ajustes sin un defecto reproducible.
- La integración de Inter fue retirada; la interfaz principal usa la pila tipográfica predeterminada del sistema/navegador. TV Lite permanece independiente.

## Pendientes

- Validar cada cambio de composición o navegación con su propia fase y comprobarlo en el navegador cuando corresponda.
- Los controles especializados pueden consumir tokens temáticos sin convertirse en `.btn`.

## No implementar todavía

- No migrar indiscriminadamente superficies al sistema de paneles.
- No duplicar PanelShell/backdrop ni trasladar lógica de dominio al PanelHost.
- No cambiar protocolo, sincronización o autoridad Host/Guest de WatchParty como parte de trabajo de arquitectura UI.

## Relación con el proyecto actual

El sistema global de botones está implementado en `src/index.css` y cerrado. Acciones convencionales migradas: ProfilePanel, UserProfileForm, General Help, Help Chat, WatchParty, Footer, Header/Cine-Sala, MobileNav y acciones convencionales de StationManager. No todos los elementos `<button>` pertenecen a `.btn`.

Se mantienen especializados Player, QualitySelector, controles especializados de Chat, acciones compactas de filas de StationManager, selector Audio/TV, cierres especializados y drag handles. En StationManager queda como trabajo futuro evaluar tokens semánticos para los rojos de Borrar/Eliminar y los azules de Editar, conservando geometría; no se justifica una nueva variante global solo para esos controles.
