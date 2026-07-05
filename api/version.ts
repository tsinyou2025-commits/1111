import type { VercelRequest, VercelResponse } from '@vercel/node'

// 版本信息来源：package.json + 构建时注入的 Git 信息
// Vercel 会自动注入以下环境变量：VERCEL_GIT_COMMIT_SHA, VERCEL_GIT_COMMIT_MESSAGE, VERCEL_GIT_COMMIT_AUTHOR_NAME
// 本地开发时从 .env 或默认值兜底
export default function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const commitSha = (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7)
  const commitMessage = process.env.VERCEL_GIT_COMMIT_MESSAGE || ''
  const commitAuthor = process.env.VERCEL_GIT_COMMIT_AUTHOR_NAME || ''
  const buildTime = process.env.VERCEL_BUILD_TIME || new Date().toISOString()
  const region = process.env.VERCEL_REGION || 'unknown'

  // 版本号从 package.json 读
  // 编译时通过 Vite 的 import.meta.glob 或常量注入即可，
  // 这里直接写死当前版本号，与 package.json 同步即可
  const version = '2.0.1'
  const apiVersion = '2.0.1'

  return res.status(200).json({
    app: {
      version,
      apiVersion,
      commitSha,
      commitMessage: commitMessage.split('\n')[0],
      commitAuthor,
      buildTime,
      region,
      env: process.env.VERCEL_ENV || 'development',
    },
    server: {
      timestamp: Date.now(),
      iso: new Date().toISOString(),
      timezone: 'UTC',
    },
  })
}
