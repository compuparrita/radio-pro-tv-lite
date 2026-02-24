# 📻 Radio Streaming Pro

Una aplicación web moderna y elegante para streaming de radio en línea y televisión en vivo, con chat en tiempo real, optimizada para múltiples dispositivos incluyendo Smart TVs.

![Version](https://img.shields.io/badge/version-1.2.0-blue)
![React](https://img.shields.io/badge/React-18.3-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-010101)
![VideoJS](https://img.shields.io/badge/Video.js-8.0-red)

## ✨ Características Principales

### 🎵 Reproductor de Multimedia Avanzado
- **Streaming HLS Híbrido**: Soporte completo para audio y video mediante **Video.js** y **Hls.js**.
- **Optimización de Buffer**: Configuración personalizada de VHS (Video.js HTTP Streaming) para una reproducción fluida incluso en conexiones inestables:
  - `bufferLowWaterLine`: 6 segundos.
  - `goalBufferLength`: 20 segundos.
- **Control de Calidad**: Selector de resolución manual (Auto, 1080p, 720p, etc.) integrado en la UI del reproductor.
- **Persistencia**: Historial de la última emisora, volumen y preferencias de reproducción sincronizadas entre sesiones.

### 📺 Canales de TV y Video
- **Soporte de Video HD**: Pestaña dedicada para canales de televisión.
- **Proxy de Desarrollo (Bypass CORS)**: Configuración estratégica en `vite.config.ts` para acceder a streams protegidos (ej. Repretel) mediante un túnel local que anonimiza las peticiones (stripping referer/origin).
- **Modo Radio/TV Inteligente**: La interfaz conmuta automáticamente entre visualización de video y visualización de disco giratorio según el tipo de medio.

### 💬 Chat en Vivo & Social
- **Tiempo real**: Comunicación bidireccional instantánea mediante **Socket.io**.
- **Contador de oyentes**: Visualización dinámica de usuarios conectados.
- **WhatsApp Style**: Badge de mensajes no leídos y diseño de chat fluido.
- **Seguridad**: Hash de números de teléfono con Bcrypt y sanitización de mensajes con DOMPurify.

### 📱 Experiencia de Usuario & UI
- **Estética Premium**: Diseño Glassmorphism limpio, sin sombras pesadas, basado en variables CSS dinámicas.
- **Mobile First**: Barra de navegación inferior `MobileNav` optimizada para pulgares.
- **Animaciones Reactivas**: Logo del disco con rotación sincronizada al estado `isPlaying` y transiciones suaves entre emisoras.
- **Temas Dinámicos**: Dark Mode, Light Mode y el exclusivo **Youth Mode** (Cyberpunk/Neon).

### 🖥️ Soporte Smart TV (Full Control)
- **Navegación por Control Remoto**: Mapeo completo de teclado/flechas para Smart TVs.
- **Auto-focus**: Sistema inteligente que redirige el foco a la lista de emisoras tras 6 segundos de inactividad.
- **Interfaz 10ft**: Elementos de UI ampliados y anillos de foco de alto contraste para visibilidad a distancia.

## ⚙️ Migraciones y Datos
La aplicación cuenta con un **Sistema de Migración Interno** (`RadioContext.tsx`) que asegura que todos los usuarios reciban las actualizaciones de emisoras (URLs corregidas, nuevos logos, mejoras de buffer) de forma automática sin perder sus estaciones personalizadas.

## 🚀 Instalación y Uso

### Requisitos Previos
- Node.js 18+ 
- npm o yarn

### Instalación Rápida

1. **Dependencias del Proyecto**
```bash
npm install
cd server
npm install
cd ..
```

2. **Desarrollo Local**
```bash
# Frontend
npm run dev

# Backend (en otra terminal)
cd server
npm run dev
```

## 📂 Estructura Técnica
- **`/src/hooks/useVideoPlayer.ts`**: El motor de reproducción. Gestiona la lógica de Video.js, calidad y buffering.
- **`/src/context/RadioContext.tsx`**: El cerebro de la app. Gestiona el estado global, persistencia y migraciones de datos.
- **`vite.config.ts`**: Configuración del servidor de desarrollo y **Proxies de Streaming** para saltar bloqueos de CORS/Referer.

## 🌐 Notas de Producción
Para desplegar en producción (ej. Servidor Debian/Ubuntu con Nginx):
1. Es necesario replicar las reglas de proxy de `vite.config.ts` en la configuración de Nginx para mantener el acceso a señales protegidas.
2. Usar **PM2** para gestionar el proceso del servidor Socket.io.

---

Hecho con ❤️ para una experiencia de radio y TV definitiva.
&copy; 2026 Radio Streaming Pro
