# 📻 Radio Streaming Pro — Contenido y Funcionalidades de la Aplicación

> **Documento de referencia funcional.** Describe el contenido, las funcionalidades y el comportamiento esperado de Radio Streaming Pro. La arquitectura técnica detallada, las decisiones de implementación y los procedimientos de mantenimiento deben documentarse por separado.

## 1. Resumen del proyecto

**Radio Streaming Pro** es una plataforma de streaming que reúne emisoras de radio, canales de televisión, reproducción de video y una comunidad de usuarios con chat en tiempo real.

La aplicación permite escuchar emisoras de distintos países, visualizar canales de televisión y compartir experiencias con otros usuarios. Incorpora un reproductor multimedia y un sistema **WatchParty** para coordinar la reproducción entre los participantes de una sala.

El proyecto combina tres áreas principales:

* **Streaming:** reproducción de radio, televisión y video.
* **Comunidad:** chat en tiempo real e interacción entre usuarios.
* **WatchParty:** salas compartidas con sincronización de reproducción entre anfitrión e invitados.

---

## 2. Funcionalidades principales

### 2.1. Radio en vivo

* Acceso a emisoras de distintos países, entre ellos Costa Rica, España y Argentina.
* Reproducción de transmisiones de audio en vivo.
* Selección de emisoras desde el directorio de contenido.
* Acceso rápido a emisoras favoritas.

### 2.2. Televisión y video

* Reproducción de canales de televisión y transmisiones de video.
* Compatibilidad con distintas fuentes multimedia, según el canal:

  * Streams HLS.
  * Reproductores de YouTube.
  * Reproductores externos mediante iframe.
  * Reproducción de video compatible con el reproductor integrado.
* Controles de reproducción disponibles según el tipo de fuente.
* Selección de calidad cuando la fuente y el reproductor lo permiten.

La disponibilidad de controles y funciones puede variar según el proveedor, el formato de transmisión y las restricciones del contenido.

### 2.3. Buscador

* Filtrado de emisoras y canales.
* Búsqueda para localizar contenido dentro de la aplicación.
* Integración con búsquedas de YouTube, según la funcionalidad disponible en la versión instalada.

### 2.4. Favoritos

* Guardado de emisoras o contenidos favoritos.
* Acceso rápido al contenido seleccionado por el usuario.

### 2.5. Chat en vivo

La aplicación incorpora un sistema de comunicación en tiempo real basado en Socket.IO.

Sus funcionalidades incluyen:

* Identificación del usuario mediante un nombre.
* Intercambio de mensajes en tiempo real.
* Historial de mensajes recientes.
* Contador de oyentes conectados.
* Sanitización de mensajes para reducir riesgos asociados al contenido enviado por los usuarios.

### 2.6. Reproductor y controles multimedia

La aplicación cuenta con un reproductor que gestiona distintos tipos de fuentes.

Entre sus capacidades se encuentran:

* Reproducción y pausa.
* Gestión de fuentes de audio y video.
* Integración con Video.js para fuentes compatibles.
* Integración con la API de YouTube.
* Compatibilidad con reproductores externos.
* Control de volumen, cuando la fuente lo permite.
* Gestión de eventos de reproducción y cambios de contenido.

Los controles disponibles dependen de las capacidades de cada reproductor. Por ejemplo, una transmisión en vivo no necesariamente permite buscar una posición anterior o posterior.

---

## 3. WatchParty — Reproducción compartida

WatchParty permite que varios usuarios compartan una sala y coordinen la reproducción de contenido multimedia.

El sistema distingue entre el **Host (anfitrión)** y los **Guests (invitados)**.

### 3.1. Roles

**Host**

* Crea y administra la sesión de reproducción compartida.
* Determina el contenido que se reproduce en la sala, de acuerdo con los permisos implementados.
* Actúa como referencia de sincronización para los invitados.
* Puede ejecutar las acciones de reproducción autorizadas.

**Guest**

* Se une a una sala mediante el mecanismo de acceso disponible.
* Recibe las actualizaciones de reproducción de la sala.
* Puede utilizar las acciones de reproducción que el servidor autorice.
* Puede necesitar iniciar o sincronizar la reproducción mediante una interacción explícita con el reproductor.

### 3.2. Sincronización de reproducción

WatchParty coordina las acciones de reproducción entre los participantes.

El comportamiento de sincronización contempla:

* Reproducción y pausa.
* Sincronización de la posición para contenido compatible.
* Corrección de diferencias de reproducción cuando el tipo de contenido lo permite.
* Recuperación del estado de reproducción al incorporarse a una sala o volver a conectarse.
* Validación de acciones según el rol del usuario y las reglas del servidor.

La sincronización de una transmisión en vivo no debe interpretarse como una garantía de que todos los participantes reciben exactamente el mismo instante de la señal. Las diferencias de latencia, buffering y distribución del proveedor pueden producir desfases.

### 3.3. Capacidades según el tipo de contenido

| Tipo de contenido                       | Play/Pause           | Buscar posición               | Sincronización de posición |
| --------------------------------------- | -------------------- | ----------------------------- | -------------------------- |
| YouTube / video bajo demanda compatible | Sí                   | Sí, sujeto a permisos         | Sí                         |
| Televisión en vivo mediante HLS         | Sí                   | No como función de WatchParty | No                         |
| Radio en vivo                           | Sí                   | No                            | No                         |
| Reproductores externos / iframe         | Según compatibilidad | Según compatibilidad          | Según compatibilidad       |

**Principio funcional:** las acciones compartidas deben respetar las capacidades reales de cada fuente. Una transmisión en vivo puede sincronizar las acciones de reproducción sin imponer una posición temporal común.

### 3.4. Sincronización de YouTube

Para contenido de YouTube compatible, WatchParty puede sincronizar la posición de reproducción entre Host y Guests.

El sistema contempla:

* Cálculo del tiempo transcurrido desde el estado de reproducción del Host.
* Aplicación de la posición correspondiente al incorporarse o sincronizarse.
* Ejecución de búsquedas de posición remotas antes de continuar la reproducción, cuando corresponde.
* Sincronización de volumen mediante la API del reproductor, cuando está disponible.
* Una acción explícita de sincronización para los casos en que el navegador restringe la reproducción automática.

### 3.5. Reglas de autoridad y permisos

El servidor valida las acciones recibidas de los participantes.

* Las acciones están sujetas a validación de rol y tipo de contenido.
* Los Guests pueden solicitar las acciones de reproducción permitidas por el servidor.
* La búsqueda de posición está restringida según el tipo de contenido y los permisos vigentes.
* Los Guests no deben generar emisiones recursivas de acciones como consecuencia de eventos locales de buffering o corrección.
* Los cambios de contenido y las acciones administrativas deben respetar las reglas de autoridad del servidor.

La implementación del servidor es la referencia definitiva para los permisos efectivos.

---

## 4. Directorio de emisoras y canales

El siguiente inventario corresponde al contenido documentado para la aplicación. La disponibilidad de cada fuente puede variar con el tiempo por cambios del proveedor, enlaces, restricciones regionales o condiciones de la transmisión.

### 4.1. Televisión y video

| Nombre             | País / origen | Categoría    |
| ------------------ | ------------- | ------------ |
| Oldies Hits TV     | Costa Rica    | Música TV    |
| DW Español         | Alemania      | Noticias     |
| RT en Español      | Rusia         | Noticias     |
| Telesur            | Venezuela     | Noticias     |
| Repretel Canal 6   | Costa Rica    | Noticias     |
| Teletica Canal 7   | Costa Rica    | Noticias     |
| Nat Geo en Español | Internacional | Animales     |
| Discovery Channel  | Internacional | Documentales |
| France 24          | Francia       | Noticias     |
| Euronews           | Internacional | Noticias     |
| CNN en Español     | Internacional | Noticias     |
| NTN24              | Latinoamérica | Noticias     |

### 4.2. Emisoras de radio destacadas

| Nombre              | Origen     | Estilo              |
| ------------------- | ---------- | ------------------- |
| Radio Omega         | Costa Rica | Música              |
| Oldies Hits 70s/80s | España     | Relax               |
| Radio Disney        | Costa Rica | Música              |
| Columbia 98.7 FM    | Costa Rica | Noticias / Deportes |
| Bésame 89.9 FM      | Costa Rica | Romántica           |
| IQ Radio 93.9       | Costa Rica | Inteligente         |
| Super Radio         | Costa Rica | Éxitos              |
| Teletica Radio      | Costa Rica | Noticias            |
| Radio Sinfonola     | Costa Rica | Clásicos            |

---

## 5. Arquitectura funcional del reproductor

El reproductor selecciona el mecanismo de reproducción según el tipo de fuente.

| Tecnología / fuente | Uso                                                                  |
| ------------------- | -------------------------------------------------------------------- |
| Video.js / VHS      | Reproducción de video y fuentes HLS compatibles                      |
| YouTube IFrame API  | Reproducción de videos de YouTube y funciones de control compatibles |
| HTML5 Audio         | Reproducción de emisoras de audio compatibles                        |
| HTML5 Video         | Reproducción de fuentes de video compatibles                         |
| iframe externo      | Integración de reproductores de terceros                             |

### 5.1. Ciclo de vida del reproductor

El reproductor debe gestionar correctamente:

* Montaje y desmontaje de elementos multimedia.
* Cambios de emisora o canal.
* Inicialización y limpieza de instancias de reproductores.
* Eventos de carga, reproducción, pausa y buffering.
* Actualización de la fuente multimedia.
* Integración entre el estado local del reproductor y el estado de WatchParty.

En particular, el ciclo de vida de YouTube debe mantener coherencia entre React, el elemento iframe y la instancia de la API. La API no debe destruir un elemento que React siga considerando vigente.

### 5.2. Cambio de contenido

Al cambiar de canal o video, la aplicación debe evitar que el reproductor conserve referencias obsoletas al contenido anterior.

El cambio de fuente debe coordinar:

1. La actualización del contenido seleccionado.
2. El ciclo de vida del elemento multimedia.
3. La inicialización del reproductor correspondiente.
4. La actualización del estado de reproducción.
5. La sincronización de WatchParty, cuando exista una sala activa.

### 5.3. Reproductores externos

Los canales que utilizan iframe dependen de la implementación y disponibilidad del proveedor externo.

La aplicación debe conservar correctamente la URL de origen y evitar modificaciones de parámetros que puedan alterar rutas, consultas o direcciones de reproducción.

---

## 6. Detalles técnicos

### 6.1. Frontend

* React.
* Vite.
* TypeScript.
* CSS para la interfaz y sus componentes.
* Video.js para fuentes de video compatibles.
* Integración con la API de YouTube.
* Socket.IO Client para la comunicación en tiempo real.

### 6.2. Backend

* Node.js.
* Express.
* Socket.IO.
* Validación de acciones de WatchParty.
* Gestión de salas y participantes.
* Distribución de eventos de reproducción y estado.

### 6.3. Streaming

La aplicación trabaja con diferentes modalidades de reproducción:

* Audio en vivo.
* Video bajo demanda.
* Video en vivo mediante HLS.
* Videos de YouTube.
* Reproductores externos integrados mediante iframe.

Cada modalidad tiene limitaciones y capacidades propias. La compatibilidad depende tanto de la aplicación como de los proveedores de contenido.

### 6.4. Plataformas

La aplicación está orientada a navegadores modernos, incluidos Chrome y Edge, además de dispositivos móviles compatibles.

El comportamiento concreto puede variar según el navegador, el sistema operativo, las políticas de reproducción automática y las capacidades del dispositivo.

---

## 7. Seguridad y validación

La aplicación incorpora mecanismos de control en la comunicación entre clientes y servidor.

Aspectos relevantes:

* Validación de acciones de WatchParty en el servidor.
* Restricción de acciones según rol y tipo de contenido.
* Sanitización de mensajes del chat.
* Gestión de conexiones y desconexiones.
* Control del estado de los participantes en las salas.

La validación del cliente mejora la experiencia de uso, pero no sustituye la validación del servidor.

---

## 8. Estado funcional documentado

La versión actual ha recibido mejoras en la reproducción y en la sincronización de WatchParty.

Según las pruebas y el trabajo de implementación reportados:

* Se corrigieron problemas relacionados con el ciclo de vida del iframe de YouTube.
* Se mejoró la sincronización temporal entre Host y Guests para YouTube.
* Se incorporó la aplicación de la posición remota antes de continuar la reproducción, cuando corresponde.
* Se reforzó la validación de acciones en el servidor.
* Se añadieron mecanismos de sincronización manual para situaciones en las que el navegador restringe la reproducción automática.
* Se corrigió el tratamiento de parámetros en URLs de reproductores externos.

**Estado:** la sincronización de WatchParty se encuentra funcional según las pruebas realizadas por el usuario. Los ajustes menores pendientes pueden registrarse como tareas de mantenimiento sin alterar el comportamiento que ya funciona.

Este apartado debe actualizarse cuando se incorporen nuevas funciones o se completen pruebas relevantes.

---

## 9. Documentación relacionada

Para evitar que este documento se convierta en una descripción excesivamente técnica, la información debe distribuirse entre documentos especializados:

| Documento            | Propósito                                                       |
| -------------------- | --------------------------------------------------------------- |
| `APP_CONTENT.md`     | Contenido, funcionalidades y visión general de la aplicación    |
| `ARCHITECTURE.md`    | Arquitectura, módulos, dependencias y flujo de datos            |
| `WATCHPARTY.md`      | Salas, roles, sincronización, permisos y protocolo              |
| `PLAYER.md`          | Reproductor, tecnologías, ciclo de vida y resolución de fuentes |
| `CHANGELOG.md`       | Cambios realizados por versión o commit                         |
| `TROUBLESHOOTING.md` | Problemas conocidos, diagnóstico y soluciones verificadas       |

---

## 10. Criterio de mantenimiento

Este documento describe el producto desde la perspectiva funcional.

Cuando una funcionalidad cambie:

1. Actualizar la descripción funcional correspondiente.
2. Registrar los cambios técnicos en la documentación especializada.
3. Añadir al changelog los cambios relevantes.
4. Distinguir entre comportamiento implementado, comportamiento probado y trabajo pendiente.
5. Evitar documentar como garantizada una capacidad que dependa de un proveedor externo o que todavía no haya sido probada.

---

*Documento de referencia de Radio Streaming Pro. Debe mantenerse alineado con el comportamiento real de la aplicación.*
