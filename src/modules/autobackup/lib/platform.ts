/**
 * APP ĐANG CHẠY Ở ĐÂU, và vì vậy sao lưu tự động được tới mức nào:
 *   - 'desktop':  bản Windows. Ghi file thẳng vào thư mục, hoàn toàn tự động.
 *   - 'folder':   Chrome / Edge trên máy tính. Chọn một thư mục một lần; sau đó ghi tự động
 *                 (trình duyệt có thể hỏi lại quyền sau khi mở lại, khi đó app hiện thanh nhắc).
 *   - 'download': Firefox, Safari, điện thoại. Trình duyệt không cho ghi vào thư mục, nên tới hạn
 *                 thì app hiện thanh nhắc, bấm một cái là tải file sao lưu về.
 */
export type Platform = 'desktop' | 'folder' | 'download'

export const isDesktopApp = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export function platform(): Platform {
  if (isDesktopApp()) return 'desktop'
  if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) return 'folder'
  return 'download'
}
