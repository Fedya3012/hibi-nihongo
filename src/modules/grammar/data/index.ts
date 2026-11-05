/**
 * TẤT CẢ NỘI DUNG NGỮ PHÁP (gộp các cấp). Mỗi cấp một file (n5.ts … n1.ts).
 * File này nặng (~300 KB chữ) nên chỉ được tải khi cần, qua lib/content.ts.
 */
import type { GrammarPoint } from '../types'
import { N5 } from './n5'
import { N4 } from './n4'
import { N3 } from './n3'
import { N2 } from './n2'
import { N1 } from './n1'

export const ALL_POINTS: GrammarPoint[] = [...N5, ...N4, ...N3, ...N2, ...N1]
