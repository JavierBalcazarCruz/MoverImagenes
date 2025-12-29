// mover.js
const ExifTool = require("exiftool-vendored").ExifTool;
const fs = require("fs");
const path = require("path");

const months = {
    1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
    5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
    9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre"
};

// Extensiones completas soportadas
const SUPPORTED_EXTENSIONS = {
    images: [
        'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif', 'webp',
        'heic', 'heif', 'svg', 'ico',
        // Formatos RAW
        'cr2', 'cr3', 'nef', 'arw', 'dng', 'raf', 'orf', 'rw2', 'pef',
        'srw', 'raw', 'rwl', 'nrw', 'crw'
    ],
    videos: [
        'mp4', 'mov', 'avi', 'mkv', 'wmv', 'flv', 'webm', '3gp', 'm4v',
        'mpeg', 'mpg', 'vob', 'ogv', 'm2ts', 'mts', 'ts', 'divx', 'f4v',
        'asf', 'rm', 'rmvb', 'qt', 'm2v', 'mxf'
    ]
};

// Campos EXIF para extraer fechas (en orden de prioridad)
const DATE_FIELDS_PRIORITY = [
    'DateTimeOriginal',      // Fecha de captura original (mejor para fotos)
    'CreateDate',            // Fecha de creación (común en videos y fotos)
    'MediaCreateDate',       // Fecha de creación de media (videos MP4)
    'TrackCreateDate',       // Fecha de track (videos)
    'DateTimeDigitized',     // Fecha de digitalización
    'ModifyDate',            // Fecha de modificación
    'FileModifyDate',        // Fecha de modificación del archivo
    'FileCreateDate'         // Fecha de creación del archivo (último recurso)
];

function remplazaSlash(inputString) {
    return inputString.replace(/\\/g, "/");
}

function isImageFile(filename) {
    const ext = path.extname(filename).toLowerCase().replace('.', '');
    return SUPPORTED_EXTENSIONS.images.includes(ext);
}

function isVideoFile(filename) {
    const ext = path.extname(filename).toLowerCase().replace('.', '');
    return SUPPORTED_EXTENSIONS.videos.includes(ext);
}

function isSupportedFile(filename) {
    return isImageFile(filename) || isVideoFile(filename);
}

// Extraer fecha usando estrategia de fallback
function extractDateFromTags(tags, filename) {
    for (const field of DATE_FIELDS_PRIORITY) {
        if (tags[field]) {
            const dateValue = tags[field];

            // ExifTool devuelve objetos con year, month, day
            if (typeof dateValue === 'object' && dateValue.year && dateValue.month) {
                return {
                    year: dateValue.year,
                    month: dateValue.month,
                    field: field
                };
            }

            // Si es string, intentar parsear
            if (typeof dateValue === 'string') {
                try {
                    const date = new Date(dateValue);
                    if (!isNaN(date.getTime())) {
                        return {
                            year: date.getFullYear(),
                            month: date.getMonth() + 1,
                            field: field
                        };
                    }
                } catch (e) {
                    continue;
                }
            }
        }
    }

    // Si no se encontró ninguna fecha válida, usar fecha actual como último recurso
    const now = new Date();
    return {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        field: 'fallback_current_date'
    };
}

// Generar nombre único si ya existe el archivo
function getUniqueFilename(destPath, filename) {
    if (!fs.existsSync(destPath)) {
        return destPath;
    }

    const ext = path.extname(filename);
    const nameWithoutExt = path.basename(filename, ext);
    const dir = path.dirname(destPath);

    let counter = 1;
    let newPath;

    do {
        const newFilename = `${nameWithoutExt}_${counter}${ext}`;
        newPath = path.join(dir, newFilename);
        counter++;
    } while (fs.existsSync(newPath));

    return newPath;
}

async function procesarImagenes(sourceDir, destDir, progressCallback, options = {}) {
    const {
        deleteAAE = true,
        dryRun = false,
        timeoutMillis = 30000
    } = options;

    const exiftool = new ExifTool({ taskTimeoutMillis: timeoutMillis });
    const errors = [];
    const processed = [];
    const skipped = [];

    try {
        return await new Promise((resolve, reject) => {
            fs.readdir(sourceDir, async function (err, files) {
                if (err) {
                    await exiftool.end();
                    reject(new Error("Error al leer la carpeta fuente: " + err.message));
                    return;
                }

                if (files.length === 0) {
                    await exiftool.end();
                    progressCallback({
                        processed: 0,
                        total: 0,
                        percentage: 100,
                        completed: true,
                        errors: [],
                        processedFiles: [],
                        skippedFiles: []
                    });
                    resolve({
                        success: true,
                        total: 0,
                        processed: [],
                        errors: [],
                        skipped: []
                    });
                    return;
                }

                let filesProcessed = 0;
                const totalFiles = files.length;

                // Usar for...of para procesamiento asíncrono correcto
                for (const file of files) {
                    const sourcePath = path.join(sourceDir, file);

                    try {
                        const stats = fs.statSync(sourcePath);

                        if (stats.isDirectory()) {
                            console.log(`"${file}" es un directorio. Ignorando...`);
                            skipped.push({ file, reason: 'Es un directorio' });
                            updateProgress();
                            continue;
                        }

                        // Verificar si es un archivo soportado
                        if (!isSupportedFile(file)) {
                            const ext = path.extname(file).toLowerCase().replace('.', '');

                            // Manejar archivos AAE especiales
                            if (ext === 'aae') {
                                if (deleteAAE) {
                                    if (!dryRun) {
                                        fs.unlinkSync(sourcePath);
                                    }
                                    console.log(`${dryRun ? '[DRY-RUN] ' : ''}Eliminando archivo AAE: ${file}`);
                                    processed.push({
                                        file,
                                        action: 'deleted',
                                        type: 'AAE'
                                    });
                                } else {
                                    skipped.push({ file, reason: 'Archivo AAE (configurado para no eliminar)' });
                                }
                            } else {
                                console.log(`Archivo no soportado: ${file} (extensión: ${ext || 'sin extensión'})`);
                                skipped.push({ file, reason: `Extensión no soportada: ${ext || 'sin extensión'}` });
                            }
                            updateProgress();
                            continue;
                        }

                        // Leer metadatos EXIF
                        const tags = await exiftool.read(path.join(sourceDir, file));

                        // Extraer fecha usando estrategia unificada
                        const dateInfo = extractDateFromTags(tags, file);
                        const yearStr = dateInfo.year.toString();
                        const monthName = months[dateInfo.month];

                        const fileType = isVideoFile(file) ? 'video' : 'imagen';
                        console.log(`Procesando ${fileType}: ${file} (fecha desde: ${dateInfo.field})`);

                        if (!dryRun) {
                            await MoveFile(destDir, yearStr, sourcePath, monthName, file);
                        } else {
                            const destYearDir = path.join(destDir, yearStr);
                            const destMonthDir = path.join(destYearDir, monthName);
                            const destPath = path.join(destMonthDir, file);
                            console.log(`[DRY-RUN] Se movería "${file}" a "${destPath}"`);
                        }

                        processed.push({
                            file,
                            action: 'moved',
                            type: fileType,
                            year: yearStr,
                            month: monthName,
                            dateField: dateInfo.field,
                            dryRun
                        });

                        updateProgress();
                    } catch (err) {
                        console.error(`Error en archivo ${file}:`, err.message);
                        errors.push({
                            file,
                            error: err.message,
                            stack: err.stack
                        });
                        updateProgress();
                    }
                }

                // Cerrar ExifTool al terminar
                await exiftool.end();

                function updateProgress() {
                    filesProcessed++;
                    const percentage = Math.round((filesProcessed/totalFiles) * 100);

                    progressCallback({
                        processed: filesProcessed,
                        total: totalFiles,
                        percentage: percentage,
                        completed: filesProcessed === totalFiles,
                        errors: errors.slice(),
                        processedFiles: processed.slice(),
                        skippedFiles: skipped.slice(),
                        currentFile: filesProcessed < totalFiles ? files[filesProcessed] : null
                    });

                    if(filesProcessed === totalFiles) {
                        resolve({
                            success: errors.length === 0,
                            total: totalFiles,
                            processed: processed,
                            errors: errors,
                            skipped: skipped
                        });
                    }
                }
            });
        });
    } catch (error) {
        // Asegurar que ExifTool se cierra incluso si hay error
        try {
            await exiftool.end();
        } catch (e) {
            console.error('Error cerrando ExifTool:', e);
        }
        throw error;
    }
}

async function MoveFile(destDir, yearStr, sourcePath, monthName, file) {
    const destYearDir = path.join(destDir, yearStr);
    const destMonthDir = path.join(destYearDir, monthName);
    let destPath = path.join(destMonthDir, file);

    // Crear directorios si no existen
    if (!fs.existsSync(destYearDir)) {
        fs.mkdirSync(destYearDir, { recursive: true });
    }
    if (!fs.existsSync(destMonthDir)) {
        fs.mkdirSync(destMonthDir, { recursive: true });
    }

    // Manejar archivos duplicados
    destPath = getUniqueFilename(destPath, file);

    // Mover archivo
    fs.renameSync(sourcePath, destPath);

    const movedFilename = path.basename(destPath);
    if (movedFilename !== file) {
        console.log(`El archivo "${file}" se renombró a "${movedFilename}" y se movió a "${destPath}".`);
    } else {
        console.log(`El archivo "${file}" se movió a "${destPath}".`);
    }
}

module.exports = {
    remplazaSlash,
    procesarImagenes,
    SUPPORTED_EXTENSIONS
};
