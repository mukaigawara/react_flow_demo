import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages は https://<user>.github.io/<repo>/ で公開されるため、
// アセットパスをリポジトリ名に合わせる。
export default defineConfig({
  plugins: [react()],
  base: '/react_flow_demo/',
})
