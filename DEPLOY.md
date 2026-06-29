# 部署到 Vercel

## 前置条件
- GitHub 账号
- Vercel 账号（可以用 GitHub 登录）

## 部署步骤

### 1. 推送到 GitHub
把项目代码推送到你的 GitHub 仓库。

### 2. 导入 Vercel
1. 打开 https://vercel.com
2. 点「Add New...」→「Project」
3. 选择你的 GitHub 仓库
4. 点「Import」

### 3. 配置项目
- **Framework Preset**: Vite（应该自动识别）
- **Build Command**: `npm run build`（自动识别）
- **Output Directory**: `dist`（自动识别）
- **Root Directory**: 保持空

直接点「Deploy」就行，不用配置环境变量。

### 4. 等待部署完成
大约 1-2 分钟，部署成功后会给你一个 `xxx.vercel.app` 的域名。

## 手机端使用

1. 手机浏览器打开你的 Vercel 域名
2. 去「设置」页面配置你的 AI 接口（API Key、模型）
3. 回到首页选主题和风格，开始生成
4. 浏览器菜单里选「添加到主屏幕」，可以当 App 用

## 本地开发

双击 `启动.bat`，或者命令行运行：

```bash
npm run dev
```

- 前端: http://localhost:5173
- 后端: http://localhost:3001

## 项目结构

```
.
├── api/                    # Vercel Serverless Functions（云端用）
│   └── story/
│       ├── outline.ts      # 生成目录
│       ├── generate.ts     # 生成章节（流式）
│       └── models.ts       # 获取模型列表
├── api-express/            # Express 后端（本地开发用）
│   ├── routes/
│   ├── app.ts
│   └── server.ts
├── shared/                 # 共享逻辑
│   └── storyLogic.ts       # AI 生成核心逻辑
├── src/                    # 前端 React 代码
├── dist/                   # 构建产物
├── vercel.json             # Vercel 配置
└── ...
```

## 注意事项

- API Key 只保存在用户浏览器本地，不会上传到服务器
- Vercel 免费版 Serverless Function 最长执行 10 秒（Pro 版 300 秒），长文本生成建议用本地模式
- 流式生成在 Vercel 上可能会有缓冲，建议用本地部署获得最佳体验
