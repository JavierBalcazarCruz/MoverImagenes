// mover.js
const ExifTool = require("exiftool-vendored").ExifTool;
const exiftool = new ExifTool({ taskTimeoutMillis: 5000 });
const fs = require("fs");
const path = require("path");

const months = {
    1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
    5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
    9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre"
};

function remplazaSlash(inputString) {
    return inputString.replace(/\\/g, "/");
}

function procesarImagenes(sourceDir, destDir, progressCallback) {
    return new Promise((resolve, reject) => {
        fs.readdir(sourceDir, function (err, files) {
            if (err) {
                reject(new Error("Error al leer la carpeta fuente: " + err.message));
                return;
            }
 
            if (files.length === 0) {
                progressCallback({
                    processed: 0,
                    total: 0,
                    percentage: 100,
                    completed: true
                });
                resolve();
                return;
            }

            let filesProcessed = 0;
            const totalFiles = files.length;

            files.forEach(async function (file) {
                const sourcePath = path.join(sourceDir, file);
                try {
                    const stats = fs.statSync(sourcePath);

                    if (stats.isDirectory()) {
                        console.log(`"${file}" es un directorio. Ignorando...`);
                        updateProgress();
                        return;
                    }

                    const tags = await exiftool.read(sourceDir + "\\" + file);
                    
                    if (tags.FileType === 'AAE') {
                        console.log(`Eliminando archivo AAE: ${file}`);
                        fs.unlinkSync(sourcePath);
                    } else if (tags.FileType === 'MOV') {
                        console.log("Es video MOV");
                        const year = tags.CreateDate.year;
                        const yearStr = year.toString();
                        const month = tags.CreateDate.month;
                        const monthName = months[month];
                        await MoveFile(destDir, yearStr, sourcePath, monthName, file);
                    } else {
                        if (tags.DateTimeOriginal == undefined) {
                            console.log("Es imagen pero usará fecha de creación");
                            const year = tags.FileCreateDate.year;
                            const yearStr = year.toString();
                            const month = tags.FileCreateDate.month;
                            const monthName = months[month];
                            await MoveFile(destDir, yearStr, sourcePath, monthName, file);
                        } else {
                            console.log("Es imagen usará fecha de Captura");
                            const year = tags.DateTimeOriginal.year;
                            const yearStr = year.toString();
                            const month = tags.DateTimeOriginal.month;
                            const monthName = months[month];
                            await MoveFile(destDir, yearStr, sourcePath, monthName, file);
                        }
                    }
                    updateProgress();
                } catch (err) {
                    console.error(`Error en archivo ${file}:`, err);
                    updateProgress();
                }
            });

            function updateProgress() {
                filesProcessed++;
                progressCallback({
                    processed: filesProcessed,
                    total: totalFiles,
                    percentage: Math.round((filesProcessed/totalFiles) * 100),
                    completed: filesProcessed === totalFiles
                });
                
                if(filesProcessed === totalFiles) {
                    resolve();
                }
            }
        });
    });
}
async function MoveFile(destDir, yearStr, sourcePath, monthName, file) {
    const destYearDir = path.join(destDir, yearStr);
    const destMonthDir = path.join(destYearDir, monthName);
    const destPath = path.join(destMonthDir, file);

    if (!fs.existsSync(destYearDir)) {
        fs.mkdirSync(destYearDir);
    }
    if (!fs.existsSync(destMonthDir)) {
        fs.mkdirSync(destMonthDir);
    }
    fs.renameSync(sourcePath, destPath);
    console.log(`El archivo "${file}" se movió a "${destPath}".`);
}
module.exports = {
    remplazaSlash,
    procesarImagenes
};