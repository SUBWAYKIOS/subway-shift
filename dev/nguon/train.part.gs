
// ===========================================================================
// 📋 ĐÀO TẠO NHÂN VIÊN MỚI (v47) — checklist các việc nhân viên SUBWAY phải học
// ---------------------------------------------------------------------------
// 'train' = { tpl: { groups: [{ id, t:{ja,vi,en}, items: [{ id, t:{ja,vi,en} }] }], at },
//             emp: { empId: { open, at, by, items: { itemId: { s: lúc NV tự tick, c: lúc xác nhận, cb: người xác nhận, n: ghi chú } }, done } } }
// Quản lý "mở yêu cầu" cho một nhân viên → nhân viên thấy checklist trong app, tự tick "đã làm được";
// quản lý / người đào tạo bấm xác nhận (kèm tên + ngày). Quản lý tick hộ được. Đóng yêu cầu = ẩn với nhân viên, giữ tiến độ.
// ===========================================================================
function trainTx_(ja, vi, en) { return { ja: ja, vi: vi, en: en || vi }; }
function trainDefaultTpl_() {
  var G = function (id, ja, vi, en, items) { return { id: id, t: trainTx_(ja, vi, en), items: items.map(function (x, i) { return { id: id + (i + 1), t: trainTx_(x[0], x[1], x[2]) }; }) }; };
  return { at: Date.now(), groups: [
    G('g1', '基本・衛生', 'Cơ bản & vệ sinh', 'Basics & hygiene', [
      ['身だしなみ（制服・帽子・爪・アクセサリー）', 'Tác phong (đồng phục, mũ, móng tay, không đeo trang sức)', 'Uniform, cap, nails, no jewellery'],
      ['正しい手洗い（30秒・決められたタイミング）', 'Rửa tay đúng cách (30 giây, đúng thời điểm quy định)', 'Correct handwashing (30 s, required times)'],
      ['手袋の着用・交換ルール', 'Quy tắc đeo và thay găng tay', 'Glove use and change rules'],
      ['体調不良時の報告（体調チェック）', 'Báo khi không khoẻ (khai sức khoẻ)', 'Reporting when unwell (health check)'],
      ['温度管理（冷蔵・冷凍・保温）と記録', 'Kiểm soát nhiệt độ (lạnh, đông, giữ nóng) và ghi chép', 'Temperature control (chilled, frozen, hot) and logs'],
      ['消費期限ラベル（デイドット）の付け方・確認', 'Dán và kiểm tra nhãn hạn dùng (day-dot)', 'Shelf-life labels (day dots)'],
      ['交差汚染の防止（色分け・置き場所）', 'Chống nhiễm chéo (phân màu, chỗ để)', 'Preventing cross-contamination'],
      ['アレルギー対応の基本', 'Kiến thức cơ bản về dị ứng thực phẩm', 'Allergen basics']]),
    G('g2', 'パン', 'Bánh mì', 'Bread', [
      ['冷凍パンの解凍（スロー解凍）', 'Rã đông bánh (rã đông chậm)', 'Thawing frozen dough'],
      ['プルーフ（発酵）の設定と見極め', 'Ủ bột (cài đặt và nhận biết đủ độ)', 'Proofing settings and checks'],
      ['焼成（オーブン設定・時間）', 'Nướng bánh (cài lò, thời gian)', 'Baking (oven settings, time)'],
      ['トッピング（チーズ・シード等）', 'Rắc topping (phô mai, hạt…)', 'Toppings (cheese, seeds)'],
      ['焼き上がりの品質チェック・時間管理', 'Kiểm tra chất lượng bánh và quản lý thời gian', 'Bake quality and hold times']]),
    G('g3', '仕込み', 'Chuẩn bị nguyên liệu', 'Prep', [
      ['野菜のカット・計量', 'Cắt và cân rau', 'Cutting and weighing vegetables'],
      ['肉・チーズの準備', 'Chuẩn bị thịt và phô mai', 'Preparing meats and cheese'],
      ['ソース・ドレッシングの補充', 'Bổ sung sốt / dressing', 'Refilling sauces'],
      ['ラインの準備（配置・量）', 'Chuẩn bị quầy line (vị trí, số lượng)', 'Setting up the line'],
      ['先入れ先出し（FIFO）', 'Nhập trước dùng trước (FIFO)', 'First in, first out (FIFO)']]),
    G('g4', 'サンドイッチ作り', 'Làm sandwich', 'Making sandwiches', [
      ['お客様への声かけ・注文の聞き方', 'Chào khách và cách nhận order', 'Greeting and taking the order'],
      ['パンの選択・カット', 'Chọn bánh và cắt bánh', 'Bread choice and cutting'],
      ['具材の規定量（ポーション）', 'Định lượng nhân đúng chuẩn', 'Correct portions'],
      ['トースト', 'Nướng (toast)', 'Toasting'],
      ['野菜・ソースのトッピング', 'Thêm rau và sốt', 'Vegetables and sauces'],
      ['包装・カット・提供', 'Gói, cắt và đưa cho khách', 'Wrapping, cutting, serving'],
      ['サラダ・ラップ', 'Salad và wrap', 'Salads and wraps'],
      ['スピード目標の達成', 'Đạt tốc độ mục tiêu', 'Meeting speed targets']]),
    G('g5', 'レジ・接客', 'Quầy thu ngân & tiếp khách', 'Register & service', [
      ['レジ操作（会計・取消・返金）', 'Thao tác máy tính tiền (thanh toán, huỷ, hoàn tiền)', 'POS (payment, void, refund)'],
      ['支払い方法（現金・カード・電子マネー・QR）', 'Các cách thanh toán (tiền mặt, thẻ, ví điện tử, QR)', 'Payment methods'],
      ['クーポン・アプリ・ポイント対応', 'Xử lý coupon, app, điểm thưởng', 'Coupons, app, points'],
      ['モバイルオーダー・デリバリー対応', 'Đơn đặt qua app / giao hàng', 'Mobile orders and delivery'],
      ['クレーム対応と店長への報告', 'Xử lý phàn nàn và báo quản lý', 'Handling complaints and reporting']]),
    G('g6', '清掃・閉店', 'Dọn dẹp & đóng cửa', 'Cleaning & closing', [
      ['毎時の清掃（客席・トイレ・店外）', 'Dọn mỗi giờ (bàn khách, nhà vệ sinh, trước quán)', 'Hourly cleaning'],
      ['器具の洗浄・消毒', 'Rửa và khử trùng dụng cụ', 'Washing and sanitising tools'],
      ['閉店作業（ライン片付け・廃棄記録）', 'Việc đóng cửa (dọn line, ghi hàng huỷ)', 'Closing tasks and waste log'],
      ['ゴミ出し・分別', 'Đổ rác và phân loại', 'Rubbish and sorting'],
      ['戸締り・セキュリティ', 'Khoá cửa và an ninh', 'Locking up and security']]),
    G('g7', '安全・緊急時', 'An toàn & khẩn cấp', 'Safety & emergencies', [
      ['包丁・スライサーの安全な使い方', 'Dùng dao và máy thái an toàn', 'Safe use of knives and slicer'],
      ['火傷・ケガの防止と応急処置', 'Phòng bỏng, bị thương và sơ cứu', 'Burns, injuries and first aid'],
      ['緊急連絡先・避難経路・消火器の位置', 'Số liên lạc khẩn cấp, lối thoát hiểm, vị trí bình chữa cháy', 'Emergency contacts, exits, extinguisher']])
  ] };
}
function trainRead_() {
  var o = readJsonKey_('train');
  if (!o || typeof o !== 'object' || Array.isArray(o)) o = {};
  if (!o.tpl || !Array.isArray(o.tpl.groups)) o.tpl = trainDefaultTpl_();
  if (!o.emp || typeof o.emp !== 'object') o.emp = {};
  return o;
}
function trainEdit_(fn) {
  return attKv_('train', function (o) {
    o = (o && typeof o === 'object' && !Array.isArray(o)) ? o : {};
    if (!o.tpl || !Array.isArray(o.tpl.groups)) o.tpl = trainDefaultTpl_();
    if (!o.emp || typeof o.emp !== 'object') o.emp = {};
    fn(o);
    return o;
  });
}
function trainItemIds_(tpl) { var a = []; tpl.groups.forEach(function (g) { (g.items || []).forEach(function (it) { a.push(it.id); }); }); return a; }
function trainSum_(tpl, rec) {
  var ids = trainItemIds_(tpl), s = 0, c = 0, items = (rec && rec.items) || {};
  ids.forEach(function (id) { var x = items[id]; if (x && (x.s || x.c)) s++; if (x && x.c) c++; });
  return { n: ids.length, s: s, c: c };
}
/** Mẫu checklist + phần của một người (nhân viên chỉ xem được của mình, và chỉ khi quản lý đã mở yêu cầu). */
function trainState(token, empId) {
  var p = requireCanEdit_(token, empId), o = trainRead_(), rec = o.emp[String(empId)] || null;
  if (p.r !== 'mgr' && !(rec && rec.open)) return { tpl: o.tpl, rec: null, open: false };
  return { tpl: o.tpl, rec: rec, open: !!(rec && rec.open), sum: trainSum_(o.tpl, rec) };
}
/** Quản lý: tiến độ của mọi người đã từng mở. */
function trainList(token) {
  requireManager_(token);
  var o = trainRead_(), names = {};
  readEmployees_().forEach(function (e) { names[e.id] = e.name; });
  return { tpl: o.tpl, list: Object.keys(o.emp).filter(function (id) { return names[id]; }).map(function (id) {
    var r = o.emp[id]; return { id: id, name: names[id], open: !!r.open, at: r.at || 0, done: r.done || 0, sum: trainSum_(o.tpl, r) };
  }).sort(function (a, b) { return (b.open - a.open) || (b.at - a.at); }) };
}
/** Quản lý: lưu mẫu (thêm / sửa / xoá nhóm và mục). Mục bị xoá thì tiến độ cũ của mục đó không còn tính. */
function trainTplSave(token, json) {
  requireManager_(token);
  var g; try { g = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { g = null; }
  if (!g || !Array.isArray(g.groups) || g.groups.length > 30) throw new Error('Dữ liệu không hợp lệ.');
  var clean = function (t) { var o = {}; ['ja', 'vi', 'en'].forEach(function (k) { var v = String((t && t[k]) || '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, 120); if (v) o[k] = v; }); return o; };
  var seen = {}, uid = function (pre, id) { id = String(id || ''); if (!/^[a-z0-9]{1,16}$/.test(id) || seen[id]) id = pre + Utilities.getUuid().replace(/-/g, '').slice(0, 8); seen[id] = 1; return id; };
  var groups = g.groups.map(function (x) {
    var t = clean(x.t); if (!t.ja && !t.vi && !t.en) return null;
    var items = (Array.isArray(x.items) ? x.items : []).slice(0, 60).map(function (it) { var tt = clean(it.t); return (tt.ja || tt.vi || tt.en) ? { id: uid('i', it.id), t: tt } : null; }).filter(Boolean);
    return { id: uid('g', x.id), t: t, items: items };
  }).filter(Boolean);
  var res = trainEdit_(function (o) { o.tpl = { groups: groups, at: Date.now() }; });
  return { tpl: res.tpl };
}
/** Quản lý mở / đóng yêu cầu đào tạo cho một nhân viên (mở = nhân viên thấy checklist + nhận thông báo). */
function trainOpen(token, empId, on) {
  requireManager_(token);
  empId = String(empId || '');
  var emp = readEmployees_().filter(function (e) { return e.id === empId; })[0];
  if (!emp) throw new Error('Không tìm thấy nhân viên này.');
  var wasOpen = false;
  var res = trainEdit_(function (o) {
    var r = o.emp[empId] || (o.emp[empId] = { items: {} });
    wasOpen = !!r.open; r.open = !!on;
    if (on && !r.at) r.at = Date.now();
  });
  if (on && !wasOpen) {
    try {
      pushSend_([{ w: empId, tag: 'train', url: pushUrl_('go=today'), tx: pushTx_(function (lg) {
        if (lg === 'ja') return ['📋 研修チェックリストが届きました', '覚えた項目にチェックを入れてください。店長が確認します。'];
        if (lg === 'en') return ['📋 Your training checklist is open', 'Tick the tasks you can do — the manager will confirm.'];
        return ['📋 Checklist đào tạo đã mở', 'Tick những việc bạn đã làm được — quản lý sẽ xác nhận.'];
      }) }]);
    } catch (e) {}
  }
  return trainState(token, empId);
}
/** Tick một mục. Nhân viên: chỉ "đã làm được" của mình (khi yêu cầu đang mở, mục chưa được xác nhận).
 *  Quản lý: mode 's' = tick hộ phần nhân viên · 'c' = xác nhận (kèm người xác nhận `by`) · on=false bỏ tick. */
function trainTick(token, empId, itemId, on, mode, by, note) {
  var p = requireCanEdit_(token, empId);
  empId = String(empId || ''); itemId = String(itemId || '');
  var o0 = trainRead_();
  if (trainItemIds_(o0.tpl).indexOf(itemId) === -1) throw new Error('Mục này không còn trong checklist.');
  var mgr = p.r === 'mgr', allSelf = false, name = '';
  readEmployees_().forEach(function (e) { if (e.id === empId) name = e.name; });
  var res = trainEdit_(function (o) {
    var r = o.emp[empId];
    if (!mgr && !(r && r.open)) throw new Error('Quản lý chưa mở checklist đào tạo cho bạn.');
    if (!r) r = o.emp[empId] = { items: {}, at: Date.now() };
    r.items = r.items || {};
    var x = r.items[itemId] || {};
    if (!mgr || mode !== 'c') {
      if (!mgr && x.c && !on) throw new Error('Mục này quản lý đã xác nhận — không bỏ tick được.');
      if (mgr && on && !x.s) x.sm = 1;             // quản lý tick hộ (NV đã tự tick thì giữ là của NV)
      if (on) x.s = x.s || Date.now(); else { delete x.s; delete x.sm; if (mgr) { delete x.c; delete x.cb; } }
    } else {
      if (on) { x.c = Date.now(); x.cb = String(by || '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, 30) || 'Quản lý'; x.s = x.s || x.c; }
      else { delete x.c; delete x.cb; }
    }
    if (note !== undefined && mgr) { var nn = String(note || '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, 120); if (nn) x.n = nn; else delete x.n; }
    if (x.s || x.c || x.n) r.items[itemId] = x; else delete r.items[itemId];
    var S = trainSum_(o.tpl, r);
    if (S.n && S.c === S.n) r.done = r.done || Date.now(); else delete r.done;
    allSelf = !mgr && on && S.n && S.s === S.n && S.c < S.n;
  });
  if (allSelf) { try { mgrEvent_('train', empId, '', 0, ''); } catch (e) {} }    // NV tick đủ → báo quản lý vào xác nhận
  return { rec: res.emp[empId], sum: trainSum_(res.tpl, res.emp[empId]) };
}
