# Mã nguồn để phát triển app SUBWAY シフト

Thư mục `src/` và `apps-script/` là bản CHẠY THẬT (GitHub Pages + Apps Script tự cập nhật khi đẩy lên `main`).
Thư mục `dev/` là mã nguồn gốc để sửa — bất kỳ phiên Claude nào mở kho này cũng làm tiếp được ngay.

| File | Là gì |
|---|---|
| `dev/nguon/Index.nguon.html` | Giao diện (chưa nén). Sửa ở đây, KHÔNG sửa thẳng `src/Index.html`. |
| `dev/nguon/*.part.gs` | Các phần máy chủ đã gộp vào `apps-script/Code.gs` (để tham khảo). |
| `apps-script/Code.gs` | Máy chủ Apps Script — sửa thẳng file này. |
| `dev/tools/minify.js` | Nén giao diện: `node dev/tools/minify.js dev/nguon/Index.nguon.html src/Index.html` (cần `npm i esbuild`). |
| `dev/tests/*.js` | Bài kiểm tra (Playwright + máy chủ giả `gas-mock.js`). |
| `test/ui-audit.js` | Bộ kiểm tỉ lệ giao diện (tự chạy trên GitHub khi `src/Index.html` đổi). |
| `dev/YEU-CAU-APP.md` | Nhật ký các bản + yêu cầu của anh Lâm. |

## Quy trình mỗi lần sửa
1. Sửa `dev/nguon/Index.nguon.html` (và/hoặc `apps-script/Code.gs`), tăng `APP_VERSION` (định dạng `YYYY.MM.DD.n`); đổi máy chủ thì tăng cả `APP_VERSION` trong Code.gs và `SRV_NEED` trong giao diện.
2. `node dev/tools/minify.js dev/nguon/Index.nguon.html src/Index.html`
3. Chạy kiểm tra, ví dụ: `node dev/tests/v54ui.js src/Index.html apps-script/Code.gs` (mọi bài nhận 2 tham số: đường dẫn Index.html, Code.gs).
4. `node test/ui-audit.js` → 0 lỗi.
5. Ghi một mục mới ở đầu `dev/YEU-CAU-APP.md`, commit, đẩy lên `main`.

Trả lời anh Lâm bằng tiếng Việt; giao diện 3 ngôn ngữ vi / en / ja (thêm khoá i18n ở cả ba).
