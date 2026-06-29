import express, { type Request, type Response } from 'express'
import { generateOutline, generateChapterStream, getModels } from '../../shared/storyLogic.js'

const router = express.Router()

router.post('/outline', async (req: Request, res: Response) => {
  try {
    const result = await generateOutline(req.body)
    res.json(result)
  } catch (error) {
    console.error('Outline error:', error)
    res.status(500).json({ error: error instanceof Error ? error.message : '未知错误' })
  }
})

router.post('/generate', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

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
    console.error('Generate error:', error)
    if (!ended) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: error instanceof Error ? error.message : '未知错误' })}\n\n`)
      res.end()
    }
  }
})

router.get('/models', async (req: Request, res: Response) => {
  try {
    const baseUrl = req.query.baseUrl as string
    const apiKey = req.query.apiKey as string
    const result = await getModels(baseUrl, apiKey)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : '未知错误' })
  }
})

export default router
