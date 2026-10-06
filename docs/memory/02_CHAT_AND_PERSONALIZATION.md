# Chat y personalización

## Estado

Chat General y Chat de Sala comparten `ChatModal`. El chat contiene interacciones y comportamiento especializados; no se debe asumir que sus controles deban migrarse al sistema global `.btn`.

## Objetivo

Mejorar la lectura y composición de conversaciones, especialmente mensajes largos, y permitir preferencias visuales globales acotadas sin crear un sistema paralelo de temas.

## Concepto

Una experiencia común de chat para General y Sala, con superficies coherentes con el tema activo. Las preferencias futuras deben ser globales y persistentes, no soluciones distintas por pantalla.

## UX / funcionamiento previsto

- Borde visual minimalista de aproximadamente 1px.
- Rediseñar la composición de burbujas para mensajes largos y textos de aproximadamente 400 caracteres.
- Evaluar ancho y padding, line-height, separación de párrafos, presentación de URLs y prevención de overflow.
- Puede evaluarse una diferenciación sutil de fondo/color por tema.
- Añadir en el futuro una escala global de tamaño de texto.
- Evaluar opciones limitadas de contraste o color del texto.
- Persistir preferencias de personalización en `localStorage`.

Estos puntos describen dirección, no una especificación visual final ni valores aprobados.

## Decisiones cerradas

- General y Sala siguen utilizando el mismo `ChatModal`.
- Mantener el comportamiento existente de teclado/`visualViewport`, scroll, entrada de texto y particularidades táctiles al trabajar en Chat.
- Chat es una familia de controles especializada; no forzar `.btn` a sus controles internos solo por ser `<button>`.
- Las preferencias futuras no deben borrar ni reemplazar la preferencia existente de tema.

## Pendientes

- Definir una fase independiente de legibilidad de mensajes largos y comprobarla con mensajes extensos, URLs y distintos temas.
- Definir alcance, controles y límites de la escala tipográfica global.
- Determinar si las preferencias de contraste/color aportan una necesidad real y cómo se relacionan con los tokens actuales.

## No implementar todavía

- No rediseñar Chat incidentalmente durante otras fases.
- No crear personalización ilimitada ni otra arquitectura de temas.
- No alterar teclado móvil, drag/resize o sincronización al perseguir ajustes visuales.
- No presentar estas ideas como funcionalidades ya disponibles.

## Relación con el proyecto actual

ChatModal es una superficie de comportamiento propio, distinta de PanelShell. General Help y Chat Help pueden utilizar PanelShell, pero el Chat en sí permanece compartido y especializado. Cualquier futura preferencia global podría ofrecerse desde el futuro menú izquierdo descrito en [`03_GLOBAL_MENU.md`](03_GLOBAL_MENU.md).
