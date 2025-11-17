const { app, BrowserWindow } = require('electron');
const { WebSocketServer } = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { networkInterfaces } = require('os');

// Esta función crea la ventana del navegador.
const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      // Estas opciones son importantes para este ejemplo simple.
      // Permiten que el código en `index.html` use APIs de Node.js como `process`.
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  // Carga el archivo index.html en la ventana.
  win.loadFile('index.html');
};

// Electron llamará a esta función cuando esté listo.
app.whenReady().then(() => {
  createWindow();

  // --- Crear servidor HTTP para servir la web del cliente ---
  const server = http.createServer((req, res) => {
    // Servimos solo el archivo client.html en la raíz
    if (req.url === '/') {
      fs.readFile(path.join(__dirname, 'client.html'), (err, data) => {
        if (err) {
          res.writeHead(500);
          res.end('Error al cargar client.html');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      });
    } else {
      res.writeHead(404);
      res.end('No encontrado');
    }
  });

  // --- Adjuntar el servidor de WebSockets al servidor HTTP ---
  const wss = new WebSocketServer({ server });

  wss.on('connection', ws => {
    console.log('Cliente WebSocket conectado.');

    // Enviar un mensaje de bienvenida al cliente que se acaba de conectar.
    ws.send('¡Bienvenido! Conectado al servidor WebSocket de Michi.');

    // Escuchar mensajes del cliente.
    ws.on('message', message => {
      // Usamos String() para asegurarnos de que el buffer se convierta a texto.
      const messageText = String(message);
      console.log('Mensaje recibido del cliente: %s', messageText);

      // Devolver el mensaje al cliente (modo "eco").
      ws.send(`El servidor recibió tu mensaje: "${messageText}"`);
    });

    ws.on('close', () => {
      console.log('Cliente WebSocket desconectado.');
    });
  });

  // --- Iniciar el servidor y mostrar la IP local ---
  const PORT = 8080;
  server.listen(PORT, () => {
    const nets = networkInterfaces();
    const results = [];
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        // Solo nos interesan las direcciones IPv4 que no sean internas
        if (net.family === 'IPv4' && !net.internal) {
          results.push(net.address);
        }
      }
    }

    console.log('Servidor HTTP y WebSocket iniciado.');
    console.log('La ventana de configuración de Electron está activa.');
    if (results.length > 0) {
      console.log(`Clientes en la red local pueden conectarse a: http://${results[0]}:${PORT}`);
    }
  });

  // Manejo para macOS: si no hay ventanas abiertas, crea una nueva al hacer clic en el ícono del dock.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Cierra la aplicación cuando todas las ventanas se han cerrado (excepto en macOS).
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
