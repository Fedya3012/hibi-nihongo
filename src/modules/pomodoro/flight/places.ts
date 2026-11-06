/**
 * DỮ LIỆU CHUYẾN BAY TẬP TRUNG: sân bay, vùng của Nhật Bản, chế độ học (chỗ ngồi).
 *
 * Luật bay: chỉ bay TRONG Nhật Bản, hoặc TỪ nước khác TỚI Nhật Bản (không bay từ Nhật ra nước ngoài).
 * Tọa độ sân bay lấy gần đúng (độ thập phân), đủ để vẽ bản đồ và tính quãng đường.
 */

export type RegionId =
  | 'hokkaido' | 'tohoku' | 'kanto' | 'chubu' | 'kansai' | 'chugoku' | 'shikoku' | 'kyushu' | 'okinawa'

/** Kiểu phong cảnh nhìn qua cửa sổ máy bay (vẽ ở scenes.tsx). */
export type SceneId = RegionId | 'ocean'

export interface Airport {
  code: string
  /** Tên thành phố (tiếng Việt / Anh). */
  city: string
  cityEn: string
  /** Tên tiếng Nhật (chỉ sân bay Nhật). */
  ja?: string
  kana?: string
  lat: number
  lon: number
  /** Có = sân bay ở Nhật (thuộc vùng này). Không có = sân bay nước ngoài. */
  region?: RegionId
  country?: string
}

const jp = (code: string, city: string, cityEn: string, ja: string, kana: string, lat: number, lon: number, region: RegionId): Airport =>
  ({ code, city, cityEn, ja, kana, lat, lon, region })
const intl = (code: string, city: string, cityEn: string, country: string, lat: number, lon: number): Airport =>
  ({ code, city, cityEn, country, lat, lon })

export const AIRPORTS: Airport[] = [
  // Hokkaido
  jp('CTS', 'Sapporo', 'Sapporo', '札幌', 'さっぽろ', 42.78, 141.69, 'hokkaido'),
  jp('HKD', 'Hakodate', 'Hakodate', '函館', 'はこだて', 41.77, 140.82, 'hokkaido'),
  jp('AKJ', 'Asahikawa', 'Asahikawa', '旭川', 'あさひかわ', 43.67, 142.45, 'hokkaido'),
  jp('KUH', 'Kushiro', 'Kushiro', '釧路', 'くしろ', 43.04, 144.19, 'hokkaido'),
  // Tohoku
  jp('AOJ', 'Aomori', 'Aomori', '青森', 'あおもり', 40.73, 140.69, 'tohoku'),
  jp('AXT', 'Akita', 'Akita', '秋田', 'あきた', 39.62, 140.22, 'tohoku'),
  jp('SDJ', 'Sendai', 'Sendai', '仙台', 'せんだい', 38.14, 140.92, 'tohoku'),
  // Kanto
  jp('HND', 'Tokyo (Haneda)', 'Tokyo Haneda', '東京', 'とうきょう', 35.55, 139.78, 'kanto'),
  jp('NRT', 'Tokyo (Narita)', 'Tokyo Narita', '成田', 'なりた', 35.77, 140.39, 'kanto'),
  // Chubu
  jp('KIJ', 'Niigata', 'Niigata', '新潟', 'にいがた', 37.96, 139.12, 'chubu'),
  jp('KMQ', 'Kanazawa (Komatsu)', 'Kanazawa', '金沢', 'かなざわ', 36.39, 136.41, 'chubu'),
  jp('FSZ', 'Shizuoka (núi Phú Sĩ)', 'Shizuoka', '静岡', 'しずおか', 34.80, 138.19, 'chubu'),
  jp('NGO', 'Nagoya', 'Nagoya', '名古屋', 'なごや', 34.86, 136.81, 'chubu'),
  // Kansai
  jp('KIX', 'Osaka (Kansai)', 'Osaka Kansai', '大阪', 'おおさか', 34.43, 135.24, 'kansai'),
  jp('ITM', 'Osaka (Itami)', 'Osaka Itami', '伊丹', 'いたみ', 34.79, 135.44, 'kansai'),
  jp('UKB', 'Kobe', 'Kobe', '神戸', 'こうべ', 34.63, 135.22, 'kansai'),
  // Chugoku
  jp('OKJ', 'Okayama', 'Okayama', '岡山', 'おかやま', 34.76, 133.86, 'chugoku'),
  jp('HIJ', 'Hiroshima', 'Hiroshima', '広島', 'ひろしま', 34.44, 132.92, 'chugoku'),
  jp('IZO', 'Izumo', 'Izumo', '出雲', 'いずも', 35.41, 132.89, 'chugoku'),
  // Shikoku
  jp('TAK', 'Takamatsu', 'Takamatsu', '高松', 'たかまつ', 34.21, 134.02, 'shikoku'),
  jp('MYJ', 'Matsuyama', 'Matsuyama', '松山', 'まつやま', 33.83, 132.70, 'shikoku'),
  jp('KCZ', 'Kochi', 'Kochi', '高知', 'こうち', 33.55, 133.67, 'shikoku'),
  // Kyushu
  jp('FUK', 'Fukuoka', 'Fukuoka', '福岡', 'ふくおか', 33.59, 130.45, 'kyushu'),
  jp('NGS', 'Nagasaki', 'Nagasaki', '長崎', 'ながさき', 32.92, 129.91, 'kyushu'),
  jp('KMJ', 'Kumamoto', 'Kumamoto', '熊本', 'くまもと', 32.84, 130.86, 'kyushu'),
  jp('OIT', 'Oita (Beppu)', 'Oita', '大分', 'おおいた', 33.48, 131.74, 'kyushu'),
  jp('KOJ', 'Kagoshima', 'Kagoshima', '鹿児島', 'かごしま', 31.80, 130.72, 'kyushu'),
  // Okinawa
  jp('OKA', 'Naha (Okinawa)', 'Naha', '那覇', 'なは', 26.21, 127.65, 'okinawa'),
  jp('MMY', 'Miyako', 'Miyako', '宮古', 'みやこ', 24.78, 125.30, 'okinawa'),
  jp('ISG', 'Ishigaki', 'Ishigaki', '石垣', 'いしがき', 24.40, 124.25, 'okinawa'),

  // Nước ngoài (chỉ bay TỚI Nhật)
  intl('HAN', 'Hà Nội', 'Hanoi', 'Việt Nam', 21.22, 105.81),
  intl('DAD', 'Đà Nẵng', 'Da Nang', 'Việt Nam', 16.04, 108.20),
  intl('SGN', 'TP. Hồ Chí Minh', 'Ho Chi Minh City', 'Việt Nam', 10.82, 106.66),
  intl('ICN', 'Seoul', 'Seoul', 'Hàn Quốc', 37.46, 126.44),
  intl('PUS', 'Busan', 'Busan', 'Hàn Quốc', 35.18, 128.94),
  intl('TPE', 'Đài Bắc', 'Taipei', 'Đài Loan', 25.08, 121.23),
  intl('PVG', 'Thượng Hải', 'Shanghai', 'Trung Quốc', 31.14, 121.81),
  intl('PEK', 'Bắc Kinh', 'Beijing', 'Trung Quốc', 40.08, 116.58),
  intl('HKG', 'Hồng Kông', 'Hong Kong', 'Trung Quốc', 22.31, 113.91),
  intl('MNL', 'Manila', 'Manila', 'Philippines', 14.51, 121.02),
  intl('BKK', 'Bangkok', 'Bangkok', 'Thái Lan', 13.69, 100.75),
  intl('SIN', 'Singapore', 'Singapore', 'Singapore', 1.36, 103.99),
  intl('KUL', 'Kuala Lumpur', 'Kuala Lumpur', 'Malaysia', 2.74, 101.71),
  intl('SYD', 'Sydney', 'Sydney', 'Úc', -33.95, 151.18),
  intl('HNL', 'Honolulu', 'Honolulu', 'Mỹ', 21.32, -157.92),
  intl('LAX', 'Los Angeles', 'Los Angeles', 'Mỹ', 33.94, -118.41),
  intl('JFK', 'New York', 'New York', 'Mỹ', 40.64, -73.78),
  intl('LHR', 'London', 'London', 'Anh', 51.47, -0.45),
  intl('CDG', 'Paris', 'Paris', 'Pháp', 49.01, 2.55),
  intl('FRA', 'Frankfurt', 'Frankfurt', 'Đức', 50.04, 8.56),
  intl('DXB', 'Dubai', 'Dubai', 'UAE', 25.25, 55.36),
]

const byCode = new Map(AIRPORTS.map((a) => [a.code, a]))
export const airport = (code: string): Airport => byCode.get(code) ?? byCode.get('HND')!
export const JAPAN = AIRPORTS.filter((a) => a.region)
export const ABROAD = AIRPORTS.filter((a) => !a.region)

/** Điểm đến được phép từ `from`: luôn là sân bay Nhật khác. */
export const destinationsFrom = (from: string) => JAPAN.filter((a) => a.code !== from)

// ---------- Vùng của Nhật Bản ----------

export interface Word { w: string; r: string; vi: string }

export interface Region {
  id: RegionId
  name: string
  ja: string
  kana: string
  /** Một câu giới thiệu ngắn, hiện khi máy bay bay qua. */
  intro: string
  /** Những thứ nổi tiếng (hiện thành thẻ nhỏ). */
  sights: string[]
  /** Từ vựng gắn với vùng này, học trong lúc bay. */
  words: Word[]
}

export const REGIONS: Record<RegionId, Region> = {
  hokkaido: {
    id: 'hokkaido', name: 'Hokkaido', ja: '北海道', kana: 'ほっかいどう',
    intro: 'Hòn đảo cực bắc: mùa đông tuyết trắng xóa, mùa hè có đồng hoa oải hương. Nổi tiếng với lễ hội tuyết Sapporo và mì ramen bơ ngô.',
    sights: ['Lễ hội tuyết Sapporo', 'Đồng hoa Furano', 'Cảng đêm Hakodate', 'Hồ Shikotsu'],
    words: [
      { w: '雪', r: 'ゆき', vi: 'tuyết' },
      { w: '寒い', r: 'さむい', vi: 'lạnh' },
      { w: '牛乳', r: 'ぎゅうにゅう', vi: 'sữa bò' },
      { w: '夜景', r: 'やけい', vi: 'cảnh đêm' },
    ],
  },
  tohoku: {
    id: 'tohoku', name: 'Tohoku', ja: '東北', kana: 'とうほく',
    intro: 'Vùng núi non và ruộng lúa phía đông bắc, có những lễ hội mùa hè rực rỡ như Nebuta ở Aomori và rất nhiều suối nước nóng.',
    sights: ['Lễ hội Nebuta', 'Vịnh Matsushima', 'Lá đỏ Hakkoda', 'Táo Aomori'],
    words: [
      { w: '祭り', r: 'まつり', vi: 'lễ hội' },
      { w: '田んぼ', r: 'たんぼ', vi: 'ruộng lúa' },
      { w: 'りんご', r: 'りんご', vi: 'táo' },
      { w: '紅葉', r: 'こうよう', vi: 'lá đỏ mùa thu' },
    ],
  },
  kanto: {
    id: 'kanto', name: 'Kanto', ja: '関東', kana: 'かんとう',
    intro: 'Đồng bằng lớn nhất Nhật Bản với thủ đô Tokyo: nhà chọc trời, tháp Skytree, tàu điện chạy khắp nơi, và ngày trời trong thấy cả núi Phú Sĩ.',
    sights: ['Tháp Tokyo Skytree', 'Chùa Sensoji (Asakusa)', 'Ngã tư Shibuya', 'Chùa Đại Phật Kamakura'],
    words: [
      { w: '東京', r: 'とうきょう', vi: 'Tokyo' },
      { w: '電車', r: 'でんしゃ', vi: 'tàu điện' },
      { w: '駅', r: 'えき', vi: 'nhà ga' },
      { w: '都会', r: 'とかい', vi: 'thành phố lớn' },
    ],
  },
  chubu: {
    id: 'chubu', name: 'Chubu', ja: '中部', kana: 'ちゅうぶ',
    intro: 'Miền trung với dãy Alps Nhật Bản và núi Phú Sĩ cao 3.776 m, ngọn núi biểu tượng của cả nước, soi bóng xuống năm hồ dưới chân.',
    sights: ['Núi Phú Sĩ', 'Làng cổ Shirakawa-go', 'Vườn Kenrokuen (Kanazawa)', 'Đồi chè Shizuoka'],
    words: [
      { w: '富士山', r: 'ふじさん', vi: 'núi Phú Sĩ' },
      { w: '山', r: 'やま', vi: 'núi' },
      { w: '湖', r: 'みずうみ', vi: 'hồ' },
      { w: 'お茶', r: 'おちゃ', vi: 'trà' },
    ],
  },
  kansai: {
    id: 'kansai', name: 'Kansai', ja: '関西', kana: 'かんさい',
    intro: 'Cái nôi văn hóa cổ: Kyoto có hơn 1.600 ngôi chùa, Nara có hươu đi dạo, còn Osaka là "căn bếp của Nhật Bản".',
    sights: ['Đền Fushimi Inari', 'Chùa Vàng Kinkakuji', 'Công viên hươu Nara', 'Lâu đài Osaka'],
    words: [
      { w: '寺', r: 'てら', vi: 'chùa' },
      { w: '神社', r: 'じんじゃ', vi: 'đền thần đạo' },
      { w: '桜', r: 'さくら', vi: 'hoa anh đào' },
      { w: '鹿', r: 'しか', vi: 'con hươu' },
    ],
  },
  chugoku: {
    id: 'chugoku', name: 'Chugoku', ja: '中国', kana: 'ちゅうごく',
    intro: 'Vùng phía tây đảo Honshu: cổng torii nổi giữa biển ở Miyajima, đài tưởng niệm hòa bình Hiroshima và đồi cát Tottori.',
    sights: ['Cổng torii Itsukushima', 'Công viên Hòa bình Hiroshima', 'Đồi cát Tottori', 'Đền Izumo Taisha'],
    words: [
      { w: '鳥居', r: 'とりい', vi: 'cổng đền torii' },
      { w: '島', r: 'しま', vi: 'đảo' },
      { w: '平和', r: 'へいわ', vi: 'hòa bình' },
      { w: '砂', r: 'すな', vi: 'cát' },
    ],
  },
  shikoku: {
    id: 'shikoku', name: 'Shikoku', ja: '四国', kana: 'しこく',
    intro: 'Hòn đảo nhỏ nhất trong bốn đảo chính, nổi tiếng với hành trình hành hương 88 ngôi chùa, mì udon Sanuki và những cây cầu dài vượt biển.',
    sights: ['Hành hương 88 chùa', 'Mì udon Sanuki', 'Suối nước nóng Dogo', 'Thung lũng Iya'],
    words: [
      { w: '橋', r: 'はし', vi: 'cây cầu' },
      { w: 'うどん', r: 'うどん', vi: 'mì udon' },
      { w: '川', r: 'かわ', vi: 'sông' },
      { w: '旅', r: 'たび', vi: 'chuyến đi' },
    ],
  },
  kyushu: {
    id: 'kyushu', name: 'Kyushu', ja: '九州', kana: 'きゅうしゅう',
    intro: 'Đảo phía nam của núi lửa và suối nước nóng: núi lửa Sakurajima vẫn đang phun khói, Beppu có hàng nghìn suối khoáng nóng.',
    sights: ['Núi lửa Sakurajima', 'Suối nóng Beppu', 'Núi lửa Aso', 'Mì ramen Hakata'],
    words: [
      { w: '火山', r: 'かざん', vi: 'núi lửa' },
      { w: '温泉', r: 'おんせん', vi: 'suối nước nóng' },
      { w: '煙', r: 'けむり', vi: 'khói' },
      { w: '熱い', r: 'あつい', vi: 'nóng (vật)' },
    ],
  },
  okinawa: {
    id: 'okinawa', name: 'Okinawa', ja: '沖縄', kana: 'おきなわ',
    intro: 'Quần đảo nhiệt đới phía nam: biển xanh ngọc, rạn san hô, bãi cát trắng và nền văn hóa Ryukyu riêng biệt.',
    sights: ['Lâu đài Shuri', 'Thủy cung Churaumi', 'Bãi biển Miyako', 'Rạn san hô Ishigaki'],
    words: [
      { w: '海', r: 'うみ', vi: 'biển' },
      { w: '砂浜', r: 'すなはま', vi: 'bãi cát' },
      { w: '太陽', r: 'たいよう', vi: 'mặt trời' },
      { w: '暑い', r: 'あつい', vi: 'nóng (thời tiết)' },
    ],
  },
}

export const REGION_ORDER: RegionId[] = ['hokkaido', 'tohoku', 'kanto', 'chubu', 'kansai', 'chugoku', 'shikoku', 'kyushu', 'okinawa']

/** Đang bay qua biển (chưa tới gần Nhật): từ vựng về bầu trời. */
export const SKY_WORDS: Word[] = [
  { w: '空', r: 'そら', vi: 'bầu trời' },
  { w: '雲', r: 'くも', vi: 'mây' },
  { w: '飛行機', r: 'ひこうき', vi: 'máy bay' },
  { w: '窓', r: 'まど', vi: 'cửa sổ' },
]

// ---------- Chỗ ngồi = chế độ học ----------

export type ModeId = 'vocab' | 'kanji' | 'grammar' | 'reading' | 'listening' | 'writing' | 'other'

export const MODES: { id: ModeId; icon: string; label: string; to?: string }[] = [
  { id: 'vocab', icon: '語', label: 'Từ vựng', to: '/review' },
  { id: 'kanji', icon: '字', label: 'Kanji', to: '/learn/kanji' },
  { id: 'grammar', icon: '文', label: 'Ngữ pháp', to: '/learn/grammar' },
  { id: 'reading', icon: '読', label: 'Đọc', to: '/immersion' },
  { id: 'listening', icon: '聴', label: 'Nghe', to: '/immersion/anime' },
  { id: 'writing', icon: '書', label: 'Viết', to: '/learn/kana' },
  { id: 'other', icon: '他', label: 'Việc khác' },
]
export const mode = (id: string) => MODES.find((m) => m.id === id) ?? MODES[MODES.length - 1]
