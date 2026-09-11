// Smoke test: runs the inline app script from index.html against a stub DOM,
// with the real vendored qrcode-generator library. Not shipped with the site.
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const inline = html.match(/<script>\n([\s\S]*?)\n<\/script>/);
if (!inline) throw new Error('could not find inline script in index.html');
const appSrc = inline[1];

const libSrc =
  fs.readFileSync(path.join(root, 'vendor/qrcode-generator/qrcode.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(root, 'vendor/qrcode-generator/qrcode_UTF8.js'), 'utf8');

// ---- stub DOM ----
const ctxStub = { fillStyle: null, fillRect() {} };
const els = {};
function makeEl(id) {
  return {
    id, value: '', textContent: '', hidden: false, disabled: false,
    width: 0, height: 0, clientWidth: 280, dataset: {},
    classList: { toggle() {}, add() {}, remove() {} },
    addEventListener() {}, focus() {}, select() {}, click() {}, remove() {},
    appendChild() {},
    getContext() { return ctxStub; },
    querySelector() { return { textContent: '' }; },
    toBlob(cb) { cb({ size: 1, type: 'image/png' }); },
  };
}
const documentStub = {
  readyState: 'complete',
  getElementById(id) { return els[id] || (els[id] = makeEl(id)); },
  createElement(tag) { return makeEl('created-' + tag); },
  addEventListener() {},
  body: { appendChild() {} },
};

const results = [];
function t(name, cond) {
  if (!cond) throw new Error('FAIL: ' + name);
  results.push('ok - ' + name);
}

const sandbox = new Function(
  'window', 'document', 'history', 'location', 'navigator', 'console',
  'setTimeout', 'clearTimeout', 'URL', 'URLSearchParams', 'Blob',
  `
  "use strict";
  ${libSrc}
  ${appSrc}
  return window.__linkqr;
  `
);

let linkqr;
try {
  linkqr = sandbox(
    {}, documentStub,
    { replaceState() {} },
    { search: '?u=' + encodeURIComponent('https://example.com/test?x=1'), pathname: '/', hash: '' },
    {},
    console, setTimeout, clearTimeout, URL, URLSearchParams, Blob
  );
} catch (e) {
  console.error('script load failed:', e);
  process.exit(1);
}

// ---- initial load with ?u= preset ----
t('preset generated a canvas drawing', els['qr-canvas'].width > 0 && els['qr-canvas'].height === els['qr-canvas'].width);
t('preview is hi-res (>= 280px)', els['qr-canvas'].width >= 280);
t('empty state hidden', els['qr-empty'].hidden === true);
t('encoded line shown', els['encoded'].textContent === 'Encodes: https://example.com/test?x=1');
t('buttons enabled', els['dl-png'].disabled === false && els['dl-svg'].disabled === false && els['copy'].disabled === false);
t('status clear', els['status'].textContent === '');

// ---- normalize() ----
t('bare domain', linkqr.normalize('example.com') === 'https://example.com');
t('host with port', linkqr.normalize('example.com:8080/x') === 'https://example.com:8080/x');
t('scheme kept', linkqr.normalize('  https://a.b ') === 'https://a.b');
t('mailto kept', linkqr.normalize('mailto:a@b.co') === 'mailto:a@b.co');
t('empty', linkqr.normalize('   ') === '');
t('unicode passthrough', linkqr.normalize('ünicode.example') === 'https://ünicode.example');

// ---- generate(): plain domain ----
els['url'].value = 'github.com/nangti';
linkqr.generate();
t('domain auto-https', linkqr.current && linkqr.current.text === 'https://github.com/nangti');
const svg = linkqr.svgString(linkqr.current.qr);
t('svg has header', svg.startsWith('<?xml'));
t('svg has viewBox', svg.includes('viewBox="0 0 330 330"'));
t('svg has white bg + black path', svg.includes('fill="#ffffff"') && svg.includes('fill="#000000"'));
t('svg is square + quiet zone', /width="(\d+)" height="\1"/.test(svg));
t('fileBase from host', linkqr.fileBase('https://example.com/x?y=1') === 'qr-example.com');
t('fileBase strips www', linkqr.fileBase('https://www.foo.bar/') === 'qr-foo.bar');

// ---- generate(): unicode URL ----
els['url'].value = 'https://example.com/caf\u00e9';
linkqr.generate();
t('unicode URL encodes', linkqr.current && linkqr.current.text === 'https://example.com/caf\u00e9');
t('unicode canvas drawn', els['qr-canvas'].width > 0);

// ---- generate(): too long ----
els['url'].value = 'https://example.com/' + 'a'.repeat(3000);
linkqr.generate();
t('overflow caught', linkqr.current === null);
t('overflow message', els['status'].textContent.toLowerCase().includes('too long'));
t('overflow disables buttons', els['dl-png'].disabled === true);

// ---- generate(): empty ----
els['url'].value = '   ';
linkqr.generate();
t('empty resets UI', els['qr-empty'].hidden === false && els['encoded'].textContent === '' && els['dl-png'].disabled === true);

// ---- generate(): bad scheme-ish input still becomes https URL ----
els['url'].value = 'not a url';
linkqr.generate();
t('spaces become %20-encoded https URL', linkqr.current && linkqr.current.text === 'https://not a url');

// ---- canvas draw is deterministic & square ----
els['url'].value = 'https://example.com';
linkqr.generate();
const w = els['qr-canvas'].width, h = els['qr-canvas'].height;
t('canvas square', w === h);
t('canvas dims multiple of modules', linkqr.current.qr.getModuleCount() > 10);

console.log(results.join('\n'));
console.log('\n' + results.length + ' assertions passed ✅');
