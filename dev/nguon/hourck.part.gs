
// ===========================================================================
// ⏰ CHECKLIST THEO KHUNG GIỜ CỦA QUÁN (v48) — nằm trong "Việc hôm nay"
// ---------------------------------------------------------------------------
// 'hk:tpl'     = { slots: [{ id, at:'07:30', t:{ja,vi,en}, items: [{ id, t:{ja,vi,en} }] }], at }  — mỗi quán một mẫu riêng
// 'hk:YYYY-MM' = { 'DD': { itemId: { at, by: empId | 'm', n: tên người tick } } }
// Nhân viên tick trong app (hôm nay / hôm qua — việc đóng cửa qua nửa đêm), chỉ bỏ được tick của chính mình.
// Quản lý tick hộ / bỏ tick mọi ngày, sửa mẫu. In / PDF làm hồ sơ vệ sinh (衛生管理記録).
// ===========================================================================
function hkTx_(ja, vi, en) { return { ja: ja, vi: vi, en: en || vi }; }
function hkDefaultTpl_() {
  var S = function (id, at, ja, vi, en, items) { return { id: id, at: at, t: hkTx_(ja, vi, en), items: items.map(function (x, i) { return { id: id + (i + 1), t: hkTx_(x[0], x[1], x[2]) }; }) }; };
  return { at: Date.now(), slots: [
    S('h1', '07:30', '開店前', 'Trước giờ mở cửa', 'Before opening', [
      ['冷蔵庫・冷凍庫の温度を確認・記録', 'Đo nhiệt độ tủ lạnh / tủ đông và ghi lại', 'Check & record fridge / freezer temperatures'],
      ['オーブン・ウォーマーの電源を入れる', 'Bật lò nướng và tủ giữ nóng', 'Turn on the oven and warmers'],
      ['手洗い場（石けん・アルコール・ペーパー）を補充', 'Bổ sung bồn rửa tay (xà phòng, cồn, khăn giấy)', 'Restock the hand-wash station (soap, sanitiser, towels)'],
      ['食材の期限ラベル（デイドット）を確認', 'Kiểm tra nhãn hạn dùng nguyên liệu (day-dot)', 'Check ingredient day-dot labels'],
      ['ライン（野菜・肉・ソース）を準備', 'Bày line (rau, thịt, sốt)', 'Set up the line (veg, meat, sauces)'],
      ['パンを焼く（開店分）', 'Nướng bánh cho đầu ngày', 'Bake bread for opening'],
      ['客席・カウンター・入口を清掃', 'Lau bàn khách, quầy và cửa ra vào', 'Clean tables, counter and entrance'],
      ['レジの釣銭を確認', 'Kiểm tra tiền lẻ quầy thu ngân', 'Check the till float']]),
    S('h2', '11:00', 'ランチ前', 'Trước cao điểm trưa', 'Before lunch peak', [
      ['ラインの食材を補充', 'Bổ sung nguyên liệu trên line', 'Restock the line'],
      ['サンドイッチユニットの温度を確認', 'Kiểm tra nhiệt độ line lạnh', 'Check the sandwich unit temperature'],
      ['予測に合わせてパンを追加で焼く', 'Nướng thêm bánh theo dự báo', 'Bake extra bread to forecast'],
      ['ダスター・消毒液を交換', 'Thay khăn lau và nước sát khuẩn', 'Change cloths and sanitiser']]),
    S('h3', '14:00', 'ランチ後', 'Sau cao điểm trưa', 'After lunch peak', [
      ['客席・床を清掃', 'Lau bàn khách và sàn khu khách', 'Clean tables and the dining floor'],
      ['ゴミを捨てる', 'Đổ rác', 'Empty the bins'],
      ['ラインの期限・状態を確認、パンを入れ替え', 'Kiểm tra hạn dùng / tình trạng trên line, thay khay', 'Check line dates and condition, swap pans'],
      ['冷蔵庫・冷凍庫の温度を確認・記録', 'Đo nhiệt độ tủ lạnh / tủ đông và ghi lại', 'Check & record fridge / freezer temperatures'],
      ['器具を洗浄', 'Rửa dụng cụ', 'Wash utensils']]),
    S('h4', '17:00', 'ディナー前', 'Trước cao điểm tối', 'Before dinner peak', [
      ['ラインの食材を補充・パンを焼く', 'Bổ sung nguyên liệu, nướng bánh', 'Restock and bake bread'],
      ['サンドイッチユニットの温度を確認', 'Kiểm tra nhiệt độ line lạnh', 'Check the sandwich unit temperature'],
      ['ダスター・消毒液を交換', 'Thay khăn lau và nước sát khuẩn', 'Change cloths and sanitiser'],
      ['客席を清掃', 'Lau bàn khách', 'Clean the tables']]),
    S('h5', '20:00', '閉店', 'Đóng cửa', 'Closing', [
      ['オーブン・ウォーマーを切って清掃', 'Tắt và vệ sinh lò nướng, tủ giữ nóng', 'Turn off and clean the oven and warmers'],
      ['食材をラップ・ラベルして保管', 'Bọc màng, dán nhãn và cất nguyên liệu', 'Wrap, label and store ingredients'],
      ['ライン・スライサー・まな板を洗浄消毒', 'Vệ sinh line, máy thái, thớt', 'Clean & sanitise the line, slicer and boards'],
      ['床清掃・ゴミ捨て', 'Lau sàn, đổ rác', 'Mop the floor, empty the bins'],
      ['冷蔵庫・冷凍庫の温度を最終確認・記録', 'Đo nhiệt độ tủ lần cuối và ghi lại', 'Final fridge / freezer temperature check'],
      ['レジ締め', 'Kết sổ thu ngân', 'Close the till'],
      ['電気・ガス・施錠を確認', 'Kiểm tra điện, gas, khoá cửa', 'Check power, gas and locks']])
  ] };
}
function hkTpl_() {
  var o = readJsonKey_('hk:tpl');
  return (o && Array.isArray(o.slots)) ? o : hkDefaultTpl_();
}
function hkIds_(tpl) { var a = []; tpl.slots.forEach(function (s) { (s.items || []).forEach(function (it) { a.push(it.id); }); }); return a; }
function hkYmd_(ymd) {
  ymd = String(ymd || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) throw new Error('Ngày không hợp lệ.');
  return ymd;
}
function hkDay_(ymd) { var m = readJsonKey_('hk:' + ymd.slice(0, 7)); return (m && m[ymd.slice(8)]) || {}; }
/** Mẫu + các mục đã tick của một ngày. Nhân viên: hôm nay / hôm qua. */
function hkState(token, ymd) {
  var p = auth_(token); ymd = hkYmd_(ymd);
  if (p.r !== 'mgr' && ymd !== jstDateStr_(0) && ymd !== jstDateStr_(-1)) throw new Error('Chỉ xem được checklist của hôm nay.');
  return { ymd: ymd, tpl: hkTpl_(), done: hkDay_(ymd) };
}
/** Tick / bỏ tick một mục. Nhân viên: hôm nay (hoặc hôm qua), chỉ bỏ tick của mình. Quản lý: mọi ngày, kèm tên người kiểm tra. */
function hkTick(token, ymd, itemId, on, empId, by) {
  var p = auth_(token), mgr = p.r === 'mgr'; ymd = hkYmd_(ymd); itemId = String(itemId || '');
  if (!mgr) {
    if (String(p.e) !== String(empId)) throw new Error('Bạn chỉ tick được bằng tên của mình.');
    if (ymd !== jstDateStr_(0) && ymd !== jstDateStr_(-1)) throw new Error('Chỉ tick được checklist của hôm nay.');
  }
  if (hkIds_(hkTpl_()).indexOf(itemId) === -1) throw new Error('Mục này không còn trong checklist (tải lại trang).');
  var name = '';
  if (mgr) name = String(by || '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, 30) || '店長';
  else readEmployees_().forEach(function (e) { if (e.id === String(p.e)) name = e.name; });
  var dd = ymd.slice(8);
  var res = attKv_('hk:' + ymd.slice(0, 7), function (m) {
    m = (m && typeof m === 'object' && !Array.isArray(m)) ? m : {};
    var d = m[dd] || (m[dd] = {}), x = d[itemId];
    if (on) { if (!x) d[itemId] = { at: Date.now(), by: mgr ? 'm' : String(p.e), n: name }; }
    else if (x) {
      if (!mgr && x.by !== String(p.e)) throw new Error('Mục này do ' + (x.n || 'người khác') + ' tick — bạn không bỏ được.');
      delete d[itemId];
    }
    if (!Object.keys(d).length) delete m[dd];
    return m;
  });
  return { ymd: ymd, done: res[dd] || {} };
}
/** Quản lý lưu mẫu: thêm / sửa / xoá khung giờ và mục. Mục cũ giữ id (tick cũ vẫn đúng). */
function hkTplSave(token, json) {
  requireManager_(token);
  var g; try { g = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { g = null; }
  if (!g || !Array.isArray(g.slots) || g.slots.length > 24) throw new Error('Dữ liệu không hợp lệ.');
  var clean = function (t) { var o = {}; ['ja', 'vi', 'en'].forEach(function (k) { var v = String((t && t[k]) || '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, 120); if (v) o[k] = v; }); return o; };
  var seen = {}, uid = function (pre, id) { id = String(id || ''); if (!/^[a-z0-9]{1,16}$/.test(id) || seen[id]) id = pre + Utilities.getUuid().replace(/-/g, '').slice(0, 8); seen[id] = 1; return id; };
  var slots = g.slots.map(function (x) {
    var at = String(x.at || '').trim(), mm = at.match(/^(\d{1,2}):?(\d{2})$/);
    at = mm && Number(mm[1]) < 30 && Number(mm[2]) < 60 ? ('0' + Number(mm[1])).slice(-2) + ':' + mm[2] : '';
    var t = clean(x.t); if (!t.ja && !t.vi && !t.en && !at) return null;
    var items = (Array.isArray(x.items) ? x.items : []).slice(0, 40).map(function (it) { var tt = clean(it.t); return (tt.ja || tt.vi || tt.en) ? { id: uid('k', it.id), t: tt } : null; }).filter(Boolean);
    return { id: uid('s', x.id), at: at, t: t, items: items };
  }).filter(Boolean);
  slots.sort(function (a, b) { return (a.at || '99') < (b.at || '99') ? -1 : (a.at || '99') > (b.at || '99') ? 1 : 0; });
  var tpl = { slots: slots, at: Date.now() };
  attKv_('hk:tpl', function () { return tpl; });
  return { tpl: tpl };
}
