const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const SRC_DIR = path.join(__dirname, 'src');
const LIB_DIR = path.join(__dirname, 'src', 'lib');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.map': 'application/json',
  '.wasm': 'application/wasm'
};

function serveFile(req, res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('Not Found');
      } else {
        res.writeHead(500);
        res.end('Server Error');
      }
      return;
    }
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  
  if (urlPath === '/') urlPath = '/index.html';
  if (urlPath === '/login') urlPath = '/login.html';
  if (urlPath === '/venta') urlPath = '/venta.html';
  if (urlPath === '/dashboard') urlPath = '/dashboard.html';
  if (urlPath === '/productos') urlPath = '/productos.html';
  if (urlPath === '/proveedores') urlPath = '/proveedores.html';
  if (urlPath === '/alertas') urlPath = '/alertas.html';
  
  let filePath;
  
  if (urlPath.startsWith('/src/')) {
    filePath = path.join(__dirname, urlPath);
  } else if (urlPath.startsWith('/lib/')) {
    filePath = path.join(__dirname, urlPath);
  } else {
    filePath = path.join(PUBLIC_DIR, urlPath);
  }
  
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    serveFile(req, res, filePath);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Frontend server running at http://localhost:${PORT}`);
  console.log(`📁 Serving from: ${PUBLIC_DIR}`);
  console.log(`\nCredenciales de prueba:`);
  console.log(`  Admin:    admin / admin123`);
  console.log(`  Vendedor: vendedor / vendedor123`);
  console.log(`\nPresiona Ctrl+C para detener`);
});

process.on('SIGINT', () => {
  console.log('\n👋 Server stopped');
  process.exit(0);
});