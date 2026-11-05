# Làm nhiều tính năng song song mà không bị conflict

**Conflict là gì?** Hai PR được tạo cùng lúc từ cùng một bản `main`. PR thứ nhất được merge trước,
làm `main` thay đổi. Nếu PR thứ hai sửa **cùng dòng hoặc dòng sát bên** chỗ PR thứ nhất đã sửa,
git không biết giữ bản nào nên dừng lại và báo "conflict".

**Lần conflict đầu tiên (PR #2 Giáo trình, sau khi PR #1 Ngữ pháp được merge):** cả hai PR cùng sửa
hai dòng nằm sát nhau trong `src/modules/registry.ts` (dòng Ngữ pháp và dòng Giáo trình) và hai hàng
sát nhau trong bảng của `docs/MODULES.md`. Code thật của hai module không hề đụng nhau.

## Đã sửa gì để không lặp lại

| Chỗ hay bị đụng | Trước | Bây giờ |
| --- | --- | --- |
| Danh sách module (`registry.ts`) | Mọi module chung một danh sách | Mỗi module có file `src/modules/<id>/module.ts` riêng, `registry.ts` tự gom |
| Tên tiếng Anh/Nhật của module (`core/i18n/modules.ts`) | Một bảng chung | Nằm trong `module.ts` của từng module (`text.en`, `text.ja`) |
| Nguồn tìm kiếm Ctrl+K (`search/api.ts`) | Thêm một dòng vào danh sách chung | Tạo `src/modules/<id>/search.ts`, tự được tìm thấy |
| Bảng trạng thái trong `docs/MODULES.md` | PR nào cũng sửa | PR tính năng **không sửa** bảng; trạng thái thật là `status` trong `module.ts` |
| PR cũ bị lạc hậu so với `main` | Chỉ biết khi bấm merge | Workflow **Keep PRs updated** tự cập nhật mọi PR mỗi khi `main` đổi, và để lại bình luận nếu có conflict |
| Ký tự xuống dòng Windows/Mac khác nhau | Có thể làm cả file "khác" | `.gitattributes` thống nhất một kiểu |

## Quy tắc cho mỗi thread làm tính năng

1. **Bắt đầu từ `main` mới nhất**: `git fetch origin main` rồi tạo nhánh từ `origin/main`.
2. **Chỉ sửa trong thư mục của module mình** (`src/modules/<id>/`). Đăng ký module bằng `module.ts`,
   tìm kiếm bằng `search.ts`. Không sửa `registry.ts`, `search/api.ts`, `core/i18n/modules.ts`.
3. Nếu **bắt buộc** phải sửa file dùng chung (ví dụ thêm bảng dữ liệu trong `src/core/db/schema.ts`,
   thêm một hàm vào API của module khác): sửa ít dòng nhất có thể, thêm vào **cuối** danh sách, ghi rõ trong mô tả PR.
4. **Không sửa bảng trạng thái trong `docs/MODULES.md`**. Hướng dẫn dùng module viết trong
   `src/modules/<id>/README.md`. (Bảng được cập nhật gộp sau, bằng một PR nhỏ riêng.)
5. **Không sửa `package-lock.json` bằng tay.** Nếu nó bị conflict: lấy bản của `main`, chạy lại
   `npm install`, commit file mới.
6. **Trước khi báo xong và trước mỗi lần push**: `git fetch origin main && git merge origin/main`
   (hoặc rebase), chạy `npm run build` không lỗi, rồi mới push.
7. Nếu workflow **Keep PRs updated** bình luận "có conflict" trên PR: thread của PR đó tự gộp `main`
   vào nhánh, sửa conflict, build lại, push.

## Trường hợp conflict vẫn có thể xảy ra (và là đúng)

- Hai PR **cùng thêm bảng dữ liệu** vào `src/core/db/schema.ts`. Thứ tự các bước nâng cấp ở đó
  quyết định dữ liệu trên máy người dùng, nên git dừng lại để người làm PR sau đặt bước của mình
  **sau** bước của PR trước. Không được đổi thứ tự bước đã có trên `main`.
- Hai PR sửa cùng một tính năng. Khi đó nên làm lần lượt, không làm song song.
