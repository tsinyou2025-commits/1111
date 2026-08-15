export interface OutlineRequest {
  theme: string
  style: string
  customStylePrompt?: string
  targetHours: number
  aiBaseUrl: string
  apiKey: string
  model: string
}

export interface GenerateRequest {
  theme: string
  style: string
  customStylePrompt?: string
  targetHours: number
  chapterIndex: number
  chapterTitle?: string
  totalChapters: number
  previousSummary?: string
  previousEnding?: string
  aiBaseUrl: string
  apiKey: string
  model: string
}

// 运行时解码 base64 prompt
const _d = (b: string) => typeof atob === 'function' ? atob(b) : Buffer.from(b, 'base64').toString()

export const stylePrompts: Record<string, string> = {
  fantasy: _d('5aWH5bm75YaS6Zmp6aOO5qC855qE552h5YmN5pWF5LqL44CC5YWF5ruh6a2U5rOV44CB56We56eY55Sf54mp5ZKM5aOu5Li955qE5byC5LiW55WM5pmv6KeC44CC6K+t6KiA6IiS57yT44CB5p+U5ZKM77yM5Y+Z5LqL6IqC5aWP57yT5oWi77yM5o+P5YaZ57uG6IW777yM5rOo6YeN5rCb5Zu05ZKM5oSf5a6Y57uG6IqC77yM6K6p5ZCs6ICF6IO95aSf5rKJ5rW45YW25Lit5bm25pS+5p2+6Lqr5b+D44CC'),
  knowledge: _d('55+l6K+G56eR5pmu6aOO5qC855qE552h5YmN5pWF5LqL44CC55So55Sf5Yqo5pyJ6Laj44CB5bmz5ZKM55qE5pa55byP6K6y6Kej5ZCE56eN55+l6K+G44CC6K+t6KiA6IiS57yT77yM57uG6IqC5Liw5a+M77yM6YG/5YWN6L+H5LqO5r+A54OI5oiW5Yi65r+A55qE5oOF6IqC77yM6YCC5ZCI552h5YmN6IGG5ZCs44CC'),
  history: _d('5Y6G5Y+y5Y+Z5LqL6aOO5qC844CC6K+t6KiA5py05a6e5LiN5Y2O5Li977yM5L2G5oCd6Lev5b+F6aG75rex6YKD44CB5pyJ5LiT5Lia5Y6G5Y+y5a2m55qE57Sg5YW75Yed57uD5oSf4oCU4oCU5YOP5LiA5Liq5Y+X6L+H5Lil5qC85a2m5pyv6K6t57uD55qE5Y6G5Y+y5a2m6ICF5Zyo6Lef5L2g5rex6LCI77yM6ICM5LiN5piv5LiA5Liq6Zeo5aSW5rGJ5Zyo6K6y5q615a2Q44CC5qC45b+D5pa55rOV6K6677ya5q+P5LiA5q616K666L+w6YO95bqU6YG15b6qIuWFiOaKm+e7k+iuuuKGkuWxleW8gOiuuuivgeKGkuW8leeUqOWPsuaWmeWOn+aWh+KGkueUqOeOsOS7o+eZveivneino+mHiuWOn+aWh+KGkuaJqeWxlemYkOmHiiLnmoTot6/lvoTjgILnu5PorrropoHlsJbplJDjgIHmnInliKTmlq3lipvvvIzorrror4HopoHmiY7lrp7vvIzlvJXnlKjopoHnsr7lh4bjgILlvJXnlKjlj7Lmlpnljp/mloflkI7vvIzlv4XpobvntKfot5/kuIDmrrXnjrDku6Pnmb3or53nmoTop6Pph4rvvIzmiorlj6TmlofnmoTmhI/mgJ3nlKjku4rlpKnnmoTor53or7TmuIXmpZrvvIzorqnlkKzkvJfkuI3nlKjlnKjohJHlrZDph4znv7vor5HmlofoqIDmlofjgILop6Pph4rlj7Lmlpnml7bvvIzkuI3og73lj6rlgZrlrZfpnaLnv7vor5HjgILlpoLmnpzljp/mlofmj5DliLDkuoblhbfkvZPnmoTkurrnianjgIHlhbjmlYXjgIHkuovku7bmiJbnrZbnlaXvvIzlv4Xpobvmiorov5nkuKrog4zmma/orrLmuIXmpZrjgILmr5TlpoLlj7Lmlpnmj5DliLAi6JKv6YCa5LmL6K6hIu+8jOS9oOS4jeiDveWPque/u+ivkeaIkCLokq/pgJrnmoTorqHnrZYi77yM5L2g6KaB6K+05piO6JKv6YCa5piv6LCB44CB5LuW5o+Q5Ye65LqG5LuA5LmI6K6h562W44CB5Zyo5LuA5LmI5Y6G5Y+y6IOM5pmv5LiL5o+Q5Ye655qE44CB5a+86Ie05LqG5LuA5LmI57uT5p6c44CC5ZCs5LyX5LiN55+l6YGT5L2g5Zyo6K+06LCB44CB5Zyo6K+05LuA5LmI5LqL77yM5L2g5pyJ6LSj5Lu75oqK5LiK5LiL5paH5Lqk5Luj5piO55m944CC5byV55So5Y+y5paZ55qE5pa55byP77ya5LiA5Y+l5LiA5byV77yM5LiA5Y+l5LiA6Kej77yM5LiA5Y+l5LiA6K+E44CC5byV5LiA5Y+l5Y6f5paH77yM56uL5Yi755So55m96K+d6Kej6YeK6L+Z5Y+l55qE5oSP5oCd77yM5YaN57uZ5Ye65L2g55qE6K+E5Lu35oiW5YiG5p6Q44CC54S25ZCO5byV5LiL5LiA5Y+l44CC5LiN6KaB5LiA5Y+j5rCU5byV5a6M5LiA5aSn5q615Y+k5paH5YaN57uf5LiA6Kej6YeK77yM6YKj5qC35ZCs5LyX5qC55pys6Lef5LiN5LiK44CC5Y+l5a2Q6KaB55+t44CB6KaB55u055m944CC5aW955qE5Y6G5Y+y5a2m5a6255So566A55+t5pyJ5Yqb55qE5Y+l5a2Q5oqK5aSN5p2C55qE5LqL5oOF6K+05riF5qWa77yM6ICM5LiN5piv55So6ZW/6Zq+5Y+l5o6p55uW5oCd5oOz55qE6LSr5LmP44CC5LiA5Liq5oSP5oCd5LiA5Y+l6K+d6K+05LiN5a6M77yM5bCx5ouG5oiQ5Lik5Y+l44CC5q+P5Y+l6K+d5Y+q5om/6L295LiA5Liq5Yik5pat44CC56ug6IqC57uT5p6E77ya5LiN6KaB5q+P56ug6YO95Zu057uV5ZCM5LiA5Liq5qC45b+D6K666L+w5Y+N5aSN5omT56Oo77yM5YOP5oyk54mZ6IaP5LiA5qC35LiA54K554K55oyk44CC56ys5LiA56ug5bCx5bqU6K+l5oqK5qC45b+D5Yik5pat5Lqu5Ye65p2l77yM54S25ZCO55So5ZCO6Z2i5Yeg56ug5LuO5LiN5ZCM6KeS5bqm5bGV5byA6K666K+B44CC5q+P5LiA56ug6KaB5pyJ6Ieq5bex55qE54us56uL6K6654K55ZKM5paw6KeG6KeS77yM56ug6IqC5LmL6Ze05piv6YCS6L+b5oiW5bm25YiX5YWz57O777yM5LiN5piv6YeN5aSN5YWz57O744CC5LiK5LiA56ug5bey57uP6K+06L+H55qE5YaF5a6577yM5LiL5LiA56ug5LiN6KaB5YaN6YeN5aSN44CC5q+P5LiA56ug6K+75a6M77yM5ZCs5LyX5bqU6K+l6I635b6X5paw55qE6K6k55+l5aKe6YeP44CC5Y+Z5LqL6KaB5pyJ5Yqo5Yqb5oSf77ya5Y6G5Y+y5LqL5Lu255qE5Y+R55Sf44CB5Y+R5bGV44CB6L2s5oqY44CB57uT5bGA77yM5pys6Lqr5bCx5p6E5oiQ5LiA5Liq5Yqo5Yqb5ryU6L+b6L+H56iL44CC5L2g6KaB5oqK6L+Z5Liq6L+H56iL5riF5pmw5Zyw5ZGI546w5Ye65p2l77yM6ICM5LiN5piv55So5LiA5Liq6Z2Z5oCB57uT6K665Y675Y+N5aSN6K666K+B44CC5b+F6aG75bCG5YW35L2T5Y+y5a6e5LiK5Y2H5Yiw5Y6G5Y+y6L+b56iL55qE5bGC6Z2i5Y675YiG5p6Q4oCU4oCU5Yi25bqm5ryU5Y+Y44CB5p2D5Yqb57uT5p6E55qE6L2s56e744CB57uP5rWO5Z+656GA55qE5Y+Y5Yqo44CB56S+5Lya6Zi25bGC55qE5rWB5Yqo44CB5paH5piO56Kw5pKe55qE6KeE5b6L44CC5Lq654mp5YiG5p6Q6KaB5rex5YWl5YW26KGM5Li66YC76L6R5ZKM5Y6G5Y+y5aSE5aKD77yM5LiN5piv566A5Y2V55qE5aW95Z2P6K+E5Lu344CC5Lil56aB5L2/55So57yW5Y+35YiX6KGo44CB5YiG54K56K666L+w44CC5q616JC95LmL6Ze05Lul6YC76L6R6YCS6L+b6Ieq54S26L+H5rih44CC5Lil56aB5Lu75L2V5bCP6K+05byP55qE6Jma5p6E5a+56K+d44CB5Zy65pmv5riy5p+T44CB5b+D55CG5o+P5YaZ44CC5Lil56aB5Y2O5Li96L6e6Je75ZKM5peg5oSP5LmJ55qE5oqS5oOF44CC5L2G5Lmf57ud5LiN6IO955So5aSn55m96K+d5ZKM5L+X5Lq65oCd57u05oq55p2A5Y6G5Y+y5a2m55qE6aOO5ZGz5LiO6LSo5oSf4oCU4oCU5py057Sg55qE5piv6K+t6KiA77yM5LiN5piv5oCd5oOz44CC6K+t5rCU5rKJ6Z2Z44CB5YWL5Yi244CB5a+M5pyJ5rSe5a+f5Yqb77yM6YCC5ZCI5aSc6Ze06IGG5ZCs44CC'),
  colloquialhistory: _d('5Y6G5Y+y5Y+Z5LqL6aOO5qC844CC6K+t6KiA57K+54K844CB5a6i6KeC77yM55+l6K+G5L+h5oGv5a+G5bqm6auY77yM5L2G57ud5LiN5L2/55So57yW5Y+35YiX6KGo44CB5bCP5qCH6aKY44CB5YiG54K56K666L+w6L+Z56eN562U6aKY5byP57uT5p6E4oCU4oCU6L+Z5piv5a+55Y6G5Y+y5Y+Z5LqL55qE6KO55riO44CC5pW05L2T5oCn44CB5pWF5LqL5oCn44CB6L+Q5Yqo5oSf5piv5pyA6auY5Y6f5YiZ77ya5q+P5LiA56ug5pys6Lqr5bCx5piv5LiA56+H5a6M5pW055qE5Y+Z5LqL5pWj5paH77yM5pyJ6LW35pyJ5LyP44CB5pyJ5byg5pyJ5byb77yM6YC76L6R55qE6LW35om/6L2s5ZCI5b+F6aG76YCa6L+H5Y+Z5LqL5pys6Lqr55qE5rWB5Yqo5p2l5a6e546w77yM6ICM5LiN5piv6Z2g57yW5Y+35YiG5Ymy44CC5q616JC95LmL6Ze06KaB5pyJ5YaF5Zyo55qE5Zug5p6c6ZO+5p2h5ZKM5pe26Ze06ISJ57uc77yM6K6p6K+76ICF5oSf5Y+X5Yiw5Y6G5Y+y5L2c5Li65LiA5Liq6L+Q5Yqo5pW05L2T55qE5Yqo5Yqb44CC5Lq654mp5piv5Y6G5Y+y5Yqo5Yqb5a2m55qE5qC45b+D5Y+C5pWw4oCU4oCU5Lq654mp55qE5oCn5qC844CB5L+h5b+144CB6KGM5LqL6aOO5qC844CB5YWz6ZSu57uP5Y6G5b+F6aG755u05o6l6J6N5YWl5Y+Z5LqL5pys6Lqr77yM5Zyo6K6y5Yiw5YW35L2T5Y6G5Y+y5LqL5Lu25pe26Ieq54S25Zyw5bGV546w5Lq654mp55qE54m56LSo5LiO5oqJ5oup44CC5Lq654mp6aaW5qyh55m75Zy65pe255So5LiA5Lik5Y+l6K+d5Lqk5Luj6Lqr5Lu95LiO5pe25Luj5Z2Q5qCH5Y2z5Y+v77yM5YW25oCn5qC85LiO5Yqo5py65bqU5Zyo5ZCO57ut5Y+Z5LqL5Lit6YCa6L+H5YW35L2T5LqL5Lu26YCQ5q2l5rWu546w44CC5peg5bqf6K+d44CB5peg5oqS5oOF44CB5peg5a6i5aWX6K+d44CC5Y+Z5LqL6K+t6LCD5rKJ6Z2Z44CB5YWL5Yi244CB5a+M5pyJ5rSe5a+f5Yqb77yM6YCC5ZCI5aSc6Ze06IGG5ZCs44CC'),
  nature: _d('6Ieq54S26aOO5pmv6aOO5qC855qE552h5YmN5pWF5LqL44CC55So6IiS57yT44CB5rip5p+U55qE6K+t6KiA5o+P57uY5aSn6Ieq54S255qE576O5Li95LiO5a6B6Z2Z44CC5rOo6YeN546v5aKD5ZKM5rCb5Zu055qE5Yi755S777yM5byV5a+85ZCs6ICF5pS+5p2+6Lqr5b+D77yM6L+b5YWl5bmz6Z2Z55qE54q25oCB44CC'),
  meditation: _d('5Yal5oOz5byV5a+86aOO5qC844CC5rip5p+U6IiS57yT77yM6K+t6KiA5p6B5bqm57yT5oWi5bmz5ZKM77yM5byV5a+85ZCs6ICF5LiA5q2i5q2i5pS+5p2+6Lqr5L2T5ZKM5b+D54G177yM6L+b5YWl5rex5bqm55qE5bmz6Z2Z5LiO5qKm5Lmh44CC'),
  arthistory: _d('6Im65pyv5Y+y6aOO5qC844CC5Lul5bu6562R44CB56m66Ze06K6+6K6h44CB57uT5p6E576O5a2m5Li657q/57Si77yM6J6N5ZCI6Im65pyv5Y+y5LiO5Y6G5Y+y5YWz6IGU5oCn77yM5YWF5ruh56We56eY6Imy5b2p44CC5Y+Z5LqL566A5rSB5YWL5Yi277yM5Lul5ZCN6K+N5Li65qC45b+D77yM6YGH5Yiw6YeN6KaB5pyv6K+t44CB5YW45pWF44CB6LGh5b6B56ym5Y+35pe256uL5Y2z6Kej6YeK5YW25p2l5rqQ5LiO5ZCr5LmJ77yM5oiW5Zyo5q616JC957uT5p2f5ZCO6ZuG5Lit6Kej6YeK44CC5aSn6YeP5byV5YWl5Y6G5Y+y5Lq654mp77yM5bm26YWN5Lul566A55+t55Sf5Yqo55qE5Lq654mp5bCP5Lyg77yI55Sf5Y2S5bm044CB6Lqr5Lu944CB5oCn5qC844CB6L225LqL44CB5LiO5Li76aKY55qE5YWz6IGU77yJ44CC5rOo6YeN5o+P6L+w5bu6562R55qE5biD5bGA44CB56m66Ze05oSf44CB5p2Q6LSo44CB5YWJ5b2x5Y+Y5YyW44CB6KOF6aWw57uG6IqC77yM5Lul5Y+K6Im65pyv5ZOB6IOM5ZCO55qE5Y6G5Y+y6IOM5pmv44CB5paH5YyW6LGh5b6B5ZKM56We56eY5Lyg6K+044CC6K+t6LCD5rKJ6Z2Z44CB6IiS57yT6ICM5a+M5pyJ5rSe5a+f5Yqb77yM5aaC5ZCM5LiA55uP5bm95pqX55S75buK6YeM55qE6Kej6K+05aOw77yM6YCC5ZCI5aSc6Ze06IGG5ZCs44CC'),
  documentary: _d('5Lq65paH57qq5b2V54mHL+S4k+agj+aWh+eroOmjjuagvOOAguWujOWFqOaLkue7neS7u+S9leW6n+ivneOAgeWkmuS9meeahOaKkuaDheOAgeWPo+ivreWMluihqOi+vuaIluWuouWll+ivneOAguivreiogOaegeWFtueyvueCvOOAgeWuouingu+8jOefpeivhuS/oeaBr+WvhuW6puaegemrmOOAgue7k+aehOW/hemhu+a4heaZsO+8jOmHh+eUqCLmgLst5YiGLeaAuyLnu5PmnoTvvIzmraPmlofpg6jliIblv4Xpobvkvb/nlKjluKbnvJblj7fnmoTlsI/moIfpopjvvIjlpoIgMS4gMi4gMy7vvInmnaXliIbngrnpmJDov7DmoLjlv4PlhoXlrrnjgILnm7TmjqXlkYjnjrDljoblj7Log4zmma/jgIHmoLjlv4PnibnlvoHlkozmvJTlj5jov4fnqIvvvIzooYzmlofpo47moLznsbvkvLzpq5jotKjph4/nmoTlrabmnK/kuJPmoI/miJZCQkPljoblj7LnuqrlvZXniYfop6Por7Tor43jgII='),
}

export function buildOutlinePrompt(req: OutlineRequest): string {
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

export function buildChapterPrompt(req: GenerateRequest): string {
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
6. 必须合理分段，每个自然段之间用两个换行符（\n\n）分隔。不要把所有内容写成一整块，要根据内容逻辑自然分段
7. 直接输出内容，不要有任何额外的开场白、说明或标题`

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

export function buildSummaryPrompt(chapterContent: string, theme: string): string {
  return `请用200字以内总结下面这段关于"${theme}"的故事章节的主要内容，以便后续章节参考。直接输出总结，不要有任何额外说明：

${chapterContent.slice(-2000)}`
}

export async function generateOutline(body: OutlineRequest): Promise<any> {
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
  } catch {
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

export async function generateChapterStream(
  body: GenerateRequest,
  onText: (content: string) => void,
  onSummary: (summary: string) => void,
  onTextDone: (totalWords: number) => void,
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
        } catch {
          // 忽略解析错误
        }
      }
    }

    // 先发送正文完成事件，让前端可以立刻开始朗读
    onTextDone(fullContent.length)

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
        } else {
          onSummary(fullContent.slice(-300))
        }
      } else {
        onSummary(fullContent.slice(-300))
      }
    } catch {
      // 摘要生成失败不影响主流程，直接回退到最后 300 字
      onSummary(fullContent.slice(-300))
    }

    onDone(fullContent.length)
  } catch (error) {
    onError(error instanceof Error ? error.message : '未知错误')
  }
}

export async function getModels(baseUrl: string, apiKey: string): Promise<any> {
  if (!baseUrl || !apiKey) {
    throw new Error('缺少必要参数')
  }

  const cleanBaseUrl = baseUrl.replace(/\/$/, '')
  const response = await fetch(`${cleanBaseUrl}/models`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  })

  if (!response.ok) {
    throw new Error('获取模型列表失败')
  }

  return await response.json()
}
