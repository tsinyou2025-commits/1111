import type { VercelRequest, VercelResponse } from '@vercel/node'
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed')

  const { text, voice = 'zh-CN-YunxiNeural', rate = 1, pitch = 1, volume = 1 } = req.body

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
    res.status(500).json({ error: e.message })
  }
}
