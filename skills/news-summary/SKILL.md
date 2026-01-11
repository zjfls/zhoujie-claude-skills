---
name: news-summary
description: 新闻搜索、新闻摘要、新闻汇总、热点新闻、最新新闻、新闻整理、新闻收集。帮你搜索最近几天的相关新闻（12-25条），生成精美的HTML摘要页面，每条新闻都有摘要和AI深度解读功能，自动打开浏览器展示
---

# 新闻搜索摘要 Skill

一个智能新闻搜索和摘要工具，帮你快速获取和分析最新新闻。

## 核心功能

### 1. 搜索新闻
- 询问用户搜索主题
- 搜索最近 3-5 天的 12-25 条相关新闻
- **搜索工具**：优先使用 WebSearch，不可用时使用 Brave Search MCP
- **Brave Search 限制**：每次调用后必须 `sleep 1` 秒，防止速率限制
- **搜索优化**：
  * 使用多个关键词组合搜索
  * 分批搜索确保足够结果
  * 自动去重（标题/URL）
  * 如结果不足 12 条，扩大时间范围或关键词

### 2. 分析新闻
对每条新闻提取：
- 标题
- 来源网站
- 发布时间
- 权威性评估（高/中/低）
- 摘要（100-200字）
- 原文链接

### 3. 生成 HTML 页面
- **输出目录**：`<当前工作目录>/news-summary/<topic>/`
  * 通过 `pwd` 获取当前工作目录的绝对路径
  * `<topic>` 从用户查询提取关键词，无法提取时使用时间戳
- **文件名**：`news_summary_<topic>.html`
- **AI 解读目录**：`<当前工作目录>/news-summary/<topic>/analysis/`
- **解读文件名**：`news_analysis_<newsId>.md`
- **页面特性**：
  * 美观的响应式设计
  * 卡片式新闻展示
  * 每条新闻包含：标题、来源、时间、权威性标签、摘要
  * 两个按钮："查看原文" 和 "AI解读"
  * 必须包含前端脚本：`<script src="/news-ai.js"></script>`

### 4. AI 解读功能
- **服务器**：Node.js HTTP 服务器（server.js，端口 3456）
- **真实 AI 分析**：通过 Claude Code CLI 生成深度解读
- **自定义 Prompt**：点击"AI解读"按钮后可输入自定义分析角度
- **阻塞和超时**：
  * 生成时显示加载模态框
  * 120 秒超时自动中止
- **文件管理**：
  * 已生成：显示"查看AI解读"和"删除解读"按钮
  * 未生成：显示"AI解读"按钮
  * 支持删除和重新生成
- **服务端点**：
  * `GET /check-analysis?newsId=<id>&timestamp=<topic>` - 检查解读文件是否存在
  * `POST /analyze` - 生成 AI 解读（支持 customPrompt）
  * `DELETE /delete-analysis?newsId=<id>&timestamp=<topic>` - 删除解读
  * `GET /view-analysis?newsId=<id>&timestamp=<topic>` - 查看解读
  * `GET /news-summary/<topic>/<filename>` - 静态文件服务
  * `GET /news-ai.js` - 前端脚本

### 5. 启动服务器并打开浏览器
- 确保 Node.js 服务器运行（检查端口 3456，未运行则启动 server.js）
- 生成 HTML 后，通过 HTTP 打开浏览器
- **浏览器命令**：
  * Windows: `Start-Process "http://localhost:3456/news-summary/<topic>/news_summary_<topic>.html"`
  * macOS: `open "http://localhost:3456/news-summary/<topic>/news_summary_<topic>.html"`
  * Linux: `xdg-open "http://localhost:3456/news-summary/<topic>/news_summary_<topic>.html"`
- **重要**：必须通过 HTTP 访问，不能使用 file:// 协议

## 工作流程

1. 询问用户搜索主题
2. 从查询中提取关键词作为 `<topic>`（无法提取则用时间戳）
3. 搜索新闻（WebSearch 优先；Brave Search 需间隔 1 秒）
4. 分析和整理新闻信息
5. **获取当前工作目录**：使用 Bash 命令 `pwd` 获取绝对路径
6. 生成 HTML 到：`<当前工作目录>/news-summary/<topic>/news_summary_<topic>.html`
7. 确保服务器运行（检查端口 3456，未运行则启动）
8. 打开浏览器：`http://localhost:3456/news-summary/<topic>/news_summary_<topic>.html`

## HTML 模板要求

- 现代简洁设计，响应式布局
- 卡片式新闻展示
- 每个新闻卡片必须包含 data 属性：
  * `data-news-id`: 新闻 ID（0, 1, 2...）
  * `data-news-url`: 原文链接
  * `data-news-source`: 来源
  * `data-news-time`: 发布时间
- 权威性标签：高（绿色）、中（黄色）、低（灰色）
- 相对时间显示（如：2天前）
- **必须在底部引入**：`<script src="/news-ai.js"></script>`（绝对路径）
- AI 解读按钮由 news-ai.js 动态管理

## 注意事项

- 使用绝对路径（通过 `pwd` 获取当前工作目录）
- 创建必要的目录结构
- 处理网络请求失败
- 验证新闻来源可靠性
- 确保 HTML 包含 JavaScript 处理 AI 解读
