  // =========================================================================
  // 📊 BÁO CÁO CHỦ QUÁN (v56): doanh thu · khách · giờ công / 人件費 · bán chạy · nguyên liệu / 原価 — in A4 / PDF
  // Dữ liệu: WingArc (CSV kéo thả hoặc bot trên Mac) + lịch / điểm danh + "Doanh thu & nguyên liệu" sẵn có.
  // =========================================================================
  var OR_TX = {
    ja: { title: "店舗月次レポート", sub: "オーナー様向け", made: "作成日", rev: "売上", cust: "客数", avg: "客単価", labor: "人件費率", mh: "人時売上", cogs: "原価率", fl: "FL比率",
      prev: "前月比", days: "{n}日分", dRev: "日別売上", dRevPrev: "前月（同日）", dow: "曜日別平均", dowRev: "売上", dowCust: "客数", hourly: "時間帯別売上（1日平均）",
      chan: "売上構成（イートイン／テイクアウト／デリバリー）", eat: "イートイン", take: "テイクアウト", deli: "デリバリー", top: "販売数ランキング（サンド）", item: "商品名", qty: "数量", share: "構成比",
      staff: "スタッフ別勤務時間", name: "氏名", sch: "シフト", act: "実績", diff: "差", total: "合計", hrsDay: "日別の総勤務時間（シフト）", laborCost: "人件費（概算）",
      wage: "平均時給 {y}", ing: "原材料の使用量（レシピ換算）", serv: "使用量", packs: "袋・個", yen: "金額", buys: "仕入（発注確定分）", invB: "期首在庫", invE: "期末在庫",
      cogsAct: "実原価", cogsTheo: "理論原価", notes: "所見", none: "データなし", src: "データ: WingArc（Dr.Sum）CSV・シフト・打刻・発注・棚卸",
      nUp: "売上は前月比 {p} 増加しました。", nDown: "売上は前月比 {p} 減少しました。", nBestDow: "最も売上が高い曜日は{d}曜日（平均 {y}）。", nPeak: "ピークは {h}時台（1日平均 {y}）。",
      nLabor: "人件費率は {p}（目標 {t}）です。", nLaborHi: "人件費率が目標 {t} を上回っています。シフトの見直しをおすすめします。", nMh: "人時売上は {y}/時間 です。",
      nGap: "シフトと実績の差は {h} 時間です。", page: "{a} / {b}" },
    vi: { title: "Báo cáo tháng của quán", sub: "Gửi chủ quán", made: "Ngày lập", rev: "Doanh thu", cust: "Lượt khách", avg: "Chi tiêu / khách", labor: "Tỷ lệ nhân công", mh: "Doanh thu / giờ công", cogs: "Tỷ lệ giá vốn", fl: "Tỷ lệ FL",
      prev: "So tháng trước", days: "{n} ngày", dRev: "Doanh thu theo ngày", dRevPrev: "Tháng trước (cùng ngày)", dow: "Trung bình theo thứ", dowRev: "Doanh thu", dowCust: "Khách", hourly: "Doanh thu theo giờ (TB một ngày)",
      chan: "Cơ cấu (ăn tại quán / mang đi / giao hàng)", eat: "Ăn tại quán", take: "Mang đi", deli: "Giao hàng", top: "Món bán chạy (sandwich)", item: "Món", qty: "Số lượng", share: "Tỉ lệ",
      staff: "Giờ làm theo nhân viên", name: "Tên", sch: "Xếp ca", act: "Thực tế", diff: "Chênh", total: "Tổng", hrsDay: "Tổng giờ làm theo ngày (xếp ca)", laborCost: "Chi phí nhân công (ước tính)",
      wage: "Lương giờ TB {y}", ing: "Nguyên liệu đã dùng (theo công thức)", serv: "Lượng dùng", packs: "Gói / cái", yen: "Thành tiền", buys: "Nhập hàng (phiếu đã đặt)", invB: "Tồn đầu kỳ", invE: "Tồn cuối kỳ",
      cogsAct: "Giá vốn thực", cogsTheo: "Giá vốn lý thuyết", notes: "Nhận xét", none: "Chưa có dữ liệu", src: "Nguồn: CSV WingArc (Dr.Sum), lịch ca, điểm danh, phiếu đặt hàng, kiểm kê",
      nUp: "Doanh thu tăng {p} so với tháng trước.", nDown: "Doanh thu giảm {p} so với tháng trước.", nBestDow: "Thứ bán tốt nhất: {d} (TB {y}).", nPeak: "Giờ cao điểm: {h} giờ (TB {y}/ngày).",
      nLabor: "Tỷ lệ nhân công {p} (mục tiêu {t}).", nLaborHi: "Tỷ lệ nhân công cao hơn mục tiêu {t} — nên xem lại lịch ca.", nMh: "Doanh thu / giờ công: {y}.",
      nGap: "Chênh lệch giữa xếp ca và thực tế: {h} giờ.", page: "{a} / {b}" },
    en: { title: "Monthly store report", sub: "For the owner", made: "Created", rev: "Sales", cust: "Guests", avg: "Avg. ticket", labor: "Labor ratio", mh: "Sales / labor hr", cogs: "Food cost", fl: "FL ratio",
      prev: "vs last month", days: "{n} days", dRev: "Daily sales", dRevPrev: "Last month (same day)", dow: "Average by weekday", dowRev: "Sales", dowCust: "Guests", hourly: "Sales by hour (daily avg.)",
      chan: "Channel mix (eat-in / take-out / delivery)", eat: "Eat-in", take: "Take-out", deli: "Delivery", top: "Best sellers (sandwiches)", item: "Item", qty: "Qty", share: "Share",
      staff: "Hours by staff", name: "Name", sch: "Scheduled", act: "Actual", diff: "Diff", total: "Total", hrsDay: "Total scheduled hours by day", laborCost: "Labor cost (est.)",
      wage: "Avg. hourly wage {y}", ing: "Ingredients used (by recipe)", serv: "Used", packs: "Packs", yen: "Amount", buys: "Purchases (confirmed orders)", invB: "Opening stock", invE: "Closing stock",
      cogsAct: "Actual food cost", cogsTheo: "Theoretical food cost", notes: "Highlights", none: "No data", src: "Sources: WingArc (Dr.Sum) CSV, schedule, time clock, orders, stock count",
      nUp: "Sales rose {p} vs last month.", nDown: "Sales fell {p} vs last month.", nBestDow: "Best weekday: {d} (avg {y}).", nPeak: "Peak hour: {h}:00 (avg {y}/day).",
      nLabor: "Labor ratio {p} (target {t}).", nLaborHi: "Labor ratio is above the {t} target — consider adjusting the schedule.", nMh: "Sales per labor hour: {y}.",
      nGap: "Scheduled vs actual hours differ by {h} h.", page: "{a} / {b}" }
  };
  var OR_DOW = { ja: ["日", "月", "火", "水", "木", "金", "土"], vi: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"], en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] };
  function orLang(){ var l = lsGet("sbw.orlang"); return OR_TX[l] ? l : "ja"; }
  function orT(k, v){ var s = (OR_TX[orLang()] || OR_TX.ja)[k] || k; if (v) s = s.replace(/\{(\w+)\}/g, function(m, x){ return v[x] != null ? v[x] : m; }); return s; }

  // ---- đọc CSV WingArc (đoán loại theo tiêu đề cột) ----
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
  async function waImportFiles(files){
    var done = [];
    for (var i = 0; i < files.length; i++){
      try {
        var got = await textFromFile(files[i], function(){});
        var p = waParse(got.text, files[i].name);
        if (p.kind === "pos"){ await call("posImport", p.ym, JSON.stringify({ it: p.it, name: files[i].name })); done.push("🧾 " + files[i].name); delete BIZ.data[p.ym]; }
        else for (var ym in p.months){ var r = await call("waImport", ym, JSON.stringify(p.months[ym])); done.push("📈 " + files[i].name + " (" + ym + " · " + r.days + ")"); delete BIZ.data[ym]; }
      } catch (e){ showToast(files[i].name + ": " + ((e && e.message) || t("saveErrorToast")), true); }
    }
    if (done.length) showToast(ot("waDone", { n: done.length }));
    return done;
  }

  // ---- ô trong tab Tháng ----
  function ownerTicketHTML(){
    var L = orLang();
    return '<div class="ticket or-ticket" id="orBox"><h3>📊 ' + escapeHTML(ot("orTitle")) + ' <span class="sub">' + escapeHTML(ot("orSub")) + '</span></h3>' +
      '<div class="or-row"><button type="button" class="btn" data-orep="open">📄 ' + escapeHTML(ot("orOpen", { m: state.month })) + '</button>' +
      '<label class="btn ghost or-file">📥 ' + escapeHTML(ot("waImport")) + '<input type="file" accept=".csv,.txt,.tsv,.xlsx,.xls" multiple data-orep="file" hidden></label>' +
      '<button type="button" class="btn ghost" data-orep="bot">🤖 ' + escapeHTML(ot("waBot")) + '</button></div>' +
      '<div class="or-lang ofc-seg">' + [["ja", "日本語"], ["vi", "Tiếng Việt"], ["en", "English"]].map(function(x){ return '<button type="button" data-orlang="' + x[0] + '" class="' + (L === x[0] ? "is-on" : "") + '">' + x[1] + '</button>'; }).join("") + '</div>' +
      '<div class="hint">' + escapeHTML(ot("orHint")) + '</div></div>';
  }
  document.addEventListener("click", function(ev){
    var b = ev.target.closest && ev.target.closest("[data-orep],[data-orlang]"); if (!b || b.tagName === "INPUT") return;
    if (b.hasAttribute("data-orlang")){ lsSet("sbw.orlang", b.getAttribute("data-orlang")); document.querySelectorAll("[data-orlang]").forEach(function(x){ x.classList.toggle("is-on", x === b); }); return; }
    var a = b.getAttribute("data-orep");
    if (a === "open") ownerReportOpen(yearMonthStr(state.year, state.month));
    else if (a === "bot") waBotDialog();
  });
  document.addEventListener("change", async function(ev){
    var i = ev.target; if (!i || i.getAttribute("data-orep") !== "file" || !i.files || !i.files.length) return;
    var fs = Array.prototype.slice.call(i.files); i.value = "";
    await waImportFiles(fs);
  });

  async function waBotDialog(){
    var st = null; try { st = await call("waBotStatus"); } catch (e){}
    var key = "";
    var html = '<div class="or-bot"><p>' + escapeHTML(ot("botHow")) + '</p>' +
      (st && st.last ? '<p class="hint">' + escapeHTML(ot("botLast", { t: new Date(st.last).toLocaleString() })) + '</p>' : '') +
      '<div class="or-row"><button type="button" class="btn" id="botNew">' + escapeHTML(st && st.on ? ot("botRenew") : ot("botMake")) + '</button>' +
      (st && st.on ? '<button type="button" class="btn ghost" id="botOff">' + escapeHTML(ot("botOff")) + '</button>' : '') + '</div><div id="botKey"></div></div>';
    await uiDialog({ title: "🤖 " + ot("waBot"), html: html, hideCancel: true, okText: ot("close"),
      onOpen: function(back){
        var nb = back.querySelector("#botNew"), ob = back.querySelector("#botOff");
        nb.addEventListener("click", async function(){
          try { var r = await call("waBotKey", true); key = r.key;
            back.querySelector("#botKey").innerHTML = '<p class="hint">' + escapeHTML(ot("botKeyOnce")) + '</p><input type="text" readonly class="or-key" value="' + escapeHTML(key) + '"><button type="button" class="btn ghost" id="botCopy">' + escapeHTML(ot("botCopy")) + '</button>';
            back.querySelector("#botCopy").addEventListener("click", function(){ try { navigator.clipboard.writeText(key); showToast("✓"); } catch (e){} });
          } catch (e){ showToast((e && e.message) || t("saveErrorToast"), true); }
        });
        if (ob) ob.addEventListener("click", async function(){ try { await call("waBotKey", false); showToast(ot("botOffDone")); ob.remove(); } catch (e){ showToast((e && e.message) || "", true); } });
      } });
  }

  // ---- dựng bản báo cáo A4 ----
  function orYen(n){ return "¥" + Math.round(n || 0).toLocaleString("ja-JP"); }
  function orPct(a, b){ return b ? (Math.round(a / b * 1000) / 10).toFixed(1) + "%" : "—"; }
  function orDelta(a, b){ if (!b || !a) return ""; var p = (a - b) / b * 100; return '<em class="' + (p >= 0 ? "up" : "dn") + '">' + (p >= 0 ? "▲ " : "▼ ") + Math.abs(Math.round(p * 10) / 10).toFixed(1) + "%</em>"; }
  function orBars(vals, opt){
    opt = opt || {};
    var n = vals.length || 1, W = 640, H = opt.h || 150, mx = Math.max.apply(null, vals.map(function(v){ return Math.max(v.v || 0, v.p || 0); }).concat([1]));
    var bw = W / n, out = '<svg class="or-svg" viewBox="0 0 ' + W + ' ' + (H + 18) + '" xmlns="http://www.w3.org/2000/svg">';
    [0.25, 0.5, 0.75, 1].forEach(function(f){ out += '<line x1="0" x2="' + W + '" y1="' + (H - H * f) + '" y2="' + (H - H * f) + '" stroke="#E5E7EB" stroke-width="1"/>'; });
    vals.forEach(function(v, i){
      var h = (v.v || 0) / mx * (H - 6), x0 = i * bw + bw * 0.16;
      out += '<rect x="' + x0.toFixed(1) + '" y="' + (H - h).toFixed(1) + '" width="' + (bw * 0.68).toFixed(1) + '" height="' + h.toFixed(1) + '" rx="2" fill="' + (v.c || "#16884D") + '"/>';
      if (v.p){ var ph = v.p / mx * (H - 6); out += '<circle cx="' + (i * bw + bw / 2).toFixed(1) + '" cy="' + (H - ph).toFixed(1) + '" r="2.4" fill="#F2A541"/>'; }
      if (n <= 16 || i % 2 === 0 || i === n - 1) out += '<text x="' + (i * bw + bw / 2).toFixed(1) + '" y="' + (H + 13) + '" font-size="9" text-anchor="middle" fill="' + (v.tc || "#6B7280") + '">' + escapeHTML(String(v.x)) + '</text>';
    });
    return out + '</svg>';
  }
  async function ownerReportOpen(ym){
    var R, D;
    try { R = await call("ownerReport", ym); D = BIZ.data[ym] || await call("bizLoad", ym); BIZ.data[ym] = D; }
    catch (e){ showToast((e && e.message) || t("saveErrorToast"), true); return; }
    var L = orLang(), DOW = OR_DOW[L], y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)), nd = new Date(y, m, 0).getDate();
    var wa = (R.wa && R.wa.d) || {}, waP = (R.waPrev && R.waPrev.d) || {}, sales = (D.sales && D.sales.d) || {}, salesP = (R.salesPrev && R.salesPrev.d) || {};
    function revOf(d){ return (wa[d] && wa[d].rev) || sales[d] || 0; }
    function revPOf(d){ return (waP[d] && waP[d].rev) || salesP[d] || 0; }
    var rev = 0, revP = 0, cust = 0, custP = 0, days = 0, rows = [];
    for (var d = 1; d <= nd; d++){
      var r0 = revOf(d), w = new Date(y, m - 1, d).getDay(); if (r0) days++;
      rev += r0; revP += revPOf(d); cust += (wa[d] && wa[d].cust) || 0; custP += (waP[d] && waP[d].cust) || 0;
      rows.push({ d: d, w: w, rev: r0, revP: revPOf(d), cust: (wa[d] && wa[d].cust) || 0, h: wa[d] && wa[d].h, eat: wa[d] && wa[d].eat, take: wa[d] && wa[d].take, deli: wa[d] && wa[d].deli });
    }
    var schH = 0, actH = 0; Object.keys(R.sched || {}).forEach(function(k){ schH += R.sched[k]; }); Object.keys(R.att || {}).forEach(function(k){ actH += R.att[k]; });
    var useH = actH || schH, wage = R.wage || 0, labor = wage * useH;
    var C = null; try { C = bizCalc(D); } catch (e){}
    var buy = 0; try { buy = bizBuysYen(D); } catch (e){}
    var eI = D.inv && D.inv.c ? bizInvTotals(D, D.inv.c) : null, bI = D.invPrev && D.invPrev.c ? bizInvTotals(D, D.invPrev.c) : null;
    var cogsAct = eI && bI && eI.n && bI.n ? bI.all + buy - eI.all : null, cogsTheo = C ? C.ings.reduce(function(a, x){ return a + (x.yen || 0); }, 0) : 0;
    var cogs = cogsAct !== null ? cogsAct : (cogsTheo || null), tgt = 22;
    // nhận xét tự động
    var notes = [];
    if (rev && revP){ var p = (rev - revP) / revP * 100; notes.push(orT(p >= 0 ? "nUp" : "nDown", { p: Math.abs(Math.round(p * 10) / 10).toFixed(1) + "%" })); }
    var byW = [0, 1, 2, 3, 4, 5, 6].map(function(){ return { r: 0, c: 0, n: 0 }; });
    rows.forEach(function(x){ if (x.rev){ byW[x.w].r += x.rev; byW[x.w].c += x.cust; byW[x.w].n++; } });
    var bw = byW.map(function(b, i){ return { i: i, a: b.n ? b.r / b.n : 0 }; }).sort(function(a, b){ return b.a - a.a; })[0];
    if (bw && bw.a) notes.push(orT("nBestDow", { d: DOW[bw.i], y: orYen(bw.a) }));
    var hrs = {}, hrN = 0; rows.forEach(function(x){ if (x.h){ hrN++; Object.keys(x.h).forEach(function(h){ hrs[h] = (hrs[h] || 0) + x.h[h]; }); } });
    var hk = Object.keys(hrs).map(Number).sort(function(a, b){ return a - b; });
    if (hk.length){ var pk = hk.slice().sort(function(a, b){ return hrs[b] - hrs[a]; })[0]; notes.push(orT("nPeak", { h: pk, y: orYen(hrs[pk] / hrN) })); }
    if (rev && labor){ notes.push(orT(labor / rev * 100 > tgt ? "nLaborHi" : "nLabor", { p: orPct(labor, rev), t: tgt + "%" })); }
    if (rev && useH) notes.push(orT("nMh", { y: orYen(rev / useH) }));
    if (schH && actH && Math.abs(schH - actH) >= 1) notes.push(orT("nGap", { h: (Math.round((actH - schH) * 10) / 10).toFixed(1) }));
    var css = '<style>' +
      '.or-a4{font-size:9.5pt;}.or-hd{display:flex;align-items:flex-end;justify-content:space-between;border-bottom:2.5px solid #16884D;padding-bottom:6px;margin-bottom:10px;}' +
      '.or-hd h1{font-size:17pt;margin:0;color:#0B5E35;}.or-hd small{display:block;color:#6B7280;font-size:9pt;}.or-hd .or-m{font-size:13pt;font-weight:800;text-align:right;}' +
      '.or-k{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:10px;}.or-k div{border:1px solid #E5E7EB;border-radius:8px;padding:7px 9px;}' +
      '.or-k span{display:block;font-size:8pt;color:#6B7280;}.or-k b{display:block;font-size:14pt;color:#111;}.or-k small{font-size:7.5pt;color:#6B7280;}' +
      '.or-k em{font-style:normal;font-weight:700;font-size:8pt;margin-left:4px;}.or-k em.up,.or-n em.up{color:#15803D;}.or-k em.dn,.or-n em.dn{color:#B91C1C;}' +
      '.or-s{margin:0 0 10px;}.or-s h2{font-size:10.5pt;margin:0 0 4px;color:#0B5E35;border-left:3px solid #F2C200;padding-left:6px;}' +
      '.or-svg{width:100%;height:auto;display:block;}.or-t{width:100%;border-collapse:collapse;font-size:8.5pt;}.or-t th,.or-t td{border-bottom:1px solid #EEE;padding:2.5px 4px;text-align:right;}' +
      '.or-t th:first-child,.or-t td:first-child{text-align:left;}.or-t thead th{background:#F3F4F6;font-weight:700;}.or-t tfoot td{font-weight:800;border-top:1.5px solid #999;}' +
      '.or-n{margin:0;padding-left:16px;}.or-n li{margin:2px 0;}.or-2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}.or-src{position:absolute;left:17mm;bottom:7mm;font-size:7pt;color:#9CA3AF;}' +
      '.or-pno{position:absolute;right:17mm;bottom:7mm;font-size:8pt;color:#6B7280;}.or-leg{font-size:7.5pt;color:#6B7280;}.or-leg i{display:inline-block;width:8px;height:8px;border-radius:2px;margin:0 3px 0 8px;vertical-align:0;}' +
      '.or-bar{height:9px;border-radius:3px;background:#16884D;display:inline-block;vertical-align:-1px;}.or-none{color:#9CA3AF;font-size:8.5pt;}' +
      '</style>';
    var head = '<div class="or-hd"><div><h1>' + escapeHTML(orT("title")) + '</h1><small>' + escapeHTML(R.store) + ' · ' + escapeHTML(orT("sub")) + '</small></div><div class="or-m">' + y + '/' + pad(m) +
      '<small>' + escapeHTML(orT("made")) + ' ' + new Date().toLocaleDateString(L === "en" ? "en-US" : "ja-JP") + '</small></div></div>';
    function page(i, n, inner){ return '<div class="doc-a4 or-a4">' + css + head + inner + '<div class="or-src">' + escapeHTML(orT("src")) + '</div><div class="or-pno">' + orT("page", { a: i, b: n }) + '</div></div>'; }
    function tile(lbl, val, sub){ return '<div><span>' + escapeHTML(lbl) + '</span><b>' + val + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>'; }
    // trang 1: tổng quan
    var p1 = '<div class="or-k">' +
      tile(orT("rev"), rev ? orYen(rev) + orDelta(rev, revP) : "—", days ? orT("days", { n: days }) + (revP ? " · " + orT("prev") + " " + orYen(revP) : "") : orT("none")) +
      tile(orT("cust"), cust ? cust.toLocaleString() + orDelta(cust, custP) : "—", cust && days ? Math.round(cust / days) + " / " + (L === "ja" ? "日" : (L === "vi" ? "ngày" : "day")) : "") +
      tile(orT("avg"), cust ? orYen(rev / cust) : "—", "") +
      tile(orT("labor"), rev && labor ? orPct(labor, rev) : "—", labor ? orT("laborCost") + " " + orYen(labor) : "") +
      tile(orT("mh"), rev && useH ? orYen(rev / useH) : "—", useH ? (Math.round(useH * 10) / 10) + "h" : "") +
      tile(cogsAct !== null ? orT("cogsAct") : orT("cogs"), rev && cogs ? orPct(cogs, rev) : "—", rev && cogs && labor ? orT("fl") + " " + orPct(cogs + labor, rev) : "") + '</div>';
    p1 += '<div class="or-s"><h2>' + escapeHTML(orT("dRev")) + '</h2>' + (rev ? orBars(rows.map(function(x){ return { x: x.d, v: x.rev, p: x.revP, c: x.w === 0 ? "#E35D5B" : (x.w === 6 ? "#4D7FD6" : "#16884D"), tc: x.w === 0 ? "#E35D5B" : (x.w === 6 ? "#4D7FD6" : "#6B7280") }; }), { h: 150 }) +
      '<div class="or-leg"><i style="background:#16884D"></i>' + escapeHTML(orT("rev")) + '<i style="background:#F2A541;border-radius:50%"></i>' + escapeHTML(orT("dRevPrev")) + '</div>' : '<div class="or-none">' + escapeHTML(orT("none")) + '</div>') + '</div>';
    p1 += '<div class="or-s"><h2>' + escapeHTML(orT("dow")) + '</h2><table class="or-t"><thead><tr><th></th>' + [1, 2, 3, 4, 5, 6, 0].map(function(w){ return '<th>' + DOW[w] + '</th>'; }).join("") + '</tr></thead><tbody>' +
      '<tr><td>' + escapeHTML(orT("dowRev")) + '</td>' + [1, 2, 3, 4, 5, 6, 0].map(function(w){ var b = byW[w]; return '<td>' + (b.n ? orYen(b.r / b.n) : "—") + '</td>'; }).join("") + '</tr>' +
      (cust ? '<tr><td>' + escapeHTML(orT("dowCust")) + '</td>' + [1, 2, 3, 4, 5, 6, 0].map(function(w){ var b = byW[w]; return '<td>' + (b.n && b.c ? Math.round(b.c / b.n) : "—") + '</td>'; }).join("") + '</tr>' : '') + '</tbody></table></div>';
    p1 += '<div class="or-s"><h2>' + escapeHTML(orT("notes")) + '</h2>' + (notes.length ? '<ul class="or-n">' + notes.map(function(x){ return '<li>' + escapeHTML(x) + '</li>'; }).join("") + '</ul>' : '<div class="or-none">' + escapeHTML(orT("none")) + '</div>') + '</div>';
    // trang 2: giờ, kênh bán, món bán chạy
    var p2 = '<div class="or-s"><h2>' + escapeHTML(orT("hourly")) + '</h2>' + (hk.length ? orBars(hk.map(function(h){ return { x: h, v: hrs[h] / hrN }; }), { h: 130 }) : '<div class="or-none">' + escapeHTML(orT("none")) + '</div>') + '</div>';
    var ce = 0, ct = 0, cdl = 0; rows.forEach(function(x){ ce += x.eat || 0; ct += x.take || 0; cdl += x.deli || 0; });
    var csum = ce + ct + cdl;
    p2 += '<div class="or-2"><div class="or-s"><h2>' + escapeHTML(orT("chan")) + '</h2>' + (csum ? '<table class="or-t"><tbody>' + [["eat", ce, "#16884D"], ["take", ct, "#F2C200"], ["deli", cdl, "#4D7FD6"]].map(function(q){
        return '<tr><td>' + escapeHTML(orT(q[0])) + '</td><td>' + orYen(q[1]) + '</td><td style="width:45%"><span class="or-bar" style="width:' + Math.round(q[1] / csum * 100) + '%;background:' + q[2] + '"></span> ' + orPct(q[1], csum) + '</td></tr>'; }).join("") + '</tbody></table>' : '<div class="or-none">' + escapeHTML(orT("none")) + '</div>') + '</div>';
    var top = C && C.top ? C.top.slice(0, 12) : [], units = top.reduce(function(a, x){ return a + x.q; }, 0) || 1;
    p2 += '<div class="or-s"><h2>' + escapeHTML(orT("top")) + '</h2>' + (top.length ? '<table class="or-t"><thead><tr><th>#</th><th style="text-align:left">' + escapeHTML(orT("item")) + '</th><th>' + escapeHTML(orT("qty")) + '</th><th>' + escapeHTML(orT("share")) + '</th></tr></thead><tbody>' +
      top.map(function(x, i){ return '<tr><td>' + (i + 1) + '</td><td style="text-align:left">' + escapeHTML(x.n) + '</td><td>' + Math.round(x.q).toLocaleString() + '</td><td>' + orPct(x.q, units) + '</td></tr>'; }).join("") + '</tbody></table>' : '<div class="or-none">' + escapeHTML(orT("none")) + '</div>') + '</div></div>';
    // trang 3: giờ công từng người + nguyên liệu
    var emps = (R.emps || []).filter(function(e){ return R.sched[e.id] || R.att[e.id]; }).sort(function(a, b){ return (R.sched[b.id] || 0) - (R.sched[a.id] || 0); });
    var p3 = '<div class="or-2"><div class="or-s"><h2>' + escapeHTML(orT("staff")) + '</h2>' + (emps.length ? '<table class="or-t"><thead><tr><th>' + escapeHTML(orT("name")) + '</th><th>' + escapeHTML(orT("sch")) + '</th>' + (R.attOn ? '<th>' + escapeHTML(orT("act")) + '</th><th>' + escapeHTML(orT("diff")) + '</th>' : '') + '</tr></thead><tbody>' +
      emps.slice(0, 26).map(function(e){ var a = R.sched[e.id] || 0, b = R.att[e.id] || 0; return '<tr><td>' + escapeHTML(e.name) + '</td><td>' + a.toFixed(1) + '</td>' + (R.attOn ? '<td>' + b.toFixed(1) + '</td><td>' + (b - a >= 0 ? "+" : "") + (b - a).toFixed(1) + '</td>' : '') + '</tr>'; }).join("") +
      '</tbody><tfoot><tr><td>' + escapeHTML(orT("total")) + '</td><td>' + schH.toFixed(1) + '</td>' + (R.attOn ? '<td>' + actH.toFixed(1) + '</td><td>' + (actH - schH >= 0 ? "+" : "") + (actH - schH).toFixed(1) + '</td>' : '') + '</tr></tfoot></table>' +
      (wage ? '<div class="or-leg">' + escapeHTML(orT("wage", { y: orYen(wage) })) + ' · ' + escapeHTML(orT("laborCost")) + ' ' + orYen(labor) + '</div>' : '') : '<div class="or-none">' + escapeHTML(orT("none")) + '</div>') + '</div>';
    var ings = C ? C.ings.filter(function(x){ return x.serv > 0; }).sort(function(a, b){ return (b.yen || 0) - (a.yen || 0) || b.serv - a.serv; }).slice(0, 16) : [];
    p3 += '<div class="or-s"><h2>' + escapeHTML(orT("ing")) + '</h2>' + (ings.length ? '<table class="or-t"><thead><tr><th>' + escapeHTML(orT("name")) + '</th><th>' + escapeHTML(orT("serv")) + '</th><th>' + escapeHTML(orT("packs")) + '</th><th>' + escapeHTML(orT("yen")) + '</th></tr></thead><tbody>' +
      ings.map(function(x){ return '<tr><td>' + escapeHTML(String(x.name).slice(0, 22)) + '</td><td>' + Math.round(x.serv).toLocaleString() + '</td><td>' + (x.packs != null ? (Math.round(x.packs * 10) / 10) : "—") + '</td><td>' + (x.yen != null ? orYen(x.yen) : "—") + '</td></tr>'; }).join("") + '</tbody></table>' : '<div class="or-none">' + escapeHTML(orT("none")) + '</div>') +
      '<table class="or-t" style="margin-top:6px"><tbody>' +
      '<tr><td>' + escapeHTML(orT("invB")) + '</td><td>' + (bI && bI.n ? orYen(bI.all) : "—") + '</td></tr><tr><td>' + escapeHTML(orT("buys")) + '</td><td>' + orYen(buy) + '</td></tr>' +
      '<tr><td>' + escapeHTML(orT("invE")) + '</td><td>' + (eI && eI.n ? orYen(eI.all) : "—") + '</td></tr>' +
      '<tr><td><b>' + escapeHTML(orT("cogsAct")) + '</b></td><td><b>' + (cogsAct !== null ? orYen(cogsAct) + (rev ? " (" + orPct(cogsAct, rev) + ")" : "") : "—") + '</b></td></tr>' +
      '<tr><td>' + escapeHTML(orT("cogsTheo")) + '</td><td>' + (cogsTheo ? orYen(cogsTheo) + (rev ? " (" + orPct(cogsTheo, rev) + ")" : "") : "—") + '</td></tr></tbody></table></div></div>';
    var sd = R.schedDay || {};
    p3 += '<div class="or-s"><h2>' + escapeHTML(orT("hrsDay")) + '</h2>' + (schH ? orBars(rows.map(function(x){ return { x: x.d, v: sd[x.d] || 0, c: "#3FA7A3", tc: x.w === 0 ? "#E35D5B" : (x.w === 6 ? "#4D7FD6" : "#6B7280") }; }), { h: 90 }) : '<div class="or-none">' + escapeHTML(orT("none")) + '</div>') + '</div>';
    var html = page(1, 3, p1) + page(2, 3, p2) + page(3, 3, p3);
    await docPreview("📊 " + orT("title") + " " + y + "/" + pad(m), html, false);
  }
