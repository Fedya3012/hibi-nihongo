# Ngôn ngữ giao diện (`src/core/i18n`)

App có 3 ngôn ngữ giao diện: **Tiếng Việt** (mặc định), **English**, **日本語**. Đổi trong **Cài đặt → Ngôn ngữ giao diện**.
Lựa chọn lưu trong cài đặt (`useSettings((s) => s.lang)`), có trong file sao lưu.

## Dự phòng khi chưa dịch

| Đang chọn | Thiếu câu nào thì thử lần lượt |
| --- | --- |
| Tiếng Việt | (luôn đủ) |
| English | English → Tiếng Việt |
| 日本語 | 日本語 → English → Tiếng Việt |

Tiếng Việt là ngôn ngữ gốc: TypeScript báo lỗi nếu bảng chữ thiếu một câu tiếng Việt, nên app không bao giờ hiện khóa trống.
Màn hình chưa chuyển sang hệ thống này vẫn hiện tiếng Việt như trước. Trang Cài đặt ghi rõ điều đó và hiện % đã dịch của phần chung.

## Dịch một màn hình

Mỗi module giữ bảng chữ của mình (ví dụ `src/modules/<module>/strings.ts`), không cần sửa file chung:

```tsx
import { defineStrings, useT } from '@/core/i18n'

export const S = defineStrings({
  vi: { title: 'Ôn tập', due: 'Còn {n} thẻ đến hạn' },
  en: { title: 'Review', due: '{n} cards due' },
  ja: { title: '復習' }, // thiếu "due" → dùng tiếng Anh
})

function Page() {
  const t = useT(S)
  return <h1>{t('title')} · {t('due', { n: 5 })}</h1>
}
```

- Ngoài React: `translate(S, currentLang(), 'title')`.
- Tên và mô tả module trên thanh điều hướng: `useModuleText()` trong `modules.ts` (tiếng Việt lấy từ `registry.ts`).
- Chữ tiếng Nhật học (từ vựng, câu ví dụ) **không** dịch: chỉ dịch chữ của giao diện.
- Thẻ `<html lang>` tự đổi theo ngôn ngữ (giúp trình đọc màn hình đọc đúng).

## Đã dịch

Khung app (thanh bên, thanh dưới), trang Học, Immersion, trang tạm, Cài đặt, ô tìm kiếm.
Các module khác chuyển dần trong thread của từng module.
