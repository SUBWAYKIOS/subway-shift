// Giả lập Apps Script tối thiểu để chạy Code.gs bằng Node (dựng lại 2026-10-22).
// Dùng: const api = require('./gas-mock')({ code: '.../Code.gs', html: '.../Index.html' });
//       api.loginManager('subway1111') …  (mọi hàm cấp cao nhất của Code.gs đều có trong api)
'use strict';
const fs = require('fs'), vm = require('vm'), crypto = require('crypto');

function toSigned(buf){ return Array.from(buf, b => (b > 127 ? b - 256 : b)); }
function toBuf(x){
  if (Buffer.isBuffer(x)) return x;
  if (Array.isArray(x)) return Buffer.from(x.map(b => (b < 0 ? b + 256 : b)));
  if (x && typeof x.getBytes === 'function') return toBuf(x.getBytes());
  return Buffer.from(String(x == null ? '' : x), 'utf8');
}

// ---------- bảng tính trong bộ nhớ ----------
let SEQ = 0;
class Range {
  constructor(sh, r, c, nr, nc){ this.sh = sh; this.r = r; this.c = c; this.nr = nr; this.nc = nc; }
  getValues(){
    const out = [];
    for (let i = 0; i < this.nr; i++){
      const row = this.sh.data[this.r - 1 + i] || [], o = [];
      for (let j = 0; j < this.nc; j++){ const v = row[this.c - 1 + j]; o.push(v === undefined || v === null ? '' : v); }
      out.push(o);
    }
    return out;
  }
  getDisplayValues(){ return this.getValues().map(r => r.map(String)); }
  getValue(){ return this.getValues()[0][0]; }
  setValues(vals){
    for (let i = 0; i < vals.length; i++){
      const ri = this.r - 1 + i;
      while (this.sh.data.length <= ri) this.sh.data.push([]);
      for (let j = 0; j < vals[i].length; j++) this.sh.data[ri][this.c - 1 + j] = vals[i][j];
    }
    return this;
  }
  setValue(v){ return this.setValues([[v]]); }
  getRow(){ return this.r; } getColumn(){ return this.c; } getNumRows(){ return this.nr; } getNumColumns(){ return this.nc; }
  setNumberFormat(){ return this; } setFontWeight(){ return this; } setBackground(){ return this; } clearContent(){ return this.setValues(this.getValues().map(r => r.map(() => ''))); }
}
class Sheet {
  constructor(ss, name){ this.ss = ss; this.name = name; this.data = []; this.id = ++SEQ; }
  getName(){ return this.name; } setName(n){ this.name = n; return this; } getParent(){ return this.ss; } getSheetId(){ return this.id; }
  getLastRow(){ let n = this.data.length; while (n && !(this.data[n - 1] || []).some(v => v !== '' && v != null)) n--; return n; }
  getLastColumn(){ return this.data.reduce((m, r) => Math.max(m, (r || []).length), 0); }
  getMaxRows(){ return Math.max(1000, this.data.length); } getMaxColumns(){ return Math.max(26, this.getLastColumn()); }
  getRange(a, b, c, d){
    if (typeof a === 'string') return new Range(this, 1, 1, 1, 1);   // 'B:B' … chỉ dùng để định dạng
    return new Range(this, a, b, c || 1, d || 1);
  }
  getDataRange(){ const r = Math.max(1, this.getLastRow()), c = Math.max(1, this.getLastColumn()); return new Range(this, 1, 1, r, c); }
  appendRow(arr){ this.data.length = this.getLastRow(); this.data.push(arr.slice()); return this; }
  deleteRow(r){ this.data.splice(r - 1, 1); return this; }
  deleteRows(r, n){ this.data.splice(r - 1, n); return this; }
  insertRowsAfter(){ return this; } setFrozenRows(){ return this; } autoResizeColumns(){ return this; } setColumnWidth(){ return this; } hideSheet(){ return this; } setTabColor(){ return this; }
  clear(){ this.data = []; return this; }
}
class Spreadsheet {
  constructor(id, name){ this.id = id; this.name = name || 'SS'; this.sheets = []; }
  getId(){ return this.id; } getName(){ return this.name; } getUrl(){ return 'https://docs.google.com/spreadsheets/d/' + this.id; }
  getSheetByName(n){ return this.sheets.find(s => s.name === n) || null; }
  getSheets(){ return this.sheets.slice(); }
  insertSheet(n){ const s = new Sheet(this, n || ('Sheet' + (this.sheets.length + 1))); this.sheets.push(s); return s; }
  deleteSheet(s){ this.sheets = this.sheets.filter(x => x !== s); }
}

module.exports = function makeApi(opt){
  opt = opt || {};
  const REG = {};                                         // id → Spreadsheet (dùng chung giữa các quán nếu truyền opt.registry)
  const registry = opt.registry || REG;
  const mainId = opt.ssId || ('ss_' + crypto.randomBytes(6).toString('hex'));
  registry[mainId] = registry[mainId] || new Spreadsheet(mainId, 'SUBWAY');
  const props = {}, cache = new Map(), mails = [], triggers = [];
  const htmlPath = opt.html;

  const ctx = {
    console, Math, Date, JSON, Object, Array, String, Number, Boolean, RegExp, Error, isFinite, isNaN, parseInt, parseFloat, encodeURIComponent, decodeURIComponent,
    SpreadsheetApp: {
      getActiveSpreadsheet: () => registry[mainId],
      openById: id => { if (!registry[id]) throw new Error('Không mở được bảng tính ' + id); return registry[id]; },
      create: name => { const id = 'ss_' + crypto.randomBytes(6).toString('hex'); return (registry[id] = new Spreadsheet(id, name)); },
      flush: () => {}
    },
    CacheService: { getScriptCache: () => ({
      get: k => (cache.has(k) ? cache.get(k) : null),
      getAll: ks => { const o = {}; ks.forEach(k => { if (cache.has(k)) o[k] = cache.get(k); }); return o; },
      put: (k, v) => { cache.set(k, String(v)); }, putAll: o => { Object.keys(o).forEach(k => cache.set(k, String(o[k]))); },
      remove: k => { cache.delete(k); }, removeAll: ks => { ks.forEach(k => cache.delete(k)); }
    }) },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: k => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); return this; },
      deleteProperty: k => { delete props[k]; }, getProperties: () => Object.assign({}, props),
      setProperties: o => { Object.keys(o).forEach(k => { props[k] = String(o[k]); }); }, getKeys: () => Object.keys(props),
      deleteAllProperties: () => { Object.keys(props).forEach(k => delete props[k]); }
    }) },
    LockService: (function () {
      // Mô phỏng: khoá giữ theo lượt chạy (gọi lại tryLock khi đang giữ vẫn được), releaseLock là nhả.
      var held = { s: false, d: false };
      function mk(k) { return { tryLock: () => { held[k] = true; return true; }, waitLock: () => { held[k] = true; }, releaseLock: () => { held[k] = false; }, hasLock: () => held[k] }; }
      return { getScriptLock: () => mk('s'), getDocumentLock: () => mk('d') };
    })(),
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      DigestAlgorithm: { SHA_256: 'sha256', SHA_1: 'sha1', MD5: 'md5' },
      Charset: { UTF_8: 'utf8' },
      computeDigest: (alg, v) => toSigned(crypto.createHash(alg).update(toBuf(v)).digest()),
      computeHmacSha256Signature: (v, k) => toSigned(crypto.createHmac('sha256', toBuf(k)).update(toBuf(v)).digest()),
      base64Encode: v => toBuf(v).toString('base64'),
      base64Decode: s => toSigned(Buffer.from(String(s), 'base64')),
      base64EncodeWebSafe: v => toBuf(v).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
      base64DecodeWebSafe: s => toSigned(Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64')),
      newBlob: (data, type, name) => { const b = toBuf(data); return { getBytes: () => toSigned(b), getDataAsString: () => b.toString('utf8'), getContentType: () => type || '', getName: () => name || '', setName(n){ name = n; return this; }, setContentType(t){ type = t; return this; } }; },
      formatDate: (d, tz, fmt) => {
        const j = new Date(new Date(d).getTime() + 9 * 3600000), p = n => String(n).padStart(2, '0');
        return String(fmt).replace('yyyy', j.getUTCFullYear()).replace('MM', p(j.getUTCMonth() + 1)).replace('dd', p(j.getUTCDate()))
          .replace('HH', p(j.getUTCHours())).replace('mm', p(j.getUTCMinutes())).replace('ss', p(j.getUTCSeconds()));
      },
      sleep: () => {}, unzip: () => []
    },
    MailApp: { sendEmail: function(){ mails.push(Array.from(arguments)); }, getRemainingDailyQuota: () => 100 },
    ScriptApp: {
      getService: () => ({ getUrl: () => opt.url || 'http://127.0.0.1/exec' }),
      getOAuthToken: () => 'test-token',
      getProjectTriggers: () => triggers.slice(),
      newTrigger: fn => { const t = { fn, getHandlerFunction: () => fn, getUniqueId: () => fn }; const b = { timeBased: () => b, everyMinutes: () => b, everyHours: () => b, atHour: () => b, everyDays: () => b, create: () => { triggers.push(t); return t; } }; return b; },
      deleteTrigger: t => { const i = triggers.indexOf(t); if (i !== -1) triggers.splice(i, 1); }
    },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'owner@example.com' }), getActiveUser: () => ({ getEmail: () => 'owner@example.com' }), getScriptTimeZone: () => 'Asia/Tokyo' },
    HtmlService: {
      XFrameOptionsMode: { ALLOWALL: 'ALLOWALL', DEFAULT: 'DEFAULT' },
      createHtmlOutputFromFile: () => out(null),
      createHtmlOutput: h => out(h)
    },
    ContentService: { MimeType: { JSON: 'json', TEXT: 'text', JAVASCRIPT: 'js' }, createTextOutput: s => ({ s, setMimeType(){ return this; }, getContent(){ return this.s; } }) },
    DriveApp: {
      getFilesByName: () => iter([]), getFoldersByName: () => iter([]), searchFiles: () => iter([]),
      getFileById: id => ({ getId: () => id, addEditor: () => {}, isTrashed: () => false, getDateCreated: () => new Date() }),
      createFolder: n => folder(n), getRootFolder: () => folder('root'), getFolderById: id => folder(id)
    },
    UrlFetchApp: { fetch: (url, params) => {
      // Hai "quán" giả lập gọi doPost của nhau qua opt.web (url → ctx). Không có → coi như mạng lỗi.
      const tgt = opt.web && opt.web[url];
      if (!tgt) throw new Error('UrlFetchApp: không tới được ' + url);
      const out = tgt.doPost({ postData: { contents: (params && params.payload) || '' } });
      return { getResponseCode: () => 200, getContentText: () => (out && out.getContent) ? out.getContent() : String(out) };
    } },
    Logger: { log: () => {} }
  };
  function iter(a){ let i = 0; return { hasNext: () => i < a.length, next: () => a[i++] }; }
  function folder(n){ return { getId: () => 'f_' + n, getName: () => n, createFile: () => ({ getId: () => 'file', getUrl: () => '', setSharing(){ return this; } }), getFilesByName: () => iter([]), setSharing(){ return this; } }; }
  function out(h){
    return { _h: h, getContent(){ if (this._h == null) this._h = htmlPath ? fs.readFileSync(htmlPath, 'utf8') : ''; return this._h; },
      setTitle(){ return this; }, addMetaTag(){ return this; }, setXFrameOptionsMode(){ return this; }, setFaviconUrl(){ return this; }, setSandboxMode(){ return this; }, append(x){ this._h = this.getContent() + x; return this; } };
  }
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(opt.code, 'utf8'), ctx, { filename: 'Code.gs' });
  if (opt.web && opt.url) opt.web[opt.url] = ctx;
  ctx.__mails = mails; ctx.__props = props; ctx.__cache = cache; ctx.__triggers = triggers; ctx.__ss = registry[mainId];
  return ctx;
};
