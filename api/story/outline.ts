import type { VercelRequest, VercelResponse } from '@vercel/node'

const stylePrompts: Record<string, string> = {
  fantasy: '奇幻冒险风格，充满魔法、神秘生物和壮丽的异世界景观',
  knowledge: '知识科普风格，用生动有趣的方式讲解各种知识，细节丰富，引人入胜',
  history: '历史叙事风格，以细腻的笔触描绘历史场景、人物和事件',
  nature: '自然风景风格，用舒缓的语言描绘大自然的美丽与宁静',
  meditation: '冥想引导风格，温柔舒缓，引导听者放松身心，进入平静的状态',
  arthistory: '艺术史风格，以建筑、空间设计、结构美学为线索，融合艺术史与历史关联性，充满神秘色彩。叙事简洁克制，以名词为核心，遇到重要术语、典故、象征符号时立即解释其来源与含义，或在段落结束后集中解释。大量引入历史人物，并配以简短生动的人物小传（生卒年、身份、性格、轶事、与主题的关联）。注重描述建筑的布局、空间感、材质、光影变化、装饰细节，以及艺术品背后的历史背景、文化象征和神秘传说。语调沉静而富有洞察力，如同一盏幽暗画廊里的解说声。',
}

async function generateOutline(body: any): Promise<any> {
  if (!body.theme || !body.aiBaseUrl || !body.apiKey || !body.model) {
    throw new Error('缺少必要参数')
  }

  const styleDesc = body.customStylePrompt || stylePrompts[body.style] || '叙事风格'
  const totalChapters = Math.max(8, Math.ceil(body.targetHours * 6))

  const prompt = `请为一个关于"${body.theme}"的长篇故事设计完整的章节目录。

风格要求：${styleDesc}

整体时长：${body.targetHours}小时，共 ${totalChapters} 章

请设计 ${totalChapters} 个章节，每章约 ${Math.floor((body.targetHours * 60) / totalChapters)} 分钟朗读量。

要求：
1. 每章有一个简短有力的标题
2. 每章有1-2句话的内容简介，说明本章主要讲什么
3. 整体结构要有起承转合，层层递进
4. 章节之间要有逻辑关联，形成完整的叙事弧光
5. 适合睡前聆听，节奏舒缓，避免过于刺激的内容

请直接返回JSON格式，不要有任何额外说明，格式如下：
{
  "title": "整体标题",
  "chapters": [
    { "index": 0, "title": "第一章标题", "summary": "本章内容简介" },
    { "index": 1, "title": "第二章标题", "summary": "本章内容简介" }
  ]
}`

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
        { role: 'system', content: '你是一位擅长创作舒缓睡前故事的作家，你的文字细腻优美，节奏舒缓，能够帮助听众放松身心，进入梦乡。' },
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
