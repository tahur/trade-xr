import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 5173,        // Fixed port for Kite OAuth redirect
		strictPort: true,  // Error if port is already in use (don't auto-increment)
		proxy: {
			'/api': {
				target: process.env.VITE_API_URL || 'http://localhost:8000',
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api/, '')
			},
			'/ws': {
				target: process.env.VITE_WS_URL || 'ws://localhost:8000',
				ws: true
			}
		}
	}
});
