#!/usr/bin/env node
/**
 * frontend v2 预览服务 — 极简静态文件服务器
 *
 * 用途: serve .claude/preview/ 目录，让用户在浏览器中可视化选择色板/字体，
 *       以及预览生成的页面。
 *
 * 用法: node .claude/skills/frontend/scripts/dev-server.mjs [port]
 *
 * 特性:
 * - 零外部依赖（仅 Node.js 内置模块）
 * - 自动端口检测（默认 3333，被占用则递增）
 * - 支持 HTML/CSS/JS/JSON/图片/字体 的 MIME
 * - 后台运行，不阻塞 AI 继续工作
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

// ── 配置 ──────────────────────────────────────────────
const START_PORT = parseInt(process.argv[2] || '3333', 10);
const PREVIEW_DIR = path.resolve(process.cwd(), '.claude', 'preview');

const MIME = {
  '.html':  'text/html; charset=utf-8',
  '.css':   'text/css; charset=utf-8',
  '.js':    'application/javascript; charset=utf-8',
  '.mjs':   'application/javascript; charset=utf-8',
  '.json':  'application/json; charset=utf-8',
  '.svg':   'image/svg+xml',
  '.png':   'image/png',
  '.jpg':   'image/jpeg',
  '.jpeg':  'image/jpeg',
  '.gif':   'image/gif',
  '.webp':  'image/webp',
  '.woff2': 'font/woff2',
  '.woff':  'font/woff',
  '.ttf':   'font/ttf',
  '.ico':   'image/x-icon',
};

// ── 端口探测 ──────────────────────────────────────────
function tryPort(port) {
  return new Promise((resolve, reject) => {
    const s = http.createServer();
    s.once('error', (e) => {
      if (e.code === 'EADDRINUSE') {
        resolve(tryPort(port + 1));
      } else {
        reject(e);
      }
    });
    s.listen(port, () => {
      s.close(() => resolve(port));
    });
  });
}

// ── 确保预览目录存在 ─────────────────────────────────
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ── 启动 ──────────────────────────────────────────────
const port = await tryPort(START_PORT);
ensureDir(PREVIEW_DIR);

const server = http.createServer((req, res) => {
  // 安全：防止路径遍历
  const safePath = path.normalize(req.url.split('?')[0]).replace(/^\/+/, '');
  const filePath = path.join(PREVIEW_DIR, safePath || 'index.html');

  // 确保解析后的路径仍在 PREVIEW_DIR 内
  if (!filePath.startsWith(PREVIEW_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('Not found');
      } else {
        res.writeHead(500);
        res.end('Internal error');
      }
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
    res.end(data);
  });
});

server.listen(port, () => {
  // 输出可被 AI 解析的格式
  console.log(JSON.stringify({
    status: 'running',
    port: port,
    url: `http://localhost:${port}`,
    serving: PREVIEW_DIR,
    pid: process.pid,
  }));
});

// ── 优雅退出 ──────────────────────────────────────────
process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
