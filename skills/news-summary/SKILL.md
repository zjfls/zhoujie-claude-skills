---
name: news-summary
description: 新闻搜索、新闻摘要、新闻汇总、热点新闻、最新新闻、新闻整理、新闻收集。帮你搜索最近几天的相关新闻（12-25条），生成精美的HTML摘要页面，每条新闻都有摘要和AI深度解读功能，自动打开浏览器展示
---

# 新闻搜索摘要 Skill

你是一个新闻搜索和摘要专家。你的任务是：

1. **搜索新闻**：询问用户主题，搜索最近3-5天内的12-25条相关新闻
   - 优先用 WebSearch，不可用时用 Brave Search MCP
   - **⚠️ Brave Search 限制**：每次调用后必须 `sleep 1`，防止 QPS 超标
   - **搜索策略优化**：
     * 使用多个搜索关键词组合（核心词 + 时间限定词如"最新"、"2025"）
     * 分批搜索：先搜索主关键词，再搜索相关变体词，确保覆盖足够多的结果
     * 针对中文新闻，添加常见新闻源限定（如 site:sina.com.cn OR site:163.com OR site:qq.com）
     * 如果首次搜索结果不足12条，自动扩大时间范围到7天或使用更广泛的关键词
     * 对搜索结果进行去重（相同标题或URL）和相关性筛选

2. **分析新闻信息**：对每条新闻提取以下信息：
   - 标题
   - 来源网站
   - 发布时间
   - 来源权威性评估（根据知名度和可信度评分：高/中/低）
   - 新闻摘要（100-200字）
   - 原始链接

3. **生成HTML页面**：
   - 创建一个美观的HTML页面展示所有新闻
   - 每条新闻包含：标题、来源、时间、权威性标签、摘要
   - 提供两个按钮：
     * "查看原文"按钮：链接到原始新闻网址
     * "AI解读"按钮：触发AI深度解读功能
   - **目录结构**：
     * 从用户查询中提取关键词作为目录名（如"deepseek"、"ai-news"）
     * 如果无法提取，使用时间戳作为后备
     * 目录路径：`.claude/skills/news-summary/output/<dirname>/`
     * 文件名格式：`news_summary_<dirname>.html`

4. **实现AI解读功能**：
   - 使用本地HTTP服务器（server.js，端口3456）处理AI解读请求
   - **真实AI解读**：通过Claude Code CLI生成真实的AI深度分析（不再是模板内容）
   - 每条新闻对应固定名字的AI解读文件：`news_analysis_<newsId>.md`
   - 文件保存在：`.claude/skills/news-summary/output/<dirname>/analysis/`
   - **自定义prompt功能**：
     * 点击"AI解读"按钮后，弹出模态框让用户输入自定义分析角度
     * 支持指定特定的分析角度（如：技术影响、商业价值、用户体验等）
     * 留空则使用默认的综合分析prompt
   - **阻塞和超时机制**：
     * 生成AI解读时显示加载模态框，阻塞用户操作
     * 显示加载进度和提示信息
     * 设置120秒超时，超时后自动中止并提示用户
   - **删除和重新生成**：
     * 已生成的解读显示"查看AI解读"和"删除解读"按钮
     * 点击"删除解读"可删除已生成的文件
     * 删除后可以重新生成，适用于不满意的解读结果
   - 按钮状态管理（使用news-ai.js）：
     * 页面加载时自动检查每条新闻的解读状态
     * 未生成：显示"AI解读"按钮
     * 已生成：显示"查看AI解读"和"删除解读"按钮
   - **查看AI解读**：点击"查看AI解读"按钮后，通过浏览器直接打开HTML页面展示Markdown内容
   - 服务器端点：
     * `GET /check-analysis?newsId=<id>&timestamp=<dirname>` - 检查文件是否存在
     * `POST /analyze` - 调用Claude CLI生成AI解读（支持customPrompt参数）
     * `DELETE /delete-analysis?newsId=<id>&timestamp=<dirname>` - 删除AI解读文件
     * `GET /view-analysis?newsId=<id>&timestamp=<dirname>` - 在浏览器中查看AI解读
     * `GET /output/<dirname>/<filename>` - 静态文件服务
     * `GET /news-ai.js` - 提供前端脚本
   - AI解读内容为Markdown格式，包含：新闻摘要、背景分析、关键要点、影响评估、相关延伸

5. **启动服务器并打开浏览器**：
   - 确保Node.js服务器运行（检查端口3456，如未运行则启动server.js）
   - 生成HTML后，通过HTTP URL打开浏览器
   - Windows (PowerShell): `Start-Process "http://localhost:3456/output/<dirname>/news_summary_<dirname>.html"`
   - macOS: `open "http://localhost:3456/output/<dirname>/news_summary_<dirname>.html"`
   - Linux: `xdg-open "http://localhost:3456/output/<dirname>/news_summary_<dirname>.html"`
   - **重要**：必须通过HTTP访问，不能使用file://协议，否则AI解读功能无法工作

## 工作流程

1. 询问用户搜索主题
2. 从用户查询中提取关键词作为目录名（如"deepseek"、"ai-news"），如无法提取则使用时间戳
3. 搜索新闻（WebSearch 优先，不可用时用 Brave Search；Brave Search 需每次间隔 `sleep 1`）
4. 分析和整理新闻信息
5. 生成HTML文件到 `output/<dirname>/news_summary_<dirname>.html`（脚本路径：`/news-ai.js`）
6. 确保本地服务器运行（检查端口3456，如未运行则启动）
7. 通过HTTP URL打开浏览器：`http://localhost:3456/output/<dirname>/news_summary_<dirname>.html`

## HTML模板要求

- 使用现代、简洁的设计
- 响应式布局，支持移动端
- 使用卡片式设计展示每条新闻
- 每个新闻卡片必须包含以下data属性：
  * `data-news-id`: 新闻ID（0, 1, 2...）
  * `data-news-url`: 新闻原文链接
  * `data-news-source`: 新闻来源
  * `data-news-time`: 发布时间
- 权威性用不同颜色标签标识（高：绿色，中：黄色，低：灰色）
- 时间显示为相对时间（如：2天前）
- **重要**：在HTML底部引入news-ai.js脚本：`<script src="/news-ai.js"></script>`（使用绝对路径）
- AI解读按钮由news-ai.js动态管理，初始HTML不需要手动添加onclick事件

## 注意事项

- 使用绝对路径，检查并创建必要目录
- 处理网络请求失败，验证新闻来源可靠性
- HTML需包含JavaScript处理AI解读请求
- **搜索策略**：WebSearch 优先，不可用时用 Brave Search（需每次间隔 `sleep 1`）
