import express, { type Request, type Response } from 'express'
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'

const router = express.Router()

router.post('/', async (req: Request, res: Response) => {
  const { text, voice = 'zh-CN-YunxiNeural', rate = 1, pitch = 1 } = req.body

  if (!text) {
    return res.status(400).json({ error: 'Text is required' })
  }

  try {
    const tts = new MsEdgeTTS()
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)
    
    const rateStr = rate >= 1 ? `+${Math.round((rate - 1) * 100)}%` : `-${Math.round((1 - rate) * 100)}%`
    const pitchStr = pitch >= 1 ? `+${Math.round((pitch - 1) * 100)}%` : `-${Math.round((1 - pitch) * 100)}%`
    
    const { audioStream } = tts.toStream(text, {
      rate: rateStr,
      pitch: pitchStr
    })

    res.setHeader('Content-Type', 'audio/mpeg')
    // 直接以流的形式返回给客户端
    audioStream.pipe(res)
  } catch (e: any) {
    console.error('Edge TTS Error:', e)
    if (!res.headersSent) {
      res.status(500).json({ error: e.message })
    }
  }
})

export default router
