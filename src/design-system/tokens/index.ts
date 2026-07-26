// 値の定義をトークンの参照に必ず随伴させる。別々に読み込む形にすると、
// エントリが増えるたびに var() が解決しない画面が生まれる。
// Web フォントを読み込むことにしたら、その CSS もここに並べる
// → docs/adr/0009-browser-default-fonts.md
import './tokens.css'

export { tokens } from './tokens'
