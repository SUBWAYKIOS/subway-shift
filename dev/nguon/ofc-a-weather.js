  // =========================================================================
  // 🌤 THỜI TIẾT (v58) — dữ liệu 気象庁 qua máy chủ (wxGet, nhớ tạm 30 phút): thanh Hôm nay (bây giờ · 3 giờ · 7 ngày),
  // lớp nắng / mây / mưa rất nhẹ sau nội dung, bầu trời + mưa ở tab Quán, biểu tượng trên lịch. 出典：気象庁ホームページ
  // =========================================================================
  var WX_TX = {
    vi: { close: "Đóng", title: "Thời tiết", more: "Xem thời tiết", k_sN: "Trời quang", now: "Bây giờ", next: "Theo giờ", week: "7 ngày", rain: "Mưa", src: "Nguồn: 気象庁", fxOn: "Hiệu ứng: bật", fxOff: "Hiệu ứng: tắt", hum: "Ẩm",
      k_s: "Nắng", k_c: "Nhiều mây", k_r: "Mưa", k_n: "Tuyết", adRain: "Có mưa {h} — khách ghé quán có thể ít hơn, đơn giao hàng / mang về thường tăng.", adRainT: "Ngày mai có mưa {h} — nên chuẩn bị thêm cho giao hàng / mang về.", adHot: "Nóng {t}°C — chuẩn bị thêm đá và đồ uống lạnh.", adCold: "Lạnh {t}°C — súp / đồ nóng thường bán chạy.", adStorm: "Mưa to ({p} mm/giờ) — lưu ý sàn trơn ở cửa ra vào.", st: "trạm {n}" },
    ja: { close: "閉じる", title: "天気", more: "天気の詳細", k_sN: "晴れ", now: "現在", next: "3時間ごと", week: "週間", rain: "降水", src: "出典：気象庁", fxOn: "演出：オン", fxOff: "演出：オフ", hum: "湿度",
      k_s: "晴れ", k_c: "くもり", k_r: "雨", k_n: "雪", adRain: "{h}に雨の予報 — 来店が減り、デリバリー・テイクアウトが増えやすい時間です。", adRainT: "明日{h}に雨の予報 — デリバリー・テイクアウトの準備を。", adHot: "最高{t}°C — 氷・冷たいドリンクの準備を。", adCold: "最高{t}°C — スープなど温かい商品が売れやすい日です。", adStorm: "強い雨（{p}mm/h）— 入口の床の滑りに注意。", st: "{n}観測所" },
    en: { close: "Close", title: "Weather", more: "Weather details", k_sN: "Clear", now: "Now", next: "Hourly", week: "7 days", rain: "Rain", src: "Source: JMA", fxOn: "Effects: on", fxOff: "Effects: off", hum: "Hum.",
      k_s: "Sunny", k_c: "Cloudy", k_r: "Rain", k_n: "Snow", adRain: "Rain {h} — fewer walk-ins, more delivery / take-out.", adRainT: "Rain tomorrow {h} — prepare for more delivery / take-out.", adHot: "Hot {t}°C — prepare extra ice and cold drinks.", adCold: "Cold {t}°C — soups and hot items sell better.", adStorm: "Heavy rain ({p} mm/h) — watch for slippery floor at the entrance.", st: "{n} station" }
  };
  function wt(k, v){ var D = WX_TX[state.lang] || WX_TX.vi, s = D[k] != null ? D[k] : (WX_TX.vi[k] || k); if (v) s = String(s).replace(/\{(\w+)\}/g, function(m, x){ return v[x] != null ? v[x] : m; }); return s; }
  var WX = { d: null, at: 0, busy: false, fx: null };
  function wxFxOn(){ return lsGet("sbw.wxfx") !== "0"; }
  function wxNight(){ var h = new Date().getHours(); return h < 6 || h >= 18; }
  /** Biểu tượng nhỏ (SVG vẽ tay, không dùng emoji): s nắng · c mây · r mưa · n tuyết; đêm quang → trăng. */
  function wxIcon(k, night, sz){
    sz = sz || 22;
    var sun = '<circle cx="12" cy="12" r="5" fill="#F5B82E"/>' + [0, 45, 90, 135, 180, 225, 270, 315].map(function(a){ var r = a * Math.PI / 180; return '<line x1="' + (12 + Math.cos(r) * 7.5).toFixed(1) + '" y1="' + (12 + Math.sin(r) * 7.5).toFixed(1) + '" x2="' + (12 + Math.cos(r) * 10).toFixed(1) + '" y2="' + (12 + Math.sin(r) * 10).toFixed(1) + '" stroke="#F5B82E" stroke-width="1.6" stroke-linecap="round"/>'; }).join("");
    var moon = '<path d="M15.5 4.5a7.5 7.5 0 1 0 4 13.6A8.5 8.5 0 0 1 15.5 4.5z" fill="#F2D27A"/>';
    var cloud = function(c, y){ return '<path d="M7 ' + (17 + (y || 0)) + 'h10a4 4 0 0 0 .4-8A5.5 5.5 0 0 0 6.8 10.3 3.4 3.4 0 0 0 7 ' + (17 + (y || 0)) + 'z" fill="' + c + '"/>'; };
    var g = k === "s" ? (night ? moon : sun) : k === "c" ? (night ? '' : '<g transform="translate(-4 -4) scale(.75)">' + sun + '</g>') + cloud("#B9C2CC") :
      k === "r" ? cloud("#8E9AA8", -3) + [7, 11.5, 16].map(function(x){ return '<line x1="' + x + '" y1="17" x2="' + (x - 1.4) + '" y2="21.5" stroke="#4D8FD6" stroke-width="1.6" stroke-linecap="round"/>'; }).join("") :
      cloud("#A9B3BE", -3) + [8, 12, 16].map(function(x, i){ return '<circle cx="' + x + '" cy="' + (19 + (i % 2)) + '" r="1.3" fill="#9CC3EA"/>'; }).join("");
    return '<svg class="wx-svg" width="' + sz + '" height="' + sz + '" viewBox="0 0 24 24" aria-hidden="true">' + g + '</svg>';
  }
  function wxNowKind(){
    var d = WX.d; if (!d) return "c";
    if (d.obs && d.obs.rain1h >= 0.5) return "r";
    var now = new Date(), cur = null;
    (d.h3 || []).forEach(function(x){ if (new Date(x.t + ":00+09:00") <= now) cur = x; });
    return (cur || (d.h3 || [])[0] || d.today || { k: "c" }).k;
  }
  // v58.1: không còn thẻ to trên trang — chỉ một ô nhỏ ở góc thẻ ca (nhân viên) / hàng chip của ngày (quản lý); bấm → bảng chi tiết.
  function wxStripHTML(){ return ''; }
  function wxKL(k, night){ return wt(k === "s" && night ? "k_sN" : "k_" + k); }
  /** Thời tiết của một ngày (YYYY-MM-DD): hôm nay = trời lúc này; 6 ngày tới = dự báo; ngoài khoảng → null. */
  function wxDayInfo(ymd){
    var d = WX.d; if (!d) return null;
    var f = (d.days || []).filter(function(x){ return x.d === ymd; })[0];
    if (ymd === todayStrClient()){
      var o = d.obs || {}, temp = o.temp != null ? o.temp : ((d.h3 || [])[0] || {}).c;
      var pop = (d.pop6 || []).filter(function(x){ return new Date(x.t + ":00+09:00") > new Date(Date.now() - 6 * 3600000); })[0];
      return { k: wxNowKind(), night: wxNight(), t: temp != null ? Math.round(temp) : null, hi: f ? f.hi : null, lo: f ? f.lo : null, pop: pop && pop.p != null ? pop.p : (f ? f.pop : null), now: 1 };
    }
    return f ? { k: f.k, night: false, t: f.hi, hi: null, lo: f.lo, pop: f.pop } : null;
  }
  function wxMiniHTML(ymd, cls){
    var x = wxDayInfo(ymd); if (!x || x.t == null) return '';
    var sub = x.now ? [x.hi, x.lo].filter(function(v){ return v != null; }).map(function(v){ return v + '°'; }).join(' / ') : (x.lo != null ? x.lo + '°' : '');
    var wet = x.pop != null && x.pop >= 30 ? '<em>' + x.pop + '%</em>' : '';
    var ad = x.now && wxAdvice((WX.d.h3 || []), (WX.d.days || [])[0] || {}, WX.d.obs || {});
    return '<button type="button" class="wx-mini ' + cls + (ad ? ' has-ad' : '') + '" data-wxmini="' + ymd + '" aria-label="' + escapeHTML(wt("more") + ': ' + wxKL(x.k, x.night) + ' ' + x.t + '°') + '" title="' + escapeHTML(wxKL(x.k, x.night) + (ad ? ' — ' + ad : '')) + '">' +
      wxIcon(x.k, x.night, 26) + '<span class="wm-t"><b>' + x.t + '°</b>' + (sub || wet ? '<small>' + sub + wet + '</small>' : '') + '</span></button>';
  }
  /** Gắn ô nhỏ vào chỗ của nó sau mỗi lần vẽ (không thêm khối mới vào trang). */
  function wxMount(){
    document.querySelectorAll(".wx-mini").forEach(function(b){ b.remove(); });
    if (!WX.d) return;
    var top = document.querySelector(".st-card.next-shift .st-top-r");
    if (top){ var dt = typeof stViewDate === "function" ? stViewDate() : new Date(); top.insertAdjacentHTML("beforeend", wxMiniHTML(stYmd(dt), "is-card")); }
    var dh = state.role !== "emp" && state.mgrTab === "day" && document.querySelector(".day-head");
    if (dh){
      var row = dh.querySelector(".alerts-row"); if (!row){ row = document.createElement("div"); row.className = "alerts-row"; dh.appendChild(row); }
      var ymd = state.year + "-" + pad(state.month) + "-" + pad(state.selectedDay || 1);
      row.insertAdjacentHTML("beforeend", wxMiniHTML(ymd, "is-pill"));
      if (!row.children.length) row.remove();
    }
  }
  function wxDetailDialog(){
    if (!WX.d) return;
    uiDialog({ title: wt("title"), html: '<div class="wx-strip in-dlg">' + wxInnerHTML() + '</div>', hideCancel: true, okText: wt("close") });
  }
  document.addEventListener("click", function(ev){
    var b = ev.target.closest && ev.target.closest("[data-wxmini]"); if (!b) return;
    ev.preventDefault(); ev.stopPropagation(); wxDetailDialog();
  }, true);
  function wxInnerHTML(){
    var d = WX.d, L = state.lang, night = wxNight(), k = wxNowKind(), o = d.obs || {}, t0 = (d.days || [])[0] || {};
    var temp = o.temp != null ? o.temp : ((d.h3 || [])[0] || {}).c;
    var DOWL = (typeof DOW_BY_LANG !== "undefined" && DOW_BY_LANG[L]) || ["日", "月", "火", "水", "木", "金", "土"];
    var pop = (d.pop6 || []).filter(function(x){ return new Date(x.t + ":00+09:00") > new Date(Date.now() - 6 * 3600000); })[0];
    var hrs = (d.h3 || []).filter(function(x){ return new Date(x.t + ":00+09:00") > new Date(Date.now() - 3 * 3600000); }).slice(0, 8);
    var head = '<div class="wx-now">' + wxIcon(k, night, 44) + '<div class="wx-nt"><b>' + (temp != null ? Math.round(temp) + '°' : '—') + '</b><span>' + escapeHTML(wt("k_" + k)) +
      (t0.hi != null || t0.lo != null ? ' · ' + (t0.hi != null ? t0.hi + '°' : '') + (t0.lo != null ? ' / ' + t0.lo + '°' : '') : '') + '</span>' +
      '<small>' + (pop && pop.p != null ? wt("rain") + ' ' + pop.p + '%' : '') + (o.hum != null ? (pop && pop.p != null ? ' · ' : '') + wt("hum") + ' ' + Math.round(o.hum) + '%' : '') + '</small></div></div>';
    var row = hrs.length ? '<div class="wx-hrs" role="list">' + hrs.map(function(x){ var h = Number(x.t.slice(11, 13)), nt = h < 6 || h >= 18;
      return '<div class="wx-h" role="listitem"><span>' + h + (L === "ja" ? '時' : 'h') + '</span>' + wxIcon(x.k, nt, 22) + '<b>' + (x.c != null ? x.c + '°' : '') + '</b></div>'; }).join("") + '</div>' : '';
    var week = (d.days || []).length ? '<div class="wx-days">' + d.days.slice(0, 7).map(function(x, i){ var dt = new Date(x.d + "T00:00:00+09:00"), w = dt.getDay();
      return '<div class="wx-d' + (i === 0 ? ' is-today' : '') + (w === 0 ? ' sun' : w === 6 ? ' sat' : '') + '"><span>' + (i === 0 ? escapeHTML(L === "ja" ? "今日" : L === "en" ? "Today" : "Nay") : escapeHTML(DOWL[w])) + '</span>' + wxIcon(x.k, false, 20) +
        '<b>' + (x.hi != null ? x.hi + '°' : '') + '</b><small>' + (x.lo != null ? x.lo + '°' : '') + '</small>' + (x.pop != null && x.pop >= 30 ? '<em>' + x.pop + '%</em>' : '<em class="e"></em>') + '</div>'; }).join("") + '</div>' : '';
    var ad = wxAdvice(hrs, t0, o);
    return '<div class="wx-top">' + head + row + '</div>' + week + (ad ? '<div class="wx-ad">' + escapeHTML(ad) + '</div>' : '') +
      '<div class="wx-foot"><span>' + escapeHTML(wt("src")) + (o.st ? ' · ' + escapeHTML(wt("st", { n: o.st })) : '') + (o.at ? ' ' + escapeHTML(o.at.slice(11, 16)) : '') + '</span>' +
      '<button type="button" class="wx-fxb" data-wxfx>' + escapeHTML(wxFxOn() ? wt("fxOn") : wt("fxOff")) + '</button></div>';
  }
  /** Một câu gợi ý cho ca làm hôm nay (mưa / nóng / lạnh / mưa to). */
  function wxAdvice(hrs, t0, o){
    if (o && o.rain1h >= 10) return wt("adStorm", { p: o.rain1h });
    var open = (state.settings && state.settings.openHour) || 8, close = (state.settings && state.settings.closeHour) || 21;
    var all = (WX.d && WX.d.h3) || hrs, today = todayStrClient(), tmr = ymdShiftClient(today, 1), late = new Date().getHours() >= Math.min(close - 1, 17);
    function wetOn(day){ return all.filter(function(x){ var h = Number(x.t.slice(11, 13)); return x.k === "r" && h + 3 > open && h < close && x.t.slice(0, 10) === day && new Date(x.t + ":00+09:00").getTime() + 3 * 3600000 > Date.now(); }); }
    var wet = wetOn(today), key = "adRain";
    if (!wet.length && late){ wet = wetOn(tmr); key = "adRainT"; }                // chiều tối: báo trước mưa ngày mai
    if (wet.length){ var a = Number(wet[0].t.slice(11, 13)), b = Math.min(close, Number(wet[wet.length - 1].t.slice(11, 13)) + 3); return wt(key, { h: Math.max(a, open) + "–" + b + (state.lang === "ja" ? "時" : "h") }); }
    if (t0 && t0.hi >= 30) return wt("adHot", { t: t0.hi });
    if (t0 && t0.hi != null && t0.hi <= 8) return wt("adCold", { t: t0.hi });
    return "";
  }
  /** Gọi sau mỗi lần vẽ màn: lấp thanh thời tiết, hiệu ứng nền, biểu tượng lịch, bầu trời tab Quán. */
  function wxAfterRender(){
    if (!state.token) return;
    if (WX.d) wxPaint();
    if (!WX.busy && Date.now() - WX.at > 25 * 60000){
      WX.busy = true;
      call("wxGet").then(function(d){ WX.busy = false; WX.d = d; WX.at = Date.now(); wxPaint(); }, function(){ WX.busy = false; WX.at = Date.now() - 20 * 60000; });   // lỗi → thử lại sau ~5 phút
    }
  }
  function wxPaint(){
    wxMount(); wxFxApply(); wxCalIcons(); wxStage();
  }
  // ---- lớp hiệu ứng nền (sau nội dung, không bắt chạm) ----
  function wxFxApply(){
    var on = WX.d && wxFxOn() && !document.body.classList.contains("or-mode"), k = on ? wxNowKind() : "", night = wxNight();
    var fx = document.getElementById("wxFx");
    if (!on){ if (fx) fx.remove(); document.body.classList.remove("wx-on"); return; }
    var key = k + (night ? "n" : "d");
    if (fx && fx.getAttribute("data-k") === key) return;
    if (!fx){ fx = document.createElement("div"); fx.id = "wxFx"; fx.setAttribute("aria-hidden", "true"); document.body.insertBefore(fx, document.body.firstChild); }
    fx.className = "wx-fx k-" + k + (night ? " is-night" : ""); fx.setAttribute("data-k", key);
    var h = '<i class="wf-sky"></i>';
    if (k === "s") h += night ? '<i class="wf-stars"></i>' : '<i class="wf-sun"></i>';
    if (k === "c" || k === "r" || k === "n") h += '<i class="wf-cl c1"></i><i class="wf-cl c2"></i><i class="wf-cl c3"></i>';
    if (k === "r") h += '<i class="wf-rain"></i>';
    if (k === "n") h += '<i class="wf-snow"></i>';
    fx.innerHTML = h; document.body.classList.add("wx-on");
  }
  document.addEventListener("click", function(ev){
    var b = ev.target.closest && ev.target.closest("[data-wxfx]"); if (!b) return;
    lsSet("sbw.wxfx", wxFxOn() ? "0" : "1"); b.textContent = wxFxOn() ? wt("fxOn") : wt("fxOff"); wxFxApply();
  });
  // ---- biểu tượng thời tiết trên lịch (7 ngày tới theo dự báo, ngày đã qua theo nhật ký) ----
  function wxDayKind(y, m, d){
    var W = WX.d; if (!W) return null;
    var key = y + "-" + pad(m) + "-" + pad(d), f = (W.days || []).filter(function(x){ return x.d === key; })[0];
    if (f) return { k: f.k, f: 1 };
    var ymNow = todayStrClient().slice(0, 7), ym = y + "-" + pad(m);
    var lg = ym === ymNow ? W.log : (ym === ymShiftClient(ymNow, -1) ? W.logPrev : null), x = lg && lg[String(d)];
    return x && x.k ? { k: x.k, f: 0 } : null;
  }
  function ymdShiftClient(ymd, k){ var t = new Date(ymd + "T00:00:00Z"); t.setUTCDate(t.getUTCDate() + k); return t.toISOString().slice(0, 10); }
  function todayStrClient(){ var n = new Date(Date.now() + 9 * 3600000); return n.toISOString().slice(0, 10); }
  function ymShiftClient(ym, k){ var y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)) - 1 + k; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12; return y + "-" + pad(m + 1); }
  function wxCalIcons(){
    if (!WX.d) return;
    document.querySelectorAll(".dc-cell[data-cday], .sg-cell[data-day]").forEach(function(c){
      var d = Number(c.getAttribute("data-cday") || c.getAttribute("data-day")), r = wxDayKind(state.year, state.month, d), old = c.querySelector(".wx-ci");
      if (!r || r.k === "s" && !r.f){ if (old) old.remove(); return; }            // ngày đã qua trời quang: không cần đánh dấu
      var cls = "wx-ci k-" + r.k + (r.f ? " is-f" : "");
      if (old && old.className === cls) return;
      if (old) old.remove();
      var i = document.createElement("i"); i.className = cls; i.setAttribute("aria-hidden", "true"); i.innerHTML = wxIcon(r.k, false, 12); c.appendChild(i);
    });
  }
  // ---- tab Quán: bầu trời sau quán + mưa ngoài, ánh sáng theo giờ ----
  function wxStage(){
    var st = document.getElementById("ofcStage"); if (!st) return;
    var k = WX.d ? wxNowKind() : "", h = new Date().getHours() + new Date().getMinutes() / 60, tod = h < 5.5 || h >= 19 ? "night" : (h < 7.5 ? "dawn" : (h >= 16.5 ? "dusk" : "day"));
    ["s", "c", "r", "n"].forEach(function(x){ st.classList.toggle("wx-" + x, k === x); });
    ["night", "dawn", "dusk", "day"].forEach(function(x){ st.classList.toggle("tod-" + x, tod === x); });
    var rn = st.querySelector(".ofc-wxr");
    if ((k === "r" || k === "n") && wxFxOn()){ if (!rn){ rn = document.createElement("div"); rn.className = "ofc-wxr"; rn.setAttribute("aria-hidden", "true"); st.appendChild(rn); } rn.classList.toggle("is-snow", k === "n"); }
    else if (rn) rn.remove();
    try {                                                     // hướng nắng theo giờ (sáng: phía đông, chiều: phía tây)
      var R = OFC.sc && OFC.sc.R; if (R){ var a = (Math.max(6, Math.min(18, h)) - 12) / 6, s = [-0.45 - a * 0.5, k === "s" ? 1 : 1.25, 0.55], l = Math.hypot(s[0], s[1], s[2]); R.sun = [s[0] / l, s[1] / l, s[2] / l]; }
    } catch (e){}
  }
