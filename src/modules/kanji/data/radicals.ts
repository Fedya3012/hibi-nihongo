/**
 * 214 BỘ THỦ KHANG HY, tên Hán Việt và nghĩa tiếng Việt.
 * Số thứ tự trùng với trường `rad` trong gói KANJIDIC của module Từ điển.
 * [chữ bộ, tên Hán Việt, nghĩa, các dạng biến thể khi đứng trong chữ khác]
 */
export type Radical = [char: string, name: string, meaning: string, variants?: string]

export const RADICALS: Radical[] = [
  ['', '', ''], // để số thứ tự bắt đầu từ 1
  ['一', 'Nhất', 'số một'], ['丨', 'Cổn', 'nét sổ'], ['丶', 'Chủ', 'dấu chấm'], ['丿', 'Phiệt', 'nét phẩy'],
  ['乙', 'Ất', 'can Ất', '乚'], ['亅', 'Quyết', 'nét móc'], ['二', 'Nhị', 'số hai'], ['亠', 'Đầu', 'cái nắp'],
  ['人', 'Nhân', 'người', '亻'], ['儿', 'Nhân', 'chân người'], ['入', 'Nhập', 'vào'], ['八', 'Bát', 'số tám'],
  ['冂', 'Quynh', 'vùng biên'], ['冖', 'Mịch', 'khăn trùm'], ['冫', 'Băng', 'nước đá'], ['几', 'Kỷ', 'ghế dựa'],
  ['凵', 'Khảm', 'há miệng'], ['刀', 'Đao', 'con dao', '刂'], ['力', 'Lực', 'sức mạnh'], ['勹', 'Bao', 'bao bọc'],
  ['匕', 'Chủy', 'cái thìa'], ['匚', 'Phương', 'cái hộp'], ['匸', 'Hệ', 'che giấu'], ['十', 'Thập', 'số mười'],
  ['卜', 'Bốc', 'bói'], ['卩', 'Tiết', 'đốt tre'], ['厂', 'Hán', 'sườn núi'], ['厶', 'Khư', 'riêng tư'],
  ['又', 'Hựu', 'bàn tay, lại'], ['口', 'Khẩu', 'cái miệng'], ['囗', 'Vi', 'vây quanh'], ['土', 'Thổ', 'đất'],
  ['士', 'Sĩ', 'kẻ sĩ'], ['夂', 'Trĩ', 'đến sau'], ['夊', 'Tuy', 'đi chậm'], ['夕', 'Tịch', 'buổi tối'],
  ['大', 'Đại', 'to lớn'], ['女', 'Nữ', 'phụ nữ'], ['子', 'Tử', 'đứa trẻ'], ['宀', 'Miên', 'mái nhà'],
  ['寸', 'Thốn', 'tấc'], ['小', 'Tiểu', 'nhỏ', '⺌'], ['尢', 'Uông', 'yếu đuối'], ['尸', 'Thi', 'thân người nằm'],
  ['屮', 'Triệt', 'mầm cây'], ['山', 'Sơn', 'núi'], ['巛', 'Xuyên', 'dòng sông', '川'], ['工', 'Công', 'người thợ'],
  ['己', 'Kỷ', 'bản thân'], ['巾', 'Cân', 'cái khăn'], ['干', 'Can', 'khô, can'], ['幺', 'Yêu', 'nhỏ bé'],
  ['广', 'Nghiễm', 'mái hiên'], ['廴', 'Dẫn', 'bước dài'], ['廾', 'Củng', 'chắp tay'], ['弋', 'Dặc', 'cọc, bắn'],
  ['弓', 'Cung', 'cây cung'], ['彐', 'Kệ', 'đầu nhím'], ['彡', 'Sam', 'lông dài'], ['彳', 'Xích', 'bước chân'],
  ['心', 'Tâm', 'trái tim', '忄⺗'], ['戈', 'Qua', 'cây giáo'], ['戸', 'Hộ', 'cửa'], ['手', 'Thủ', 'tay', '扌'],
  ['支', 'Chi', 'cành'], ['攴', 'Phộc', 'đánh khẽ', '攵'], ['文', 'Văn', 'văn vẻ'], ['斗', 'Đẩu', 'cái đấu'],
  ['斤', 'Cân', 'cái rìu'], ['方', 'Phương', 'phương hướng'], ['无', 'Vô', 'không có'], ['日', 'Nhật', 'mặt trời'],
  ['曰', 'Viết', 'nói rằng'], ['月', 'Nguyệt', 'mặt trăng'], ['木', 'Mộc', 'cây'], ['欠', 'Khiếm', 'thiếu, há miệng'],
  ['止', 'Chỉ', 'dừng lại'], ['歹', 'Đãi', 'xương tàn'], ['殳', 'Thù', 'binh khí'], ['毋', 'Vô', 'chớ', '母'],
  ['比', 'Tỷ', 'so sánh'], ['毛', 'Mao', 'lông'], ['氏', 'Thị', 'họ'], ['气', 'Khí', 'hơi'],
  ['水', 'Thủy', 'nước', '氵氺'], ['火', 'Hỏa', 'lửa', '灬'], ['爪', 'Trảo', 'móng vuốt', '爫'], ['父', 'Phụ', 'cha'],
  ['爻', 'Hào', 'hào quẻ'], ['爿', 'Tường', 'tấm gỗ'], ['片', 'Phiến', 'mảnh'], ['牙', 'Nha', 'răng nanh'],
  ['牛', 'Ngưu', 'con bò', '牜'], ['犬', 'Khuyển', 'con chó', '犭'], ['玄', 'Huyền', 'màu đen huyền'], ['玉', 'Ngọc', 'ngọc', '王'],
  ['瓜', 'Qua', 'quả dưa'], ['瓦', 'Ngõa', 'ngói'], ['甘', 'Cam', 'ngọt'], ['生', 'Sinh', 'sống'],
  ['用', 'Dụng', 'dùng'], ['田', 'Điền', 'ruộng'], ['疋', 'Thất', 'tấm vải'], ['疒', 'Nạch', 'bệnh tật'],
  ['癶', 'Bát', 'gạt ra'], ['白', 'Bạch', 'màu trắng'], ['皮', 'Bì', 'da'], ['皿', 'Mãnh', 'bát đĩa'],
  ['目', 'Mục', 'con mắt'], ['矛', 'Mâu', 'cây mâu'], ['矢', 'Thỉ', 'mũi tên'], ['石', 'Thạch', 'đá'],
  ['示', 'Thị', 'thần, chỉ bảo', '礻'], ['禸', 'Nhựu', 'vết chân thú'], ['禾', 'Hòa', 'cây lúa'], ['穴', 'Huyệt', 'hang lỗ'],
  ['立', 'Lập', 'đứng'], ['竹', 'Trúc', 'cây tre', '⺮'], ['米', 'Mễ', 'gạo'], ['糸', 'Mịch', 'sợi tơ', '糹'],
  ['缶', 'Phẫu', 'đồ sành'], ['网', 'Võng', 'cái lưới', '罒'], ['羊', 'Dương', 'con dê'], ['羽', 'Vũ', 'lông vũ'],
  ['老', 'Lão', 'già', '耂'], ['而', 'Nhi', 'mà, và'], ['耒', 'Lỗi', 'cái cày'], ['耳', 'Nhĩ', 'cái tai'],
  ['聿', 'Duật', 'cây bút'], ['肉', 'Nhục', 'thịt', '月'], ['臣', 'Thần', 'bề tôi'], ['自', 'Tự', 'tự mình'],
  ['至', 'Chí', 'đến'], ['臼', 'Cữu', 'cái cối'], ['舌', 'Thiệt', 'cái lưỡi'], ['舛', 'Suyễn', 'trái ngược'],
  ['舟', 'Chu', 'con thuyền'], ['艮', 'Cấn', 'dừng lại'], ['色', 'Sắc', 'màu sắc'], ['艸', 'Thảo', 'cỏ', '艹'],
  ['虍', 'Hô', 'vằn hổ'], ['虫', 'Trùng', 'sâu bọ'], ['血', 'Huyết', 'máu'], ['行', 'Hành', 'đi'],
  ['衣', 'Y', 'áo', '衤'], ['襾', 'Á', 'che đậy', '西覀'], ['見', 'Kiến', 'nhìn thấy'], ['角', 'Giác', 'cái sừng'],
  ['言', 'Ngôn', 'lời nói', '訁'], ['谷', 'Cốc', 'thung lũng'], ['豆', 'Đậu', 'hạt đậu'], ['豕', 'Thỉ', 'con heo'],
  ['豸', 'Trãi', 'loài thú'], ['貝', 'Bối', 'vỏ sò, tiền'], ['赤', 'Xích', 'màu đỏ'], ['走', 'Tẩu', 'chạy'],
  ['足', 'Túc', 'bàn chân', '⻊'], ['身', 'Thân', 'thân thể'], ['車', 'Xa', 'chiếc xe'], ['辛', 'Tân', 'cay đắng'],
  ['辰', 'Thần', 'thìn'], ['辵', 'Sước', 'bước đi', '辶⻌'], ['邑', 'Ấp', 'vùng đất', '阝'], ['酉', 'Dậu', 'bình rượu'],
  ['釆', 'Biện', 'phân biệt'], ['里', 'Lý', 'làng, dặm'], ['金', 'Kim', 'kim loại', '釒'], ['長', 'Trường', 'dài'],
  ['門', 'Môn', 'cổng'], ['阜', 'Phụ', 'gò đất', '阝'], ['隶', 'Đãi', 'kịp'], ['隹', 'Chuy', 'chim đuôi ngắn'],
  ['雨', 'Vũ', 'mưa'], ['青', 'Thanh', 'màu xanh'], ['非', 'Phi', 'không phải'], ['面', 'Diện', 'mặt'],
  ['革', 'Cách', 'da thú'], ['韋', 'Vi', 'da thuộc'], ['韭', 'Phỉ', 'rau hẹ'], ['音', 'Âm', 'âm thanh'],
  ['頁', 'Hiệt', 'cái đầu, trang'], ['風', 'Phong', 'gió'], ['飛', 'Phi', 'bay'], ['食', 'Thực', 'ăn', '飠𩙿'],
  ['首', 'Thủ', 'cái đầu'], ['香', 'Hương', 'mùi thơm'], ['馬', 'Mã', 'con ngựa'], ['骨', 'Cốt', 'xương'],
  ['高', 'Cao', 'cao'], ['髟', 'Tiêu', 'tóc dài'], ['鬥', 'Đấu', 'đánh nhau'], ['鬯', 'Sưởng', 'rượu thơm'],
  ['鬲', 'Cách', 'cái vạc'], ['鬼', 'Quỷ', 'ma quỷ'], ['魚', 'Ngư', 'con cá'], ['鳥', 'Điểu', 'con chim'],
  ['鹵', 'Lỗ', 'đất mặn'], ['鹿', 'Lộc', 'con hươu'], ['麦', 'Mạch', 'lúa mạch'], ['麻', 'Ma', 'cây gai'],
  ['黄', 'Hoàng', 'màu vàng'], ['黍', 'Thử', 'lúa nếp'], ['黒', 'Hắc', 'màu đen'], ['黹', 'Chỉ', 'may vá'],
  ['黽', 'Mãnh', 'con ếch'], ['鼎', 'Đỉnh', 'cái đỉnh'], ['鼓', 'Cổ', 'cái trống'], ['鼠', 'Thử', 'con chuột'],
  ['鼻', 'Tị', 'cái mũi'], ['齊', 'Tề', 'ngang bằng'], ['歯', 'Xỉ', 'răng'], ['竜', 'Long', 'con rồng'],
  ['亀', 'Quy', 'con rùa'], ['龠', 'Dược', 'cây sáo'],
]

/** Tìm số bộ thủ từ một chữ (kể cả dạng biến thể như 亻, 氵, 扌). */
const BY_CHAR = new Map<string, number>()
RADICALS.forEach(([c, , , v], i) => {
  if (!i) return
  if (!BY_CHAR.has(c)) BY_CHAR.set(c, i)
  for (const x of v ?? '') if (!BY_CHAR.has(x)) BY_CHAR.set(x, i)
})
export const radicalNumberOf = (ch: string) => BY_CHAR.get(ch)

/** "Bộ Nhân (亻) · người" */
export function radicalLabel(n: number): string {
  const r = RADICALS[n]
  return r ? `Bộ ${r[1]}` : ''
}
