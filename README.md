# Organizador de Imágenes y Videos

Sistema profesional para organizar automáticamente fotos y videos por año y mes basándose en sus metadatos EXIF.

## Características Principales

### Soporte Completo de Formatos

**Imágenes (30+ formatos):**
- Formatos estándar: JPG, JPEG, PNG, GIF, BMP, TIFF, WEBP
- Formatos Apple: HEIC, HEIF
- Formatos RAW profesionales: CR2, CR3, NEF, ARW, DNG, RAF, ORF, RW2, PEF, SRW, RAW, RWL, NRW, CRW
- Otros: SVG, ICO

**Videos (20+ formatos):**
- MP4, MOV, AVI, MKV, WMV, FLV, WEBM
- 3GP, M4V, MPEG, MPG, VOB, OGV
- M2TS, MTS, TS, DIVX, F4V, ASF, RM, RMVB, QT, M2V, MXF

### Estrategia Inteligente de Fechas

El sistema utiliza una estrategia de fallback con 8 campos EXIF diferentes (en orden de prioridad):

1. `DateTimeOriginal` - Fecha de captura original (ideal para fotos)
2. `CreateDate` - Fecha de creación (común en videos y fotos)
3. `MediaCreateDate` - Fecha de creación de media (videos MP4)
4. `TrackCreateDate` - Fecha de track (videos)
5. `DateTimeDigitized` - Fecha de digitalización
6. `ModifyDate` - Fecha de modificación
7. `FileModifyDate` - Fecha de modificación del archivo
8. `FileCreateDate` - Fecha de creación del archivo (último recurso)

### Funcionalidades Avanzadas

- **Modo Prueba (Dry-Run)**: Simula el procesamiento sin mover archivos
- **Manejo de Duplicados**: Renombra automáticamente archivos con nombres duplicados
- **Procesamiento Asíncrono Correcto**: Usa `for...of` para manejar correctamente promesas
- **Cierre Automático de Recursos**: ExifTool se cierra correctamente al finalizar
- **Timeout Configurable**: 30 segundos por defecto para archivos grandes
- **Validación de Rutas**: Verifica que las carpetas existan antes de procesar
- **Manejo de Archivos AAE**: Opción para eliminar archivos AAE de Apple
- **Logs Detallados**: Muestra archivos procesados, errores y omitidos
- **Estadísticas en Tiempo Real**: Progreso, errores, archivos procesados y omitidos

## Instalación

1. Clona el repositorio:
```bash
git clone <tu-repositorio>
cd MoverImagenes
```

2. Instala las dependencias:
```bash
npm install
```

3. Inicia el servidor:
```bash
npm start
```

4. Abre tu navegador en:
```
http://localhost:3000
```

## Uso

1. **Carpeta de Origen**: Ingresa la ruta completa de la carpeta que contiene tus fotos y videos
2. **Carpeta de Destino**: Ingresa la ruta donde quieres organizar los archivos
3. **Opciones**:
   - **Modo Prueba**: Actívalo para ver qué haría el programa sin mover archivos realmente
   - **Eliminar archivos AAE**: Elimina automáticamente archivos AAE de Apple
4. **Ejecutar**: Haz clic para iniciar el procesamiento

## Estructura de Salida

Los archivos se organizan en la siguiente estructura:

```
Carpeta Destino/
├── 2023/
│   ├── Enero/
│   │   ├── foto1.jpg
│   │   └── video1.mp4
│   ├── Febrero/
│   │   └── foto2.jpg
│   └── ...
├── 2024/
│   ├── Marzo/
│   │   └── foto3.heic
│   └── ...
```

## Mejoras Implementadas

### Versión Anterior → Versión Actual

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| **Formatos de imagen** | Solo JPG, PNG básicos | 30+ formatos incluyendo RAW y HEIC |
| **Formatos de video** | Solo MOV | 20+ formatos (MP4, AVI, MKV, etc.) |
| **Extracción de fechas** | 2-3 campos EXIF | 8 campos con fallback inteligente |
| **Procesamiento asíncrono** | `forEach` (roto) | `for...of` (correcto) |
| **Archivos duplicados** | Crashea | Renombra automáticamente |
| **Gestión de recursos** | Memory leak | Cierre correcto de ExifTool |
| **Timeout** | 5 segundos fijo | 30 segundos configurable |
| **Validación** | Ninguna | Valida rutas antes de procesar |
| **Manejo de errores** | Solo log en consola | Reportes detallados al usuario |
| **Dry-run** | No disponible | Modo prueba completo |
| **UI** | Básica | Estadísticas, logs, progreso en tiempo real |
| **Server-Sent Events** | Mal implementado | Correctamente implementado con cierre |

## Tecnologías

- **Backend**: Node.js + Express
- **EXIF**: exiftool-vendored
- **Frontend**: HTML5 + CSS3 + Vanilla JavaScript
- **Comunicación**: Server-Sent Events (SSE)

## API Endpoints

### `GET /progress`
Procesa imágenes con Server-Sent Events

**Query Parameters:**
- `origen` (requerido): Ruta de la carpeta de origen
- `destino` (requerido): Ruta de la carpeta de destino
- `dryRun` (opcional): `true` para modo prueba
- `deleteAAE` (opcional): `false` para no eliminar archivos AAE
- `timeout` (opcional): Timeout en milisegundos (default: 30000)

### `GET /supported-extensions`
Obtiene la lista de extensiones soportadas

### `POST /validate-paths`
Valida las rutas de origen y destino

**Body:**
```json
{
  "origen": "C:/Users/Photos",
  "destino": "D:/Organized"
}
```

## Logs y Debugging

El servidor muestra información detallada en la consola:
- Archivos procesados con tipo y campo EXIF usado
- Archivos renombrados por duplicados
- Archivos omitidos y razón
- Errores con stack trace completo

## Recomendaciones

1. **Usa el Modo Prueba primero**: Verifica que todo se organizará correctamente antes de mover archivos
2. **Haz backup**: Siempre respalda tus archivos antes de procesarlos
3. **Verifica las rutas**: Asegúrate de escribir correctamente las rutas de origen y destino
4. **Revisa los logs**: Después del procesamiento, revisa los archivos omitidos y errores

## Solución de Problemas

### "La carpeta de origen no existe"
- Verifica que la ruta esté escrita correctamente
- En Windows usa `\` o `/`, ambos funcionan

### "Error reading EXIF data"
- El archivo puede estar corrupto
- Puede ser un formato no estándar
- Verifica el log de errores para más detalles

### "Timeout reading file"
- Aumenta el timeout en el código (default: 30 segundos)
- El archivo puede ser muy grande (videos 4K)

## Licencia

MIT

## Autor
Javier Balcazar Cruz