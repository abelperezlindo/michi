const { app, BrowserWindow, Tray, Menu } = require('electron');
const { WebSocketServer } = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { networkInterfaces } = require('os');
let tray = null;
let win = null;

// Esta función crea la ventana del navegador.
const createWindow = () => {
  win = new BrowserWindow({
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

  // En lugar de cerrar, ocultamos la ventana para que la app siga en segundo plano.
  win.on('close', (event) => {
    // app.isQuitting es una bandera personalizada para controlar el cierre real.
    if (!app.isQuitting) {
      event.preventDefault();
      win.hide();
    }
  });
};

// Electron llamará a esta función cuando esté listo.
app.whenReady().then(() => {
  createWindow();
  // --- Crear el ícono y menú de la barra de tareas (Tray) ---
  // ¡IMPORTANTE! Debes tener un archivo 'icon.png' en la raíz de tu proyecto.
  tray = new Tray(path.join(__dirname, 'icon.png'));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Abrir Michi',
      click: () => {
        win.show(); // Simplemente muestra la ventana oculta.
      }
    },
    { type: 'separator' },
    {
      label: 'Salir',
      click: () => {
        app.isQuitting = true; // Marcamos que estamos saliendo de verdad.
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Michi - Control Remoto');
  tray.setContextMenu(contextMenu);

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
    // En macOS es común volver a crear una ventana en la aplicación cuando el
    // ícono del dock se presiona y no hay otras ventanas abiertas.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      win.show(); // Si la ventana está oculta, muéstrala
    }
  });
});

