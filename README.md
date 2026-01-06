# 📻 Radio Streaming Pro

Una aplicación web moderna y elegante para streaming de radio en línea con chat en vivo, optimizada para múltiples dispositivos incluyendo Smart TVs.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![React](https://img.shields.io/badge/React-18.3-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-010101)

## ✨ Características

### 🎵 Reproductor de Radio
- **Streaming HLS**: Reproducción de alta calidad usando HLS.js
- **Control completo**: Play/Pause, volumen, cambio de emisora
- **Navegación rápida**: Botones anterior/siguiente para cambiar emisoras
- **Persistencia**: Recuerda la última emisora y configuración del volumen

### 💬 Chat en Vivo
- **Tiempo real**: Chat con Socket.IO para comunicación instantánea
- **Contador de oyentes**: Visualización de usuarios conectados en tiempo real
- **Identificación simple**: Solo nombre (y opcionalmente teléfono)
- **Anti-spam**: Rate limiting en backend (10 mensajes/minuto)
- **Notificaciones**: Badge de mensajes no leídos estilo WhatsApp
- **Función logout**: Permite limpiar identidad y reiniciar sesión

### 📱 Optimización Móvil
- **Diseño responsive**: Se adapta perfectamente a cualquier tamaño de pantalla
- **Barra de navegación inferior**: Controles nativos estilo app móvil
- **Iconos minimalistas**: Diseño limpio con iconos outline
- **Gestos táctiles**: Optimizado para uso con dedos

### 📺 Soporte Smart TV
- **Control remoto**: Navegación completa con flechas del control
  - `←/→`: Cambiar emisora
  - `↑/↓`: Hacer scroll
- **Auto-focus**: Retorno automático al selector después de 6 segundos
- **Interfaz clara**: Anillos de foco visibles para navegación fácil

### 🎨 Temas Visuales
- **Modo Oscuro**: Tema por defecto con colores suaves
- **Modo Claro**: Para ambientes bien iluminados
- **Modo Juvenil**: Tema neón/cyberpunk con colores vibrantes
- **Persistencia**: Recuerda tu tema preferido

### ⭐ Favoritos
- **Marcado rápido**: Guarda tus emisoras favoritas con un clic
- **Persistencia**: Los favoritos se guardan en localStorage
- **Acceso rápido**: Tab dedicado en la lista de emisoras

### 🔧 Gestión de Emisoras
- **CRUD completo**: Agregar, editar, eliminar emisoras
- **Validación**: URLs y nombres validados antes de guardar
- **Búsqueda**: Filtro en tiempo real por nombre de emisora

## 🚀 Instalación y Uso

### Requisitos Previos
- Node.js 18+ 
- npm o yarn

### Instalación

1. **Clonar o descargar el proyecto**
```bash
cd radiofm
```

2. **Instalar dependencias del frontend**
```bash
npm install
```

3. **Instalar dependencias del backend**
```bash
cd server
npm install
cd ..
```

### Desarrollo

**Iniciar frontend** (en una terminal):
```bash
npm run dev
```
El frontend estará disponible en `http://localhost:5173`

**Iniciar backend** (en otra terminal):
```bash
cd server
npm run dev
```
El backend estará disponible en `http://localhost:3001`

### Producción

1. **Construir el frontend**
```bash
npm run build
```

2. **Iniciar servidor (sirve frontend + backend)**
```bash
cd server
node index.js
```

La aplicación completa estará disponible en `http://localhost:3001`

## 📂 Estructura del Proyecto

```
radiofm/
├── src/                          # Código fuente del frontend
│   ├── components/               # Componentes React
│   │   ├── Header.tsx           # Encabezado con reloj y contador
│   │   ├── Player.tsx           # Reproductor de audio
│   │   ├── StationList.tsx      # Lista de emisoras
│   │   ├── ChatModal.tsx        # Modal del chat
│   │   ├── MobileNav.tsx        # Barra de navegación móvil
│   │   ├── ThemeToggle.tsx      # Selector de temas
│   │   └── StationManager.tsx   # Gestor de emisoras
│   ├── context/                 # React Context para estado global
│   │   ├── RadioContext.tsx    # Estado del reproductor
│   │   └── ChatContext.tsx     # Estado del chat
│   ├── hooks/                   # Custom hooks
│   │   └── useTVRemote.ts      # Hook para control remoto TV
│   ├── services/               # Servicios externos
│   │   └── socketService.ts    # Cliente Socket.IO
│   ├── data/                   # Datos estáticos
│   │   └── defaultStations.ts  # Emisoras predeterminadas
│   ├── types/                  # Definiciones TypeScript
│   │   └── index.ts           
│   ├── App.tsx                 # Componente principal
│   ├── index.css              # Estilos globales + temas
│   └── main.tsx               # Punto de entrada
├── server/                     # Código del backend
│   ├── index.js               # Servidor Express + Socket.IO
│   └── package.json           # Dependencias del servidor
├── dist/                      # Build de producción (generado)
├── package.json              # Dependencias del frontend
└── README.md                # Este archivo
```

## 🎨 Temas

La aplicación incluye 3 temas:

1. **Dark Mode** (Predeterminado)
   - Fondo oscuro (#0f172a)
   - Colores primarios: Púrpura/Violeta

2. **Light Mode**
   - Fondo claro (#f1f5f9)
   - Texto oscuro para mejor legibilidad

3. **Youth Mode**
   - Fondo negro profundo
   - Acentos neón (verde, cyan, magenta)
   - Estilo cyberpunk

## 🔌 Variables de Entorno

### Frontend (.env)
```env
VITE_SOCKET_URL=http://localhost:3001
```

### Backend (server/.env)
```env
PORT=3001
CLIENT_URL=http://localhost:5173
```

## 🌐 Despliegue

### En Servidor Local (LAN)
1. Construir el frontend: `npm run build`
2. En `server/index.js`, el CORS ya está configurado para aceptar cualquier origen
3. Iniciar el servidor: `cd server && node index.js`
4. Acceder desde cualquier dispositivo en la red: `http://[IP_SERVIDOR]:3001`

### En la Nube (VPS/Cloud)
1. Configurar dominio/subdominio
2. Instalar Node.js en el servidor
3. Clonar proyecto y construir
4. Usar PM2 o systemd para mantener el proceso activo
5. Configurar nginx como proxy reverso (opcional)

### Con Ngrok (Testing)
```bash
# Terminal 1: Iniciar servidor
cd server && node index.js

# Terminal 2: Exponer con ngrok
ngrok http 3001
```

## 📱 Uso en Smart TV

1. Abrir la app en el navegador del Smart TV (Chrome recomendado)
2. La app detectará automáticamente el uso de control remoto
3. Controles:
   - **← / →**: Cambiar emisora
   - **↑ / ↓**: Scroll en la página
   - **Enter**: Seleccionar
   - **6 segundos de inactividad**: Auto-focus en selector

## 🛡️ Seguridad

- **Sanitización**: Todos los mensajes del chat pasan por DOMPurify
- **Rate Limiting**: Backend limita a 10 mensajes por minuto por usuario
- **Hashing**: Números de teléfono hasheados con bcrypt
- **CORS**: Configurado para aceptar orígenes dinámicos
- **Validación**: Validación de entradas en frontend y backend

## 🐛 Solución de Problemas

### El chat no se conecta
- Verificar que el servidor backend esté corriendo
- Revisar la consola del navegador para errores de Socket.IO
- Confirmar que las variables de entorno estén correctas

### Los favoritos no se guardan
- Verificar que localStorage esté habilitado en el navegador
- Revisar la consola para logs de debug (muestra cuando se guardan)
- Limpiar caché del navegador si persiste el problema

### El audio no reproduce
- Verificar que la URL de la emisora sea correcta y esté activa
- Algunos navegadores requieren interacción del usuario antes de reproducir audio
- Revisar la consola para errores de HLS.js

### En Smart TV no funciona el control remoto
- Asegurarse de que el navegador tenga el foco
- Recargar la página si los controles no responden
- Verificar que sea Chrome/Chromium en el Smart TV

## 🤝 Contribuciones

Este proyecto fue desarrollado para uso personal/privado. Si deseas extenderlo:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto es de uso privado. Todos los derechos reservados.

## 🙏 Créditos

- **HLS.js**: Streaming de audio
- **Socket.IO**: Comunicación en tiempo real
- **Lucide React**: Iconos
- **Tailwind CSS**: Estilos
- **Vite**: Build tool
- **React**: Framework UI

## 📞 Soporte

Para problemas o preguntas, revisar el archivo `TECHNICAL_GUIDE.md` para detalles técnicos de implementación.

---

Hecho con ❤️ para disfrutar de la mejor música
