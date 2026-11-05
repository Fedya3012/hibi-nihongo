/**
 * TẤT CẢ NỘI DUNG NGỮ PHÁP (gộp các cấp). Thêm cấp mới (N3…): tạo data/n3.ts rồi thêm vào ALL_POINTS.
 * File này nặng (~100 KB chữ) nên chỉ được tải khi cần, qua lib/content.ts.
 */
import type { GrammarPoint } from '../types'
import { N5 } from './n5'
import { N4 } from './n4'

export const ALL_POINTS: GrammarPoint[] = [...N5, ...N4]
