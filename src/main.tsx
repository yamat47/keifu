import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// 参照が無くても消さない。トークンの CSS 変数を文書に載せているのはこの1行で、
// 消すと画面上の var() が全て解決しなくなる。
import './design-system/tokens'
import { App } from './pages/App'

const container = document.getElementById('root')
if (!container) throw new Error('#root が見つからない')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
