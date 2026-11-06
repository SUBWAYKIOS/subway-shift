// 🤖 Bot WingArc (Dr.Sum EA Datalizer) cho app SUBWAY — chạy trên máy Mac của quán.
// Không có API → bot "học" đường bấm của anh một lần, sau đó tự làm lại mỗi lần chạy:
//   node wa-bot.mjs hoc      → mở Chrome, anh đăng nhập + bấm tải từng file CSV như mọi khi; bot ghi lại các bước bấm
//   node wa-bot.mjs chay     → tự đăng nhập (tài khoản trong Keychain), bấm lại các bước, tải CSV, gửi vào app
//   node wa-bot.mjs gui      → chỉ gửi các CSV đang nằm trong thư mục "tha-csv" (anh tự tải tay rồi thả vào)
// Mật khẩu WingArc + khoá bot nằm trong Keychain của máy Mac (bot không ghi ra file). Mọi việc ghi vào nhat-ky.txt.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const TOOLS = process.env.WA_TOOLS || path.join(os.homedir(), '.subway-tools');      // ngoài iCloud
const require = createRequire(path.join(TOOLS, 'node_modules', 'x.js'));
const { waParse } = createRequire(import.meta.url)('./wa-parse.cjs');
const CFG_F = path.join(HERE, 'cau-hinh.json'), REC_F = path.join(HERE, 'cac-buoc.json'), LOG_F = path.join(HERE, 'nhat-ky.txt');
const DROP = path.join(HERE, 'tha-csv'), SENT = path.join(HERE, 'da-gui'), PROFILE = path.join(TOOLS, 'chrome-wingarc');
const LOGIN_URL = process.env.WA_URL || 'https://subway-datalizer.com/datalizer/Tpage.rse';
for (const d of [DROP, SENT]) fs.mkdirSync(d, { recursive: true });

function log(s){ const line = new Date().toLocaleString('ja-JP') + '  ' + s; console.log(s); fs.appendFileSync(LOG_F, line + '\n'); }
function kc(svc){ const tv = process.env['WA_TEST_' + svc.replace(/\W/g, '_').toUpperCase()]; if (tv) return tv; try { return execFileSync('security', ['find-generic-password', '-a', os.userInfo().username, '-s', svc, '-w'], { encoding: 'utf8' }).trim(); } catch (e){ return ''; } }
function cfg(){ try { return JSON.parse(fs.readFileSync(CFG_F, 'utf8')); } catch (e){ return {}; } }
function decode(buf){
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^﻿/, ''); }
  catch (e){ return new TextDecoder('shift_jis').decode(buf); }
}

// ---------- gửi vào app (Apps Script /exec, giống trang GitHub gọi) ----------
async function send(months){
  const c = cfg(), key = kc('subway-wabot');
  if (!c.url) throw new Error('Chưa có link máy chủ của quán — chạy lại Cai-bot-WingArc.command');
  if (!key) throw new Error('Chưa có khoá bot trong Keychain — chạy lại Cai-bot-WingArc.command');
  const r = await fetch(c.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ rpc: 1, fn: 'waBotImport', args: [key, JSON.stringify({ months })] }), redirect: 'follow' });
  const j = JSON.parse(await r.text());
  if (!j.ok) throw new Error(j.m || 'Máy chủ từ chối');
  return j.v;
}
/** Đọc một loạt file CSV → gộp theo tháng → gửi một lần. */
// ---------- đọc các báo cáo Datalizer của SUBWAY ----------
function csvRows(t){
  const out = []; let row = [], f = '', q = false;
  for (let i = 0; i < t.length; i++){
    const c = t[i];
    if (q){ if (c === '"'){ if (t[i + 1] === '"'){ f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true; else if (c === ','){ row.push(f); f = ''; }
    else if (c === '\n' || c === '\r' || c === '\u0085'){ if (c === '\r' && t[i + 1] === '\n') i++; row.push(f); out.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f || row.length){ row.push(f); out.push(row); }
  return out;
}
const nz = v => { const x = String(v == null ? '' : v).replace(/[,\s円]/g, ''); return x === '' || isNaN(+x) ? null : +x; };
const metricOf = s => { s = String(s || '').replace(/[\s　]/g, ''); return /売上|金額/.test(s) ? 'rev' : /客数/.test(s) ? 'cust' : /ﾕﾆｯﾄ|ユニット/.test(s) ? 'unit' : /数量/.test(s) ? 'qty' : ''; };
/** Ngày kinh doanh của báo cáo "trong ngày": lấy từ tên file (@YYYYMMDD), không có thì theo giờ chạy (trước 5h sáng = hôm qua). */
function bizDate(name){
  const m = String(name).match(/@(\d{4})(\d{2})(\d{2})/); if (m) return { y: +m[1], m: +m[2], d: +m[3] };
  const n = new Date(Date.now() - (new Date().getHours() < 5 ? 864e5 : 0)); return { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate() };
}
const ymOf = b => b.y + '-' + String(b.m).padStart(2, '0');
function botParse(text, name){
  const R = csvRows(text).filter(r => r.some(c => c !== '')), cond = (R[0] || []).join(',');
  if (!/抽出条件/.test(cond)) return null;
  const iT = R.findIndex(r => r.includes('時間帯'));                          // hàng giờ: "時間帯","総合計","09","10",…
  if (iT < 0) return null;
  const hr = R[iT], noTot = hr.indexOf('総合計') < 0, c0 = noTot ? hr.indexOf('時間帯') + 1 : hr.indexOf('総合計');          // 商品販売数 (trong ngày) không có cột 総合計 → cộng các giờ
  const hourOf = c => { const v = hr[c] || (c > 0 && hr[c - 1] && /^\d{1,2}$/.test(hr[c - 1]) && hr[c] === '' ? hr[c - 1] : ''); return v; };
  const hourAt = []; let last = '';
  for (let c = 0; c < hr.length; c++){ if (hr[c] !== '') last = hr[c]; hourAt[c] = c >= c0 ? last : ''; }
  const dataStart = R.findIndex((r, i) => i > iT && /^\d{3,}$/.test(r[0] || ''));
  if (dataStart < 0) return null;
  const labRows = R.slice(iT + 1, dataStart);                                 // các hàng tiêu đề chỉ số (売上/客数/ﾕﾆｯﾄ数…)
  const colMet = []; for (let c = 0; c < hr.length; c++){ for (const lr of labRows){ const m = metricOf(lr[c]); if (m){ colMet[c] = m; break; } } }
  const data = R.slice(dataStart).filter(r => /^\d{3,}$/.test(r[0] || ''));
  const head = labRows[labRows.length - 1] || [];
  const cDate = head.indexOf('日付'), cIO = head.findIndex(x => /IN\/OUT/i.test(x)), cCode = head.indexOf('商品コード'), cName = head.indexOf('商品名');
  const put = (o, met, c, v) => { const H = hourAt[c]; if (v === null || !met) return; if (H === '総合計'){ if (met === 'rev') o.rev = v; else if (met === 'cust') o.cust = v; } else if (/^\d{1,2}$/.test(H) && met === 'rev'){ (o.h = o.h || {})[String(+H)] = v; } };
  if (cCode >= 0){                                                            // số bán từng món (trong ngày, cột theo giờ)
    const b = bizDate(name), it = {}; let n = 0;
    for (const r of data){ const k = String(r[cCode] || '').trim(); if (!k) continue; let q = null;
      if (noTot){ for (let c = c0; c < r.length; c++) if (colMet[c] === 'qty' || !colMet[c]){ const v = nz(r[c]); if (v !== null) q = (q || 0) + v; } }
      else for (let c = c0; c < r.length; c++) if (hourAt[c] === '総合計' && (colMet[c] === 'qty' || !colMet[c])){ q = nz(r[c]); break; }
      if (q === null) continue; it[k] = { n: r[cName] || '', c1: r[head.indexOf('大分類')] || '', c2: r[head.indexOf('中分類')] || '', d: { [b.d]: q } }; n++; }
    return n ? { kind: 'pos', ym: ymOf(b), it, n } : null;
  }
  const months = {};
  const day = (b) => { const M = months[ymOf(b)] = months[ymOf(b)] || { d: {} }; return M.d[b.d] = M.d[b.d] || {}; };
  if (cDate >= 0){                                                            // theo ngày × giờ (時間帯別…, cả tháng)
    for (const r of data){ const m = String(r[cDate]).match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/); if (!m) continue;
      const o = day({ y: +m[1], m: +m[2], d: +m[3] }); for (let c = c0; c < r.length; c++) put(o, colMet[c], c, nz(r[c])); }
  } else if (cIO >= 0){                                                       // ăn tại quán / mang đi / giao hàng (trong ngày)
    const o = day(bizDate(name));
    for (const r of data){ const ch = /EAT/i.test(r[cIO]) ? 'eat' : /TAKE/i.test(r[cIO]) ? 'take' : /DELI/i.test(r[cIO]) ? 'deli' : ''; if (!ch) continue;
      for (let c = c0; c < r.length; c++) if (hourAt[c] === '総合計' && colMet[c] === 'rev'){ const v = nz(r[c]); if (v !== null) o[ch] = v; break; } }
  } else {                                                                    // 売上 / 客数 / ﾕﾆｯﾄ数 theo giờ (trong ngày): mỗi hàng 1 chỉ số
    const o = day(bizDate(name)), mets = labRows.map(lr => metricOf(lr[c0])).filter(Boolean);
    data.forEach((r, i) => { const met = mets[i]; if (!met) return; for (let c = c0; c < r.length; c++){ const H = hourAt[c], v = nz(r[c]); if (v === null) continue;
      if (H === '総合計'){ if (met === 'rev') o.rev = v; else if (met === 'cust') o.cust = v; } else if (met === 'rev' && /^\d{1,2}$/.test(H)) (o.h = o.h || {})[String(+H)] = v; } });
  }
  for (const ym of Object.keys(months)) for (const d of Object.keys(months[ym].d)){ const o = months[ym].d[d]; if (o.rev == null && o.h) o.rev = Object.values(o.h).reduce((a, b) => a + b, 0); }
  for (const ym of Object.keys(months)) for (const d of Object.keys(months[ym].d)) if (!Object.keys(months[ym].d[d]).length) delete months[ym].d[d];
  return Object.keys(months).some(ym => Object.keys(months[ym].d).length) ? { kind: 'wa', months } : null;
}
async function sendFiles(files){
  const months = {};
  for (const f of files){
    try {
      const txt = decode(fs.readFileSync(f)), p = botParse(txt, path.basename(f)) || waParse(txt, path.basename(f));
      if (p.kind === 'pos'){ (months[p.ym] = months[p.ym] || {}).pos = { it: p.it }; log('  🧾 ' + path.basename(f) + ' → số bán ' + p.ym + ' (' + p.n + ' món)'); }
      else for (const ym of Object.keys(p.months)){
        const M = months[ym] = months[ym] || {}; M.d = M.d || {};
        for (const [d, x] of Object.entries(p.months[ym].d)){ const o = M.d[d] = M.d[d] || {}; Object.assign(o, x, { h: Object.assign(o.h || {}, x.h || {}) }); }
        const ks = Object.keys(p.months[ym].d).filter(d => Object.keys(p.months[ym].d[d]).length); if (!ks.length){ log('  ⚠️ ' + path.basename(f) + ': không có số liệu'); continue; }
        log('  📈 ' + path.basename(f) + ' → ' + ym + (ks.length === 1 ? ' ngày ' + ks[0] : ' (' + ks.length + ' ngày)'));
      }
    } catch (e){ log('  ⚠️ ' + path.basename(f) + ': ' + e.message); }
  }
  if (!Object.keys(months).length){ log('Không có dữ liệu để gửi.'); return false; }
  const v = await send(months);
  log('✅ Đã gửi vào app: ' + Object.keys(v.months || {}).join(', '));
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  for (const f of files){ try { fs.renameSync(f, path.join(SENT, stamp + '_' + path.basename(f))); } catch (e){} }
  return true;
}

// ---------- trình duyệt ----------
async function browser(headless){
  let pw;
  try { pw = require('playwright-core'); } catch (e){ throw new Error('Thiếu playwright-core — chạy lại Cai-bot-WingArc.command'); }
  const opts = { headless, acceptDownloads: true, viewport: { width: 1360, height: 900 }, locale: 'ja-JP' };
  try { return await pw.chromium.launchPersistentContext(PROFILE, Object.assign({ channel: 'chrome' }, opts)); }
  catch (e){ return await pw.chromium.launchPersistentContext(PROFILE, opts); }        // không có Google Chrome → Chromium riêng
}
/** Đăng nhập tự động bằng tài khoản trong Keychain (trang Lon.rse: ô User ID + Password + nút Login). */
async function login(page){
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const pw = page.locator('input[type=password]').first();
  if (!(await pw.count())) return true;                       // phiên cũ còn sống
  const user = kc('subway-wingarc-user'), pass = kc('subway-wingarc-pass');
  if (!user || !pass) throw new Error('Chưa lưu tài khoản WingArc trong Keychain — chạy lại Cai-bot-WingArc.command');
  // Trang đăng nhập Datalizer: #login_id + #userpwd_v + ảnh login.gif (gọi submitFunc()). Còn lại: đoán theo kiểu ô.
  const id = page.locator('#login_id, input[name=userid], input[type=text], input:not([type])').first();
  await id.fill(user); await page.locator('#userpwd_v, input[type=password]').first().fill(pass);
  const btn = page.locator('input[type=image][src*="login" i], input[type=image][alt*="ogin" i], button:has-text("Login"), input[type=submit], img[alt*="ogin" i], a:has-text("Login")').first();
  if (await btn.count()) await btn.click(); else await pw.press('Enter');
  await page.waitForTimeout(4000);
  return !(await page.locator('input[type=password]').count());
}

/** Tên báo cáo = chữ của mục cuối cùng anh bấm trước "集計実行 / CSV" (vd 【速報版】売上客数ユニット数). */
const SKIP_TX = /^(集計実行|CSV|ＣＳＶ|Excel|PDF|印刷|OK|閉じる)$/i;
function labelOf(steps, fb){
  for (let i = steps.length - 1; i >= 0; i--){ const t = (steps[i].text || '').trim(); if (t && steps[i].tag !== 'select' && !SKIP_TX.test(t) && t.length < 50) return t; }
  return fb || 'bao-cao';
}
function fileFor(n, label){ return String(n).padStart(2, '0') + '-' + label.replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 40) + '.csv'; }
// ---------- chế độ HỌC: ghi lại các bước bấm cho tới mỗi lần tải file ----------
const REC_JS = `(() => {
  if (window.__waRecOn) return; window.__waRecOn = 1;
  function sel(el){
    if (!el || el.nodeType !== 1) return null;
    const t = (el.innerText || el.value || el.getAttribute('title') || el.getAttribute('alt') || '').trim().replace(/\\s+/g, ' ').slice(0, 60);
    const path = []; let x = el;
    while (x && x.nodeType === 1 && path.length < 6){
      let s = x.tagName.toLowerCase();
      if (x.id && !/\\d{4,}/.test(x.id)){ s += '#' + CSS.escape(x.id); path.unshift(s); break; }
      const sib = x.parentElement ? [...x.parentElement.children].filter(c => c.tagName === x.tagName) : [];
      if (sib.length > 1) s += ':nth-of-type(' + (sib.indexOf(x) + 1) + ')';
      path.unshift(s); x = x.parentElement;
    }
    return { css: path.join(' > '), text: t, tag: el.tagName.toLowerCase(), lg: !!document.querySelector('input[type=password]') };
  }
  document.addEventListener('click', e => { const t = e.target.closest('a,button,input,img,td,span,div,li') || e.target; const s = sel(t); if (s) window.__waRec && window.__waRec(Object.assign({ k: 'click' }, s)); }, true);
  document.addEventListener('change', e => { const t = e.target; if (!/INPUT|SELECT|TEXTAREA/.test(t.tagName) || t.type === 'password') return; const s = sel(t); if (s) window.__waRec && window.__waRec(Object.assign({ k: 'fill', v: t.value }, s)); }, true);
})();`;
async function learn(){
  const ctx = await browser(!!process.env.WA_HEADLESS);
  const steps = [], recipes = [];
  await ctx.exposeBinding('__waRec', (src, s) => {
    if (s.lg) return;                                    // bước trên trang đăng nhập: bot tự đăng nhập, không ghi
    s.frame = src.frame && src.frame.url ? src.frame.url().replace(/[?#].*$/, '') : '';
    steps.push(s); console.log('   • ' + (s.k === 'fill' ? 'nhập ' + s.text : 'bấm ' + (s.text || s.css)));
  });
  await ctx.addInitScript(REC_JS);
  const page = ctx.pages()[0] || await ctx.newPage();
  ctx.on('page', p => p.on('download', onDl));
  page.on('download', onDl);
  async function onDl(dl){
    const st = steps.splice(0), label = labelOf(st, dl.suggestedFilename()), name = fileFor(recipes.length + 1, label), to = path.join(DROP, name);
    await dl.saveAs(to);
    recipes.push({ name, label, steps: st });
    fs.writeFileSync(REC_F, JSON.stringify({ at: Date.now(), recipes }, null, 1));
    log('📥 Đã học file thứ ' + recipes.length + ': ' + name + ' (' + recipes[recipes.length - 1].steps.length + ' bước)');
  }
  log('🎓 CHẾ ĐỘ HỌC: hãy đăng nhập WingArc rồi mở + tải (エクスポート / CSV) từng báo cáo như mọi khi. Xong thì ĐÓNG cửa sổ Chrome.');
  await page.goto(LOGIN_URL);
  if (process.env.WA_SIM){ const sim = await import(process.env.WA_SIM); await sim.default(page); await page.waitForTimeout(800); await ctx.close(); }   // chỉ dùng khi kiểm thử
  else await new Promise(r => ctx.on('close', r));
  log(recipes.length ? '✅ Đã học ' + recipes.length + ' file. Lần sau bấm đúp WingArc-Bot.command là bot tự làm.' : '⚠️ Chưa tải file nào nên bot chưa học được gì.');
  const f = fs.readdirSync(DROP).filter(n => /\.(csv|txt|tsv)$/i.test(n)).map(n => path.join(DROP, n));
  if (f.length) await sendFiles(f);
}

// ---------- chế độ CHẠY: đăng nhập + bấm lại + tải + gửi ----------
/** Tìm khung (frame) đã ghi — ở trang chính hoặc cửa sổ bật lên (WingArc hay mở báo cáo trong cửa sổ mới). */
async function frameFor(page, url){
  const ctx = page.context();
  for (let i = 0; i < 20; i++){
    const pages = ctx.pages().slice().reverse();
    for (const pg of pages){ const f = pg.frames().find(fr => fr.url().replace(/[?#].*$/, '') === url); if (f) return f; }
    if (!url) return page.mainFrame();
    await page.waitForTimeout(500);
  }
  return (ctx.pages().slice(-1)[0] || page).mainFrame();
}
/** Chờ file tải về ở BẤT KỲ cửa sổ nào của phiên. */
function waitDownload(ctx, ms){
  return new Promise((ok, no) => {
    const tm = setTimeout(() => no(new Error('Không thấy file tải về sau ' + Math.round(ms / 1000) + ' giây')), ms);
    const hook = pg => pg.once('download', d => { clearTimeout(tm); ok(d); });
    ctx.pages().forEach(hook); ctx.on('page', hook);
  });
}
/** Mở hết các nhánh cây báo cáo (ExtJS) để thấy mục cần bấm. */
async function expandTree(fr){
  for (let k = 0; k < 4; k++){
    const n = await fr.evaluate(() => { const L = [...document.querySelectorAll('.x-tree-elbow-plus, .x-tree-elbow-end-plus, .x-tree-node-collapsed .x-tree-ec-icon')]; L.forEach(e => e.dispatchEvent(new MouseEvent('click', { bubbles: true }))); return L.length; }).catch(() => 0);
    if (!n) return; await fr.waitForTimeout(600);
  }
}
async function replay(page, step){
  if (step.k === 'click' && step.tag === 'select') return;                       // bấm mở hộp chọn — không cần
  const fr = await frameFor(page, step.frame);
  const vis = async l => (await l.count()) && await l.isVisible().catch(() => false);
  let loc = null;
  if (step.text && step.k === 'click'){
    const byText = () => fr.getByText(step.text, { exact: true }).first();
    loc = byText();
    if (!(await vis(loc))){ await expandTree(fr); await page.waitForTimeout(500); loc = byText(); }
    if (!(await vis(loc))){ const c = fr.locator(step.css).first(); if (await vis(c)) loc = c; }
  } else {
    loc = fr.locator(step.css).first();
    if (!(await vis(loc))){
      if (step.k === 'click' && !step.text) return;                             // nút mở cây không chữ: bỏ qua, bước sau tự mở cây
      if (step.text) loc = fr.getByText(step.text, { exact: true }).first();
    }
  }
  if ((!loc || !(await loc.count()) || !(await vis(loc))) && step.text && step.text.length < 50){
    for (let w = 0; w < 90; w++){                                               // chờ tối đa ~90 giây
      await page.waitForTimeout(1000);
      const f2 = await frameFor(page, step.frame), a = f2.getByText(step.text, { exact: true }).first(), b2 = f2.locator(step.css).first();
      if (await vis(a)){ loc = a; break; } if (await vis(b2)){ loc = b2; break; }
    }
  }
  if ((!loc || !(await loc.count())) && step.k === 'click' && (step.text || '').length >= 50) return;   // bấm vào ô chọn năm/tháng mà không đổi gì — bỏ qua
  if (!loc || !(await loc.count())) throw new Error('Không thấy nút "' + (step.text || step.css) + '" — giao diện WingArc đổi? chạy lại chế độ học');
  if (step.k === 'fill'){ const tg = await loc.evaluate(e => e.tagName); if (tg === 'SELECT') await loc.selectOption(step.v); else await loc.fill(step.v); }
  else await loc.click();
  await page.waitForTimeout(900);
}
/** Ghi lại các ô chọn ngày/tháng + ảnh màn hình của trang báo cáo (để chỉnh bot chọn đúng kỳ). */
const DIAG = path.join(HERE, 'tham-do');
async function dumpForm(page, fr, name){
  try {
    fs.mkdirSync(DIAG, { recursive: true });
    const info = await fr.evaluate(() => {
      const lab = e => { const l = e.id && document.querySelector('label[for="' + e.id + '"]'); return (l && l.innerText) || (e.closest('td,div') && e.closest('td,div').previousElementSibling && e.closest('td,div').previousElementSibling.innerText) || ''; };
      return {
        url: location.href.replace(/[?#].*$/, ''),
        selects: [...document.querySelectorAll('select')].map(e => ({ id: e.id, name: e.name, lab: lab(e).trim().slice(0, 30), vis: !!e.offsetParent, sel: e.value, opts: [...e.options].slice(0, 60).map(o => o.value + '=' + o.text.trim()) })),
        inputs: [...document.querySelectorAll('input:not([type=hidden]):not([type=password]):not([type=image]):not([type=button])')].map(e => ({ id: e.id, name: e.name, type: e.type, lab: lab(e).trim().slice(0, 30), vis: !!e.offsetParent, v: e.value })),
        hidden: [...document.querySelectorAll('input[type=hidden]')].filter(e => /date|ym|month|year|from|to|day|kikan|period/i.test(e.name + e.id)).map(e => ({ id: e.id, name: e.name, v: e.value })),
        text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 1500)
      };
    });
    fs.writeFileSync(path.join(DIAG, name.replace(/\.csv$/, '.json')), JSON.stringify(info, null, 1));
    const pg = fr.page ? fr.page() : page; await pg.screenshot({ path: path.join(DIAG, name.replace(/\.csv$/, '.png')), fullPage: true }).catch(() => {});
  } catch (e){ log('(thăm dò ' + name + ': ' + e.message + ')'); }
}
/** Báo cáo NGÀY (file 1–3) hay báo cáo THÁNG (file 4–5: 時間帯別…). */
function kindOf(r, label){ return r.kind || (/^時間帯別/.test(label) ? 'thang' : 'ngay'); }
const MON_F = path.join(HERE, 'da-lay-thang.json');
function prevMonth(d){ const x = new Date(d.getFullYear(), d.getMonth() - 1, 1); return { y: x.getFullYear(), m: x.getMonth() + 1 }; }
/** Chọn năm / tháng (và ngày đầu–cuối nếu có) trên trang báo cáo trước khi bấm 集計実行. */
async function setPeriod(fr, y, m){
  const last = new Date(y, m, 0).getDate();
  return fr.evaluate(([y, m, last]) => {
    const done = [], days = [];
    const pick = (sel, re) => { const o = [...sel.options].find(o => re.test(o.text.trim()) || re.test(o.value)); if (o && sel.value !== o.value){ sel.value = o.value; sel.dispatchEvent(new Event('change', { bubbles: true })); } return !!o; };
    for (const s of document.querySelectorAll('select')){
      const tx = [...s.options].map(o => o.text.trim());
      if (tx.some(t => /^\d{4}\s*年?$/.test(t))){ if (pick(s, new RegExp('^' + y + '\\s*年?$'))) done.push('năm=' + y); }
      else if (tx.filter(t => /^\d{1,2}\s*月$/.test(t)).length >= 12 || (tx.length >= 12 && tx.length <= 13 && /月/.test(s.name + s.id + tx.join('')))){ if (pick(s, new RegExp('^0?' + m + '\\s*月?$'))) done.push('tháng=' + m); }
      else if (tx.filter(t => /^\d{1,2}\s*日?$/.test(t)).length >= 28) days.push(s);
    }
    if (days.length >= 2){ pick(days[0], /^0?1\s*日?$/); pick(days[days.length - 1], new RegExp('^' + last + '\\s*日?$')); done.push('ngày=1–' + last); }
    return done.join(', ');
  }, [y, m, last]).catch(e => 'lỗi: ' + e.message);
}
/** Đọc dòng 抽出条件 đầu file CSV → khoảng ngày thật sự của dữ liệu. */
function rangeOf(file){
  try { const t = decode(fs.readFileSync(file)).slice(0, 600); const a = t.match(/>=\s*(\d{8})/), b = t.match(/<=\s*(\d{8})/); return a && b ? [a[1], b[1]] : null; } catch (e){ return null; }
}
async function run(force){
  fs.mkdirSync(DIAG, { recursive: true });
  let rec; try { rec = JSON.parse(fs.readFileSync(REC_F, 'utf8')); } catch (e){ rec = null; }
  let mon = {}; try { mon = JSON.parse(fs.readFileSync(MON_F, 'utf8')); } catch (e){}
  const now = new Date(), pm = prevMonth(now), pmKey = pm.y + '-' + String(pm.m).padStart(2, '0');
  const wantMonth = force === 'thang' || !mon[pmKey];                 // tháng trước chưa lấy (đầu tháng, hoặc bù nếu hôm 1 máy tắt)
  const got = [];
  if (rec && rec.recipes && rec.recipes.length){
    const list = rec.recipes.map((r, ri) => { const label = r.label || labelOf(r.steps, r.name); return { r, label, name: fileFor(ri + 1, label), kind: kindOf(r, label) }; })
      .filter(x => force === 'thang' ? x.kind === 'thang' : (x.kind === 'ngay' || wantMonth));
    log('▶️ ' + (list.some(x => x.kind === 'ngay') ? 'Báo cáo ngày' : '') + (list.some(x => x.kind === 'thang') ? (list.some(x => x.kind === 'ngay') ? ' + ' : '') + 'báo cáo tháng ' + pmKey : ''));
    const ctx = await browser(true), page = ctx.pages()[0] || await ctx.newPage();
    let monOk = 0, monN = 0;
    try {
      if (!(await login(page))) throw new Error('Đăng nhập WingArc không được (sai mật khẩu?)');
      log('🔐 Đã đăng nhập WingArc');
      let fresh = false;
      for (const x of list){
        const { r, label, name, kind } = x;
        if (kind === 'thang') monN++;
        try {
          if (fresh){ for (const extra of ctx.pages().slice(1)) await extra.close().catch(() => {}); await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2000); fresh = false; }
          const last = r.steps.length - 1;
          for (let i = 0; i < last; i++){
            if (/集計実行/.test(r.steps[i].text || '')){
              const fr = await frameFor(page, r.steps[i].frame);
              if (kind === 'thang'){ const how = await setPeriod(fr, pm.y, pm.m); log('   🗓 ' + label + ': ' + (how || 'không thấy ô chọn kỳ')); await page.waitForTimeout(800); }
              if (process.env.WA_DIAG !== '0') await dumpForm(page, fr, name);
            }
            await replay(page, r.steps[i]);
          }
          const [dl] = await Promise.all([waitDownload(ctx, 120000), replay(page, r.steps[last])]);
          const bd = bizDate(''), to = path.join(DROP, kind === 'ngay' ? name.replace(/\.csv$/, '@' + bd.y + String(bd.m).padStart(2, '0') + String(bd.d).padStart(2, '0') + '.csv') : name); await dl.saveAs(to); got.push(to);
          const rg = rangeOf(to);
          if (kind === 'thang'){
            const want = [pmKey.replace('-', '') + '01', pmKey.replace('-', '') + String(new Date(pm.y, pm.m, 0).getDate())];
            if (rg && (rg[0] !== want[0] || rg[1] !== want[1])){ log('⚠️ ' + label + ': dữ liệu ' + rg.join('–') + ' chưa đúng tháng ' + pmKey + ' → KHÔNG gửi file này'); fs.renameSync(to, path.join(DIAG, 'sai-ky_' + name)); continue; }
            monOk++;
          }
          log('📥 ' + label + ' → ' + path.basename(to) + (rg ? ' (' + rg.join('–') + ')' : ''));
        } catch (e){ log('⚠️ ' + label + ': ' + e.message); fresh = true; }
      }
    } catch (e){ log('⚠️ ' + e.message); }
    await ctx.close();
    if (monN && monOk === monN){ mon[pmKey] = Date.now(); fs.writeFileSync(MON_F, JSON.stringify(mon, null, 1)); log('🗓 Đã lấy đủ báo cáo tháng ' + pmKey); }
  } else log('ℹ️ Bot chưa học đường bấm — chỉ gửi các file đang có trong thư mục tha-csv.');
  const all = fs.readdirSync(DROP).filter(n => /\.(csv|txt|tsv)$/i.test(n)).map(n => path.join(DROP, n));
  if (all.length) await sendFiles(all); else log('Không có file CSV nào để gửi.');
}

/** Lấy lùi dữ liệu tháng cũ: chạy các báo cáo tháng (時間帯別…) cho từng tháng từ <from> tới tháng trước, gửi từng tháng một. */
async function backfill(from){
  const mm = String(from || '').match(/^(\d{4})-?(\d{1,2})$/);
  if (!mm){ log('❌ Cần tháng bắt đầu dạng 2024-04'); return; }
  let rec; try { rec = JSON.parse(fs.readFileSync(REC_F, 'utf8')); } catch (e){ rec = null; }
  if (!rec || !rec.recipes || !rec.recipes.length){ log('❌ Bot chưa học đường bấm — chạy Hoc-lai-duong-bam.command trước.'); return; }
  let mon = {}; try { mon = JSON.parse(fs.readFileSync(MON_F, 'utf8')); } catch (e){}
  const list = rec.recipes.map((r, ri) => { const label = r.label || labelOf(r.steps, r.name); return { r, label, name: fileFor(ri + 1, label), kind: kindOf(r, label) }; }).filter(x => x.kind === 'thang');
  if (!list.length){ log('❌ Không có báo cáo tháng (時間帯別…) trong đường bấm đã học.'); return; }
  const end = prevMonth(new Date()), months = [];
  for (let y = +mm[1], m = +mm[2]; (y < end.y || (y === end.y && m <= end.m)) && months.length < 60; m === 12 ? (y++, m = 1) : m++) months.push({ y, m, k: y + '-' + String(m).padStart(2, '0') });
  const todo = months.filter(x => process.env.WA_REDO === '1' || !mon[x.k]);
  log('⏪ Lấy lùi ' + todo.length + ' tháng (' + (todo[0] ? todo[0].k : '—') + ' → ' + end.y + '-' + String(end.m).padStart(2, '0') + '), bỏ qua ' + (months.length - todo.length) + ' tháng đã có');
  if (!todo.length) return;
  fs.mkdirSync(DIAG, { recursive: true });
  const ctx = await browser(true), page = ctx.pages()[0] || await ctx.newPage();
  let okM = 0;
  try {
    if (!(await login(page))) throw new Error('Đăng nhập WingArc không được (sai mật khẩu?)');
    log('🔐 Đã đăng nhập WingArc');
    for (const P of todo){
      const got = []; let ok = 0;
      for (const { r, label, name } of list){
        try {
          for (const extra of ctx.pages().slice(1)) await extra.close().catch(() => {});
          if (!(await login(page))) throw new Error('mất đăng nhập');       // login() tự mở lại trang đầu
          const last = r.steps.length - 1;
          for (let i = 0; i < last; i++){
            if (/集計実行/.test(r.steps[i].text || '')){ const fr = await frameFor(page, r.steps[i].frame); const how = await setPeriod(fr, P.y, P.m); log('   🗓 ' + P.k + ' ' + label + ': ' + (how || 'không thấy ô chọn kỳ')); await page.waitForTimeout(800); }
            await replay(page, r.steps[i]);
          }
          const [dl] = await Promise.all([waitDownload(ctx, 120000), replay(page, r.steps[last])]);
          const to = path.join(DROP, name.replace(/\.csv$/, '@' + P.k.replace('-', '') + '.csv')); await dl.saveAs(to);
          const rg = rangeOf(to), want = [P.k.replace('-', '') + '01', P.k.replace('-', '') + String(new Date(P.y, P.m, 0).getDate())];
          if (rg && (rg[0] !== want[0] || rg[1] !== want[1])){ log('⚠️ ' + label + ': dữ liệu ' + rg.join('–') + ' không phải tháng ' + P.k + ' → bỏ'); fs.renameSync(to, path.join(DIAG, 'sai-ky_' + path.basename(to))); continue; }
          got.push(to); ok++; log('📥 ' + P.k + ' ' + label + (rg ? ' (' + rg.join('–') + ')' : ''));
        } catch (e){ log('⚠️ ' + P.k + ' ' + label + ': ' + e.message); }
      }
      if (got.length && await sendFiles(got).catch(e => (log('⚠️ gửi ' + P.k + ': ' + e.message), false)) && ok === list.length){ mon[P.k] = Date.now(); fs.writeFileSync(MON_F, JSON.stringify(mon, null, 1)); okM++; }
      await page.waitForTimeout(1500);
    }
  } catch (e){ log('⚠️ ' + e.message); }
  await ctx.close();
  log('⏪ Xong lấy lùi: đủ ' + okM + '/' + todo.length + ' tháng' + (okM < todo.length ? ' — chạy lại lệnh này để bù tháng còn thiếu (tháng đã có sẽ tự bỏ qua)' : ''));
}

const mode = process.argv[2] || 'chay';
(mode === 'hoc' ? learn() : mode === 'lui' ? backfill(process.argv[3]) : (mode === 'gui' ? sendFiles(fs.readdirSync(DROP).filter(n => /\.(csv|txt|tsv)$/i.test(n)).map(n => path.join(DROP, n))) : run(mode)))
  .then(() => process.exit(0), e => { log('❌ ' + (e && e.message || e)); process.exit(1); });
