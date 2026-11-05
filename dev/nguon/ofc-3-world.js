  // ---------- bố cục quán (toạ độ theo sơ đồ: 100 = 1 mét; y = 0 là phía cửa vào) ----------
  // otagawa: lấy từ "Sơ đồ giao hàng – SUBWAY FM東海太田川店" (納品場所マップ). basic: mẫu chung cho quán khác.
  var OFC_LAYOUTS = {
    otagawa: {
      W: 1460, H: 870, kitchenY: 340, entrance: [1045, 1285],
      walls: [[0,0,1045,0,"o"],[1285,0,1460,0,"o"],[1460,0,1460,870,"o"],[1460,870,0,870,"o"],[0,870,0,0,"o"],
              [225,355,282,355,"i"],[393,355,405,355,"i"],[405,355,405,670,"i"],[405,670,225,670,"i"],[225,670,225,355,"i"],
              [0,670,70,670,"i"],[215,670,225,670,"i"]],
      items: [
        { t: "counter", x: 495, y: 340, w: 620, h: 105, line: 1 }, { t: "counter", x: 1205, y: 340, w: 240, h: 95, reg: 1 },
        { t: "seats", x: 20, y: 35, w: 530, h: 90 }, { t: "pillar", x: 550, y: 25, w: 60, h: 60 }, { t: "block", x: 1310, y: 30, w: 95, h: 90 },
        { t: "block", x: 5, y: 335, w: 65, h: 335 }, { t: "work", x: 620, y: 565, w: 595, h: 95 }, { t: "work", x: 685, y: 790, w: 535, h: 60 },
        { t: "block", x: 185, y: 795, w: 285, h: 70 }, { t: "block", x: 20, y: 770, w: 105, h: 95 }, { t: "block", x: 0, y: 675, w: 60, h: 95 },
        { t: "frz", x: 1330, y: 465, w: 120, h: 190, door: "left", lb: "A" }, { t: "chl", x: 1330, y: 655, w: 120, h: 190, door: "left", lb: "B" },
        { t: "chl", x: 770, y: 565, w: 235, h: 95, door: "bottom", lb: "C" }, { t: "frz", x: 470, y: 760, w: 215, h: 95, door: "top", lb: "D" },
        { t: "chl", x: 220, y: 680, w: 185, h: 70, door: "bottom", lb: "F" }, { t: "mark", x: 145, y: 640, lb: "納品口" }],
      room: { x: 225, y: 355, w: 180, h: 315 },
      work: [[560,478,0],[690,478,0],[820,478,0],[950,478,0],[1070,478,0],[1255,470,0],[760,725,1],[930,725,0],[1100,725,1],[1280,700,2],[1180,500,0],[130,730,1]],
      lobby: [[1110,210],[1230,230],[980,250],[860,200],[1330,250]],
      visit: [[640,250],[780,235],[920,255],[520,215],[1040,290],[700,175],[860,165],[1180,300]],
      door: [1165, 25], board: { x: 580, y: 868, face: 0 }, menu: { x1: 760, x2: 1190 }
    },
    basic: {
      W: 1200, H: 800, kitchenY: 330, entrance: [820, 1000],
      walls: [[0,0,820,0,"o"],[1000,0,1200,0,"o"],[1200,0,1200,800,"o"],[1200,800,0,800,"o"],[0,800,0,0,"o"],
              [0,470,140,470,"i"],[200,470,230,470,"i"],[230,470,230,800,"i"]],
      items: [
        { t: "seats", x: 30, y: 40, w: 560, h: 90 }, { t: "counter", x: 300, y: 330, w: 560, h: 100, line: 1 }, { t: "counter", x: 960, y: 330, w: 210, h: 90, reg: 1 },
        { t: "work", x: 380, y: 560, w: 560, h: 90 }, { t: "frz", x: 1070, y: 450, w: 120, h: 170, door: "left", lb: "A" }, { t: "chl", x: 1070, y: 620, w: 120, h: 170, door: "left", lb: "B" },
        { t: "chl", x: 440, y: 560, w: 200, h: 90, door: "bottom", lb: "C" }, { t: "frz", x: 300, y: 715, w: 200, h: 80, door: "top", lb: "D" },
        { t: "block", x: 640, y: 740, w: 260, h: 55 }],
      room: { x: 0, y: 470, w: 230, h: 330 },
      work: [[360,465,0],[490,465,0],[620,465,0],[750,465,0],[1010,460,0],[480,700,1],[700,700,1],[880,700,0],[1020,600,2],[880,470,0]],
      lobby: [[900,200],[1020,220],[780,230],[1100,180]],
      visit: [[420,240],[560,225],[700,245],[840,260],[500,170],[640,165]],
      door: [910, 25], board: { x: 560, y: 798, face: 0 }, menu: { x1: 660, x2: 1040 }
    }
  };
  function ofcPickLayout(cfg, store){
    if (cfg === "otagawa" || cfg === "basic") return cfg;
    return /太田川|otagawa|forest|フォレスト/i.test(String(store || "")) ? "otagawa" : "basic";
  }
  function lx(L, x){ return (x - L.W / 2) / 100; }
  function lz(L, y){ return (y - L.H / 2) / 100; }

  /** Lưới đi lại (ô 20 cm) + tìm đường A* — nhân vật đi vòng quầy / tủ chứ không xuyên qua. */
  function navBuild(L){
    var C = 20, nx = Math.ceil(L.W / C), ny = Math.ceil(L.H / C), g = new Uint8Array(nx * ny);
    function blockRect(x, y, w, h, pad){
      var x0 = Math.max(0, Math.floor((x - pad) / C)), x1 = Math.min(nx - 1, Math.floor((x + w + pad) / C));
      var y0 = Math.max(0, Math.floor((y - pad) / C)), y1 = Math.min(ny - 1, Math.floor((y + h + pad) / C));
      for (var j = y0; j <= y1; j++) for (var i = x0; i <= x1; i++) g[j * nx + i] = 1;
    }
    L.items.forEach(function(it){ if (it.t !== "mark") blockRect(it.x, it.y, it.w, it.h, 14); });
    L.walls.forEach(function(w){ blockRect(Math.min(w[0], w[2]), Math.min(w[1], w[3]), Math.abs(w[2] - w[0]), Math.abs(w[3] - w[1]), 16); });
    (L._furn || []).forEach(function(f){ blockRect(f[0], f[1], f[2], f[3], 6); });
    for (var i = 0; i < nx; i++){ g[i] = g[i] || 0; }
    function free(i, j){ return i >= 0 && j >= 0 && i < nx && j < ny && !g[j * nx + i]; }
    function cellOf(x, y){ return [Math.max(0, Math.min(nx - 1, Math.floor(x / C))), Math.max(0, Math.min(ny - 1, Math.floor(y / C)))]; }
    function nearest(x, y){
      var c = cellOf(x, y);
      if (free(c[0], c[1])) return c;
      for (var r = 1; r < 12; r++) for (var dj = -r; dj <= r; dj++) for (var di = -r; di <= r; di++){
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        if (free(c[0] + di, c[1] + dj)) return [c[0] + di, c[1] + dj];
      }
      return c;
    }
    function los(a, b){
      var x0 = a[0], y0 = a[1], x1 = b[0], y1 = b[1], dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, er = dx - dy;
      for (var k = 0; k < 400; k++){
        if (!free(x0, y0)) return false;
        if (x0 === x1 && y0 === y1) return true;
        var e2 = 2 * er;
        if (e2 > -dy){ er -= dy; x0 += sx; }
        if (e2 < dx){ er += dx; y0 += sy; }
      }
      return true;
    }
    function path(fx, fy, tx, ty){
      var s = nearest(fx, fy), t = nearest(tx, ty), si = s[1] * nx + s[0], ti = t[1] * nx + t[0];
      var gS = new Float32Array(nx * ny).fill(1e9), from = new Int32Array(nx * ny).fill(-1), done = new Uint8Array(nx * ny), open = [si];
      gS[si] = 0;
      function h(i){ var x = i % nx, y = (i / nx) | 0, ddx = Math.abs(x - t[0]), ddy = Math.abs(y - t[1]); return (ddx + ddy) + (1.414 - 2) * Math.min(ddx, ddy); }
      var found = false, guard = 0;
      while (open.length && guard++ < 20000){
        var bi = 0, bf = 1e18;
        for (var k = 0; k < open.length; k++){ var f = gS[open[k]] + h(open[k]); if (f < bf){ bf = f; bi = k; } }
        var cI = open[bi]; open.splice(bi, 1);
        if (cI === ti){ found = true; break; }
        if (done[cI]) continue; done[cI] = 1;
        var cx = cI % nx, cy = (cI / nx) | 0;
        for (var dy2 = -1; dy2 <= 1; dy2++) for (var dx2 = -1; dx2 <= 1; dx2++){
          if (!dx2 && !dy2) continue;
          var x2 = cx + dx2, y2 = cy + dy2;
          if (!free(x2, y2)) continue;
          if (dx2 && dy2 && (!free(cx + dx2, cy) || !free(cx, cy + dy2))) continue;
          var ni = y2 * nx + x2, cost = gS[cI] + (dx2 && dy2 ? 1.414 : 1);
          if (cost < gS[ni]){ gS[ni] = cost; from[ni] = cI; if (!done[ni]) open.push(ni); }
        }
      }
      if (!found) return [[tx, ty]];
      var cells = [], q = ti;
      while (q !== -1){ cells.push([q % nx, (q / nx) | 0]); if (q === si) break; q = from[q]; }
      cells.reverse();
      var pts = [cells[0]], last = cells[0];          // làm thẳng đường (bỏ điểm thừa khi nhìn thẳng được)
      for (var m = 1; m < cells.length; m++){
        if (!los(last, cells[m])){ last = cells[m - 1]; pts.push(last); }
      }
      pts.push(cells[cells.length - 1]);
      var out = pts.slice(1).map(function(c){ return [c[0] * C + C / 2, c[1] * C + C / 2]; });
      out[out.length - 1] = [tx, ty];
      return out;
    }
    return { path: path, nearest: function(x, y){ var c = nearest(x, y); return [c[0] * C + C / 2, c[1] * C + C / 2]; }, free: function(x, y){ var c = cellOf(x, y); return free(c[0], c[1]); } };
  }

  // ---------- biển hiệu quán: biểu tượng TỰ VẼ (bánh mì kẹp trong vòng tròn xanh–vàng, không chép logo thương hiệu) ----------
  function ofcEmblem(x, cx, cy, r){
    x.save(); x.translate(cx, cy);
    x.beginPath(); x.arc(0, 0, r, 0, Math.PI * 2); x.fillStyle = "#FFC20E"; x.fill();
    x.lineWidth = r * 0.09; x.strokeStyle = "#FFFFFF"; x.stroke();
    x.beginPath(); x.arc(0, 0, r * 0.8, 0, Math.PI * 2); x.fillStyle = "#0E6B39"; x.fill();
    var w = r * 1.1;
    function rr(px, py, pw, ph, rad, col){ x.beginPath(); x.moveTo(px + rad, py); x.arcTo(px + pw, py, px + pw, py + ph, rad); x.arcTo(px + pw, py + ph, px, py + ph, rad); x.arcTo(px, py + ph, px, py, rad); x.arcTo(px, py, px + pw, py, rad); x.closePath(); x.fillStyle = col; x.fill(); }
    rr(-w / 2, r * 0.12, w, r * 0.22, r * 0.11, "#E9B067");                       // bánh dưới
    x.beginPath(); x.moveTo(-w / 2, r * 0.1);                                       // xà lách lượn sóng
    for (var i = 0; i <= 8; i++) x.quadraticCurveTo(-w / 2 + w * (i - 0.5) / 8, r * (i % 2 ? 0.0 : 0.2), -w / 2 + w * i / 8, r * 0.1);
    x.lineTo(w / 2, r * 0.16); x.lineTo(-w / 2, r * 0.16); x.closePath(); x.fillStyle = "#7BC043"; x.fill();
    rr(-w * 0.42, -r * 0.04, w * 0.84, r * 0.1, r * 0.05, "#E8463B");               // cà chua
    x.beginPath(); x.ellipse(0, -r * 0.1, w / 2, r * 0.3, 0, Math.PI, 0); x.closePath(); x.fillStyle = "#F0BE76"; x.fill();   // bánh trên
    x.fillStyle = "#FFF4DC"; [[-0.3, -0.22], [-0.05, -0.3], [0.2, -0.24], [0.38, -0.16], [-0.42, -0.14], [0.06, -0.18]].forEach(function(q){ x.beginPath(); x.ellipse(q[0] * r, q[1] * r, r * 0.04, r * 0.022, 0.4, 0, Math.PI * 2); x.fill(); });
    x.restore();
  }
  function ofcSignCanvas(name){
    var cv = document.createElement("canvas"); cv.width = 1024; cv.height = 256;
    var x = cv.getContext("2d"), g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#16884D"); g.addColorStop(1, "#0B5E35");
    x.beginPath(); x.moveTo(40, 8); x.arcTo(1016, 8, 1016, 248, 32); x.arcTo(1016, 248, 8, 248, 32); x.arcTo(8, 248, 8, 8, 32); x.arcTo(8, 8, 1016, 8, 32); x.closePath();
    x.fillStyle = g; x.fill(); x.lineWidth = 10; x.strokeStyle = "#FFC20E"; x.stroke();
    ofcEmblem(x, 130, 128, 92);
    var n = String(name || "").trim(), sp = n.indexOf(" "), L1 = n, L2 = "";
    if (sp > 0){ L1 = n.slice(0, sp); L2 = n.slice(sp + 1); }
    else if (n.length > 14){ L1 = n.slice(0, Math.ceil(n.length / 2)); L2 = n.slice(Math.ceil(n.length / 2)); }
    var F = '-apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP","Segoe UI",sans-serif', maxW = 1024 - 250 - 50;
    function fit(t, px, wt){ var s = px; do { x.font = wt + " " + s + "px " + F; s -= 2; } while (x.measureText(t).width > maxW && s > 18); return s + 2; }
    x.textBaseline = "middle"; x.textAlign = "left";
    if (L2){ fit(L1, 92, "900"); x.fillStyle = "#FFFFFF"; x.fillText(L1, 250, 92); fit(L2, 58, "800"); x.fillStyle = "#FFD54A"; x.fillText(L2, 252, 178); }
    else { fit(L1, 110, "900"); x.fillStyle = "#FFFFFF"; x.fillText(L1, 250, 132); }
    return cv;
  }
  function ofcEmblemCanvas(){
    var cv = document.createElement("canvas"); cv.width = 256; cv.height = 256;
    ofcEmblem(cv.getContext("2d"), 128, 128, 118); return cv;
  }

  /** Dựng căn phòng tĩnh (sàn + đồ đạc gộp thành ít khối) + tường cắt (tường phía camera tự hạ thấp). */
  function ofcBuildWorld(L, opt){
    opt = opt || {};
    var signs = [];
    var G = avGeo(), parts = [], glass = [], walls = [], tags = [];
    L._furn = []; L._cseats = [];
    var BX = GEO.get("u-box", function(){ return GEO.box(1, 1, 1); }), CY = GEO.get("u-cyl", function(){ return GEO.cyl(1, 1, 1, 18); });
    var SP = GEO.get("u-sph", function(){ return GEO.sphere(1, 12, 8); });
    var tm = new Float32Array(16);
    function put(g, col, x, y, z, sx, sy, sz, ry, list){
      var m = new Float32Array(16); M4.trs(m, [x, y, z], [0, ry || 0, 0], [sx, sy, sz]);
      (list || parts).push({ g: g, m: m, c: typeof col === "string" ? hexRGB(col) : col });
    }
    function boxAt(x, y, w, h, y0, hh, col, list){ put(BX, col, lx(L, x + w / 2), y0, lz(L, y + h / 2), w / 100, hh, h / 100, 0, list); }
    // sàn: khu khách (gỗ ấm) + khu bếp (gạch xám)
    var T = 50;
    for (var yy = 0; yy < L.H; yy += T) for (var xx = 0; xx < L.W; xx += T){
      var kit = yy + T / 2 >= L.kitchenY, odd = ((xx / T) + (yy / T)) % 2;
      var col = kit ? (odd ? "#D9DCDD" : "#CDD1D3") : (odd ? "#E9D6B8" : "#E1CCAB");
      boxAt(xx, yy, Math.min(T, L.W - xx), Math.min(T, L.H - yy), -0.05, 0.05, col);
    }
    // thảm cửa vào
    boxAt(L.entrance[0] + 20, 5, L.entrance[1] - L.entrance[0] - 40, 70, 0, 0.012, "#3D6B4F");
    var trayC = ["#7BC043", "#E8463B", "#F4F1E8", "#4E9A3E", "#2B2B2B", "#F6C945", "#9BD27A", "#E07A3F"];
    L.items.forEach(function(it){
      var x = it.x, y = it.y, w = it.w, h = it.h;
      if (it.t === "counter"){
        boxAt(x, y, w, h, 0, 0.8, "#1E6B3A");
        boxAt(x - 4, y - 4, w + 8, h + 8, 0.8, 0.05, "#EADBC0");
        boxAt(x - 0.6, y - 1.2, w + 1.2, 4, 0.1, 0.12, "#F2C200");    // dải vàng mặt trước (nhô hơn thân một chút → không trùng mặt, hết nhấp nháy)
        if (it.line){
          var n = Math.max(4, Math.floor(w / 60));
          for (var i = 0; i < n; i++){
            var cx = x + 20 + (w - 40) * (i + 0.5) / n;
            put(BX, "#B9BEC2", lx(L, cx), 0.85, lz(L, y + h * 0.55), (w - 40) / n / 100 * 0.9, 0.04, h / 100 * 0.42);
            put(BX, trayC[i % trayC.length], lx(L, cx), 0.87, lz(L, y + h * 0.55), (w - 40) / n / 100 * 0.78, 0.035, h / 100 * 0.34);
          }
          put(BX, [0.8, 0.92, 1, 0.28], lx(L, x + w / 2), 1.1, lz(L, y + h * 0.2), (w - 30) / 100, 0.02, 0.32, 0, glass);
          put(BX, [0.8, 0.92, 1, 0.28], lx(L, x + w / 2), 0.85, lz(L, y + h * 0.05), (w - 30) / 100, 0.26, 0.02, 0, glass);
          // biển hiệu treo trên quầy + dây treo
          var sw = Math.min(2.6, w / 100 * 0.62), sx0 = lx(L, x + w / 2), sz0 = lz(L, y + h + 190);      // treo phía sau người đứng quầy → không che mặt
          sw = Math.min(sw, 2.2); var sy0 = 2.42;     // treo cao (trên đầu người đứng quầy) để không che mặt
          put(BX, "#0B5E35", sx0, sy0 - 0.04, sz0 + 0.04, sw + 0.08, sw * 0.25 + 0.08, 0.05);
          [-1, 1].forEach(function(sd){ put(CY, "#6B7280", sx0 + sd * sw * 0.4, sy0 + sw * 0.25, sz0 + 0.04, 0.008, 0.3, 0.008); });
          signs.push({ k: "sign", x: sx0, y: sy0 + sw * 0.125, z: sz0, w: sw, h: sw * 0.25 });
        }
        [0.22, 0.78].forEach(function(f){ if (w > 150 || f < 0.5) signs.push({ k: "emb", x: lx(L, x + w * (it.reg ? 0.5 : f)), y: 0.45, z: lz(L, y) - 0.012, w: 0.36, h: 0.36 }); });
        if (it.reg){
          put(BX, "#2B2F36", lx(L, x + w * 0.35), 0.85, lz(L, y + h * 0.5), 0.36, 0.1, 0.3);
          put(BX, "#1B1F24", lx(L, x + w * 0.35), 0.95, lz(L, y + h * 0.45), 0.3, 0.22, 0.03);
          put(BX, "#58A6D8", lx(L, x + w * 0.35), 0.97, lz(L, y + h * 0.43), 0.26, 0.17, 0.012);
          put(BX, "#3B3F46", lx(L, x + w * 0.7), 0.85, lz(L, y + h * 0.45), 0.09, 0.05, 0.14);
        }
      } else if (it.t === "work"){
        var cut = L.items.filter(function(u){ return (u.t === "frz" || u.t === "chl") && u.x >= x - 1 && u.x + u.w <= x + w + 1 && u.y >= y - 1 && u.y + u.h <= y + h + 1; });
        var segs = [[x, x + w]];
        cut.forEach(function(u){ var out = []; segs.forEach(function(s){ if (u.x + u.w <= s[0] || u.x >= s[1]) out.push(s); else { if (u.x > s[0]) out.push([s[0], u.x]); if (u.x + u.w < s[1]) out.push([u.x + u.w, s[1]]); } }); segs = out; });
        segs.forEach(function(s){ boxAt(s[0], y, s[1] - s[0], h, 0.1, 0.72, "#B7BDC3"); boxAt(s[0] + 4, y + 4, s[1] - s[0] - 8, h - 8, 0, 0.1, "#8E959C"); });
        boxAt(x - 3, y - 3, w + 6, h + 6, 0.84, 0.05, "#DDE2E6");
        for (var k = 0; k < Math.floor(w / 140); k++) boxAt(x + 40 + k * 140, y + h * 0.3, 40, h * 0.4, 0.89, 0.03, k % 2 ? "#F4F1E8" : "#C8A06A");
      } else if (it.t === "seats"){
        boxAt(x, y, w, 25, 0, 0.42, "#2E7D4F");                       // ghế băng dài sát tường
        boxAt(x, y - 2, w, 8, 0.42, 0.45, "#2E7D4F");
        for (var s2 = 0; s2 + 130 <= w + 10; s2 += 135){
          var tx = x + s2 + 65, tz = y + 62;
          put(CY, "#F3EBDD", lx(L, tx), 0.7, lz(L, tz), 0.3, 0.04, 0.3); put(CY, "#5A5F66", lx(L, tx), 0, lz(L, tz), 0.04, 0.7, 0.04);
          put(CY, "#E9A15A", lx(L, tx), 0.42, lz(L, tz + 45), 0.15, 0.06, 0.15); put(CY, "#5A5F66", lx(L, tx), 0, lz(L, tz + 45), 0.03, 0.42, 0.03);
          L._furn = (L._furn || []).concat([[tx - 30, tz - 30, 60, 60], [tx - 15, tz + 30, 30, 30]]);
          L._cseats = (L._cseats || []).concat([[tx, tz + 45, Math.PI], [tx, y + 14, 0]]);
        }
      } else if (it.t === "pillar"){
        boxAt(x, y, w, h, 0, 1.1, "#CFC6B8"); boxAt(x - 2, y - 2, w + 4, h + 4, 1.1, 0.04, "#2E7D4F");   // cột: vẽ thấp (cắt ngang) để không che
      } else if (it.t === "block"){
        boxAt(x, y, w, h, 0, 0.95, "#D6D0C6"); boxAt(x - 2, y - 2, w + 4, h + 4, 0.95, 0.04 + (L.items.indexOf(it) % 4) * 0.002, "#C3BBAF");   // v57: nắp các khối kề nhau lệch nhau 2 mm
      } else if (it.t === "frz" || it.t === "chl"){
        var under = L.items.some(function(o){ return o.t === "work" && it.x >= o.x - 1 && it.x + it.w <= o.x + o.w + 1 && it.y >= o.y - 1 && it.y + it.h <= o.y + o.h + 1; });
        var tall = !under && Math.min(w, h) >= 100, hh = tall ? 1.9 : (under ? 0.84 : 0.86), band = it.t === "frz" ? "#2563EB" : "#0F8A7E";
        boxAt(x + 2, y + 2, w - 4, h - 4, 0, hh - 0.08, "#E8EDF1");      // v57: thân dừng dưới dải màu → mặt trên không trùng (hết chớp nóc tủ)
        boxAt(x, y, w, h, hh - 0.08, 0.08, band);
        // cửa + tay nắm ở phía mở
        var d = it.door, nD = tall ? 2 : 2;
        for (var q = 0; q < nD; q++){
          var f = (q + 0.5) / nD, along = (d === "left" || d === "right") ? y + h * f : x + w * f, len = ((d === "left" || d === "right") ? h : w) / nD - 10;
          var px = d === "left" ? x : (d === "right" ? x + w : along), pz = d === "top" ? y : (d === "bottom" ? y + h : along);
          var lr = (d === "left" || d === "right");
          var sx = lr ? 3 : len, sz = lr ? len : 3;
          boxAt(px - sx / 2, pz - sz / 2, sx, sz, 0.08, hh - 0.22, "#F7F9FB");
          var hx = lr ? px + (d === "left" ? -2 : 2) : along - len * 0.35, hz = lr ? along - len * 0.35 : pz + (d === "top" ? -2 : 2);
          boxAt(hx - (lr ? 2 : 1.5), hz - (lr ? 1.5 : 2), lr ? 4 : 3, lr ? 3 : 4, hh * 0.45, tall ? 0.5 : 0.25, "#8E959C");
        }
        tags.push({ x: lx(L, x + w / 2), y: hh + 0.12, z: lz(L, y + h / 2), t: it.lb, k: it.t });
      } else if (it.t === "mark"){
        put(CY, "#8E959C", lx(L, x), 0, lz(L, y), 0.02, 1.25, 0.02);
        put(BX, "#C8102E", lx(L, x), 1.2, lz(L, y), 0.5, 0.2, 0.03);
        tags.push({ x: lx(L, x), y: 1.55, z: lz(L, y), t: it.lb, k: "mark" });
      }
    });
    // phòng nghỉ: bàn + 4 ghế + máy cà phê + cây xanh + tủ đồ
    var rm = L.room, rcx = rm.x + rm.w / 2, rcy = rm.y + rm.h / 2 + 15, seats = [];
    put(CY, "#C8A06A", lx(L, rcx), 0.68, lz(L, rcy), 0.36, 0.04, 0.36); put(CY, "#6B5444", lx(L, rcx), 0, lz(L, rcy), 0.05, 0.68, 0.05);
    put(CY, "#FFFFFF", lx(L, rcx + 12), 0.72, lz(L, rcy - 8), 0.035, 0.07, 0.035); put(CY, "#FFFFFF", lx(L, rcx - 14), 0.72, lz(L, rcy + 10), 0.035, 0.07, 0.035);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function(q){
      var sx = rcx + q[0] * 48, sz = rcy + q[1] * 58;
      boxAt(sx - 17, sz - 17, 34, 34, 0.38, 0.05, "#E58FB4"); boxAt(sx - 14, sz - 14, 28, 28, 0, 0.38, "#7A6A5F");
      var back = q[0] < 0 ? [sx - 19, sz - 16.4, 5, 32.8] : [sx + 14, sz - 16.4, 5, 32.8];
      boxAt(back[0], back[1], back[2], back[3], 0.42, 0.42, "#E58FB4");
      seats.push([sx, sz, q[0] < 0 ? Math.PI / 2 : -Math.PI / 2]);
    });
    L._furn = (L._furn || []).concat([[rcx - 40, rcy - 40, 80, 80]]);
    boxAt(rm.x + 10, rm.y + rm.h - 50, 50, 40, 0, 0.85, "#B08968"); put(BX, "#2B2F36", lx(L, rm.x + 30), 0.85, lz(L, rm.y + rm.h - 30), 0.16, 0.3, 0.18);
    put(CY, "#B5652E", lx(L, rm.x + rm.w - 25), 0, lz(L, rm.y + rm.h - 25), 0.14, 0.3, 0.14);
    put(SP, "#4E9A3E", lx(L, rm.x + rm.w - 25), 0.55, lz(L, rm.y + rm.h - 25), 0.24, 0.3, 0.24);
    L._seats = seats;
    // cây xanh hai bên cửa
    [L.entrance[0] - 30, L.entrance[1] + 30].forEach(function(px){
      if (px > 40 && px < L.W - 40){ put(CY, "#B5652E", lx(L, px), 0, lz(L, 40), 0.16, 0.36, 0.16); put(SP, "#5DAA55", lx(L, px), 0.68, lz(L, 40), 0.28, 0.36, 0.28); }
    });
    // tường: ngoài cao 2,4 m (tự hạ khi chắn camera), trong thấp 1,1 m
    L.walls.forEach(function(w){
      var x0 = w[0], y0 = w[1], x1 = w[2], y1 = w[3], len = Math.hypot(x1 - x0, y1 - y0), out = w[4] === "o";
      var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, ry = Math.atan2(y1 - y0, x1 - x0);
      var H = out ? 2.4 : 1.1, th = out ? 0.12 : 0.1;
      function seg(hh, low){
        var lst = [], m;
        // v57: viền / nắp dài hơn thân 1–2 cm và thân dừng dưới nắp → không có hai mặt trùng nhau (hết nhấp nháy đầu tường)
        function wb(y0b, hb, col, thick, ex){ m = new Float32Array(16); M4.trs(m, [lx(L, cx), y0b, lz(L, cy)], [0, -ry, 0], [len / 100 + th + (ex || 0), hb, thick]); lst.push({ g: BX, m: m, c: hexRGB(col) }); }
        if (low){ wb(0, 0.28, "#2E7D4F", th); wb(0.28, 0.03, "#F2C200", th + 0.01, 0.01); }
        else if (out){ wb(0, 0.9, "#2E7D4F", th); wb(0.9, 0.04, "#F2C200", th + 0.01, 0.01); wb(0.94, hh - 0.99, "#F3EADB", th); wb(hh - 0.05, 0.05, "#E2D5BF", th + 0.02, 0.02); }
        else { wb(0, hh - 0.04, "#F3EADB", th); wb(hh - 0.04, 0.05, "#2E7D4F", th + 0.02, 0.02); }
        return N3(GEO.merge(lst), [1, 1, 1, 1]);
      }
      var nrm = [-(y1 - y0) / len, (x1 - x0) / len];               // pháp tuyến 2D; quay ra ngoài quán
      if ((cx + nrm[0] * 10 - L.W / 2) * nrm[0] + (cy + nrm[1] * 10 - L.H / 2) * nrm[1] < 0){ nrm[0] = -nrm[0]; nrm[1] = -nrm[1]; }
      var full = seg(H, false), stub = out ? seg(0.31, true) : null;
      walls.push({ full: full, stub: stub, mx: lx(L, cx), mz: lz(L, cy), nx: nrm[0], nz: nrm[1], out: out });
    });
    // bảng tin + thực đơn trên tường sau
    var bd = L.board, bz = lz(L, bd.y) - 0.07;
    put(BX, "#8B5E3C", lx(L, bd.x), 1.05, bz, 1.0, 0.72, 0.03);
    put(BX, "#D9B382", lx(L, bd.x), 1.09, bz - 0.012, 0.92, 0.64, 0.02);
    [["#FFF59D", -0.3, 1.5], ["#F8BBD0", 0.0, 1.55], ["#B3E5FC", 0.28, 1.45], ["#C8E6C9", -0.22, 1.22], ["#FFFFFF", 0.12, 1.2]].forEach(function(q){
      put(BX, q[0], lx(L, bd.x) + q[1], q[2], bz - 0.026, 0.2, 0.17, 0.01);
    });
    var mn = L.menu, mw = (mn.x2 - mn.x1) / 3;
    for (var mi = 0; mi < 3; mi++){
      var mx = lx(L, mn.x1 + mw * (mi + 0.5)), mzz = lz(L, L.H) - 0.08;
      put(BX, "#1F2A24", mx, 1.45, mzz, mw / 100 - 0.08, 0.72, 0.03);
      put(BX, mi === 1 ? "#F2C200" : "#2E8B57", mx, 1.98, mzz - 0.016, mw / 100 - 0.16, 0.12, 0.01);
      for (var li = 0; li < 4; li++) put(BX, "#E9E6DA", mx - 0.05, 1.82 - li * 0.1, mzz - 0.016, mw / 100 - 0.4, 0.025, 0.01);
      put(SP, ["#E8B04A", "#7BC043", "#E8463B"][mi], mx + mw / 100 / 2 - 0.3, 1.6, mzz - 0.03, 0.12, 0.08, 0.03);
    }
    // gộp theo lô < 60.000 đỉnh (máy cũ không có chỉ số 32-bit)
    var nodes = [], lot = [], nv = 0;
    parts.forEach(function(it){ var k = it.g.p.length / 3; if (nv + k > 60000 && lot.length){ nodes.push(N3(GEO.merge(lot), [1, 1, 1, 1])); lot = []; nv = 0; } lot.push(it); nv += k; });
    if (lot.length) nodes.push(N3(GEO.merge(lot), [1, 1, 1, 1]));
    if (typeof document !== "undefined" && signs.length){
      var sc0 = ofcSignCanvas(opt.store || "SANDWICH"), ec0 = ofcEmblemCanvas(), seen = {};
      signs.forEach(function(s){
        if (s.k === "emb"){ var key = s.x.toFixed(2) + s.z.toFixed(2); if (seen[key]) return; seen[key] = 1; }
        nodes.push(N3(GEO.get("pl" + s.w.toFixed(2) + "x" + s.h.toFixed(2), function(){ return GEO.plane(s.w, s.h); }), [1, 1, 1, 1],
          { p: [s.x, s.y, s.z], r: [0, Math.PI, 0], tex: s.k === "sign" ? sc0 : ec0, em: 0.6 }));
      });
    }
    var glassN = glass.length ? N3(GEO.merge(glass), [1, 1, 1, 1], { tr: true }) : null;
    return { nodes: nodes, glass: glassN, walls: walls, tags: tags, board: { x: lx(L, bd.x), y: 1.3, z: bz } };
  }
