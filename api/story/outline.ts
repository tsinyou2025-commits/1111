import type { VercelRequest, VercelResponse } from '@vercel/node'
import { generateOutline } from '../../shared/storyLogic'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const result = await generateOutline(req.body)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.status(200).json(result)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : '未知错误' })
  }
}
