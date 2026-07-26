// 値の定義をトークンの参照に必ず随伴させる。別々に読み込む形にすると、
// エントリが増えるたびに var() が解決しない画面が生まれる。書体も同じ理由でここに置く。
// index.html の <link> や Vite のプラグインに置くと Storybook に効かない
// → docs/adr/0008-self-hosted-sliced-web-fonts.md
import './fonts.css'
import './tokens.css'

export { tokens } from './tokens'
