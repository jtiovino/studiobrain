const { createServer } = require('http');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3005;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

console.log('Preparing Next.js app...');

app
  .prepare()
  .then(() => {
    console.log('Next.js app prepared successfully');
    createServer((req, res) => {
      handle(req, res);
    }).listen(port, err => {
      if (err) throw err;
      console.log(`> Ready on http://${hostname}:${port}`);
    });
  })
  .catch(err => {
    console.error('Error preparing Next.js app:', err);
  });
