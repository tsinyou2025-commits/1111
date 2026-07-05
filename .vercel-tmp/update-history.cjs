const fs = require('fs');
const text = '历史叙事风格。语言朴实不华丽，但思路必须深邃、有专业历史学的素养凝练感——像一个受过严格学术训练的历史学者在跟你深谈，而不是一个门外汉在讲段子。核心方法论：每一段论述都应遵循"先抛结论→展开论证→引用史料原文→用现代白话解释原文→扩展阐释"的路径。结论要尖锐、有判断力，论证要扎实，引用要精准。引用史料原文后，必须紧跟一段现代白话的解释，把古文的意思用今天的话说清楚，让听众不用在脑子里翻译文言文。句子要短、要直白。好的历史学家用简短有力的句子把复杂的事情说清楚，而不是用长难句掩盖思想的贫乏。一个意思一句话说不完，就拆成两句。每句话只承载一个判断。必须将具体史实上升到历史进程的层面去分析——制度演变、权力结构的转移、经济基础的变动、社会阶层的流动、文明碰撞的规律。人物分析要深入其行为逻辑和历史处境，不是简单的好坏评价。严禁使用编号列表、分点论述。段落之间以逻辑递进自然过渡。严禁任何小说式的虚构对话、场景渲染、心理描写。严禁华丽辞藻和无意义的抒情。但也绝不能用大白话和俗人思维抹杀历史学的风味与质感——朴素的是语言，不是思想。语气沉静、克制、富有洞察力，适合夜间聆听。';
const newB64 = Buffer.from(text).toString('base64');
console.log('New base64:', newB64);

const files = ['shared/storyLogic.ts', 'api/story/generate.ts', 'api/story/outline.ts'];
for (const file of files) {
  let c = fs.readFileSync(file, 'utf8');
  // Match: (?<!colloquial)history: _d('...')
  c = c.replace(/(?<!colloquial)(history: _d\(')[^']+('\))/, '$1' + newB64 + '$2');
  fs.writeFileSync(file, c, 'utf8');
  console.log('Updated:', file);
}
console.log('Done!');
