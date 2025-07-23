// app.js
const express = require('express');
const path = require("path");
const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

const { remplazaSlash, procesarImagenes } = require('./mover');

app.get('/progress', (req, res) => {
    const { origen, destino } = req.query;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const sOrigen = remplazaSlash(origen);
    const sDestino = remplazaSlash(destino);
    
    procesarImagenes(sOrigen, sDestino, (progress) => {
        res.write(`data: ${JSON.stringify(progress)}\n\n`);
    });
});

app.listen(3000, () => {
    console.log('Server en ejecución en puerto: ', 3000);
}); 