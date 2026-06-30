import type { VercelRequest, VercelResponse } from '@vercel/node'

async function getModels(baseUrl: string, apiKey: string): Promise<any> {
  if (!baseUrl || !apiKey) {
    throw new Error('缺少必要参数')
  }

  const cleanBaseUrl = baseUrl.replace(/\/$/, '')
  const response = await fetch(`${cleanBaseUrl}/models`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  })

  if (!response.ok) {
    throw new Error('获取模型列表失败')
  }

  return await response.json()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.status(200).end()
    return
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const baseUrl = req.query.baseUrl as string
    const apiKey = req.query.apiKey as string
    const result = await getModels(baseUrl, apiKey)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.status(200).json(result)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : '未知错误' })
  }
}
