// v2026.11.05.3 — 🏪 quán sống động: đồng bộ gần tức thì, Tenchou, khen thưởng, trò chơi, quay thưởng. Chạy: node tests/v56srv.js
'use strict';
const path = require('path');
const root = path.join(__dirname, '..');
const CODE = process.argv[3] ? path.resolve(process.argv[3]) : path.join(root, 'Code.gs');
const HTML = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'Index.html');
const makeApi = require('./gas-mock');
const A = makeApi({ code: CODE, html: HTML, registry: {}, web: {}, ssId: 'ssOtagawa', url: 'https://script.google.com/macros/s/otagawa/exec' });
let pass = 0, fail = 0;
const ok = (l, c, x) => { if (c) { pass++; console.log('  ✅ ' + l); } else { fail++; console.log('  ❌ ' + l + (x !== undefined ? '  → ' + String(x).slice(0, 300) : '')); } };
const throws = f => { try { f(); return null; } catch (e) { return e.message; } };
const rpc = (fn, ...args) => JSON.parse(A.doPost({ postData: { contents: JSON.stringify({ rpc: 1, fn, args }) } }).getContent());
let t = A.loginManager('subway1111').token; A.changeManagerPassword(t, 'subway1111', 'Otagawa2026x'); t = A.loginManager('Otagawa2026x').token;
A.saveEmployees(t, JSON.stringify([{ id: 'e1aaaa', name: 'ヒエウ', rank: 4 }, { id: 'e2bbbb', name: 'ラム', rank: 2 }, { id: 'e3cccc', name: 'まい' }]));
function staffTok(id){ const cc = A.issueClaimCode(t, id); const st = A.claimEmployee(id, '284619', true, 'iPhone', cc.code); return A.bootstrap(st.dk).session.token; }
const s1 = staffTok('e1aaaa'), s2 = staffTok('e2bbbb'), s3 = staffTok('e3cccc');

console.log('— Đồng bộ gần tức thì —');
let L = A.ofcLive(s1, JSON.stringify({ x: 500, y: 400, a: 'mop', yw: 1.2, m: 1 }), 0);
ok('trả về vị trí người khác + chat', L && L.p && Array.isArray(L.chat) && L.now > 0);
L = A.ofcLive(s2, JSON.stringify({ x: 900, y: 300, a: 'dance' }), 0);
ok('ラム thấy ヒエウ đang lau sàn ở (500,400)', L.p.e1aaaa && L.p.e1aaaa.a === 'mop' && L.p.e1aaaa.x === 500 && L.p.e1aaaa.m === 1, JSON.stringify(L.p));
ok('không trả về chính mình', !L.p.e2bbbb);
ok('động tác lạ → bỏ', JSON.parse(A.CacheService.getScriptCache().get('oflv:e2bbbb') || '{}').a === 'dance' && A.ofcLive(s3, JSON.stringify({ x: 1, y: 1, a: 'hack' }), 0) && A.ofcLive(s1, null, 0).p.e3cccc.a === '');
const before = Date.now() - 1;
A.officeSay(s2, 'やあ', '');
L = A.ofcLive(s1, null, before);
ok('tin nhắn mới tới ngay ở lần hỏi kế tiếp', L.chat.some(c => c.m === 'やあ'), JSON.stringify(L.chat));
ok('since lọc tin cũ', A.ofcLive(s1, null, Date.now() + 1000).chat.length === 0);

console.log('— Tenchou —');
ok('chức vụ 店長 (rank 4) → có quyền', A.officeState(s1).tc === 1);
ok('ラム (rank 2) → không', A.officeState(s2).tc === 0);
ok('ラム xin phiên Tenchou bị từ chối', /chưa được giao/.test(throws(() => A.tenchouSession(s2))));
const tc = A.tenchouSession(s1);
ok('ヒエウ nhận phiên Tenchou', tc.token && tc.name === 'ヒエウ');
const r1 = rpc('loadMonth', tc.token, A.todayStr_().slice(0, 7));
ok('Tenchou mở lịch tháng qua link GitHub', r1.ok === 1, JSON.stringify(r1).slice(0, 200));
const r2 = rpc('hrList', tc.token);
ok('Tenchou KHÔNG xem được hồ sơ nhân viên', r2.ok === 0 && /quản lý/.test(r2.m), JSON.stringify(r2));
const r3 = rpc('changeManagerPassword', tc.token, 'Otagawa2026x', 'zzzzzzzz1');
ok('Tenchou KHÔNG đổi được mật khẩu quản lý', r3.ok === 0, JSON.stringify(r3));
ok('Tenchou KHÔNG sửa được danh sách nhân viên (lương)', rpc('saveEmployees', tc.token, '[]').ok === 0);
ok('Phiên Tenchou không dùng ngoài link GitHub', /GitHub/.test(throws(() => A.loadMonth(tc.token, A.todayStr_().slice(0, 7)))));
ok('nhân vật trong phiên Tenchou vẫn là của ヒエウ', rpc('officeState', tc.token).v.me === 'e1aaaa');
A.officeConfig(t, JSON.stringify({ tc: ['e2bbbb'] }));
ok('quản lý giao thêm Tenchou cho ラム', A.officeState(s2).tc === 1 && A.officeState(t).tcIds.includes('e2bbbb'));
ok('bố cục giữ nguyên khi chỉ đổi Tenchou', A.officeState(t).layout === 'auto');

console.log('— Khen thưởng —');
const g1 = A.officeGrant(t, JSON.stringify({ to: 'e3cccc', kudo: 'guest', note: 'お客様からお褒めの言葉' }));
ok('khen "được khách khen" → +30 điểm + ruy băng', g1.xp === 30 && g1.kudos[0].k === 'guest', JSON.stringify(g1));
let o3 = A.officeState(s3);
ok('まい: điểm có phần được thưởng', o3.mine.n.gr === 30 && o3.mine.xp >= 30, JSON.stringify(o3.mine));
ok('ruy băng hiện cho mọi người (3 ngày)', A.officeState(s1).people.find(p => p.id === 'e3cccc').kd.length === 1);
ok('tin hệ thống báo khen', A.officeState(s1).chat.some(c => c.f === 'sys' && c.kd === 'guest'));
A.officeGrant(t, JSON.stringify({ to: 'e3cccc', items: [['ac', 12], ['pet', 3]] }));
const av = A.saveAvatar(s3, JSON.stringify({ ac: 12, pet: 3, ef: 4 }));
ok('món được tặng dùng được dù Lv thấp (halo, gà con); hiệu ứng chưa tặng → bỏ', av.ac === 12 && av.pet === 3 && av.ef === 0, JSON.stringify(av));
ok('Tenchou khen người khác được', A.officeGrant !== null && rpc('officeGrant', tc.token, JSON.stringify({ to: 'e2bbbb', kudo: 'bake' })).ok === 1);
ok('Tenchou không tự khen mình', /chính mình/.test(rpc('officeGrant', tc.token, JSON.stringify({ to: 'e1aaaa', kudo: 'bake' })).m));
ok('nhân viên thường không khen được', /quản lý/.test(throws(() => A.officeGrant(s2, JSON.stringify({ to: 'e3cccc', xp: 100 })))));
ok('điểm thưởng có trần ±500', A.officeGrant(t, JSON.stringify({ to: 'e2bbbb', xp: 99999 })).xp <= 520);

console.log('— Trò chơi —');
const gs = A.officeGameScore(s2, 'bake', 400);
ok('lưu điểm cao nhất', gs.best === 400 && gs.top[0].id === 'e2bbbb');
ok('điểm thấp hơn không đè', A.officeGameScore(s2, 'bake', 100).best === 400);
ok('điểm ảo bị chặn trần', A.officeGameScore(s1, 'catch', 1e9).best === 3000);
ok('trò chơi lạ → lỗi', /không hợp lệ/.test(throws(() => A.officeGameScore(s1, 'xx', 1))));
A.ofcXpBust_();
ok('điểm trò chơi đổi ra kinh nghiệm có trần (≤ 15 mỗi trò)', A.officeState(s2).mine.n.gm === 10 && A.officeState(s1).mine.n.gm === 15, A.officeState(s2).mine.n.gm + '/' + A.officeState(s1).mine.n.gm);

console.log('— Quay thưởng cuối tháng —');
ok('nhân viên không quay được', /quản lý/.test(throws(() => A.luckyDraw(s1, '{}'))));
const d1 = A.luckyDraw(t, JSON.stringify({ prizes: [{ n: '🧋 Trà sữa', c: 2 }, { n: '🍫 Bánh kẹo', c: 1 }], ids: ['e1aaaa', 'e2bbbb', 'e3cccc'], mode: 'eq' }));
ok('3 quà → 3 người khác nhau', d1.list.length === 3 && new Set(d1.list.map(x => x.id)).size === 3, JSON.stringify(d1.list));
ok('quay lần 2 trong tháng phải xác nhận', /đã quay rồi/.test(throws(() => A.luckyDraw(t, JSON.stringify({ prizes: [{ n: 'x' }], ids: ['e1aaaa'] })))));
const d2 = A.luckyDraw(t, JSON.stringify({ prizes: [{ n: 'Cà phê', c: 5 }], ids: ['e1aaaa', 'e2bbbb'], mode: 'xp', redo: true }));
ok('quà nhiều hơn người → mỗi người tối đa 1 quà; lưu lịch sử', d2.list.length === 2 && d2.hist.length === 1);
ok('mọi người thấy kết quả', A.officeState(s3).draw.list.length === 2);
ok('tin hệ thống 🎁', A.officeState(s3).chat.some(c => c.kd === 'draw'));
let cnt = { e1aaaa: 0, e2bbbb: 0, e3cccc: 0 };
for (let i = 0; i < 300; i++){ const r = A.luckyDraw(t, JSON.stringify({ prizes: [{ n: 'x' }], ids: Object.keys(cnt), redo: true })); cnt[r.list[0].id]++; }
ok('bốc thăm đều (mỗi người ~1/3)', Object.values(cnt).every(v => v > 60 && v < 140), JSON.stringify(cnt));

console.log('\nĐẠT: ' + pass + '   ·   LỖI: ' + fail);
process.exit(fail ? 1 : 0);
