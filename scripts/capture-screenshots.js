#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'assets', 'screenshots');
const port = +(process.env.PORT || 5179);
const baseUrl = `http://127.0.0.1:${port}`;

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.webmanifest': 'application/manifest+json',
};

function startServer(){
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
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
    });
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

async function main(){
  fs.mkdirSync(outDir, { recursive: true });
  const server = await startServer();

  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch {
    console.error('Install puppeteer first: npm install --no-save puppeteer');
    server.close();
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

    await page.goto(`${baseUrl}/play/?mode=creative`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => typeof fitCityView === 'function' && typeof render === 'function', { timeout: 30000 });
    await new Promise(r => setTimeout(r, 1800));

    await page.evaluate(() => {
      document.getElementById('toasts').innerHTML = '';
      setHudExpanded(true);
      setPeopleExpanded(false);
      setTool('inspect');
      fitCityView();
    });
    await new Promise(r => setTimeout(r, 900));
    await page.screenshot({
      path: path.join(outDir, 'city-overview.png'),
      type: 'png',
    });
    console.log('Wrote city-overview.png');

    await page.evaluate(() => {
      setHudExpanded(false);
      setTool('inspect');
      document.getElementById('toasts').innerHTML = '';
      addWalker('Mochi');
      addWalker('Biscuit');
      addWalker('Pepper');
      const core = 16;
      cam.z = 1.85;
      const p = iso(core, core, 0);
      const center = camCenter();
      cam.px = (center.x - p.x) * cam.z;
      cam.py = (center.y - p.y) * cam.z;
    });
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({
      path: path.join(outDir, 'living-city.png'),
      type: 'png',
    });
    console.log('Wrote living-city.png');

    let sharp;
    try { sharp = require('sharp'); } catch { sharp = null; }
    if (sharp) {
      for (const name of ['city-overview', 'living-city']) {
        await sharp(path.join(outDir, name + '.png'))
          .webp({ quality: 82 })
          .toFile(path.join(outDir, name + '.webp'));
        console.log('Wrote ' + name + '.webp');
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
