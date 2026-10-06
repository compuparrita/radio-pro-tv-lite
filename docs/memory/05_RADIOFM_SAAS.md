# Visión RadioFM SaaS para emisoras

## Estado

Visión estratégica de largo plazo. No describe un producto SaaS ya implementado ni define un plan de entrega.

## Objetivo

Explorar RadioFM como servicio de precio muy accesible para emisoras de Costa Rica y, posteriormente, otros mercados.

## Concepto

Cada emisora tendría su propia instancia, configuración y branding. La experiencia del cliente se adapta a una emisora concreta; no necesita mostrar una lista de emisoras. Una demo comercial podría utilizar una sola emisora y contenido de demostración.

## UX / funcionamiento previsto

- La emisora conserva su programación habitual.
- La emisora define una biblioteca o carpeta musical preseleccionada.
- Los oyentes visualizan opciones de esa biblioteca y seleccionan sus favoritas; aproximadamente tres selecciones por oyente es un punto de partida, no una cifra final aprobada.
- La lógica de programación e interacción permite que el DJ conserve control editorial.
- El sistema busca reducir parte de la carga operativa del DJ y aumentar la interacción con oyentes.
- Chat en tiempo real como experiencia más integrada que depender de WhatsApp.
- Posibilidad de video en vivo.
- Experiencia unificada de radio, video, chat y solicitudes musicales.

La publicidad y su posible monetización se detallan por separado en [`06_ADVERTISING_AND_MONETIZATION.md`](06_ADVERTISING_AND_MONETIZATION.md).

## Decisiones cerradas

- La visión es multi-cliente: una emisora por configuración/instancia de cliente.
- El DJ conserva el control editorial; las solicitudes de oyentes no deben equivaler a control automático de programación.
- Asequibilidad y facilidad de adopción son objetivos estratégicos.

## Pendientes

- Definir el modelo de instancias, configuración, branding y operación por cliente.
- Diseñar permisos y flujo editorial de solicitudes.
- Precisar biblioteca musical, integración de programación, chat y video.
- Validar la propuesta con emisoras y determinar prioridades de mercado.

## No implementar todavía

- No fijar arquitectura multi-tenant, infraestructura, precios, límites o contratos sin una fase de producto específica.
- No convertir la cifra aproximada de tres selecciones en regla definitiva.
- No sustituir el criterio editorial del DJ por automatización no acordada.
- No asumir que cada componente de esta visión existe en el RadioFM actual.

## Relación con el proyecto actual

RadioFM aporta contexto de streaming, interacción y WatchParty que podría informar esta visión. La estrategia SaaS requeriría definir alcance y arquitectura por separado; no es una extensión automática de la UI actual.
