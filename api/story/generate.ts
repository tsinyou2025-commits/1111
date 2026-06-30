import type { VercelRequest, VercelResponse } from '@vercel/node'

const stylePrompts: Record<string, string> = {
  fantasy: '奇幻冒险风格，充满魔法、神秘生物和壮丽的异世界景观',
  knowledge: '知识科普风格，用生动有趣的方式讲解各种知识，细节丰富，引人入胜',
  history: '历史叙事风格，以细腻的笔触描绘历史场景、人物和事件',
  nature: '自然风景风格，用舒缓的语言描绘大自然的美丽与宁静',
  meditation: '冥想引导风格，温柔舒缓，引导听者放松身心，进入平静的状态',
  arthistory: '艺术史风格，以建筑、空间设计、结构美学为线索，融合艺术史与历史关联性，充满神秘色彩。叙事简洁克制，以名词为核心，遇到重要术语、典故、象征符号时立即解释其来源与含义，或在段落结束后集中解释。大量引入历史人物，并配以简短生动的人物小传（生卒年、身份、性格、轶事、与主题的关联）。注重描述建筑的布局、空间感、材质、光影变化、装饰细节，以及艺术品背后的历史背景、文化象征和神秘传说。语调沉静而富有洞察力，如同一盏幽暗画廊里的解说声。',
}

function buildChapterPrompt(body: any): string {
  const styleDesc = body.customStylePrompt || stylePrompts[body.style] || '叙事风格'
  const wordsPerChapter = Math.floor((body.targetHours * 60 * 200) / Math.max(1, body.totalChapters))

  let prompt = `请用${styleDesc}，创作一个关于"${body.theme}"的长篇故事的第 ${body.chapterIndex + 1} 章${body.chapterTitle ? `——《${body.chapterTitle}》` : ''}。

本章是全书中的第 ${body.chapterIndex + 1} / ${body.totalChapters} 章。

要求：
1. 本章大约 ${wordsPerChapter} 字左右，内容要充实，细节丰富
2. 语言要舒缓、柔和，适合睡前聆听，避免过于激烈或刺激的情节
3. 描写要细腻，注重环境、氛围和感官细节的刻画
4. 叙事节奏要慢，让听者能够沉浸其中
5. 不要在章节结尾留下过于紧张的悬念，保持平和的基调
6. 直接输出故事内容，不要有任何额外的说明或标题`

  if (body.previousSummary) {
    prompt += `\n\n之前章节的概要：${body.previousSummary}`
  }
  if (body.previousEnding) {
    prompt += `\n\n上一章的结尾是：${body.previousEnding}`
  }
  if (body.chapterIndex === 0) {
    prompt += `\n\n这是故事的第一章，请为故事设定一个引人入胜的开端。`
  } else if (body.chapterIndex === body.totalChapters - 1) {
    prompt += `\n\n这是故事的最后一章，请给故事一个平和、圆满的收尾。`
  } else {
    prompt += `\n\n请承接上文，自然地继续故事。`
  }

  return prompt
}

function buildSummaryPrompt(chapterContent: string, theme: string): string {
  return `请用200字以内总结下面这段关于"${theme}"的故事章节的主要内容，以便后续章节参考。直接输出总结，不要有任何额外说明：

${chapterContent.slice(-2000)}`
}

async function generateChapterStream(
  body: any,
  onText: (content: string) => void,
  onSummary: (summary: string) => void,
  onDone: (totalWords: number) => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    if (!body.theme || !body.aiBaseUrl || !body.apiKey || !body.model) {
      onError('缺少必要参数')
      return
    }

    const prompt = buildChapterPrompt(body)
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
        stream: true,
        temperature: 0.8,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      onError(`AI接口错误: ${response.status} ${errorText.slice(0, 200)}`)
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      onError('无法读取响应流')
      return
    }

    const decoder = new TextDecoder()
    let fullContent = ''
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue

        const dataStr = trimmed.slice(5).trim()
        if (dataStr === '[DONE]') continue

        try {
          const data = JSON.parse(dataStr)
          const content = data.choices?.[0]?.delta?.content
          if (content) {
            fullContent += content
            onText(content)
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }

    // 生成章节摘要
    try {
      const summaryPrompt = buildSummaryPrompt(fullContent, body.theme)
      const summaryResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${body.apiKey}`,
        },
        body: JSON.stringify({
          model: body.model,
          messages: [{ role: 'user', content: summaryPrompt }],
          stream: false,
          temperature: 0.5,
        }),
      })

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json()
        const summary = summaryData.choices?.[0]?.message?.content?.trim() || ''
        if (summary) {
          onSummary(summary)
        }
      }
    } catch (e) {
      // 摘要生成失败不影响主流程
    }

    onDone(fullContent.length)
  } catch (error) {
    onError(error instanceof Error ? error.message : '未知错误')
  }
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

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.flushHeaders()

  let ended = false

  const sendSSE = (event: string, data: any) => {
    if (ended) return
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  try {
    await generateChapterStream(
      req.body,
      (content) => {
        sendSSE('text', { content, chapterIndex: req.body.chapterIndex })
      },
      (summary) => {
        sendSSE('summary', { content: summary, chapterIndex: req.body.chapterIndex })
      },
      (totalWords) => {
        sendSSE('done', { chapterIndex: req.body.chapterIndex, totalWords })
        ended = true
        res.end()
      },
      (error) => {
        sendSSE('error', { error })
        ended = true
        res.end()
      }
    )
  } catch (error) {
    if (!ended) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: error instanceof Error ? error.message : '未知错误' })}\n\n`)
      res.end()
    }
  }
}
