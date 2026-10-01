2. Causas de los problemas detectados
Desmontaje y recreación del iframe de YouTube:
En Player.tsx, el contenedor y el <iframe> tenían una key ligada a currentStation.id (key={tech-container-
{playerType}}).
Cada vez que cambiaba el video, React destruía por completo el nodo del iframe del DOM. La instancia de la API de YouTube (ytPlayerRef.current) quedaba apuntando a un elemento huérfano y el nuevo iframe quedaba en blanco.
Sincronización desfasada entre Host y Guest:
En WatchPartyContext.tsx, cuando un invitado presionaba sincronizar (syncPlayback), se enviaba action: 'play' con payload: null, haciendo que el invitado reprodujera desde el segundo 0:00 en vez de calcular el tiempo transcurrido del anfitrión (room.playback.currentTime + elapsed).
En useVideoPlayer.ts, la acción remota play ignoraba los segundos pendientes de seek, reproduciendo desde el inicio.
En Player.tsx, los eventos locales del reproductor del invitado (al almacenar en buffer o corregir drift) intentaban emitir acciones sendAction a la sala, bloqueando los controles del invitado o recibiendo rechazo del servidor (NOT_HOST).
3. Soluciones implementadas
Montaje estable del iframe de YouTube (Player.tsx & useVideoPlayer.ts):
Se estabilizaron las claves (tech-container-${playerType} e id="youtube-player-iframe"). El iframe se mantiene en el DOM sin recargas innecesarias.
Se habilitó la navegación fluida (loadVideoById / cueVideoById) sin parpadeos ni pantallas negras.
Se agregó sincronización de volumen directa con la API de YouTube (setVolume).
Sincronización exacta Host/Guest (WatchPartyContext.tsx & server/index.js):
Cálculo de tiempo real: syncPlayback() ahora calcula el tiempo exacto transcurrido del anfitrión y aplica el seekTo correspondiente al instante.
Protección de roles: Solo el anfitrión emite cambios de reproducción a la sala; los invitados reproducen y ajustan su reproductor localmente sin generar conflictos en el servidor.
Experiencia de invitado: Se añadieron botones claros y directos de "Sincronizar ahora" tanto en el reproductor como en GuestCinemaLayout.tsx para sortear las restricciones de autoplay de los navegadores.
Compilación verificada: La aplicación compila limpiamente sin errores de TypeScript ni de empaquetado.

---
src/components/Player.tsx: Contenedores e iframes con claves estables (id="youtube-player-iframe"), protección de roles para anfitrión/invitado y banner interactivo de sincronización.
src/hooks/useVideoPlayer.ts: Ciclo de vida y navegación fluida de la API de YouTube (loadVideoById/cueVideoById), soporte de volumen directo y ejecución prioritaria de seekTo antes de reproducir en acciones remotas.
src/context/WatchPartyContext.tsx: Cálculo matemático del tiempo transcurrido del anfitrión al unirse o sincronizar, regex compatible con todos los formatos de enlaces de YouTube y restricción de comandos para invitados.
src/components/GuestCinemaLayout.tsx: Banner persistente de un solo clic para superar las restricciones de autoplay de los navegadores.
server/index.js: Validación estricta del anfitrión (NOT_HOST) en watchparty:action para evitar desincronizaciones accidentales por parte de los invitados.
Documentación y configuraciones: Todos los archivos .md, package.json, configuraciones de Capacitor y scripts de compilación para TV Lite y APK.
---
El <iframe> de YouTube no tenía atributo src en el JSX: El reproductor delegaba la asignación del src a una rutina imperativa en JavaScript (useVideoPlayer.ts) que intentaba reutilizar la misma instancia mediante loadVideoById.
Eliminación del nodo DOM por la API de YouTube: Cuando cambiabas de video o de canal, la rutina llamaba a player.destroy(). Según la especificación oficial de la API de YouTube, .destroy() elimina el nodo del iframe del DOM, pero React no lo sabía. Como la clave (key) era estática, React no volvía a crear el iframe, dejando la pantalla en negro y sin URL montada.
Parámetros en iframes externos: Se estaban añadiendo parámetros forzados (&autoplay=1&muted=0&mute=0&volume=100) a todas las URLs de canales de TV externos, lo que causaba que servidores con rutas codificadas o proxies rechazaran la URL o fallaran al cambiar de canal.
Correcciones aplicadas
Inyección directa del src en el JSX (Player.tsx):
El iframe de YouTube ahora monta directamente su URL embed en el DOM (src={youtubeEmbedSrc}), garantizando que el video y la URL siempre existan y carguen de inmediato sin depender de que los scripts externos terminen de inicializarse.
Ciclo de vida por estación con clave única (key dinámica):
Se asignaron claves únicas tanto al contenedor como al iframe (key={iframe-yt-
{ytId}} y key={tech-container-
{playerType}}).
Al cambiar a otro video de YouTube o canal de TV, React desmonta limpiamente el elemento anterior y monta un iframe nuevo con su URL correcta.
Inicialización no destructiva en useVideoPlayer.ts:
Se eliminó el intento de reutilización forzada (loadVideoById) que borraba el nodo del DOM.
La API de YouTube ahora se conecta directamente al iframe recién montado, manteniendo la sincronización de la WatchParty, volumen y estado de reproducción sin destruir elementos.
URLs de iframes externos protegidas:
Se limpió la concatenación de parámetros para evitar corromper los reproductores externos de canales de televisión.

---

Se ha implementado la configuración de permisos solicitada, tanto en el cliente como en el servidor Socket.IO de la WatchParty:
Cambios implementados:
Permiso de Play / Pausa para invitados en todos los medios:
En el servidor (server/index.js): Se permite que cualquier invitado conectado a la sala emita acciones de play y pause sin importar el tipo de medio (canales de TV, streams HLS, radio o YouTube).
En el cliente (WatchPartyContext.tsx y Player.tsx): Cuando un invitado presiona el botón de reproducción/pausa o interactúa con el reproductor, la orden se envía a la sala y se sincroniza inmediatamente con todos los participantes.
Permiso de Seek (adelantar / retroceder) exclusivo para YouTube:
En el servidor (server/index.js): Si un invitado intenta enviar una acción seek, el servidor comprueba que el medio actual sea mediaType === 'youtube'. Si se trata de un canal en vivo o radio, la acción se restringe para evitar desincronizar transmisiones en directo.
En el cliente (Player.tsx): La barra de tiempo y las acciones de seek solo se transmiten a la sala si el usuario es el anfitrión o si el contenido que se está reproduciendo es un video de YouTube.