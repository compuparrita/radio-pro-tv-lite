# Instrucciones para generar el APK en la Nube

Como no tienes instalado Capacitor ni Android Studio localmente, usaremos **GitHub Actions** para que los servidores de GitHub hagan todo el trabajo por ti.

### Pasos para generar el APK:

1. **Sube estos cambios a tu GitHub**:
   - Usa los comandos que te proporcionaré para subir el código a tu nueva cuenta.

2. **Ve a tu repositorio en GitHub**:
   - Abre tu navegador y entra a la página de tu repositorio.

3. **Entra en la pestaña "Actions"**:
   - Arriba verás varias pestañas (Code, Issues, Pull requests, etc.). Haz clic en **Actions**.

4. **Selecciona el proceso "Build TV Lite APK"**:
   - En la lista de la izquierda, verás un flujo llamado "Build TV Lite APK". Haz clic en él.

5. **Ejecuta el proceso**:
   - Verás un botón gris que dice **"Run workflow"**. Haz clic en él y luego en el botón verde **"Run workflow"** que aparece abajo.

6. **Espera a que termine**:
   - Aparecerá una nueva ejecución en la lista. Espera unos minutos hasta que aparezca un check verde ✅.

7. **Descarga el APK**:
   - Haz clic en la ejecución terminada.
   - Baja hasta la sección **"Artifacts"**.
   - Allí verás un archivo llamado `tv-lite-debug-apk`. Haz clic para descargarlo.
   - Descomprime el archivo y tendrás tu `app-debug.apk` listo para instalar.
