// app.js
const express = require('express');
const path = require("path");
const fs = require("fs");
const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

const { remplazaSlash, procesarImagenes, SUPPORTED_EXTENSIONS } = require('./mover');

// Endpoint para obtener extensiones soportadas
app.get('/supported-extensions', (req, res) => {
    res.json(SUPPORTED_EXTENSIONS);
});

// Endpoint mejorado con validación y manejo correcto de SSE
app.get('/progress', async (req, res) => {
    const { origen, destino, dryRun, deleteAAE, timeout } = req.query;

    // Validar parámetros
    if (!origen || !destino) {
        return res.status(400).json({
            error: 'Se requieren las rutas de origen y destino'
        });
    }

    const sOrigen = remplazaSlash(origen);
    const sDestino = remplazaSlash(destino);

    // Validar que las carpetas existan
    if (!fs.existsSync(sOrigen)) {
        return res.status(400).json({
            error: `La carpeta de origen no existe: ${sOrigen}`
        });
    }

    if (!fs.statSync(sOrigen).isDirectory()) {
        return res.status(400).json({
            error: `La ruta de origen no es una carpeta: ${sOrigen}`
        });
    }

    // Validar o crear carpeta de destino
    if (!fs.existsSync(sDestino)) {
        try {
            fs.mkdirSync(sDestino, { recursive: true });
            console.log(`Carpeta de destino creada: ${sDestino}`);
        } catch (err) {
            return res.status(400).json({
                error: `No se pudo crear la carpeta de destino: ${err.message}`
            });
        }
    }

    if (!fs.statSync(sDestino).isDirectory()) {
        return res.status(400).json({
            error: `La ruta de destino no es una carpeta: ${sDestino}`
        });
    }

    // Configurar Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Enviar comentario inicial para mantener la conexión abierta
    res.write(': connected\n\n');

    // Opciones de procesamiento
    const options = {
        dryRun: dryRun === 'true',
        deleteAAE: deleteAAE !== 'false', // Por defecto true
        timeoutMillis: timeout ? parseInt(timeout) : 30000
    };

    console.log('Iniciando procesamiento con opciones:', options);
    console.log(`Origen: ${sOrigen}`);
    console.log(`Destino: ${sDestino}`);

    try {
        await procesarImagenes(sOrigen, sDestino, (progress) => {
            // Enviar progreso al cliente
            res.write(`data: ${JSON.stringify(progress)}\n\n`);

            // Cerrar conexión cuando se complete
            if (progress.completed) {
                console.log('Procesamiento completado');

                // Dar tiempo para que el último mensaje se envíe
                setTimeout(() => {
                    res.end();
                }, 100);
            }
        }, options);
    } catch (error) {
        console.error('Error durante el procesamiento:', error);

        // Enviar error al cliente
        res.write(`data: ${JSON.stringify({
            error: true,
            message: error.message,
            completed: true
        })}\n\n`);

        setTimeout(() => {
            res.end();
        }, 100);
    }

    // Manejar cierre de conexión del cliente
    req.on('close', () => {
        console.log('Cliente desconectado');
        res.end();
    });
});

// Endpoint para validar rutas
app.post('/validate-paths', (req, res) => {
    const { origen, destino } = req.body;

    if (!origen || !destino) {
        return res.status(400).json({
            valid: false,
            error: 'Se requieren las rutas de origen y destino'
        });
    }

    const sOrigen = remplazaSlash(origen);
    const sDestino = remplazaSlash(destino);
    const errors = [];

    // Validar origen
    if (!fs.existsSync(sOrigen)) {
        errors.push(`La carpeta de origen no existe: ${sOrigen}`);
    } else if (!fs.statSync(sOrigen).isDirectory()) {
        errors.push(`La ruta de origen no es una carpeta: ${sOrigen}`);
    }

    // Validar destino (puede no existir, se creará)
    if (fs.existsSync(sDestino) && !fs.statSync(sDestino).isDirectory()) {
        errors.push(`La ruta de destino existe pero no es una carpeta: ${sDestino}`);
    }

    res.json({
        valid: errors.length === 0,
        errors: errors,
        canCreateDestination: !fs.existsSync(sDestino)
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('===========================================');
    console.log('  Organizador de Imágenes y Videos');
    console.log('===========================================');
    console.log(`Servidor en ejecución en puerto: ${PORT}`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log('');
    console.log('Formatos soportados:');
    console.log(`  Imágenes: ${SUPPORTED_EXTENSIONS.images.length} formatos`);
    console.log(`  Videos: ${SUPPORTED_EXTENSIONS.videos.length} formatos`);
    console.log('===========================================');
});
