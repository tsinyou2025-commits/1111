import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const mod = await import('../../shared/storyLogic')
    res.status(200).json({ 
      status: 'ok', 
      hasGenerateOutline: typeof mod.generateOutline === 'function',
      exports: Object.keys(mod)
    })
  } catch (e: any) {
    res.status(500).json({ error: 'Import failed', details: e.message, stack: e.stack?.substring(0, 500) })
  }
}
