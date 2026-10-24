# SUBWAY シフト — bản chạy trên GitHub Pages

Giao diện app lịch ca chạy trên **GitHub Pages**; **máy chủ và dữ liệu vẫn là Apps Script + Google Sheet của từng quán** (không đổi gì về dữ liệu).

```
Điện thoại ──► https://<tài-khoản>.github.io/subway-shift/   (trang tĩnh, nhanh, cài lên màn hình chính được)
                   │  POST JSON (fetch)
                   ▼
        Apps Script /exec của quán (Code.gs)  ──►  Google Sheet của quán
```

Lợi so với mở thẳng link Apps Script:
- Không còn khung Google và dòng "Ứng dụng này do người dùng Google Apps Script tạo".
- Mở nhanh hơn (trang tĩnh trên CDN), mất mạng vẫn mở được bản đã lưu.
- "Thêm vào màn hình chính" ra icon riêng như app thật (Android cài được dạng PWA).
- Một link cho mọi quán: chọn quán một lần, lần sau vào thẳng.

## Cấu trúc

| Đường dẫn | Là gì |
|---|---|
| `config.js` | **Danh sách quán + link /exec** — file duy nhất cần sửa khi thêm quán / đổi link |
| `src/Index.html` | Giao diện app (y hệt file Index.html dán vào Apps Script) |
| `apps-script/Code.gs` | Máy chủ (dán vào Apps Script của từng quán) |
| `web/` | Trang chọn quán, manifest, service worker, icon |
| `tools/build.mjs` | Dựng `_site/` để đưa lên Pages |
| `.github/workflows/pages.yml` | Đẩy lên `main` là tự dựng + đưa lên GitHub Pages |
| `.github/workflows/apps-script.yml` | (Tuỳ chọn) tự dán Code.gs vào Apps Script của các quán |
| `test/e2e.js` | Kiểm thử bản GitHub với máy chủ giả lập |

## Cài lần đầu

1. **Bật Pages:** repo → *Settings* → *Pages* → *Build and deployment* → Source: **GitHub Actions**.
2. **Điền link máy chủ** vào `config.js` (mỗi quán một dòng). Link lấy ở Apps Script → *Deploy* → *Manage deployments* → Web app → URL (dạng `https://script.google.com/macros/s/…/exec`).
3. **Cập nhật Code.gs ở CẢ HAI quán** lên bản `2026.10.24.4` trở lên (bản có API cho GitHub) → *Deploy* → *Manage deployments* → ✏️ → *New version*.
   Kiểm tra mục **Who has access = Anyone** (nhân viên không cần tài khoản Google).
4. Mở `https://<tài-khoản>.github.io/subway-shift/` → chọn quán → **quản lý đăng nhập một lần ở mỗi quán**: máy chủ quán đó tự nhớ link trang GitHub, từ đó link vào nhanh của nhân viên, mã QR điểm danh, link tuyển dụng, email đều trỏ về trang GitHub.
5. Gửi link mới cho nhân viên. Link Apps Script cũ **vẫn dùng được** song song.

> Link thẳng tới một quán: `…/app.html?s=FOR` (hoặc `?s=CTR`). Đổi quán: nút "Đổi quán" ở cuối màn đăng nhập, hoặc `…/index.html?pick=1`.

## Cập nhật bản mới

1. Thay `src/Index.html` và `apps-script/Code.gs` bằng bản mới → **Commit** lên `main`.
2. Trang GitHub tự cập nhật sau khoảng 1 phút (xem tab *Actions*).
3. Code.gs: dán vào Apps Script của từng quán → *New version* — hoặc cài bước tự động bên dưới.
   Trong lúc một quán chưa dán Code.gs mới, app của quán đó hiện băng nhắc ở đầu trang.

## (Tuỳ chọn) Tự cập nhật Code.gs cho các quán

Cài một lần, sau đó mỗi lần commit `apps-script/Code.gs` / `src/Index.html` là cả hai quán tự được dán code + cập nhật bản triển khai (giữ nguyên link /exec).

1. Bật Apps Script API: https://script.google.com/home/usersettings → **On**.
2. Trên máy tính: `npm i -g @google/clasp@2.4.2` → `clasp login` → mở file `~/.clasprc.json`, chép toàn bộ nội dung.
3. Repo → *Settings* → *Secrets and variables* → *Actions* → *New repository secret*:
   - `CLASPRC_JSON` = nội dung `~/.clasprc.json`
   - `SCRIPT_ID_FOR`, `SCRIPT_ID_CTR` = Apps Script → ⚙ *Project settings* → Script ID
   - `DEPLOY_ID_FOR`, `DEPLOY_ID_CTR` = *Deploy* → *Manage deployments* → Deployment ID (bản Web app đang dùng)
4. Tab *Actions* → *Update Apps Script* → *Run workflow* để thử.

## Kiểm thử trên máy

```bash
node tools/build.mjs          # dựng _site/
node test/e2e.js              # cần Playwright (Chromium); máy chủ giả lập ở test/gas-mock.js
```

## Bảo mật

- Repo **không chứa** mật khẩu, token hay dữ liệu nhân viên — chỉ có giao diện và link /exec (link này vốn là link công khai nhân viên đang dùng).
- Mọi quyền vẫn kiểm ở máy chủ như trước (mã nhân viên, mật khẩu quản lý, mã đăng ký…). API chỉ gọi được đúng những hàm mà app Apps Script vốn gọi được.
- Hai quán dùng chung trang nhưng **bộ nhớ máy tách riêng theo quán** (máy đã ghi nhớ, ngôn ngữ…).
