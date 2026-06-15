#!/usr/bin/env node
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const port = +(process.env.PORT || 5173);
const root = path.join(__dirname, '..');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  let rel;
  if (urlPath === '/' || urlPath === '') rel = 'index.html';
  else {
    rel = urlPath.replace(/^\//, '');
    if (rel.endsWith('/')) rel += 'index.html';
    else if (!path.extname(rel)) rel = path.join(rel, 'index.html');
  }
  let file = path.join(root, rel);
  if (!file.startsWith(root)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(port, '127.0.0.1', () => {
  console.log(`Calm Safe City marketing → http://127.0.0.1:${port}/`);
  console.log(`Play the game          → http://127.0.0.1:${port}/play/`);
  console.log(`Creative sandbox       → http://127.0.0.1:${port}/play/?mode=creative`);
});
