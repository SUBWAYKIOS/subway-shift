// Đọc CSV WingArc (Dr.Sum) — TỰ SINH từ mã app (ofc-9-report.js + bizParsePos) để bot và app đọc giống hệt nhau.
'use strict';
function t(k){ return k === 'bzPosBad' ? 'Không thấy cột 商品名' : (k === 'bzPosNoDate' ? 'Không thấy cột ngày' : k); }
function ot(k){ return k === 'waBad' ? 'Không nhận ra file WingArc này' : k; }
  function bizCsvRows(text){
    var lines = String(text || "").replace(/\r\n?/g, "\n").split("\n"), out = [];
    var tabbed = lines.slice(0, 10).some(function(l){ return l.indexOf("\t") !== -1; }) && !lines.slice(0, 10).some(function(l){ return /","/.test(l); });
    lines.forEach(function(l){
      if (tabbed){ out.push(l.split("\t")); return; }
      var cells = [], cur = "", q = false;
      for (var i = 0; i < l.length; i++){
        var ch = l[i];
        if (q){ if (ch === '"'){ if (l[i + 1] === '"'){ cur += '"'; i++; } else q = false; } else cur += ch; }
        else if (ch === '"') q = true; else if (ch === ","){ cells.push(cur); cur = ""; } else cur += ch;
      }
      cells.push(cur); out.push(cells);
    });
    return out;
  }

  function bizParsePos(text){
    var rows = bizCsvRows(text), dateRow = -1, hdr = -1, colDay = {}, ymSeen = {};
    for (var i = 0; i < Math.min(rows.length, 30); i++){
      var r = rows[i], found = 0;
      r.forEach(function(c, j){
        var m = String(c).match(/(\d{4})[\/\-年](\d{1,2})[\/\-月](\d{1,2})/);
        if (m){ found++; colDay[j] = { ym: m[1] + "-" + ("0" + m[2]).slice(-2), d: Number(m[3]) }; }
      });
      if (found >= 1 && dateRow === -1){ dateRow = i; } else if (dateRow === -1) colDay = {};
      if (r.some(function(c){ return /商品名/.test(c); })) hdr = i;
      if (dateRow !== -1 && hdr !== -1) break;
    }
    if (hdr === -1) throw new Error(t("bzPosBad"));
    if (dateRow === -1) throw new Error(t("bzPosNoDate"));
    var H = rows[hdr], col = function(re){ for (var j = 0; j < H.length; j++) if (re.test(String(H[j]))) return j; return -1; };
    var cName = col(/商品名/), cCode = col(/商品コード|コード/), c1 = col(/大分類/), c2 = col(/中分類/);
    Object.keys(colDay).forEach(function(j){ ymSeen[colDay[j].ym] = (ymSeen[colDay[j].ym] || 0) + 1; });
    var ym = Object.keys(ymSeen).sort(function(a, b){ return ymSeen[b] - ymSeen[a]; })[0];
    var it = {}, n = 0;
    for (var k = hdr + 1; k < rows.length; k++){
      var r = rows[k], nm = String(r[cName] || "").trim(); if (!nm) continue;
      var code = String(cCode !== -1 ? r[cCode] : "").trim() || ("n:" + nm);
      var x = it[code] || (it[code] = { n: nm, c1: c1 !== -1 ? String(r[c1] || "").trim() : "", c2: c2 !== -1 ? String(r[c2] || "").trim() : "", d: {} });
      Object.keys(colDay).forEach(function(j){
        if (colDay[j].ym !== ym) return;
        var v = Number(String(r[j] || "").replace(/[,\s]/g, ""));
        if (isFinite(v) && v) x.d[colDay[j].d] = (x.d[colDay[j].d] || 0) + v;
      });
      n++;
    }
    var ds = Object.keys(colDay).filter(function(j){ return colDay[j].ym === ym; }).map(function(j){ return colDay[j].d; }).sort(function(a, b){ return a - b; });
    return { ym: ym, it: it, rows: n, from: ds[0], to: ds[ds.length - 1] };
  }

  function waParse(text, name){
    if (/商品名/.test(text.slice(0, 4000))){ var p = bizParsePos(text); return { kind: "pos", ym: p.ym, it: p.it, n: p.rows, from: p.from, to: p.to }; }
    var rows = bizCsvRows(text).filter(function(r){ return r.some(function(c){ return String(c).trim(); }); });
    var DRX = /(\d{4})[\/\-年.](\d{1,2})[\/\-月.](\d{1,2})/, HRX = /^\s*(\d{1,2})\s*(?::\d{2}|時)/;
    // dạng 1: mỗi hàng = một ngày
    var hdr = -1, dc = -1;
    for (var i = 0; i < Math.min(rows.length, 40) && hdr === -1; i++){
      for (var j = 0; j < rows[i].length; j++) if (DRX.test(rows[i][j])){
        var cnt = 0; for (var k = i; k < Math.min(rows.length, i + 6); k++) if (DRX.test(rows[k][j] || "")) cnt++;
        if (cnt >= 2 || rows.length - i <= 2){ hdr = i - 1; dc = j; break; }
      }
    }
    var out = { kind: "wa", d: {}, name: name }, yms = {};
    function col(H, re){ for (var j = 0; j < H.length; j++) if (re.test(String(H[j]))) return j; return -1; }
    if (dc !== -1){
      var H = hdr >= 0 ? rows[hdr].map(String) : [];
      var cRev = col(H, /純売上|売上金額|税抜売上|売上高/); if (cRev === -1) cRev = col(H, /売上/);
      var cCust = col(H, /客数|来店客|組数/), cEat = col(H, /イートイン|店内/), cTake = col(H, /テイクアウト|持ち?帰/), cDeli = col(H, /デリバリー|宅配|出前|Uber|wolt|menu/i);
      var hours = {}; H.forEach(function(h, j){ var m = String(h).match(HRX); if (m) hours[j] = Number(m[1]); });
      for (var r = Math.max(0, hdr + 1); r < rows.length; r++){
        var m = String(rows[r][dc] || "").match(DRX); if (!m) continue;
        var ym = m[1] + "-" + ("0" + m[2]).slice(-2); yms[ym] = (yms[ym] || 0) + 1;
        var o = { ym: ym };
        function num(c){ if (c < 0) return null; var v = Number(String(rows[r][c] || "").replace(/[,¥￥\s円]/g, "")); return isFinite(v) ? v : null; }
        if (num(cRev) !== null) o.rev = num(cRev);
        if (num(cCust) !== null) o.cust = num(cCust);
        if (num(cEat) !== null) o.eat = num(cEat); if (num(cTake) !== null) o.take = num(cTake); if (num(cDeli) !== null) o.deli = num(cDeli);
        var hk = Object.keys(hours); if (hk.length >= 3){ o.h = {}; hk.forEach(function(c){ var v = num(+c); if (v !== null) o.h[hours[c]] = v; }); }
        var key = Number(m[3]), prev = out.d[ym + ":" + key];
        if (prev && o.h && prev.h){ Object.keys(o.h).forEach(function(h){ prev.h[h] = (prev.h[h] || 0) + o.h[h]; }); }
        else out.d[ym + ":" + key] = Object.assign(prev || {}, o);
      }
    } else {
      // dạng 2: hàng = giờ, cột = ngày (giống file số bán)
      var drow = -1, cd = {};
      for (var i2 = 0; i2 < Math.min(rows.length, 30) && drow === -1; i2++){
        rows[i2].forEach(function(c, j){ var m2 = String(c).match(DRX); if (m2){ cd[j] = { ym: m2[1] + "-" + ("0" + m2[2]).slice(-2), d: Number(m2[3]) }; } });
        if (Object.keys(cd).length >= 2) drow = i2; else cd = {};
      }
      if (drow === -1) throw new Error(ot("waBad"));
      for (var r2 = drow + 1; r2 < rows.length; r2++){
        var lab = String(rows[r2][0] || "") + " " + String(rows[r2][1] || ""), hm = lab.match(/(\d{1,2})\s*(?::\d{2}|時)/);
        var isRev = /売上/.test(lab), isCust = /客数|組数/.test(lab);
        Object.keys(cd).forEach(function(j){
          var v = Number(String(rows[r2][j] || "").replace(/[,¥￥\s円]/g, "")); if (!isFinite(v)) return;
          var k = cd[j].ym + ":" + cd[j].d, o = out.d[k] || (out.d[k] = { ym: cd[j].ym }); yms[cd[j].ym] = 1;
          if (hm){ o.h = o.h || {}; o.h[Number(hm[1])] = (o.h[Number(hm[1])] || 0) + v; }
          else if (isRev) o.rev = v; else if (isCust) o.cust = v;
        });
      }
    }
    var months = {};
    Object.keys(out.d).forEach(function(k){ var x = out.d[k], ym = x.ym, dd = k.split(":")[1]; delete x.ym; (months[ym] = months[ym] || { d: {}, name: name }).d[dd] = x; });
    if (!Object.keys(months).length) throw new Error(ot("waBad"));
    return { kind: "wa", months: months };
  }

module.exports = { waParse: waParse, bizParsePos: bizParsePos, bizCsvRows: bizCsvRows };
