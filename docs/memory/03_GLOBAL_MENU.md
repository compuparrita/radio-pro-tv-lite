# Menú global izquierdo

## Estado

El menú hamburguesa global izquierdo es una visión futura. No se declara implementado por este documento.

## Objetivo

Ofrecer acceso compacto a navegación global y preferencias, separado de los paneles contextuales derechos que pertenecen a la actividad abierta.

## Concepto

La referencia es la captura proporcionada por el usuario: un panel lateral compacto y claro. La referencia orienta la calidad y disposición general; no se debe copiar literalmente ni asumir detalles no definidos.

La infraestructura prevista es `PanelHost → PanelShell`, con una futura variante de PanelShell que se abra desde la izquierda.

## UX / funcionamiento previsto

Posibles entradas, sujetas a definición posterior:

- LITE.
- Station Manager.
- Ayuda general.
- Perfil.
- Preferencias tipográficas.
- Preferencias limitadas de contraste/color.

Izquierda significa navegación global y preferencias. Derecha significa contexto de la actividad. El panel izquierdo debe sentirse compacto y no sustituir las superficies contextuales derechas.

## Decisiones cerradas

- Reutilizar el patrón arquitectónico PanelHost/PanelShell, no crear un sistema de paneles paralelo.
- Mantener la semántica izquierda = global/preferencias y derecha = contexto.
- La lista anterior es candidata; no implica que todas las entradas estén aprobadas como alcance final.

## Pendientes

- Definir apertura/cierre, estados activos, comportamiento responsive y relación con un panel derecho que ya esté abierto.
- Diseñar la futura variante izquierda sin afectar los consumidores existentes de PanelShell.
- Decidir el orden y alcance definitivo de las entradas.

## No implementar todavía

- No crear la variante izquierda como parte de una fase no relacionada.
- No asumir que el menú necesita duplicar lógica, backdrop o infraestructura de PanelShell.
- No convertir cada destino listado en una nueva vista antes de definir el flujo.

## Relación con el proyecto actual

PanelHost y PanelShell existen para las vistas contextuales actuales. Este capítulo propone su extensión futura; no modifica el mapa de paneles activos ni el comportamiento actual de navegación.
