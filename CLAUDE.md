# Hướng dẫn cho Claude khi làm việc trong repo này

- Người dùng không lập trình. Giải thích bằng tiếng Việt, đơn giản.
- Quy ước làm module: `docs/MODULES.md`.
- **Tránh conflict giữa các PR làm song song: đọc và làm theo `docs/LAM-VIEC-SONG-SONG.md`.** Tóm tắt:
  - Tạo nhánh từ `origin/main` mới nhất.
  - Chỉ sửa trong `src/modules/<id>/`. Đăng ký module bằng `src/modules/<id>/module.ts`, nguồn tìm kiếm
    bằng `src/modules/<id>/search.ts`. Không sửa `src/modules/registry.ts`, `src/modules/search/api.ts`,
    `src/core/i18n/modules.ts`, và không sửa bảng trạng thái trong `docs/MODULES.md`.
  - Trước khi push / báo xong: gộp `origin/main` mới nhất vào nhánh, chạy `npm run build`.
  - Bình luận "có conflict" từ workflow Keep PRs updated nghĩa là cần gộp `main` và sửa ngay.
