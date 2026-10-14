import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';
export default defineConfig({ plugins: [(uni as any).default?.() ?? (uni as any)()], server: { port: 5173, proxy: { '/api': 'http://127.0.0.1:8787' } } });
