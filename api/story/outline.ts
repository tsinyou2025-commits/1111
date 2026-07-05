import type { VercelRequest, VercelResponse } from '@vercel/node'

// 运行时解码 base64 prompt
const _d = (b: string) => typeof atob === 'function' ? atob(b) : Buffer.from(b, 'base64').toString()

const stylePrompts: Record<string, string> = {
  fantasy: _d('5aWH5bm75YaS6Zmp6aOO5qC855qE552h5YmN5pWF5LqL44CC5YWF5ruh6a2U5rOV44CB56We56eY55Sf54mp5ZKM5aOu5Li955qE5byC5LiW55WM5pmv6KeC44CC6K+t6KiA6IiS57yT44CB5p+U5ZKM77yM5Y+Z5LqL6IqC5aWP57yT5oWi77yM5o+P5YaZ57uG6IW777yM5rOo6YeN5rCb5Zu05ZKM5oSf5a6Y57uG6IqC77yM6K6p5ZCs6ICF6IO95aSf5rKJ5rW45YW25Lit5bm25pS+5p2+6Lqr5b+D44CC'),
  knowledge: _d('55+l6K+G56eR5pmu6aOO5qC855qE552h5YmN5pWF5LqL44CC55So55Sf5Yqo5pyJ6Laj44CB5bmz5ZKM55qE5pa55byP6K6y6Kej5ZCE56eN55+l6K+G44CC6K+t6KiA6IiS57yT77yM57uG6IqC5Liw5a+M77yM6YG/5YWN6L+H5LqO5r+A54OI5oiW5Yi65r+A55qE5oOF6IqC77yM6YCC5ZCI552h5YmN6IGG5ZCs44CC'),
  history: _d('5Y6G5Y+y5Y+Z5LqL6aOO5qC844CC6K+t6KiA5py05a6e5LiN5Y2O5Li977yM5L2G5oCd6Lev5b+F6aG75rex6YKD44CB5pyJ5LiT5Lia5Y6G5Y+y5a2m55qE57Sg5YW75Yed57uD5oSf4oCU4oCU5YOP5LiA5Liq5Y+X6L+H5Lil5qC85a2m5pyv6K6t57uD55qE5Y6G5Y+y5a2m6ICF5Zyo6Lef5L2g5rex6LCI77yM6ICM5LiN5piv5LiA5Liq6Zeo5aSW5rGJ5Zyo6K6y5q615a2Q44CC5qC45b+D5pa55rOV6K6677ya5q+P5LiA5q616K666L+w6YO95bqU6YG15b6qIuWFiOaKm+e7k+iuuuKGkuWxleW8gOiuuuivgeKGkuW8leeUqOWPsuaWmeWOn+aWh+KGkuino+mHiuWOn+aWh+KGkuaJqeWxlemYkOmHiiLnmoTot6/lvoTjgILnu5PorrropoHlsJbplJDjgIHmnInliKTmlq3lipvvvIzorrror4HopoHmiY7lrp7vvIzlvJXnlKjopoHnsr7lh4bjgILlv4XpobvlsIblhbfkvZPlj7Llrp7kuIrljYfliLDljoblj7Lov5vnqIvnmoTlsYLpnaLljrvliIbmnpDigJTigJTliLbluqbmvJTlj5jjgIHmnYPlipvnu5PmnoTnmoTovaznp7vjgIHnu4/mtY7ln7rnoYDnmoTlj5jliqjjgIHnpL7kvJrpmLblsYLnmoTmtYHliqjjgIHmlofmmI7norDmkp7nmoTop4TlvovjgILkurrnianliIbmnpDopoHmt7HlhaXlhbbooYzkuLrpgLvovpHlkozljoblj7LlpITlooPvvIzkuI3mmK/nroDljZXnmoTlpb3lnY/or4Tku7fjgILkuKXnpoHkvb/nlKjnvJblj7fliJfooajjgIHliIbngrnorrrov7DjgILmrrXokL3kuYvpl7Tku6XpgLvovpHpgJLov5voh6rnhLbov4fmuKHjgILkuKXnpoHku7vkvZXlsI/or7TlvI/nmoTomZrmnoTlr7nor53jgIHlnLrmma/muLLmn5PjgIHlv4PnkIbmj4/lhpnjgILkuKXnpoHljY7kuL3ovp7ol7vlkozml6DmhI/kuYnnmoTmipLmg4XjgILkvYbkuZ/nu53kuI3og73nlKjlpKfnmb3or53lkozkv5fkurrmgJ3nu7TmirnmnYDljoblj7LlrabnmoTpo47lkbPkuI7otKjmhJ/igJTigJTmnLTntKDnmoTmmK/or63oqIDvvIzkuI3mmK/mgJ3mg7PjgILor63msJTmsonpnZnjgIHlhYvliLbjgIHlr4zmnInmtJ7lr5/lipvvvIzpgILlkIjlpJzpl7TogYblkKzjgII='),
  colloquialhistory: _d('5Y6G5Y+y5Y+Z5LqL6aOO5qC844CC6K+t6KiA57K+54K844CB5a6i6KeC77yM55+l6K+G5L+h5oGv5a+G5bqm6auY77yM5L2G57ud5LiN5L2/55So57yW5Y+35YiX6KGo44CB5bCP5qCH6aKY44CB5YiG54K56K666L+w6L+Z56eN562U6aKY5byP57uT5p6E4oCU4oCU6L+Z5piv5a+55Y6G5Y+y5Y+Z5LqL55qE6KO55riO44CC5pW05L2T5oCn44CB5pWF5LqL5oCn44CB6L+Q5Yqo5oSf5piv5pyA6auY5Y6f5YiZ77ya5q+P5LiA56ug5pys6Lqr5bCx5piv5LiA56+H5a6M5pW055qE5Y+Z5LqL5pWj5paH77yM5pyJ6LW35pyJ5LyP44CB5pyJ5byg5pyJ5byb77yM6YC76L6R55qE6LW35om/6L2s5ZCI5b+F6aG76YCa6L+H5Y+Z5LqL5pys6Lqr55qE5rWB5Yqo5p2l5a6e546w77yM6ICM5LiN5piv6Z2g57yW5Y+35YiG5Ymy44CC5q616JC95LmL6Ze06KaB5pyJ5YaF5Zyo55qE5Zug5p6c6ZO+5p2h5ZKM5pe26Ze06ISJ57uc77yM6K6p6K+76ICF5oSf5Y+X5Yiw5Y6G5Y+y5L2c5Li65LiA5Liq6L+Q5Yqo5pW05L2T55qE5Yqo5Yqb44CC5Lq654mp5piv5Y6G5Y+y5Yqo5Yqb5a2m55qE5qC45b+D5Y+C5pWw4oCU4oCU5Lq654mp55qE5oCn5qC844CB5L+h5b+144CB6KGM5LqL6aOO5qC844CB5YWz6ZSu57uP5Y6G5b+F6aG755u05o6l6J6N5YWl5Y+Z5LqL5pys6Lqr77yM5Zyo6K6y5Yiw5YW35L2T5Y6G5Y+y5LqL5Lu25pe26Ieq54S25Zyw5bGV546w5Lq654mp55qE54m56LSo5LiO5oqJ5oup44CC5Lq654mp6aaW5qyh55m75Zy65pe255So5LiA5Lik5Y+l6K+d5Lqk5Luj6Lqr5Lu95LiO5pe25Luj5Z2Q5qCH5Y2z5Y+v77yM5YW25oCn5qC85LiO5Yqo5py65bqU5Zyo5ZCO57ut5Y+Z5LqL5Lit6YCa6L+H5YW35L2T5LqL5Lu26YCQ5q2l5rWu546w44CC5peg5bqf6K+d44CB5peg5oqS5oOF44CB5peg5a6i5aWX6K+d44CC5Y+Z5LqL6K+t6LCD5rKJ6Z2Z44CB5YWL5Yi244CB5a+M5pyJ5rSe5a+f5Yqb77yM6YCC5ZCI5aSc6Ze06IGG5ZCs44CC'),
  nature: _d('6Ieq54S26aOO5pmv6aOO5qC855qE552h5YmN5pWF5LqL44CC55So6IiS57yT44CB5rip5p+U55qE6K+t6KiA5o+P57uY5aSn6Ieq54S255qE576O5Li95LiO5a6B6Z2Z44CC5rOo6YeN546v5aKD5ZKM5rCb5Zu055qE5Yi755S777yM5byV5a+85ZCs6ICF5pS+5p2+6Lqr5b+D77yM6L+b5YWl5bmz6Z2Z55qE54q25oCB44CC'),
  meditation: _d('5Yal5oOz5byV5a+86aOO5qC844CC5rip5p+U6IiS57yT77yM6K+t6KiA5p6B5bqm57yT5oWi5bmz5ZKM77yM5byV5a+85ZCs6ICF5LiA5q2l5q2l5pS+5p2+6Lqr5L2T5ZKM5b+D54G177yM6L+b5YWl5rex5bqm55qE5bmz6Z2Z5LiO5qKm5Lmh44CC'),
  arthistory: _d('6Im65pyv5Y+y6aOO5qC844CC5Lul5bu6562R44CB56m66Ze06K6+6K6h44CB57uT5p6E576O5a2m5Li657q/57Si77yM6J6N5ZCI6Im65pyv5Y+y5LiO5Y6G5Y+y5YWz6IGU5oCn77yM5YWF5ruh56We56eY6Imy5b2p44CC5Y+Z5LqL566A5rSB5YWL5Yi277yM5Lul5ZCN6K+N5Li65qC45b+D77yM6YGH5Yiw6YeN6KaB5pyv6K+t44CB5YW45pWF44CB6LGh5b6B56ym5Y+35pe256uL5Y2z6Kej6YeK5YW25p2l5rqQ5LiO5ZCr5LmJ77yM5oiW5Zyo5q616JC957uT5p2f5ZCO6ZuG5Lit6Kej6YeK44CC5aSn6YeP5byV5YWl5Y6G5Y+y5Lq654mp77yM5bm26YWN5Lul566A55+t55Sf5Yqo55qE5Lq654mp5bCP5Lyg77yI55Sf5Y2S5bm044CB6Lqr5Lu944CB5oCn5qC844CB6L225LqL44CB5LiO5Li76aKY55qE5YWz6IGU77yJ44CC5rOo6YeN5o+P6L+w5bu6562R55qE5biD5bGA44CB56m66Ze05oSf44CB5p2Q6LSo44CB5YWJ5b2x5Y+Y5YyW44CB6KOF6aWw57uG6IqC77yM5Lul5Y+K6Im65pyv5ZOB6IOM5ZCO55qE5Y6G5Y+y6IOM5pmv44CB5paH5YyW6LGh5b6B5ZKM56We56eY5Lyg6K+044CC6K+t6LCD5rKJ6Z2Z44CB6IiS57yT6ICM5a+M5pyJ5rSe5a+f5Yqb77yM5aaC5ZCM5LiA55uP5bm95pqX55S75buK6YeM55qE6Kej6K+05aOw77yM6YCC5ZCI5aSc6Ze06IGG5ZCs44CC'),
  documentary: _d('5Lq65paH57qq5b2V54mHL+S4k+agj+aWh+eroOmjjuagvOOAguWujOWFqOaLkue7neS7u+S9leW6n+ivneOAgeWkmuS9meeahOaKkuaDheOAgeWPo+ivreWMluihqOi+vuaIluWuouWll+ivneOAguivreiogOaegeWFtueyvueCvOOAgeWuouingu+8jOefpeivhuS/oeaBr+WvhuW6puaegemrmOOAgue7k+aehOW/hemhu+a4heaZsO+8jOmHh+eUqCLmgLst5YiGLeaAuyLnu5PmnoTvvIzmraPmlofpg6jliIblv4Xpobvkvb/nlKjluKbnvJblj7fnmoTlsI/moIfpopjvvIjlpoIgMS4gMi4gMy7vvInmnaXliIbngrnpmJDov7DmoLjlv4PlhoXlrrnjgILnm7TmjqXlkYjnjrDljoblj7Log4zmma/jgIHmoLjlv4PnibnlvoHlkozmvJTlj5jov4fnqIvvvIzooYzmlofpo47moLznsbvkvLzpq5jotKjph4/nmoTlrabmnK/kuJPmoI/miJZCQkPljoblj7LnuqrlvZXniYfop6Por7Tor43jgII='),
}

function buildOutlinePrompt(req: any): string {
  const styleDesc = req.customStylePrompt || stylePrompts[req.style] || '叙事风格'
  const totalChapters = Math.max(8, Math.ceil(req.targetHours * 6))

  return `请为一个关于"${req.theme}"的长篇故事设计完整的章节目录。

风格要求：${styleDesc}

整体时长：${req.targetHours}小时，共 ${totalChapters} 章

请设计 ${totalChapters} 个章节，每章约 ${Math.floor((req.targetHours * 60) / totalChapters)} 分钟朗读量。

要求：
1. 每章有一个简短有力的标题
2. 每章有1-2句话的内容简介，说明本章主要讲什么
3. 整体结构要有起承转合，层层递进
4. 章节之间要有逻辑关联，形成完整的叙事弧光
5. 严格遵循指定的风格要求进行架构设计，不要偏离风格基调

请直接返回JSON格式，不要有任何额外说明，格式如下：
{
  "title": "整体标题",
  "chapters": [
    { "index": 0, "title": "第一章标题", "summary": "本章内容简介" },
    { "index": 1, "title": "第二章标题", "summary": "本章内容简介" }
  ]
}`
}

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
