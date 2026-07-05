import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { execSync } from 'child_process'

import { VitePWA } from 'vite-plugin-pwa';

// 读取当前 git commit 信息（短 hash + 提交信息第一行）
function getGitInfo() {
  try {
    const sha = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    const msg = execSync('git log -1 --pretty=%s', { encoding: 'utf-8' }).trim();
    return { sha, msg };
  } catch {
    return { sha: 'unknown', msg: '' };
  }
}

const gitInfo = getGitInfo();

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_COMMIT_SHA__: JSON.stringify(gitInfo.sha),
    __APP_COMMIT_MSG__: JSON.stringify(gitInfo.msg),
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),

    tsconfigPaths(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: '长夜故事',
        short_name: '长夜故事',
        description: 'AI驱动的助眠故事生成器，让故事陪你入眠',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      }
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      }
    }
  }
})
