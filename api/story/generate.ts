import type { VercelRequest, VercelResponse } from '@vercel/node'
import { generateChapterStream } from '../../shared/storyLogic'

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
