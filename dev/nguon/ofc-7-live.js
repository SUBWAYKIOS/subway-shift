  // ---------- v56: đồng bộ gần tức thì (hỏi máy chủ ~2 giây/lần khi đang mở tab Quán) ----------
  var OFC_LV = { timer: 0, since: 0, last: "", sent: 0, busy: false, fails: 0 };
  function ofcLiveStart(){ if (!OFC_LV.timer){ OFC_LV.timer = setInterval(ofcLiveTick, 2000); setTimeout(ofcLiveTick, 300); } }
  function ofcLiveStop(){ clearInterval(OFC_LV.timer); OFC_LV.timer = 0; }
  function ofcSelfState(){
    var sc = OFC.sc, d = OFC.d, me = sc && d && sc.ents[d.me];
    if (!me) return null;
    var g = me.free && me.goal ? me.goal : [me.x, me.y];
    return { x: Math.round(g[0]), y: Math.round(g[1]), a: me.act || "", yw: Math.round((me.ty != null ? me.ty : me.yaw) * 100) / 100, m: me.free ? 1 : 0 };
  }
  function ofcLiveTick(){
    if (!document.getElementById("ofcRoot")){ ofcLiveStop(); return; }
    if (document.hidden || !OFC.d || OFC_LV.busy || !state.token) return;
    if (OFC_LV.fails > 3 && Date.now() - OFC_LV.failAt < 20000) return;          // máy chủ cũ / mất mạng → chậm lại
    var s = ofcSelfState(), k = s ? JSON.stringify(s) : "", send = k && (k !== OFC_LV.last || Date.now() - OFC_LV.sent > 15000);
    OFC_LV.busy = true;
    callInner_("ofcLive", send ? k : null, OFC_LV.since || (Date.now() - 30000)).then(function(r){
      OFC_LV.busy = false; OFC_LV.fails = 0;
      if (send){ OFC_LV.last = k; OFC_LV.sent = Date.now(); }
      ofcLiveIn(r);
    }, function(){ OFC_LV.busy = false; OFC_LV.fails++; OFC_LV.failAt = Date.now(); });
  }
  /** Nhận vị trí / động tác / tin mới của người khác. */
  function ofcLiveIn(r){
    var d = OFC.d, sc = OFC.sc; if (!r || !d) return;
    if (r.chat && r.chat.length){ ofcChatIn(r.chat); r.chat.forEach(function(c){ if (c.at > OFC_LV.since) OFC_LV.since = c.at; }); }
    else if (!OFC_LV.since) OFC_LV.since = r.now - 1000;
    if (!sc || !sc.R || !sc.L) return;
    var onNew = false;
    Object.keys(r.on || {}).forEach(function(id){ if (!(d.on || {})[id]) onNew = true; });
    d.on = r.on || d.on;
    if (onNew) ofcSync(sc, d);
    var t = (performance.now() - sc.t0) / 1000;
    Object.keys(sc.ents).forEach(function(id){
      var e = sc.ents[id], L = (r.p || {})[id];
      if (id === d.me) return;
      if (!L){
        if (e.live){ e.live = null; e.act = ""; if (e.free && !e.leaving){ e.free = false; e.path = sc.nav.path(e.x, e.y, e.spot.x, e.spot.y); e.mode = "walk"; } }
        return;
      }
      e.live = L; e.liveT = t;
      if (L.m){
        if (!e.goal || Math.hypot(e.goal[0] - L.x, e.goal[1] - L.y) > 12){
          e.goal = [L.x, L.y]; e.free = true; e.path = sc.nav.path(e.x, e.y, L.x, L.y); e.mode = "walk"; e.act = ""; e.pendAct = L.a; e.endYaw = L.yw;
        }
      } else if (e.free && !e.leaving){
        e.free = false; e.goal = null; e.path = sc.nav.path(e.x, e.y, e.spot.x, e.spot.y); e.mode = "walk";
      }
      if (e.path && e.path.length) e.pendAct = L.a; else ofcSetAct(e, L.a, t);
    });
  }
  /** Bong bóng cho tin mới; tin hệ thống (khen thưởng, quay thưởng) → băng rôn giữa màn. */
  function ofcChatIn(list){
    var sc = OFC.sc, d = OFC.d, now = Date.now(), t = sc ? (performance.now() - sc.t0) / 1000 : 0;
    (list || []).slice().sort(function(a, b){ return a.at - b.at; }).forEach(function(c){
      if (c.at <= OFC.seenChat) return;
      OFC.seenChat = c.at;
      if (d && d.chat && !d.chat.some(function(x){ return x.id === c.id; })) d.chat.push(c);
      if (c.f === "sys"){ if (now - c.at < 120000){ ofcRibbon(c); clearTimeout(OFC_LV.rl); OFC_LV.rl = setTimeout(function(){ OFC.at = 0; ofcLoad(); }, 600); } return; }
      var e = sc && sc.ents[c.f];
      if (e && !(c.f === (d && d.me) && e.say && e.say.local && now - e.say.at < 4000)){
        e.say = { id: c.id, text: c.m || c.e, emo: !c.m, until: now + (c.m ? 7000 : 3500) }; e.wave = t + 1.6;
      }
      if (c.to && sc && sc.ents[c.to]) sc.ents[c.to].jumpAt = t + 0.4;
    });
  }
  function ofcSetAct(e, a, t){
    if ((e.act || "") === (a || "")) return;
    e.act = a || ""; e.actT = t;
    if (a === "bow") e.say = { id: "bow" + t, text: "いらっしゃいませ！", emo: false, until: Date.now() + 3000 };
    if (a === "sit" && e.P && e.P.shadow) e.P.shadow.v = false;
  }
  /** Hành vi tự nhiên của người không điều khiển (mỗi máy tự diễn — cho quán luôn có chuyển động). */
  var OFC_AMB = { work: ["bake", "bake", "wipe", "bow", "thumb", ""], brk: ["coffee", "phone", "eat", "sleep", "phone"], visit: ["phone", "coffee", "eat", "wave", "think", ""], lobby: ["phone", "stretch", "wave", ""] };
  function ofcAmbient(sc, e, t){
    if (e.self || e.live || e.leaving || e.mode === "walk") return;
    if (e.ambEnd && t > e.ambEnd){
      e.ambEnd = 0; ofcSetAct(e, "", t);
      if (e.free && e.amb){ e.free = false; e.amb = 0; e.path = sc.nav.path(e.x, e.y, e.spot.x, e.spot.y); e.mode = "walk"; }
      e.ambNext = t + 12 + Math.random() * 30; return;
    }
    if (e.ambEnd) return;
    if (!e.ambNext){ e.ambNext = t + 3 + Math.random() * 20; return; }
    if (t < e.ambNext) return;
    var opts = OFC_AMB[e.kind] || OFC_AMB.lobby, a = opts[Math.floor(Math.random() * opts.length)];
    if (e.kind === "work" && Math.random() < 0.22){             // đi lau sàn / hút bụi một vòng rồi về chỗ
      var q = sc.nav.nearest(e.spot.x + (Math.random() - 0.5) * 320, e.spot.y + (Math.random() - 0.5) * 220);
      e.free = true; e.amb = 1; e.path = sc.nav.path(e.x, e.y, q[0], q[1]); e.mode = "walk"; e.pendAct = Math.random() < 0.5 ? "mop" : "vac";
      e.ambEnd = t + 14; return;
    }
    ofcSetAct(e, a, t); e.ambEnd = t + 5 + Math.random() * 6;
  }
  /** Băng rôn vinh danh / thông báo trong khung quán + pháo giấy. */
  function ofcRibbon(c){
    var st = document.getElementById("ofcStage"); if (!st) return;
    var txt = c.m;
    if (c.kd && c.kd !== "draw" && c.to){ var p = ofcFind(c.to); txt = "🏅 " + (p ? p.name : "") + " — " + (OFC_KUDO_ICON[c.kd] || "") + " " + ot("kd_" + c.kd) + (c.n ? " · " + c.n : "") + (c.xp ? " (+" + c.xp + ")" : ""); }
    var el = document.createElement("div"); el.className = "ofc-rib no-ei" + (c.kd === "draw" ? " is-gift" : ""); el.textContent = txt;
    st.appendChild(el); ofcConfetti(st);
    setTimeout(function(){ el.classList.add("out"); }, 5200); setTimeout(function(){ el.remove(); }, 5800);
  }
  function ofcConfetti(host){
    var box = document.createElement("div"); box.className = "ofc-conf";
    var C = ["#FFC20E", "#16884D", "#E35D5B", "#4D7FD6", "#F29BBA", "#7BC043"];
    for (var i = 0; i < 36; i++){
      var s = document.createElement("i");
      s.style.left = (Math.random() * 100) + "%"; s.style.background = C[i % C.length];
      s.style.animationDelay = (Math.random() * 0.6) + "s"; s.style.animationDuration = (1.6 + Math.random() * 1.2) + "s";
      s.style.transform = "rotate(" + Math.round(Math.random() * 360) + "deg)";
      box.appendChild(s);
    }
    host.appendChild(box); setTimeout(function(){ box.remove(); }, 3400);
  }
  var OFC_KUDO_ICON = { guest: "😊", bake: "🥪", clean: "🧽", fast: "⚡", team: "🤝", smile: "😄", help: "🙌", star: "🌟", xp: "✨", unlock: "🎁" };

  /** Thanh động tác của chính mình. */
  function ofcActBarHTML(){
    return '<div class="ofc-acts no-ei" id="ofcActs" role="toolbar" aria-label="' + escapeHTML(ot("actT")) + '">' + OFC_ACTS.map(function(a){
      return '<button type="button" data-ofcact="' + a[0] + '"><span>' + a[1] + '</span><small>' + escapeHTML(ot("act_" + a[0])) + '</small></button>'; }).join("") + '</div>';
  }
  function ofcDoAct(a){
    var sc = OFC.sc, d = OFC.d, me = sc && d && sc.ents[d.me]; if (!me) return;
    var t = (performance.now() - sc.t0) / 1000;
    if (me.act === a){ ofcSetAct(me, "", t); }
    else {
      if (me.mode === "walk"){ me.pendAct = a; }
      else ofcSetAct(me, a, t);
      if (/^(bow|wave|cheer|clap|thumb)$/.test(a)) me.actEnd = t + 4.5; else me.actEnd = 0;
    }
    document.querySelectorAll("[data-ofcact]").forEach(function(b){ b.classList.toggle("is-on", b.getAttribute("data-ofcact") === (me.pendAct || me.act)); });
    OFC_LV.last = ""; ofcLiveTick();
  }
