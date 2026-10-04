# radiofm — Memoria de Arquitectura UI y Bitácora

> Documento de continuidad para mantener contexto entre sesiones y evitar reconstruir decisiones de arquitectura desde cero.
>
> Proyecto: `C:\radiofm`
> Última actualización: 2026-10-04
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

Actualmente, `PanelHost` selecciona entre WatchParty, General Help y Chat Help según el estado recibido desde App. `PanelShell` sigue presentando la superficie común; las migraciones de otros paneles continúan pendientes.

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

---

## 15. Regla para futuras sesiones de ChatGPT

Si una nueva conversación retoma este proyecto y existe este documento, leerlo primero antes de proponer cambios sobre UI de paneles, WatchParty, ayudas, perfil o registro.

No reconstruir decisiones anteriores por memoria parcial.

Usar este documento como bitácora de continuidad y contrastarlo con `ARCHITECTURE.md` para separar:

- arquitectura técnica general;
- decisiones específicas de UI/paneles;
- estado de implementación;
- próximos pasos.
