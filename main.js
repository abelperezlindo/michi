const { app, BrowserWindow } = require('electron');

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
