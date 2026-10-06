# radiofm — Memoria de Arquitectura UI y Bitácora

> Documento de continuidad para mantener contexto entre sesiones y evitar reconstruir decisiones de arquitectura desde cero.
>
> Proyecto: `C:\radiofm`
> Última actualización: 2026-10-05
>
> **Regla:** este documento registra decisiones, invariantes, estado de fases, pruebas y próximos pasos. No sustituye `ARCHITECTURE.md`, que sigue siendo la fuente de verdad de la arquitectura técnica general del proyecto.

---

## 1. Propósito

Estamos evolucionando `radiofm` desde una interfaz basada en modales centradas hacia una interfaz de **paneles laterales contextuales**, más parecida a una aplicación de escritorio moderna.

Principio rector:

> Los paneles son parte de la aplicación, no interrupciones modales.

Por defecto, los paneles contextuales **no deben oscurecer fuertemente el fondo**. La separación visual debe lograrse mediante superficie, borde, sombra, profundidad, tipografía, iconografía y movimiento.

---

## 2. Arquitectura visual objetivo

### Panel global izquierdo

Responsabilidad: navegación global de la aplicación.

- Se abre desde la izquierda hacia la derecha.
- Equivalente conceptual al menú hamburguesa de YouTube.
- Contendrá navegación y ajustes globales.
- No debe confundirse con el panel contextual de Cine/WatchParty.

### Panel contextual derecho

Responsabilidad: contexto de la función actualmente activa.

Ejemplos:

- Cine / WatchParty
- Gestión de sala
- Ayuda contextual
- Futuras funciones contextuales

Se abre desde la derecha hacia la izquierda.

### Regla de semántica

- Izquierda = navegación global.
- Derecha = contexto de la actividad actual.

No crear un tercer sistema de paneles para resolver lo mismo.

---

## 3. WatchParty — navegación contextual definitiva

### Sin sala activa

Header:

`🎬 Cine`

Acción:

- abre el panel derecho WatchParty;
- permite Crear sala / Unirse.

### Sala activa + usuario en la App

Header:

`🎞 Sala`

Acción:

- regresa directamente a la sala activa / Modo Sala;
- no crea otra sala;
- no solicita código nuevamente;
- no desconecta Socket.IO;
- reutiliza `handleMobileWatchPartyNavigation`.

### Usuario dentro de Modo Sala

La flecha del Header de WatchParty **NO significa volver a la App**.

La flecha significa:

> Abrir el panel de gestión de la sala.

El panel contiene las acciones existentes, principalmente:

- `Ir a App` — sale de Modo Sala pero conserva la sala activa.
- `Abandonar sala` — abandona realmente la sala.
- Ayuda / otras acciones existentes cuando correspondan.

### Ir a App

Handler existente:

`handleReturnToApp`

Resultado:

- sale de Modo Sala;
- mantiene la sala activa;
- mantiene la conexión;
- vuelve a la App;
- Header pasa a `🎞 Sala`.

### Abandonar sala

Es la única acción que debe terminar la pertenencia a la sala.

Después de abandonar:

`🎬 Cine`

---

## 4. WatchParty Drawer — estado actual

La antigua modal central de WatchParty fue transformada en drawer derecho.

### Dimensiones

Desktop `>= 1200px`:

- ancho máximo actual: **23.75rem**.

Móvil:

- mantiene el ancho adaptable existente.

### Animación

- Entrada: **330ms**.
- Salida: **280ms**.

### Backdrop

Actualmente:

- transparente;
- sin oscurecimiento;
- sin blur.

Esto es intencional. No convertir el drawer en una modal tradicional.

### Stacking

El drawer debe estar por encima del resto de la aplicación y evitar problemas de stacking context. La capa del drawer debe comportarse como overlay global.

### Fase actual

El drawer ya funciona correctamente para:

- Crear sala.
- Unirse a sala.
- Gestión de sala.
- Ir a App.
- Abandonar sala.
- Apertura desde la flecha del Header.
- Navegación contextual `Cine / Sala`.

---

## 5. Ayuda dentro de WatchParty

La ayuda de WatchParty originalmente era una modal centrada independiente con su propio portal/backdrop.

Se cambió para que sea una **vista del mismo drawer**.

Conceptualmente:

`Gestión de sala → Ayuda`

No:

`Drawer → Modal centrada → Segundo backdrop`

### Comportamiento

- ocupa la misma superficie del drawer;
- mantiene el mismo ancho y posición;
- no crea un segundo backdrop;
- no oscurece el drawer;
- tiene control de regreso;
- Escape vuelve a gestión de sala sin cerrar el drawer.

Esto es el patrón que se quiere reutilizar para otras ayudas.

---

## 6. Dirección arquitectónica: un sistema único de paneles

Actualmente existen o existirán varias antiguas modales que deben migrarse:

1. Registro inicial.
2. Perfil / edición de perfil.
3. Ayuda general de la App.
4. Ayuda del Chat.
5. Ayuda de WatchParty.
6. Futuras preferencias/configuración.

### Estado de implementación

No crear un drawer independiente para cada función. La primera pieza común ya está implementada en `src/components/panels/PanelShell.tsx`.

`PanelShell` es una superficie contextual agnóstica al contenido. Centraliza:

- portal a `document.body` y capa del panel;
- superficie, cabecera, título, acción de regreso/cierre y pie opcional;
- scroll interno, safe areas, overflow y responsive;
- animaciones de entrada/salida;
- Escape, gestión y restauración del foco;
- colores y superficies mediante las variables CSS del sistema existente (`dark`, `light`, `youth`).

No contiene textos ni lógica de WatchParty, Socket.IO, `roomCode` o handlers de sala.

WatchParty Help es su primer consumidor real. El contenido sigue este flujo:

```text
help/watchparty.md
└── src/content/helpMarkdown.ts
    └── WatchParty Help
        └── PanelShell
```

`PanelHost` ya existe en `src/components/panels/PanelHost.tsx`. Decide qué panel registrado se renderiza. Actualmente registra `watchparty`, `general-help`, `chat-help` y `profile`; recibe desde App el estado y las acciones de cada vista, y suministra el `PanelShell` común sin trasladar la lógica específica al host. La arquitectura queda:

```text
PanelHost
└── PanelShell
    └── vista actualmente activa
```

Ejemplos de vistas:

```text
registro
perfil
help-general
help-chat
help-watchparty
```

Actualmente, `PanelHost` selecciona entre WatchParty Help, General Help, Chat Help y Profile según el estado recibido desde App. `PanelShell` presenta la superficie común. No se requieren nuevos registros inmediatos.

Solo se debe montar/renderizar la vista activa cuando sea razonable; no es necesario mantener todas las vistas montadas simultáneamente.

### Perfil y registro inicial

- Profile está migrado a `PanelHost`/`PanelShell`; la vista conserva la lógica de perfil y `UserProfileContext` conserva estado y persistencia.
- El registro inicial permanece como pantalla completa mediante `UserProfileGate` + `UserProfileForm` en modo `setup`; no es un panel.
- Profile y Registration comparten `UserProfileForm` y `UserProfileContext`, pero son flujos distintos.
- La presentación de Profile corresponde a `PanelShell`; la lógica de perfil permanece en la vista/contexto.
- No todo modal debe convertirse automáticamente en panel.

### Ventaja principal

La motivación principal no es únicamente rendimiento. Es evitar duplicación y divergencia de:

- CSS;
- transiciones;
- portales;
- focus management;
- Escape;
- accesibilidad;
- comportamiento responsive;
- estética.

---

### Estado consolidado — octubre de 2026

La arquitectura actual de las superficies contextuales es:

```text
App
↓
PanelHost
↓
PanelShell
↓
Vista activa
```

`PanelHost` decide qué panel está activo. `PanelShell` centraliza presentación y comportamiento transversal; la vista activa conserva el contenido y la lógica específica.

La migración de paneles principales está **CERRADA**. Las cuatro superficies migradas y validadas son WatchParty, General Help, Chat Help y Profile. La navegación y el comportamiento existente se conservaron. `PanelShell` centraliza portal, superficie, header, cierre/regreso, Escape, gestión de foco, inert durante el cierre, scroll interno, safe areas, dimensiones responsive, animaciones de 330ms / 280ms, backdrop e integración con las variables existentes de tema.

Registration / `UserProfileGate` permanece fuera de `PanelShell` por ser una entrada de pantalla completa. `StationManager` también permanece fuera. La “Guía del Gestor de Emisoras” es una vista/estado interno de StationManager. No iniciar una migración general nueva sin una necesidad concreta: no todo modal, overlay, menú, popover, lightbox o guía corresponde a `PanelShell`.

### Tema global y componentes

RadioFM tiene exactamente tres temas: `dark`, `light` y `youth`. Todo nuevo componente, botón, control o superficie visual debe usar los tokens y clases temáticas existentes. Evitar colores, fondos, bordes, estados hover/focus y estilos inline hardcoded cuando puedan resolverse mediante el sistema temático. Si falta un token, evaluar primero uno semántico y reutilizable. No crear soluciones visuales aisladas por componente.

Si no existe una preferencia en `localStorage.theme`, el tema visual predeterminado es BLACK, implementado internamente como `youth`. Claro continúa siendo `light`; el selector conserva el ciclo lógico `dark → light → youth → dark`.

Flujo deseado:

```text
Tema → tokens globales → componentes reutilizables → UI
```

### Sistema global de botones — estado actual

**Estado de fase: IMPLEMENTADA Y CERRADA** (`refactor(ui): establish global button system`).

El sistema global está implementado en `src/index.css` con `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-ghost`, `.btn-sm`, `.btn-lg`, `.btn-icon` y `.btn-block`. La base centraliza tipografía, alineación, espaciado, altura mínima, borde, transición, focus, disabled y cursor. Las variantes semánticas consumen tokens existentes; los colores responden a los temas `dark`, `light` y `youth`. El lenguaje visual actual conserva `border-radius: 0`.

El sistema está destinado a acciones convencionales y reutilizables; no pretende absorber todos los elementos HTML `<button>` de la aplicación. Las migraciones realizadas incluyen ProfilePanel, UserProfileForm, General Help, Chat Help, WatchParty, Footer, Header/Cine-Sala, MobileNav y las acciones convencionales de StationManager. La fase quedó cerrada en `f9484f5 refactor(ui): establish global button system`; `npm run build` pasó para esa revisión. El build validó el commit de cierre, no los cambios abiertos actualmente en el working tree.

### Regla arquitectónica para controles especializados

Los controles pueden permanecer fuera de `.btn` cuando su geometría, interacción o semántica lo requiere. Esto incluye acciones compactas en filas, controles icon-only especializados, selectores segmentados, drag handles, controles de Player, controles especializados de Chat y otros overlays/popovers. Cuando sea viable, los controles especializados deben consumir los tokens globales del tema aunque no utilicen `.btn`. No migrar automáticamente cada `<button>`.

### StationManager — cierre de fase

La fase de botones de StationManager está cerrada: nueve acciones convencionales se migraron al sistema global (Guía, Entendido, Cancelar edición, Guardar/Agregar, Exportar, Sí restablecer, Cancelar reset, Reset y Cerrar del pie).

Se conservaron los controles especializados de filas sortable. Editar, Eliminar, Borrar y X de confirmación permanecen especializados por su geometría compacta y estados contextuales. Audio/TV sigue como selector segmentado; las X del gestor y de la guía permanecen especializadas por ahora; el drag handle queda fuera del sistema global. No se justificó crear una nueva variante global.

Como trabajo futuro queda evaluar la conexión de los controles especializados de fila con los tokens semánticos existentes, sin alterar su geometría: tokenizar los rojos hardcoded de Borrar/Eliminar y sus hovers, y los azules hardcoded de Editar y su superficie hover. Audio/TV, las X especializadas y los demás controles especializados permanecen fuera del sistema global mientras no exista una razón concreta para migrarlos. No crear una nueva variante global de botón para resolver estos colores.

Las esquinas rectas siguen siendo la decisión visual actual. No introducir radios redondeados como parte de migraciones puntuales; cualquier cambio futuro debe hacerse globalmente, no botón por botón.

### Scroll de la aplicación y capas de paneles

PanelShell, Profile, General Help y Chat ya no bloquean ni ocultan el scrollbar de la aplicación al abrirse. Esto evita el salto horizontal. El scrollbar de la aplicación es independiente de los paneles; no volver a ocultarlo para resolver problemas de paneles.

En el working tree actual, el scroll vertical de escritorio está asignado a `#root` (`height: 100dvh; overflow-y: auto`); `body` usa `overflow-x: clip`. `#root` es `position: relative; z-index: 0`, por lo que forma un stacking context y contiene su scrollbar. En móvil hay una regla que aplica `overflow: clip` a `#root`. `PanelShell` se monta mediante portal en `document.body`, en una capa `fixed` `z-[1000001]`; por tanto, el scrollbar en esta revisión pertenece al contenedor `#root`, no al viewport/documento. El diff intenta situar el panel sobre esa capa mediante el portal existente. La relación visual resultante y la ausencia de solapamiento deben validarse en navegador; no hay evidencia en este audit de validación visual final. No aumentar z-index a ciegas ni volver a ocultar el scrollbar.

Los paneles contextuales derechos deben llegar conceptualmente al borde derecho real de la ventana, sin usar el espacio del scrollbar como margen. Profile ya queda pegado al borde; el diff abierto también pone `PanelShell` en `right-0`. Chat puede conservar una separación visual pequeña (~10px) solo si pertenece a su diseño propio, no al scrollbar. La comprobación visual de esta composición sigue pendiente.

### Estado de WatchParty, Profile y Chat

La navegación contextual de WatchParty está completada y validada: sin sala, `🎬 Cine`; con sala activa desde App, `🎞 Sala`. En Modo Sala, el control de gestión abre las opciones de sala mediante `Settings2` y el `title`/`aria-label` “Opciones de sala”, sin abandonar la sala. `X` cierra el panel; `ArrowLeft` vuelve a una vista anterior dentro del mismo panel. Son acciones distintas.

La navegación de WatchParty Help está implementada como vista interna: el regreso visible y Escape usan `onBack` para volver a la gestión; `X` cierra el drawer. El diff abierto también distribuye QR/código arriba y los botones Copiar / ¿Cómo funciona? en una fila de ancho disponible. El arreglo de layout está presente en código, pero su validación visual final en desktop y móvil no consta para el estado actual.

Profile está migrado a PanelShell. La confirmación nativa para eliminar perfil se sustituyó por confirmación integrada en el panel; la eliminación sigue usando `clearProfile()`. `UserProfileForm.tsx` no se modificó durante esa fase.

ChatModal ya no bloquea el scrollbar de la aplicación y conserva su scrollbar interno. En el working tree actual aparece un único handle en la esquina superior izquierda para resize bidimensional mediante Pointer Events; el header conserva el drag. El layout `{ width, height, x, y }` usa `radiofm:chat-modal:layout:v1`; la implementación actual limita dimensiones y posición al viewport y guarda al terminar una interacción o al ajustar layout por cambio de viewport. Se conserva lógica específica de `visualViewport`, teclado virtual y touch. La lectura estática confirma estos mecanismos, pero el drag, ambos ejes de resize, persistencia y comportamiento móvil requieren validación de uso sobre el estado actual; no tratarlos como validados aún.

### Lenguaje visual

Mantener las esquinas rectas actuales. No introducir `border-radius` nuevo en PanelShell, Chat, botones u otros componentes como parte de trabajos puntuales. Un futuro cambio debe realizarse mediante el sistema global de botones/componentes, no botón por botón.

La sincronización, autoridad Host/Guest y sesiones de WatchParty están fuera del alcance de los diffs abiertos de UI descritos aquí. Los cambios de navegación de sala, viewport responsive de Guest Cinema y Room Chat Ticker constan en commits históricos (`d9079a3`, `27508ff`, `a6d03a6`); no extender esta auditoría a lógica de Player, Socket.IO o sincronización.

### Próximo punto de decisión

Esta auditoría no elige la próxima implementación. La decisión posterior debe ponderar: (1) impacto visual/funcional, (2) riesgo de regresión, (3) dependencia con cambios ya abiertos, (4) facilidad de validación y (5) valor arquitectónico.

Candidatos para decidir, sin prioridad asignada:

1. Validar en navegador la composición de `#root` scrollable con el portal/scrollbar de PanelShell y confirmar si hace falta una corrección mínima.
2. Validar drag, resize horizontal/vertical, límites, persistencia y teclado/`visualViewport` de Chat en desktop y móvil.
3. Validar la presentación QR/acciones y el retorno/Escape de WatchParty Help en desktop y móvil.
4. Revisar como tarea independiente la tokenización semántica de los colores de controles especializados de StationManager, conservando su geometría.
5. Decidir el destino de las modificaciones preexistentes de `public/`, `dist/` y `server/.env` antes de cualquier operación que pueda afectarlas.

No iniciar migraciones adicionales de botones ni cambios de lógica de Player/WatchParty como parte de la elección hasta que se delimite una fase. Mantener cambios controlados y no tocar cambios ajenos.

### Auditoría del working tree — 2026-10-05

La revisión se realiza sobre HEAD `f9484f5`. `git diff --check` no reportó errores de whitespace; Git emitió avisos de conversión LF/CRLF para archivos del árbol de trabajo. Ningún cambio se descartó.

Cambios clasificados por estado e intención observable:

- **A — documentación de fases cerradas:** `RADIOFM_UI_MEMORY.md` contiene el estado consolidado de paneles y botones; esta auditoría actualiza el registro, manteniendo la bitácora anterior.
- **B — cambios UI abiertos, pendientes de cierre/validación:** `src/App.tsx`, `src/components/ChatModal.tsx`, `src/components/GeneralHelpModal.tsx`, `src/components/GuestCinemaLayout.tsx`, `src/components/Header.tsx`, `src/components/MobileNav.tsx`, `src/components/ProfilePanel.tsx`, `src/components/WatchPartyModal.tsx`, `src/components/panels/PanelShell.tsx` y `src/index.css`. Los diffs tratan el ownership del scroll en `#root`, el portal/panel, viewport de Guest Cinema, WatchParty Help/QR, y layout/drag/resize/teclado de Chat; no se consideran cerrados ni validados como conjunto. `ProfilePanel` contiene confirmación de eliminación integrada; General Help elimina una prop de bloqueo de scroll. No modificar estos cambios sin primero decidir su fase y límites.
- **C — cambio preexistente/no relacionado con las fases UI identificadas:** `src/components/SidebarInfo.tsx` ahora obtiene el saludo a través de un helper de hora local. Su propósito visible es separar esa lógica del componente; mantenerlo intacto hasta confirmar su fase.
- **D — archivo nuevo sin seguimiento:** `src/utils/timeOfDay.ts`, helper de franja horaria que usa la zona `America/Costa_Rica` cuando se solicita explícitamente y la hora local en otro caso. No eliminarlo ni incorporarlo a otra fase sin decisión.
- **E — archivos que requieren revisión de procedencia/decisión antes de tocarlos:** `server/.env`; el diff de `dist/index.html` y las eliminaciones de `dist/assets/index-BhcdNFQc.js`, `dist/assets/index-DicrGC0u.css`; las eliminaciones de `public/apple-touch-icon.png`, `public/manifest.json`, `public/og-image.png`, `public/pwa-192x192.png`, `public/pwa-512x512.png`, `public/stations.json`, `public/sw.js`, `public/tv-lite.html` y `public/tv-lite/index.html`; y los nuevos artefactos `dist/assets/index-DJMjpH8Y.css` y `dist/assets/index-DJvX6fPN.js`. Preservar todos; no asumir que los archivos públicos eliminados o los artefactos dist son basura de build.

El working tree está modificado; los cambios de código enumerados en B y C, los archivos de E y el helper D no forman parte del commit `f9484f5`. La única ruta que se modificará en esta tarea de continuidad es esta memoria.

---

## 7. Contenido textual fuera del JSX/TSX

Los textos grandes de ayuda y explicación **no deben permanecer mezclados con la lógica de componentes**.

Se propone separar contenido de presentación.

Preferencia actual:

```text
help/
└── watchparty.md
```

Agregar futuras ayudas a esta carpeta cuando se migren; no precrear archivos de contenido pendientes.

No se recomienda `.txt` puro si el contenido necesita estructura.

Markdown es el formato preferido para contenido humano de ayuda; utilizar estructuras TypeScript o JSON cuando un caso requiera datos estructurados.

### Decisión: centralización progresiva de ayudas

- La aplicación tiene tres temas (`dark`, `light` y `youth`). El contenido de ayuda debe ser agnóstico al tema; colores, superficies, bordes y texto provienen del sistema de temas existente.
- Los textos largos se centralizarán progresivamente en `/help`. Markdown es el formato preferido para contenido humano de ayuda, salvo que un caso requiera estructura JSON.
- La separación debe reducir redundancia y evitar duplicar contenido y presentación.
- WatchParty Help es la primera migración piloto y ya utiliza `PanelShell`. `PanelHost` está implementado y registra WatchParty, General Help y Chat Help.

Ejemplo conceptual:

```ts
export const watchPartyHelp = {
  title: "WatchParty",
  sections: [
    {
      title: "Crear una sala",
      paragraphs: ["...", "..."]
    }
  ]
};
```

Principio:

> El contenido se edita sin tener que modificar la estructura visual del panel.

---

## 8. Diseño visual de las ayudas

Objetivo: aspecto de aplicación profesional, no documento de texto pegado dentro de una modal.

La ayuda debe tener:

- jerarquía tipográfica clara;
- título y subtítulo bien definidos;
- secciones visualmente separadas;
- bloques/tarjetas cuando aporten comprensión;
- espaciado consistente;
- iconografía discreta;
- lectura cómoda en un drawer estrecho;
- scroll interno cuando el contenido sea largo;
- controles de navegación claramente distinguibles;
- consistencia con el lenguaje visual de radiofm.

Evitar:

- grandes cajas genéricas sin jerarquía;
- exceso de bordes;
- modal centrada;
- backdrop oscuro;
- textos enormes mezclados con JSX;
- cinco implementaciones visuales distintas para cinco ayudas.

---

## 9. Reglas de no regresión

Salvo que una fase indique expresamente lo contrario, NO modificar:

- `Player.tsx`.
- servidor / Socket.IO protocol.
- `server/.env`.
- WatchParty synchronization.
- `RoomManager`.
- `ChatModal.tsx`.
- `RoomChatTicker.tsx`.
- lógica de crear/unirse.
- lógica de abandonar.
- `handleReturnToApp`.
- `handleMobileWatchPartyNavigation`.
- Guest Cinema viewport.
- navegación móvil ya validada.

Los cambios preexistentes ajenos del árbol de Git, incluido `server/.env`, deben permanecer intactos.

---

## 10. Flujo de trabajo del proyecto

### Durante pruebas en localhost / desktop

No ejecutar `npm run build` en cada iteración.

Para ganar velocidad:

```text
git diff --check
git status --short
git diff
```

El build se ejecuta cuando:

- se cierra una fase;
- se necesita validar producción/dist;
- o una modificación importante lo justifica.

### Commits

No hacer commit ni push automáticamente durante iteraciones de prueba.

Esperar confirmación del usuario / cierre de fase.

### Cambios de código

Preferencia del usuario:

- cambios controlados;
- alcance explícito;
- prompts de Codex con archivos y límites claros;
- evitar modificaciones parciales ambiguas;
- no tocar archivos ajenos preexistentes.

---

## 11. Fases y estado

### Fase 1 — Drawer WatchParty

**ESTADO: COMPLETADA**

- Modal central → drawer derecho.
- Backdrop tenue inicialmente, luego transparente.
- Z-index/stacking corregido.
- Safe areas.
- Escape.
- Click fuera.
- Foco.
- Crear / Unirse conservados.

### Fase 1.1 — Navegación contextual

**ESTADO: COMPLETADA / VALIDADA**

- `🎬 Cine` sin sala.
- `🎞 Sala` con sala activa desde App.
- Regreso directo a sala.
- `Ir a App` conserva sala.
- Flecha de Modo Sala abre panel de gestión.
- `Abandonar sala` conserva semántica correcta.

### Fase 1.2 — Pulido del drawer

**ESTADO: COMPLETADA / VALIDADA**

- Desktop: 23.75rem.
- Entrada: 330ms.
- Salida: 280ms.
- Backdrop transparente.
- Ayuda integrada como vista del mismo drawer.

### Estado de centralización y paneles

**IMPLEMENTADO:**

- `/help/watchparty.md` y su consumo mediante `src/content/helpMarkdown.ts`.
- `PanelShell` como superficie común contextual.
- WatchParty Help como primer consumidor, usando el sistema de temas `dark`, `light` y `youth`.
- General Help usando `PanelHost` y `PanelShell`.
- Chat Help usando `PanelHost` y `PanelShell`, accesible desde Chat general y Chat de sala.
- `PanelHost` registra `watchparty`, `general-help`, `chat-help` y `profile`.
- Profile usa `PanelHost`/`PanelShell`; Registration continúa como pantalla de entrada.

**PENDIENTE:**

- No hay otras migraciones de Profile pendientes. Registration permanece deliberadamente como pantalla de entrada, fuera de `PanelHost`.

### Cierre de arquitectura de paneles

Las superficies contextuales relevantes migradas y validadas son:

1. WatchParty Help.
2. General Help.
3. Chat Help.
4. Profile.

Registration / `UserProfileGate` queda fuera de `PanelShell` porque es una pantalla completa obligatoria de entrada.

Se mantienen deliberadamente fuera de `PanelShell`:

- StationManager, por ser un gestor especializado y amplio. Si se migra, será una fase independiente.
- La Guía de StationManager, porque es ayuda interna del gestor y no un panel global.
- ChatModal y sus superficies auxiliares, por su comportamiento especializado de `visualViewport`, teclado, redimensionamiento, lightbox y menús.
- Menús y popovers, incluido QualitySelector, controles de volumen y categorías.
- Resultados de YouTube, confirmaciones y avisos auxiliares, overlays del Player y RoomChatTicker.

Regla arquitectónica: **no todo overlay, modal, popover o superficie flotante debe convertirse en PanelShell**. PanelShell se reserva para superficies contextuales relevantes que se beneficien de la infraestructura común de portal, backdrop, cierre, Escape, gestión del foco, scroll, safe areas, responsive, animaciones y presentación temática.

`PanelHost` no necesita nuevos registros inmediatos. Cualquier futura migración de StationManager requiere una fase independiente por su formato amplio y sus requisitos de interacción.

---

## 12. Checklist de pruebas WatchParty

### Sin sala

- [ ] `🎬 Cine` visible.
- [ ] Abre drawer derecho.
- [ ] Crear sala funciona.
- [ ] Unirse funciona.
- [ ] Cerrar drawer funciona.

### Sala activa + App

- [ ] Header muestra `🎞 Sala`.
- [ ] `🎞 Sala` vuelve directamente a la sala.
- [ ] No pide código.
- [ ] No crea otra sala.
- [ ] Socket.IO permanece conectado.

### Dentro de Modo Sala

- [ ] Flecha abre panel de gestión.
- [ ] Flecha no lleva directamente a App.
- [ ] `Ir a App` vuelve a App.
- [ ] Sala permanece activa.
- [ ] Header pasa a `🎞 Sala`.
- [ ] `Abandonar sala` termina la sala para el usuario.
- [ ] Header vuelve a `🎬 Cine`.

### Ayuda

- [ ] Ayuda ocupa la superficie del drawer.
- [ ] No aparece modal centrada.
- [ ] No aparece segundo backdrop.
- [ ] Volver regresa a gestión.
- [ ] Escape regresa correctamente.

---

## 13. Decisiones de diseño ya consolidadas

- El panel contextual derecho es preferible a modal central.
- El panel debe sentirse integrado en la aplicación.
- El fondo normalmente no se atenúa.
- La flecha dentro de Modo Sala abre gestión; no significa abandonar ni volver a App.
- `Ir a App` y `Abandonar sala` son semánticamente distintos.
- `🎬 Cine` y `🎞 Sala` son el mismo control contextual, no dos botones distintos.
- Una sola infraestructura de paneles debe servir para múltiples funciones.
- El contenido textual debe separarse de la lógica visual.
- No duplicar handlers ni sistemas de overlay.

---

## 14. Bitácora de cambios

### 2026-10-04

- Se completó la migración inicial de WatchParty de modal central a drawer derecho.
- Se corrigió stacking/z-index.
- Se redujo el drawer desktop progresivamente hasta 23.75rem.
- Entrada ajustada a 330ms; salida 280ms.
- Backdrop convertido a transparente.
- Ayuda WatchParty integrada como vista del mismo drawer.
- Se completó navegación contextual `🎬 Cine` / `🎞 Sala`.
- Flecha del Header dentro de Modo Sala abre gestión.
- Se decidió consolidar todos los futuros modales de la aplicación bajo un sistema común de paneles.
- Se decidió separar textos largos del código de presentación.
- Se implementó `PanelShell` y se migró WatchParty Help como su primer consumidor.
- Se migró General Help a `PanelHost` y `PanelShell`; ambos paneles registrados comparten el shell.
- Se migró Chat Help a `PanelHost` y `PanelShell`; está disponible desde Chat general y Chat de sala.
- Se migró Profile a `PanelHost` y `PanelShell`; el registro inicial permanece como pantalla completa mediante `UserProfileGate`.
- Profile y Registration comparten formulario/contexto, pero mantienen flujos separados; no todo modal se convierte automáticamente en panel.

### 2026-10-05

- Se registró el cierre de la migración de las cuatro superficies principales a PanelShell: WatchParty, General Help, Chat Help y Profile. Registration y StationManager permanecen fuera; la guía de StationManager sigue siendo una vista interna.
- Se consolidó la regla de integración obligatoria de componentes nuevos con los tres temas y se planteó el sistema global de botones como fase futura.
- Se actualizó el estado de scroll: los paneles ya no ocultan el scrollbar; queda investigar el stacking/portal de la capa de scroll antes de cambiar capas.
- Se registraron los pendientes visuales del panel Compartir sala/QR y de resize vertical de Chat, junto con las restricciones de comportamiento móvil y lenguaje de esquinas rectas.
- Se ordenaron los próximos pasos de UI sin abrir una migración general nueva.
- En fases posteriores se implementó y migró progresivamente el sistema global `.btn` en las acciones convencionales aprobadas, sin convertir automáticamente todos los controles especializados.
- Se cerró la migración de nueve acciones convencionales de StationManager. Sus controles compactos de filas, selector Audio/TV, cierres y drag handle permanecen especializados; no se creó una variante adicional.

---

## 15. Regla para futuras sesiones de ChatGPT

Si una nueva conversación retoma este proyecto y existe este documento, leerlo primero antes de proponer cambios sobre UI de paneles, WatchParty, ayudas, perfil o registro.

No reconstruir decisiones anteriores por memoria parcial.

Usar este documento como bitácora de continuidad y contrastarlo con `ARCHITECTURE.md` para separar:

- arquitectura técnica general;
- decisiones específicas de UI/paneles;
- estado de implementación;
- próximos pasos.

---

## 16. Visión estratégica y roadmap de largo plazo

Esta sección registra dirección futura, no trabajo aprobado para implementación inmediata. No iniciar todas estas líneas a la vez: las fases actuales de UI/UX se delimitan, implementan y validan individualmente antes de abrir otra.

### Preferencia de tema predeterminado

Si no existe `localStorage.theme`, la aplicación inicia en la apariencia visual **Black**, cuyo identificador interno actual es `youth`. Si existe una preferencia guardada, se respeta. Claro continúa siendo `light`; el ciclo lógico permanece `dark → light → youth → dark`. Borrar el perfil no debe borrar la preferencia de tema.

### Chat

La dirección futura contempla un borde minimalista de aproximadamente 1px y un rediseño de las burbujas para mensajes largos: ancho y padding adecuados, line-height legible, separación entre párrafos, URLs manejables y prevención de overflow. Puede evaluarse una diferenciación sutil de fondos o colores según el tema. Chat General y Chat de Sala deben seguir utilizando el mismo `ChatModal`.

### Menú global izquierdo

Se propone un menú compacto inspirado en paneles laterales modernos, implementado como vista del sistema `PanelHost → PanelShell` y habilitado por una futura variante izquierda de `PanelShell`. La izquierda corresponde a navegación global y preferencias; la derecha permanece reservada para el contexto de la actividad. Posibles entradas: LITE, Station Manager, Ayuda general, Perfil y futuras preferencias.

### Personalización

Futura opción para ajustar globalmente la escala del tamaño de texto, con persistencia en `localStorage`. Más adelante se pueden evaluar opciones limitadas de contraste o color de texto, evitando introducir un sistema paralelo de temas.

### WatchParty Desktop independiente

Visión futura de un cliente o ventana independiente, minimalista, wide y sin apariencia de navegador. Podría admitir arrastrar archivos MP4 o presentaciones, ingresar una URL de YouTube y ofrecer controles mínimos, reutilizando la tecnología WatchParty existente. La tecnología concreta de empaquetado queda abierta.

### SaaS para emisoras

Visión estratégica de un servicio de precio muy accesible con una emisora por cliente y su programación habitual, una biblioteca o carpeta musical preseleccionada por la emisora, solicitudes de canciones de oyentes —aproximadamente tres selecciones por oyente como punto de partida— y control editorial conservado por el DJ. También contempla chat en tiempo real, video en vivo, espacio publicitario con piezas gráficas y textos, administración sencilla de publicidad y posible monetización mediante anuncios.

### Regla de roadmap

Estas líneas son candidatas de largo plazo, no compromisos de implementación simultánea. Continuar cerrando y validando cada fase UI/UX por separado; decidir prioridades según impacto, riesgo, dependencias y facilidad de validación. Mantener abierta la tecnología de empaquetado y los detalles de producto hasta que una fase concreta los requiera.
