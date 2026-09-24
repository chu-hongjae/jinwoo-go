import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages처럼 사이트가 도메인 하위 경로(/{repo}/)에 호스팅될 때를 대비해 상대 경로 사용
  base: './',
})