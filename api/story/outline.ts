import type { VercelRequest, VercelResponse } from '@vercel/node'

import { buildOutlinePrompt } from '../../shared/storyLogic'

async function generateOutline(body: any): Promise<any> {
  if (!body.theme || !body.aiBaseUrl || !body.apiKey || !body.model) {
    throw new Error('缺少必要参数')
  }

  const prompt = buildOutlinePrompt(body)

  const baseUrl = body.aiBaseUrl.replace(/\/$/, '')
  const apiUrl = `${baseUrl}/chat/completions`

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${body.apiKey}`,
    },
    body: JSON.stringify({
      model: body.model,
      messages: [
        { role: 'system', content: '你是一位专业的内容创作者，能够极其精准地模仿用户指定的文体、语气和结构进行创作。你绝不输出任何废话、客套话或多余的解释，总是严格遵守用户的格式要求。' },
        { role: 'user', content: prompt }
      ],
      stream: false,
      temperature: 0.8,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`AI接口错误: ${response.status} ${errorText.slice(0, 200)}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content?.trim() || ''

  let outline
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      outline = JSON.parse(jsonMatch[0])
    } else {
      throw new Error('未找到JSON')
    }
  } catch (e) {
    const totalChapters = Math.max(8, Math.ceil(body.targetHours * 6))
    outline = {
      title: body.theme,
      chapters: Array.from({ length: totalChapters }, (_, i) => ({
        index: i,
        title: `第${i + 1}章`,
        summary: ''
      }))
    }
  }

  return outline
}

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
