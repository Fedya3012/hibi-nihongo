// Kiểm tra phần đổi dữ liệu Anki → thẻ của app (chữ HTML, furigana, cloze, ảnh, tiếng).
import { describe, expect, it } from 'vitest'
import { convertCloze, decodeEntities, htmlToText, imagesIn, soundsIn, splitFurigana } from './convert'

describe('Anki convert', () => {
  it('HTML → chữ thường, giữ xuống dòng, bỏ [sound:]', () => {
    expect(htmlToText('<div>食べる</div><div>ăn&nbsp;cơm</div>[sound:a.mp3]')).toBe('食べる\năn cơm')
    expect(htmlToText('a<br>b<br/>c')).toBe('a\nb\nc')
    expect(htmlToText('<script>x()</script>ok')).toBe('ok')
  })

  it('giải mã ký tự HTML', () => {
    expect(decodeEntities('&lt;b&gt; &amp; &#26085; &#x672C;')).toBe('<b> & 日 本')
  })

  it('tìm ảnh và tiếng', () => {
    expect(imagesIn('<img src="a%20b.jpg"><img src=\'c.png\'>')).toEqual(['a b.jpg', 'c.png'])
    expect(soundsIn('[sound:x.mp3] text [sound: y.ogg ]')).toEqual(['x.mp3', 'y.ogg'])
  })

  it('furigana kiểu Anki', () => {
    expect(splitFurigana('日本[にほん]語[ご]')).toEqual({ text: '日本語', reading: 'にほんご' })
    expect(splitFurigana('ひらがな')).toEqual({ text: 'ひらがな' })
  })

  it('cloze', () => {
    expect(convertCloze('{{c1::食べ::động từ}}ます')).toEqual({ plain: '食べます', example: '{{食べ}}ます', answers: ['食べ'] })
  })
})
