  // ---------- v56: 🎮 trò chơi + 🎁 quay thưởng cuối tháng ----------
  var OFC_ING = [["bread", "🥖"], ["ham", "🥓"], ["chick", "🍗"], ["tuna", "🐟"], ["lett", "🥬"], ["tom", "🍅"], ["cuc", "🥒"], ["oni", "🧅"], ["ol", "🫒"], ["pep", "🫑"], ["chz", "🧀"], ["sauce", "🥫"]];
  var OFC_GAME_LIST = [["bake", "🥪", "gBake", "gBakeD"], ["catch", "🧺", "gCatch", "gCatchD"], ["memo", "🃏", "gMemo", "gMemoD"]];
  function ofcPName(id){ var p = ofcFind(id); return p ? p.name : "?"; }
  function ofcTopHTML(list){
    if (!list || !list.length) return '<div class="ofc-bn">' + escapeHTML(ot("bdNone")) + '</div>';
    return '<ol class="ofc-top">' + list.slice(0, 5).map(function(x, i){
      var p = ofcFind(x.id) || { av: null, id: x.id };
      return '<li class="' + (OFC.d && x.id === OFC.d.me ? 'is-me' : '') + '"><span class="ofc-rkn">' + ["🥇", "🥈", "🥉", "4", "5"][i] + '</span><img class="ofc-th" alt="" src="' + ofcThumb(p.av, p.id, "head", false) + '"><b>' + escapeHTML(ofcPName(x.id)) + '</b><span>' + x.s + '</span></li>'; }).join("") + '</ol>';
  }
  async function ofcGamesDialog(){
    var d = OFC.d; if (!d) return;
    var pick = "";
    var html = '<div class="ofc-games">' + OFC_GAME_LIST.map(function(g){
      var top = ((d.games || {})[g[0]] || []), mine = top.filter(function(x){ return x.id === d.me; })[0];
      return '<div class="ofc-gcard"><div class="ofc-gh"><span class="ofc-gi no-ei">' + g[1] + '</span><div><b>' + escapeHTML(ot(g[2])) + '</b><small>' + escapeHTML(ot(g[3])) + '</small></div>' +
        '<button type="button" class="btn" data-gplay="' + g[0] + '">' + escapeHTML(ot("play")) + '</button></div>' +
        (mine ? '<div class="ofc-gbest">' + escapeHTML(ot("best", { n: mine.s })) + '</div>' : '') + ofcTopHTML(top) + '</div>';
    }).join("") + '<p class="hint">' + escapeHTML(ot("gameXp")) + '</p></div>';
    await uiDialog({ title: ot("games"), html: html, hideCancel: true, okText: ot("close"), wide: true,
      onOpen: function(back){ back.querySelectorAll("[data-gplay]").forEach(function(b){ b.addEventListener("click", function(){ pick = b.getAttribute("data-gplay"); back.querySelector("#mOk").click(); }); }); } });
    if (pick) ofcGameRun(pick);
  }

  /** Khung chơi toàn màn hình (đóng = huỷ ván). */
  function ofcGameRun(kind){
    var g = OFC_GAME_LIST.filter(function(x){ return x[0] === kind; })[0];
    var ov = document.createElement("div"); ov.className = "ofc-game no-ei";
    ov.innerHTML = '<div class="ofc-gtop"><b>' + g[1] + ' ' + escapeHTML(ot(g[2])) + '</b><span class="ofc-ghud" id="gHud"></span><button type="button" class="ofc-gx" aria-label="×">×</button></div><div class="ofc-gbody" id="gBody"></div>';
    document.body.appendChild(ov);
    var alive = true, cleanup = [];
    function close(){ alive = false; cleanup.forEach(function(f){ try { f(); } catch (e){} }); ov.remove(); }
    ov.querySelector(".ofc-gx").addEventListener("click", close);
    var body = ov.querySelector("#gBody"), hud = ov.querySelector("#gHud");
    function finish(score){
      if (!alive) return;
      cleanup.forEach(function(f){ try { f(); } catch (e){} }); cleanup = [];
      body.innerHTML = '<div class="ofc-gend"><div class="ofc-gsc">' + escapeHTML(ot("score")) + '<b>' + score + '</b></div><div id="gRank" class="ofc-gload">…</div>' +
        '<div class="ofc-gacts"><button type="button" class="btn" id="gAgain">' + escapeHTML(ot("again")) + '</button><button type="button" class="btn ghost" id="gClose">' + escapeHTML(ot("close")) + '</button></div></div>';
      body.querySelector("#gAgain").addEventListener("click", function(){ close(); ofcGameRun(kind); });
      body.querySelector("#gClose").addEventListener("click", close);
      if (score > 40) ofcConfetti(ov);
      call("officeGameScore", kind, score).then(function(r){
        if (OFC.d){ OFC.d.games = OFC.d.games || {}; OFC.d.games[kind] = r.top; }
        var el = body.querySelector("#gRank"); if (el) el.innerHTML = '<div class="ofc-gbest">' + escapeHTML(ot("best", { n: r.best })) + '</div><h5>' + escapeHTML(ot("top")) + '</h5>' + ofcTopHTML(r.top);
      }, function(e){ var el = body.querySelector("#gRank"); if (el) el.textContent = (e && e.message) || ""; });
    }
    var api = { body: body, hud: hud, alive: function(){ return alive; }, finish: finish, on: function(f){ cleanup.push(f); } };
    if (kind === "bake") ofcGameBake(api); else if (kind === "catch") ofcGameCatch(api); else ofcGameMemo(api);
  }

  /** 🥪 Làm bánh nhanh: bấm đúng thứ tự nguyên liệu trên phiếu order. */
  function ofcGameBake(G){
    var score = 0, left = 60, order = [], pos = 0, streak = 0, t0 = Date.now();
    function newOrder(){
      var n = 3 + Math.min(3, Math.floor(score / 80)), pool = OFC_ING.slice(1).sort(function(){ return Math.random() - 0.5; });
      order = [OFC_ING[0]].concat(pool.slice(0, n)); pos = 0; draw();
    }
    function draw(){
      G.body.innerHTML = '<div class="gb"><div class="gb-ticket"><small>' + escapeHTML(ot("order")) + '</small><div class="gb-ord">' + order.map(function(o, i){
          return '<span class="' + (i < pos ? 'ok' : (i === pos ? 'cur' : '')) + '">' + o[1] + '<i>' + escapeHTML(ot("ing_" + o[0])) + '</i></span>'; }).join("") + '</div></div>' +
        '<div class="gb-stack">' + order.slice(0, pos).map(function(o){ return '<span>' + o[1] + '</span>'; }).join("") + '</div>' +
        '<div class="gb-pal">' + OFC_ING.map(function(o){ return '<button type="button" data-gi="' + o[0] + '"><span>' + o[1] + '</span><small>' + escapeHTML(ot("ing_" + o[0])) + '</small></button>'; }).join("") + '</div></div>';
    }
    function hud(){ G.hud.textContent = ot("score") + " " + score + " · ⏱ " + left + "s"; }
    G.body.addEventListener("click", function(ev){
      var b = ev.target.closest("[data-gi]"); if (!b || !G.alive() || left <= 0) return;
      if (b.getAttribute("data-gi") === order[pos][0]){
        pos++;
        if (pos >= order.length){ streak++; score += 10 + order.length * 2 + Math.min(10, streak * 2); G.body.querySelector(".gb-stack").classList.add("done"); setTimeout(newOrder, 280); hud(); return; }
        draw();
      } else { score = Math.max(0, score - 5); streak = 0; b.classList.add("bad"); setTimeout(function(){ b.classList.remove("bad"); }, 300); hud(); }
    });
    var iv = setInterval(function(){ left = Math.max(0, 60 - Math.floor((Date.now() - t0) / 1000)); hud(); if (left <= 0){ clearInterval(iv); G.finish(score); } }, 250);
    G.on(function(){ clearInterval(iv); });
    newOrder(); hud();
  }

  /** 🧺 Hứng nguyên liệu: kéo khay, tránh rác (canvas). */
  function ofcGameCatch(G){
    var cv = document.createElement("canvas"); cv.className = "gc-cv"; G.body.appendChild(cv);
    var x = cv.getContext("2d"), W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
    function fit(){ W = G.body.clientWidth; H = G.body.clientHeight; cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + "px"; cv.style.height = H + "px"; x.setTransform(dpr, 0, 0, dpr, 0, 0); }
    fit(); window.addEventListener("resize", fit); G.on(function(){ window.removeEventListener("resize", fit); });
    var tray = W / 2, items = [], score = 0, lives = 3, last = performance.now(), spawn = 0, t = 0, pops = [], raf = 0, combo = 0;
    var BAD = ["🗑️", "🧦", "👟"];
    function move(ev){ var r = cv.getBoundingClientRect(); tray = Math.max(40, Math.min(W - 40, (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left)); }
    cv.addEventListener("pointermove", move); cv.addEventListener("pointerdown", move);
    function loop(now){
      if (!G.alive()) return;
      var dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt; spawn -= dt;
      var speed = 140 + t * 6;
      if (spawn <= 0){ spawn = Math.max(0.35, 0.9 - t * 0.01); var bad = Math.random() < 0.22;
        items.push({ x: 20 + Math.random() * (W - 40), y: -20, e: bad ? BAD[Math.floor(Math.random() * 3)] : OFC_ING[Math.floor(Math.random() * OFC_ING.length)][1], bad: bad, v: speed * (0.8 + Math.random() * 0.5), r: Math.random() * 6 }); }
      x.clearRect(0, 0, W, H);
      var gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#FFF8E8"); gr.addColorStop(1, "#E9F5EC"); x.fillStyle = gr; x.fillRect(0, 0, W, H);
      var ty = H - 46;
      items.forEach(function(it){ it.y += it.v * dt; it.r += dt * 2; });
      items = items.filter(function(it){
        if (it.y > ty - 10 && it.y < ty + 20 && Math.abs(it.x - tray) < 56){
          if (it.bad){ lives--; combo = 0; pops.push({ x: it.x, y: ty - 20, s: "💥", t: 0 }); if (navigator.vibrate) try { navigator.vibrate(60); } catch (e){} }
          else { combo++; score += 10 + Math.min(20, combo * 2); pops.push({ x: it.x, y: ty - 20, s: "+" + (10 + Math.min(20, combo * 2)), t: 0 }); }
          return false;
        }
        if (it.y > H + 30){ if (!it.bad) combo = 0; return false; }
        return true;
      });
      x.font = "34px system-ui, 'Apple Color Emoji', 'Segoe UI Emoji'"; x.textAlign = "center"; x.textBaseline = "middle";
      items.forEach(function(it){ x.save(); x.translate(it.x, it.y); x.rotate(Math.sin(it.r) * 0.3); x.fillText(it.e, 0, 0); x.restore(); });
      x.fillStyle = "#145C39"; x.beginPath(); x.roundRect ? x.roundRect(tray - 56, ty, 112, 16, 8) : x.rect(tray - 56, ty, 112, 16); x.fill();
      x.fillStyle = "#F2C200"; x.fillRect(tray - 50, ty + 4, 100, 3);
      x.font = "700 18px system-ui"; pops = pops.filter(function(p){ p.t += dt; x.globalAlpha = Math.max(0, 1 - p.t); x.fillStyle = "#145C39"; x.fillText(p.s, p.x, p.y - p.t * 40); x.globalAlpha = 1; return p.t < 1; });
      G.hud.textContent = ot("score") + " " + score + " · " + "❤️".repeat(Math.max(0, lives));
      if (lives <= 0 || t > 90){ G.finish(score); return; }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    G.on(function(){ cancelAnimationFrame(raf); });
  }

  /** 🃏 Lật thẻ nhớ: 8 cặp nguyên liệu. */
  function ofcGameMemo(G){
    var pairs = OFC_ING.slice().sort(function(){ return Math.random() - 0.5; }).slice(0, 8);
    var deck = pairs.concat(pairs).map(function(p, i){ return { k: p[0], e: p[1], i: i }; }).sort(function(){ return Math.random() - 0.5; });
    var open = [], done = 0, moves = 0, t0 = Date.now(), lock = false;
    G.body.innerHTML = '<div class="gm">' + deck.map(function(c, i){ return '<button type="button" data-gm="' + i + '"><span>' + c.e + '</span></button>'; }).join("") + '</div>';
    function hud(){ G.hud.textContent = "🔄 " + moves + " · ⏱ " + Math.floor((Date.now() - t0) / 1000) + "s"; }
    var iv = setInterval(hud, 500); G.on(function(){ clearInterval(iv); }); hud();
    G.body.addEventListener("click", function(ev){
      var b = ev.target.closest("[data-gm]"); if (!b || lock || b.classList.contains("up") || !G.alive()) return;
      b.classList.add("up"); open.push(b);
      if (open.length < 2) return;
      moves++; lock = true;
      var a = deck[+open[0].getAttribute("data-gm")], c = deck[+open[1].getAttribute("data-gm")];
      if (a.k === c.k){ open.forEach(function(x){ x.classList.add("ok"); }); open = []; lock = false; done++;
        if (done === 8){ var sec = (Date.now() - t0) / 1000; setTimeout(function(){ G.finish(Math.max(50, Math.round(1000 - moves * 18 - sec * 6))); }, 400); } }
      else setTimeout(function(){ open.forEach(function(x){ x.classList.remove("up"); }); open = []; lock = false; }, 650);
      hud();
    });
  }

  // ---------- 🎁 quay thưởng cuối tháng ----------
  function ofcWheel(cv, names){
    var x = cv.getContext("2d"), W = cv.width, R = W / 2 - 8, n = Math.max(1, names.length);
    var C = ["#16884D", "#FFC20E", "#E35D5B", "#4D7FD6", "#7BC043", "#F29BBA", "#3FA7A3", "#F2A541"];
    return function(rot, hi){
      x.clearRect(0, 0, W, W); x.save(); x.translate(W / 2, W / 2); x.rotate(rot);
      for (var i = 0; i < n; i++){
        var a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
        x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, R, a0, a1); x.closePath();
        x.fillStyle = C[i % C.length]; x.globalAlpha = hi != null && hi !== i ? 0.45 : 1; x.fill(); x.globalAlpha = 1;
        x.strokeStyle = "#fff"; x.lineWidth = 2; x.stroke();
        x.save(); x.rotate((a0 + a1) / 2); x.fillStyle = (i % C.length) === 1 ? "#3A2A00" : "#fff";
        x.font = "700 " + Math.max(10, Math.min(18, 260 / n)) + "px system-ui, sans-serif"; x.textAlign = "right"; x.textBaseline = "middle";
        x.fillText(String(names[i] || "").slice(0, 10), R - 10, 0); x.restore();
      }
      x.restore();
      x.beginPath(); x.arc(W / 2, W / 2, 22, 0, Math.PI * 2); x.fillStyle = "#fff"; x.fill(); x.font = "22px system-ui"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("🎁", W / 2, W / 2 + 1);
      x.beginPath(); x.moveTo(W / 2 - 12, 2); x.lineTo(W / 2 + 12, 2); x.lineTo(W / 2, 26); x.closePath(); x.fillStyle = "#231F18"; x.fill();
    };
  }
  async function ofcDrawDialog(){
    var d = OFC.d; if (!d) return;
    var mgr = d.mgr, people = (d.people || []).filter(function(p){ return !p.guest; });
    var prizes = [{ n: "🧋 Trà sữa", c: 1 }, { n: "🍫 Bánh kẹo", c: 2 }], spinning = false;
    function prizesHTML(){ return prizes.map(function(p, i){ return '<div class="dr-pz"><input type="text" maxlength="30" data-pzn="' + i + '" value="' + escapeHTML(p.n) + '"><input type="number" min="1" max="20" data-pzc="' + i + '" value="' + p.c + '"><button type="button" class="btn ghost" data-pzx="' + i + '">×</button></div>'; }).join(""); }
    var res0 = d.draw;
    var html = '<div class="ofc-draw"><div class="dr-wheel"><canvas id="drCv" width="300" height="300"></canvas></div><div class="dr-side">' +
      (mgr ? '<p class="hint">' + escapeHTML(ot("drawHint")) + '</p>' +
        '<div class="set-sub">' + escapeHTML(ot("prizes")) + '</div><div id="drPz">' + prizesHTML() + '</div><button type="button" class="btn ghost" id="drAdd">' + escapeHTML(ot("prizeAdd")) + '</button>' +
        '<div class="set-sub">' + escapeHTML(ot("who")) + '</div><div class="ofc-seg" id="drWho">' + people.map(function(p){ return '<button type="button" class="is-on" data-drw="' + escapeHTML(p.id) + '">' + escapeHTML(p.name) + '</button>'; }).join("") + '</div>' +
        '<div class="set-sub">' + escapeHTML(ot("mode")) + '</div><div class="ofc-seg" id="drMode"><button type="button" class="is-on" data-drm="eq">' + escapeHTML(ot("modeEq")) + '</button><button type="button" data-drm="xp">' + escapeHTML(ot("modeXp")) + '</button></div>' +
        '<button type="button" class="btn dr-spin" id="drSpin">' + escapeHTML(res0 ? ot("redo") : ot("spin")) + '</button>' : '') +
      '<div class="set-sub">' + escapeHTML(ot("winners")) + '</div><div id="drRes" class="dr-res">' + (res0 ? res0.list.map(function(x){ return '<div class="dr-w">🎁 <b>' + escapeHTML(x.name) + '</b><span>' + escapeHTML(x.p) + '</span></div>'; }).join("") : '<div class="ofc-bn">' + escapeHTML(ot("drawNone")) + '</div>') + '</div>' +
      '</div></div>';
    await uiDialog({ title: ot("drawT"), html: html, hideCancel: true, okText: ot("close"), wide: true,
      onOpen: function(back){
        var cv = back.querySelector("#drCv"), names = people.map(function(p){ return p.name; }), paint = ofcWheel(cv, names), rot = 0;
        paint(rot);
        if (!mgr) return;
        var mode = "eq";
        function readPz(){ prizes = Array.prototype.slice.call(back.querySelectorAll("[data-pzn]")).map(function(inp, i){ return { n: inp.value.trim(), c: Number(back.querySelector('[data-pzc="' + i + '"]').value) || 1 }; }); }
        back.addEventListener("click", async function(ev){
          var b = ev.target.closest("button"); if (!b || spinning) return;
          if (b.id === "drAdd"){ readPz(); prizes.push({ n: "", c: 1 }); back.querySelector("#drPz").innerHTML = prizesHTML(); return; }
          if (b.hasAttribute("data-pzx")){ readPz(); prizes.splice(+b.getAttribute("data-pzx"), 1); back.querySelector("#drPz").innerHTML = prizesHTML(); return; }
          if (b.hasAttribute("data-drw")){ b.classList.toggle("is-on"); names = Array.prototype.slice.call(back.querySelectorAll("[data-drw].is-on")).map(function(x){ return x.textContent; }); paint = ofcWheel(cv, names); paint(rot); return; }
          if (b.hasAttribute("data-drm")){ mode = b.getAttribute("data-drm"); back.querySelectorAll("[data-drm]").forEach(function(x){ x.classList.toggle("is-on", x === b); }); return; }
          if (b.id !== "drSpin") return;
          readPz();
          var ids = Array.prototype.slice.call(back.querySelectorAll("[data-drw].is-on")).map(function(x){ return x.getAttribute("data-drw"); });
          spinning = true; b.disabled = true;
          try {
            var r = await call("luckyDraw", JSON.stringify({ prizes: prizes, ids: ids, mode: mode, redo: !!d.draw }));
            var resEl = back.querySelector("#drRes"); resEl.innerHTML = "";
            var nm = ids.map(function(id){ return ofcPName(id); });
            for (var k = 0; k < r.list.length; k++){
              var w = r.list[k], idx = Math.max(0, nm.indexOf(w.name)), n = nm.length, target = -Math.PI / 2 - (idx + 0.5) / n * Math.PI * 2;
              var start = rot, diff = (((start - target) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2), end = start - diff - Math.PI * 2 * (4 + k % 2), t0 = performance.now(), D = 2600;
              await new Promise(function(done){ (function step(now){ var q = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - q, 3); rot = start + (end - start) * e; paint(rot, q >= 1 ? idx : null); if (q < 1 && back.isConnected) requestAnimationFrame(step); else done(); })(t0); });
              var row = document.createElement("div"); row.className = "dr-w pop"; row.innerHTML = '🎁 <b>' + escapeHTML(w.name) + '</b><span>' + escapeHTML(w.p) + '</span>'; resEl.appendChild(row);
              ofcConfetti(back.querySelector(".ofc-draw"));
              await new Promise(function(done){ setTimeout(done, 700); });
            }
            d.draw = { at: r.at, list: r.list, prizes: r.prizes, mode: r.mode };
            b.textContent = ot("redo");
          } catch (e){ showToast((e && e.message) || t("saveErrorToast"), true); }
          spinning = false; b.disabled = false;
        });
      } });
    ofcApply(d);
  }
