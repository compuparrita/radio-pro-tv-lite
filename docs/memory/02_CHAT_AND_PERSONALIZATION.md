# Chat y personalización

## Estado

Chat General y Chat de Sala comparten `ChatModal`. El chat contiene interacciones y comportamiento especializados; no se debe asumir que sus controles deban migrarse al sistema global `.btn`.

El selector global de tamaño de texto ya está implementado. En `ChatModal.tsx` ciertos textos legibles, incluido el contenido de mensajes, están marcados para responder a la escala; esto no constituye un rediseño del chat ni una validación visual de mensajes reales largos.

## Objetivo

Mejorar la lectura y composición de conversaciones, especialmente mensajes largos, y permitir preferencias visuales globales acotadas sin crear un sistema paralelo de temas.

## Concepto

Una experiencia común de chat para General y Sala, con superficies coherentes con el tema activo. Las preferencias futuras deben ser globales y persistentes, no soluciones distintas por pantalla.

## UX / funcionamiento previsto

- Borde visual minimalista de aproximadamente 1px.
- Rediseñar la composición de burbujas para mensajes largos y textos de aproximadamente 400 caracteres.
- Evaluar ancho y padding, line-height, separación de párrafos, presentación de URLs y prevención de overflow.
- Puede evaluarse una diferenciación sutil de fondo/color por tema.
- Aplicar la preferencia global ya existente solo a los textos de lectura marcados; mantener intactos los controles y la composición hasta la fase específica de formato del chat.
- Evaluar opciones limitadas de contraste o color del texto.
- Persistir preferencias de personalización en `localStorage`.

Estos puntos describen dirección, no una especificación visual final ni valores aprobados.

## Decisiones cerradas

- General y Sala siguen utilizando el mismo `ChatModal`.
- Mantener el comportamiento existente de teclado/`visualViewport`, scroll, entrada de texto y particularidades táctiles al trabajar en Chat.
- El Chat General superpuesto se monta en `document.body`; su lista de mensajes (`.custom-scrollbar`) es su propio scroller. El usuario verificó que la rueda y el arrastre de su scrollbar no desplazan la aplicación de fondo y que el panel puede moverse sin una limitación artificial del borde derecho.
- El visor de imágenes se monta también en `document.body`, por encima del panel. El usuario confirmó que la imagen se ve completa y que cerrar el visor deja abierto el chat.
- El asa de movimiento inicia una interacción Pointer Events capturando el puntero; `pointerup`, `pointercancel` y `lostpointercapture` terminan el gesto. La antigua consulta de selección global podía impedir iniciar el arrastre aunque la selección estuviera en otra parte; se retiró. Esta explicación está basada en el código, no en una prueba aislada de esa causa.
- Chat es una familia de controles especializada; no forzar `.btn` a sus controles internos solo por ser `<button>`.
- Las preferencias futuras no deben borrar ni reemplazar la preferencia existente de tema.
- La preferencia tipográfica existente usa `textSize` y la clase optativa `.reading-text`; no crear un estado de escala paralelo para el chat.
- La carga inicial activa Realtime antes de consultar los últimos 50 mensajes, deduplica por id y ordena por timestamp para conservar eventos recibidos mientras la consulta está en curso. Errores de red/consulta se propagan como fallo y no como historial vacío. El usuario considera aceptable el historial coincidente entre Windows y móvil en sus pruebas recientes; esto no confirma una causa backend ni altera el esquema/políticas.
- El área de mensajes es el scroller del panel y usa `min-h-0` y `overscroll-contain`.

## Pendientes

- Mantener pruebas de regresión del chat en desktop (barra y rueda), móvil, imágenes/visor, escritura y envío; no reabrir las correcciones aprobadas sin un defecto reproducible.
- Abordar como fase independiente el formato de lectura del chat: mensajes largos, párrafos, listas, sangrías, URLs y temas.
- Determinar si las preferencias de contraste/color aportan una necesidad real y cómo se relacionan con los tokens actuales.

## No implementar todavía

- No rediseñar Chat incidentalmente durante otras fases.
- No crear personalización ilimitada ni otra arquitectura de temas.
- No alterar teclado móvil, drag/resize o sincronización al perseguir ajustes visuales.
- No presentar estas ideas como funcionalidades ya disponibles.

## Relación con el proyecto actual

ChatModal es una superficie de comportamiento propio, distinta de PanelShell. General Help y Chat Help pueden utilizar PanelShell, pero el Chat en sí permanece compartido y especializado. La preferencia global de texto ya está disponible en el menú izquierdo descrito en [`03_GLOBAL_MENU.md`](03_GLOBAL_MENU.md); el formato de lectura del chat sigue pendiente y no debe mezclarse con lógica de mensajes o WatchParty.
