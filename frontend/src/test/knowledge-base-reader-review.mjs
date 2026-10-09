import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server.js';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
let server;
try {
  const { ArticleDetail } = await vite.ssrLoadModule('/src/features/knowledge-base/components/ArticleDetail.jsx');
  const { ArticleFilters } = await vite.ssrLoadModule('/src/features/knowledge-base/components/ArticleFilters.jsx');
  const { ArticleList } = await vite.ssrLoadModule('/src/features/knowledge-base/components/ArticleList.jsx');
  const { ArticleBody } = await vite.ssrLoadModule('/src/features/knowledge-base/components/ArticleBody.jsx');
  const { SecureWorkspaceLayout } = await vite.ssrLoadModule('/src/components/layout/SecureWorkspaceLayout.jsx');
  const { AuthContext } = await vite.ssrLoadModule('/src/features/auth/hooks/useAuth.js');
  const { ToastProvider } = await vite.ssrLoadModule('/src/components/feedback/ToastProvider.jsx');
  const { buildAccessProfile } = await vite.ssrLoadModule('/src/permissions/access.js');
  const collection = JSON.parse(await fs.readFile('../database/knowledge-base.production.json', 'utf8'));
  const articles = collection.articles.map((entry, index) => ({
    ...entry, article_id: index + 1, status: 'published', visibility_scope: 'all_users',
    view_count: 1, last_reviewed_at: '2026-10-08T12:00:00Z', updated_at: '2026-10-08T12:00:00Z',
    body: `# ${entry.title}\n\nApplies to: ${entry.platform}\n\n## Before you start\nSave your work. Follow ICT policy.\n\n## What to do\n${entry.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n## Sources\n${entry.sources.join('\n')}`,
  }));
  const article = articles[28];
  const detail = renderToStaticMarkup(h(ArticleDetail, { article, onFeedback() {}, onEdit() {}, onBack() {} }));
  assert.equal(detail.split(article.title).length - 1, 1, 'Article title should appear only once');
  assert.match(detail, /rel="noopener noreferrer"/);
  assert.match(detail, /<details class="kb-article-toc-compact"/);
  assert.match(detail, /Last reviewed/);
  const list = renderToStaticMarkup(h(ArticleList, { articles: [article], selectedArticleId: article.article_id, onSelect() {} }));
  assert.match(list, /1 view</);
  assert.doesNotMatch(list, /1 views/);
  assert.match(list, /aria-current="page"/);
  const unsafe = renderToStaticMarkup(h(ArticleBody, { value: 'javascript:alert(1) https://user:password@example.com <script>alert(1)</script>' }));
  assert.doesNotMatch(unsafe, /href=|<script>/);
  const filters = { search: '', category: '', status: '' };
  assert.doesNotMatch(renderToStaticMarkup(h(ArticleFilters, { filters, canManage: false })), /id="kb-status-react"/);
  assert.match(renderToStaticMarkup(h(ArticleFilters, { filters, canManage: true })), /id="kb-status-react"/);

  const user = { role: 'admin', user_id: 1, full_name: 'System Administrator' };
  const auth = { isReady: true, isAuthenticated: true, user, accessProfile: buildAccessProfile(user), logout: async () => {} };
  function markup(selected) {
    const content = h('div', { className: 'kb-page-react secure-registry-page' },
      h('div', { className: 'service-desk-secure-head' }, h('div', null, h('h2', null, 'Knowledge Base'), h('p', null, 'Find answers to common ICT problems.')),
        h('div', { className: 'service-desk-secure-actions' }, h('button', { className: 'ui-button ui-button-primary' }, 'New article'))),
      h('div', { className: `kb-layout-react ${selected ? 'kb-has-selection' : ''}` },
        h('section', { className: 'secure-data-panel' }, h(ArticleFilters, { filters: { search: '', category: '', status: '' }, canManage: true, resultCount: 30, onChange() {}, onClear() {} }), h(ArticleList, { articles, selectedArticleId: selected ? article.article_id : null, onSelect() {} })),
        h(ArticleDetail, { article: selected ? article : null, hasArticles: true, onBack() {} })));
    return renderToStaticMarkup(h(StaticRouter, { location: '/knowledge-base' }, h(AuthContext.Provider, { value: auth }, h(ToastProvider, null, h(SecureWorkspaceLayout, { title: 'Knowledge Base' }, content)))));
  }
  const stylesheet = (await fs.readdir('dist/assets')).find((file) => file.endsWith('.css'));
  const css = await fs.readFile(`dist/assets/${stylesheet}`, 'utf8');
  server = http.createServer((request, response) => {
    response.setHeader('Content-Type', 'text/html');
    response.end(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body><div id="root">${markup(!request.url.includes('list'))}</div></body></html>`);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  if (process.argv.includes('--screenshots')) {
    const output = await fs.mkdtemp(path.join(os.tmpdir(), 'nsc-kb-review-'));
    for (const [name, width, height, route] of [['desktop', 1440, 1000, '/'], ['wide-desktop', 1830, 1000, '/'], ['mobile-reader', 390, 844, '/'], ['mobile-list', 390, 844, '/list'], ['small-mobile', 320, 800, '/']]) {
      const profile = path.join(output, name);
      const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
      const exited = new Promise((resolve) => chrome.once('exit', resolve));
      let socket;
      try {
        let port;
        for (let attempt = 0; attempt < 100 && !port; attempt += 1) {
          try { port = (await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; } catch { await new Promise((resolve) => setTimeout(resolve, 100)); }
        }
        assert.ok(port, 'Chrome debugging endpoint must start');
        const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
        socket = new WebSocket(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
        await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
        let sequence = 0;
        const pending = new Map();
        socket.addEventListener('message', (event) => {
          const message = JSON.parse(event.data);
          const request = pending.get(message.id);
          if (!request) return;
          pending.delete(message.id);
          if (message.error) request.reject(new Error(message.error.message)); else request.resolve(message.result);
        });
        const send = (method, params = {}) => new Promise((resolve, reject) => {
          const id = ++sequence;
          pending.set(id, { resolve, reject });
          socket.send(JSON.stringify({ id, method, params }));
        });
        await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
        await send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}${route}` });
        await new Promise((resolve) => setTimeout(resolve, 800));
        const metrics = await send('Runtime.evaluate', { returnByValue: true, expression: '({width: innerWidth, scrollWidth: document.documentElement.scrollWidth, filters: [...document.querySelectorAll(".kb-filters .ui-input")].map(el => {const r=el.getBoundingClientRect();return {left:r.left,right:r.right}})})' });
        assert.equal(metrics.result.value.width, width);
        assert.ok(metrics.result.value.scrollWidth <= width + 1, `${name} must not scroll horizontally`);
        if (name !== 'mobile-reader') for (const field of metrics.result.value.filters) assert.ok(field.left >= 0 && field.right <= width, 'Filters must fit the viewport');
        if (width < 600 && route === '/') {
          const toggled = await send('Runtime.evaluate', { returnByValue: true, expression: 'document.querySelector(".kb-article-toc-compact summary").click(); document.querySelector(".kb-article-toc-compact").open' });
          assert.equal(toggled.result.value, true, 'Mobile contents must expand');
          await send('Runtime.evaluate', { expression: 'document.querySelector(".kb-article-toc-compact summary").click()' });
        }
        const screenshot = await send('Page.captureScreenshot', { format: 'png' });
        await fs.writeFile(path.join(output, `${name}.png`), Buffer.from(screenshot.data, 'base64'));
        await send('Browser.close');
      } finally {
        socket?.close();
        chrome.kill();
        await exited;
      }
      assert.ok((await fs.stat(path.join(output, `${name}.png`))).size > 1000);
    }
    console.log(`Screenshots: ${output}`);
  }
  console.log('Knowledge-base reader rendering checks passed.');
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  await vite.close();
}
