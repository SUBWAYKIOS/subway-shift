// Thu gọn Index.html giao cho quán: bỏ chú thích + khoảng trắng (KHÔNG đổi tên biến).
// Mã nguồn đầy đủ giữ ở nguon/Index.nguon.html.  Dùng: node tools/minify.js nguon/Index.nguon.html Index.html
// (dựng lại 2026-10-22 — esbuild lấy từ /opt/npm-tools; giữ nguyên chỗ đánh dấu <!--SBW_WHO--> mà Code.gs cần)
const fs = require('fs');
let esb;
try { esb = require('esbuild'); } catch (e) { esb = require('/opt/npm-tools/node_modules/esbuild'); }
const [src, out] = process.argv.slice(2);
let h = fs.readFileSync(src, 'utf8');
const before = Buffer.byteLength(h);
const keep = [];
const stash = s => { keep.push(s); return '\u0000K' + (keep.length - 1) + '\u0000'; };
// 1) khối <script>: thu gọn bằng esbuild (chỉ bỏ khoảng trắng + chú thích)
h = h.replace(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g, (m, attrs, body) => {
  if ((attrs && /\bsrc=/.test(attrs)) || !body.trim() || (attrs && /type=["'](?!text\/javascript|module)[^"']+["']/.test(attrs))) return stash(m);
  const r = esb.transformSync(body, { loader: 'js', minifyWhitespace: true, legalComments: 'none', charset: 'utf8' });
  return stash('<script' + (attrs || '') + '>' + r.code.replace(/<\/script/gi, '<\\/script') + '</script>');
});
// 2) CSS của trang
h = h.replace(/<style(\s[^>]*)?>([\s\S]*?)<\/style>/g, (m, attrs, body) => {
  const r = esb.transformSync(body, { loader: 'css', minifyWhitespace: true, legalComments: 'none', charset: 'utf8' });
  return stash('<style' + (attrs || '') + '>' + r.code + '</style>');
});
// 3) HTML: bỏ chú thích (trừ chỗ đánh dấu Code.gs cần), gộp khoảng trắng đầu dòng
h = h.replace(/<!--(?!SBW_)[\s\S]*?-->/g, '').replace(/\n[ \t]+/g, '\n').replace(/\n{2,}/g, '\n');
h = h.replace(/\u0000K(\d+)\u0000/g, (m, i) => keep[Number(i)]);
fs.writeFileSync(out, h);
console.log('minify ' + before + ' → ' + Buffer.byteLength(h) + ' bytes (' + Math.round((1 - Buffer.byteLength(h) / before) * 100) + '% nhỏ hơn)');
