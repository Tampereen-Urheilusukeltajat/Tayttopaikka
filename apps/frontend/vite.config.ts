import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import svgr from 'vite-plugin-svgr';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',

  plugins: [react(), svgr(), sentryVitePlugin({
    org: "tampereen-urheilusukeltajat-ry",
    project: "tayttopaikka-ui"
  })],

  build: {
    sourcemap: true
  }
});
