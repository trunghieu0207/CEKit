import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { buildPreviewFontCss } from '../shared/css'
import { App } from './App'
import './styles.css'

// Load the bundled webfonts into the popup itself so previews are real.
const faces = document.createElement('style')
faces.textContent = buildPreviewFontCss()
document.head.appendChild(faces)

const root = document.getElementById('root')
if (!root) throw new Error('#root missing')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
