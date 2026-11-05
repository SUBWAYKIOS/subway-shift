# Ghép mô-đun 🏢 Văn phòng ảo (nguon/ofc-*.js + nguon/ofc.css) vào nguon/Index.nguon.html.
# Chạy lại bao nhiêu lần cũng được (khối cũ giữa hai dấu OFC_*_BEGIN/END được thay mới).
# Dùng: python3 tools/ofc-splice.py && node tools/minify.js nguon/Index.nguon.html Index.html
import re, os, sys, glob
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
src = os.path.join(root, 'nguon', 'Index.nguon.html')
h = open(src, encoding='utf8').read()

def block(tag, body):
    return '/*OFC_%s_BEGIN*/\n%s\n/*OFC_%s_END*/' % (tag, body.rstrip('\n'), tag)

js = '\n'.join(open(f, encoding='utf8').read() for f in sorted(glob.glob(os.path.join(root, 'nguon', 'ofc-*.js'))))
css = open(os.path.join(root, 'nguon', 'ofc.css'), encoding='utf8').read()
for name, s in (('js', js), ('css', css)):
    if ' ' in s or ' ' in s:
        sys.exit('ký tự U+2028/2029 trong ' + name)

# 1) JS: ngay trước renderStaff
h = re.sub(r'/\*OFC_JS_BEGIN\*/.*?/\*OFC_JS_END\*/\n', '', h, flags=re.S)
anchor = '  function renderStaff(){\n'
assert h.count(anchor) == 1, 'không thấy renderStaff'
h = h.replace(anchor, block('JS', js) + '\n' + anchor)

# 2) CSS: cuối khối <style> chính (khối đầu tiên)
h = re.sub(r'/\*OFC_CSS_BEGIN\*/.*?/\*OFC_CSS_END\*/\n', '', h, flags=re.S)
i = h.index('</style>')
h = h[:i] + block('CSS', css) + '\n' + h[i:]

# 3) i18n: nhãn tab
LBL = {'vi': 'Quán', 'en': 'Store', 'ja': 'お店'}
h = re.sub(r'stabOffice:"[^"]*", tabOffice:"[^"]*", ', '', h)   # nhãn cũ (Văn phòng) → bỏ, chèn lại nhãn mới
if 'stabOffice:' not in h:
    for k, prefix in (('vi', 'stabToday:"Hôm nay"'), ('en', 'stabToday:"Today"'), ('ja', 'stabToday:"今日"')):
        assert h.count(prefix) == 1, prefix
        h = h.replace(prefix, 'stabOffice:"%s", tabOffice:"%s", %s' % (LBL[k], LBL[k], prefix))

# 4) móc vào thanh tab + màn nhân viên / quản lý (chỉ làm một lần)
def once(old, new, label):
    global h
    if new in h:
        return
    assert h.count(old) == 1, 'không thấy: ' + label
    h = h.replace(old, new)

once('var tabs = [["day","tabDay",TAB_ICONS.day],["month","tabMonth",TAB_ICONS.month]];',
     'var tabs = [["day","tabDay",TAB_ICONS.day],["month","tabMonth",TAB_ICONS.month],["office","tabOffice",OFC_ICON]];', 'mgrTabs')
once('    if (state.role === "emp") tabs.push(["settings","tabSettings",TAB_ICONS.gear]);',
     '    tabs.push(["office","stabOffice",OFC_ICON]);   // v55: 🏢 văn phòng ảo\n    if (state.role === "emp") tabs.push(["settings","tabSettings",TAB_ICONS.gear]);', 'staffTabs')
once('    if (tab !== "settings") html += helloHTML(me);\n',
     '    if (tab !== "settings" && tab !== "office") html += helloHTML(me);\n', 'hello')
once('    else {\n      // ---- 希望: lưới tháng + bảng khai giờ của ngày đang chọn ----',
     '    else if (tab === "office"){\n      html += officeHTML();            // v55\n    }\n\n    else {\n      // ---- 希望: lưới tháng + bảng khai giờ của ngày đang chọn ----', 'staffBranch')
once('    app.innerHTML = html;\n    wireCommon();\n    document.body.classList.add("staff-v2");\n',
     '    app.innerHTML = html;\n    wireCommon();\n    document.body.classList.add("staff-v2");\n    officeAfterRender(tab === "office");\n', 'staffAfter')
once('    // ---------- TAB CÀI ĐẶT: dữ liệu gốc, mỗi tháng đụng tới một hai lần ----------\n    else {',
     '    // ---------- v55: TAB VĂN PHÒNG ẢO ----------\n    else if (state.mgrTab === "office"){\n      html += officeHTML();\n    }\n\n    // ---------- TAB CÀI ĐẶT: dữ liệu gốc, mỗi tháng đụng tới một hai lần ----------\n    else {', 'mgrBranch')
once('    app.innerHTML = html;\n    wireCommon();\n    renderCoverage(); renderTotals();\n',
     '    app.innerHTML = html;\n    wireCommon();\n    officeAfterRender(state.mgrTab === "office");\n    renderCoverage(); renderTotals();\n', 'mgrAfter')

once('    else if (state.locked){\n      // ---- v42: tháng đã chốt hết',
     '    else if (state.locked && tab !== "office"){\n      // ---- v42: tháng đã chốt hết', 'lockedNotOffice')

once('    if (state.role === "mgr") snapSave();        // v46',
     '    if (state.role === "mgr" && !state.tcBack) snapSave();        // v46 (v56: phiên Tenchou không lưu ảnh màn quản lý trên máy nhân viên)', 'tcSnap')
once('    pushSub().then(function(s){ var was = PUSH.on;',
     '    if (!state.tcBack) pushSub().then(function(s){ var was = PUSH.on;', 'tcPush1')
once('    pushSync(); pushMaybeInvite();               // v45: thông báo đẩy',
     '    if (!state.tcBack){ pushSync(); pushMaybeInvite(); }               // v45: thông báo đẩy (v56: không đăng ký thông báo quản lý trên máy Tenchou)', 'tcPush2')

once('      html += mgrpHeadHTML("sales") + [monthBudgetHTML(), bizTicketHTML(),',
     '      html += mgrpHeadHTML("sales") + [monthBudgetHTML(), ownerTicketHTML(), bizTicketHTML(),', 'ownerTicket')

# 5) phiên bản
h = re.sub(r'var APP_VERSION = "[0-9.]+";', 'var APP_VERSION = "2026.11.06.1";', h, count=1)
h = re.sub(r'var SRV_NEED = "[0-9.]+";', 'var SRV_NEED = "2026.11.06.1";', h, count=1)
open(src, 'w', encoding='utf8').write(h)
print('ok', len(js), 'js chars,', len(css), 'css chars')
