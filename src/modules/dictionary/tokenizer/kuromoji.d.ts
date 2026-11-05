/** Khai báo kiểu cho các file bên trong thư viện kuromoji (thư viện không kèm sẵn). */
declare module 'kuromoji/src/dict/DynamicDictionaries' {
  export default class DynamicDictionaries {
    loadTrie(base: Int32Array, check: Int32Array): this
    loadTokenInfoDictionaries(tokenInfo: Uint8Array, pos: Uint8Array, targetMap: Uint8Array): this
    loadConnectionCosts(cc: Int16Array): this
    loadUnknownDictionaries(
      unk: Uint8Array, unkPos: Uint8Array, unkMap: Uint8Array,
      catMap: Uint8Array, compatCatMap: Uint32Array, invokeDef: Uint8Array,
    ): this
  }
}

declare module 'kuromoji/src/Tokenizer' {
  import type DynamicDictionaries from 'kuromoji/src/dict/DynamicDictionaries'
  export interface IpadicToken {
    word_id: number
    word_type: 'KNOWN' | 'UNKNOWN'
    word_position: number // vị trí bắt đầu, tính từ 1
    surface_form: string
    pos: string
    pos_detail_1: string
    pos_detail_2: string
    pos_detail_3: string
    conjugated_type: string
    conjugated_form: string
    basic_form: string
    reading?: string
    pronunciation?: string
  }
  export default class Tokenizer {
    constructor(dic: DynamicDictionaries)
    tokenize(text: string): IpadicToken[]
  }
}
