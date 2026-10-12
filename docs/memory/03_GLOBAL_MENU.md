# Menú global izquierdo

## Estado

El menú global izquierdo está implementado dentro de la composición normal de la aplicación mediante `PanelHost` y la variante izquierda de `PanelShell`.

## Objetivo

Ofrecer acceso compacto a navegación global y preferencias, separado de los paneles contextuales derechos que pertenecen a la actividad abierta.

## Concepto

La referencia es la captura proporcionada por el usuario: un panel lateral compacto y claro. La referencia orienta la calidad y disposición general; no se debe copiar literalmente ni asumir detalles no definidos.

La infraestructura actual es `PanelHost → PanelShell`; `PanelShell` admite `side="left"` para esta superficie.

## UX / funcionamiento previsto

Entradas actuales:

- LITE.
- Selector de tema.
- Selector de tamaño del texto.
- Ayuda general.
- Administrar estaciones.
- QR de acceso general a RadioFM.

Izquierda significa navegación global y preferencias. Derecha significa contexto de la actividad. El panel izquierdo debe sentirse compacto y no sustituir las superficies contextuales derechas.

## Decisiones cerradas

- Reutilizar el patrón arquitectónico PanelHost/PanelShell, no crear un sistema de paneles paralelo.
- Mantener la semántica izquierda = global/preferencias y derecha = contexto.
- El selector tipográfico ofrece Pequeño/Normal/Grande (`0.90`/`1.00`/`1.10`) y persiste `textSize`; la escala se aplica solo a textos marcados.

## Pendientes

- Completar la validación visual del selector en móvil, escritorio y temas Dark, Light y Youth.

## No implementar todavía

- No asumir que el menú necesita duplicar lógica, backdrop o infraestructura de PanelShell.
- Mantener estas acciones conectadas a sus handlers existentes; no duplicar sus vistas ni persistencia.

## Relación con el proyecto actual

PanelHost y PanelShell presentan tanto superficies contextuales como el menú global, cada una con su lado y alcance. La existencia del menú no implica coexistencia simultánea con un panel contextual ni autoriza cambios a la navegación de salas.
