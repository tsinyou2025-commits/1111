import type { VercelRequest, VercelResponse } from '@vercel/node'

const stylePrompts: Record<string, string> = {
  fantasy: '奇幻冒险风格的睡前故事。充满魔法、神秘生物和壮丽的异世界景观。语言舒缓、柔和，叙事节奏缓慢，描写细腻，注重氛围和感官细节，让听者能够沉浸其中并放松身心。',
  knowledge: '知识科普风格的睡前故事。用生动有趣、平和的方式讲解各种知识。语言舒缓，细节丰富，避免过于激烈或刺激的情节，适合睡前聆听。',
  history: '历史叙事风格的睡前故事。以细腻舒缓的笔触描绘历史场景、人物和事件。保持平和的基调，不要留下紧张的悬念。',
  nature: '自然风景风格的睡前故事。用舒缓、温柔的语言描绘大自然的美丽与宁静。注重环境和氛围的刻画，引导听者放松身心，进入平静的状态。',
  meditation: '冥想引导风格。温柔舒缓，语言极度缓慢平和，引导听者一步步放松身体和心灵，进入深度的平静与梦乡。',
  arthistory: '艺术史风格。以建筑、空间设计、结构美学为线索，融合艺术史与历史关联性，充满神秘色彩。叙事简洁克制，以名词为核心，遇到重要术语、典故、象征符号时立即解释其来源与含义，或在段落结束后集中解释。大量引入历史人物，并配以简短生动的人物小传（生卒年、身份、性格、轶事、与主题的关联）。注重描述建筑的布局、空间感、材质、光影变化、装饰细节，以及艺术品背后的历史背景、文化象征和神秘传说。语调沉静、舒缓而富有洞察力，如同一盏幽暗画廊里的解说声，适合夜间聆听。',
  documentary: '人文纪录片/专栏文章风格。完全拒绝任何废话、多余的抒情、口语化表达或客套话。语言极其精炼、客观，知识信息密度极高。结构必须清晰，采用“总-分-总”结构，正文部分必须使用带编号的小标题（如 1. 2. 3.）来分点阐述核心内容。直接呈现历史背景、核心特征和演变过程，行文风格类似高质量的学术专栏或BBC历史纪录片解说词。',
}

function buildChapterPrompt(req: any): string {
  const styleDesc = req.customStylePrompt || stylePrompts[req.style] || '叙事风格'
  const wordsPerChapter = Math.floor((req.targetHours * 60 * 200) / Math.max(1, req.totalChapters))
  
  let prompt = `请用${styleDesc}，创作一个关于"${req.theme}"的长篇故事的第 ${req.chapterIndex + 1} 章${req.chapterTitle ? `——《${req.chapterTitle}》` : ''}。

本章是全书中的第 ${req.chapterIndex + 1} / ${req.totalChapters} 章。

要求：
1. 本章大约 ${wordsPerChapter} 字左右，内容要充实，细节丰富
2. 必须极其严格地遵守给定的【风格要求】（这是最重要的指令）
3. 拒绝无意义的废话和凑字数的描写，直接切入正题
4. 如果风格要求中包含清晰的结构（如小标题、列表等），请务必照做
5. 承上启下要自然，保持整体基调的统一
6. 直接输出内容，不要有任何额外的开场白、说明或标题`

  if (req.previousSummary) {
    prompt += `\n\n之前章节的概要：${req.previousSummary}`
  }
  if (req.previousEnding) {
    prompt += `\n\n上一章的结尾是：${req.previousEnding}`
  }
  if (req.chapterIndex === 0) {
    prompt += `\n\n这是故事的第一章，请为故事设定一个引人入胜的开端。`
  } else if (req.chapterIndex === req.totalChapters - 1) {
    prompt += `\n\n这是故事的最后一章，请给故事一个平和、圆满的收尾。`
  } else {
    prompt += `\n\n请承接上文，自然地继续故事。`
  }

  return prompt
}

function buildSummaryPrompt(chapterContent: string, theme: string): string {
  return `请用200字以内总结下面这段关于"${theme}"的故事章节的主要内容，以便后续章节参考。直接输出总结，不要有任何额外说明：\n\n${chapterContent.slice(-2000)}`
}async function generateChapterStream(
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
          { role: 'system', content: '你是一位专业的内容创作者，能够极其精准地模仿用户指定的文体、语气和结构进行创作。你绝不输出任何废话、客套话或多余的解释，总是严格遵守用户的格式要求。' },
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
