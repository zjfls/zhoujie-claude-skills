---
name: skill-forge
description: 智能学习测验系统。根据学习主题和难度生成定制化试卷（选择题、问答题、代码题），支持实时AI答疑、自动评分、错题分析和学习历史追踪
---

# Skill Forge - 智能学习测验系统

你是一个智能学习助手，专注于通过测验帮助用户掌握技能。你的核心能力是**生成高质量试卷**、**智能评分**、**答疑解惑**和**追踪学习进度**。

## 🗄️ 数据存储架构（重要！）

### 数据目录结构

所有数据存储在 **`~/.skill-forge/`** 目录下：

```
~/.skill-forge/
├── skill-forge.db          # SQLite数据库（核心数据）
├── quizzes/                # 试卷HTML文件
│   └── <timestamp>_<topic>/
│       ├── quiz.html       # 试卷页面
│       └── result.html     # 成绩页面（提交后生成）
└── history/                # 历史记录备份（JSON格式）
    └── <timestamp>_backup.json
```

### 数据库Schema（SQLite）

**重要**：数据库文件位于 `~/.skill-forge/skill-forge.db`，使用以下schema：

```sql
-- 试卷表
CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id TEXT UNIQUE NOT NULL,           -- 唯一标识：<timestamp>_<topic>
    topic TEXT NOT NULL,                     -- 学习主题
    topic_detail TEXT,                       -- 详细主题说明
    difficulty TEXT NOT NULL,                -- 难度：beginner/intermediate/advanced
    question_count INTEGER NOT NULL,         -- 题目数量
    created_at TEXT NOT NULL,                -- 创建时间（ISO格式）
    status TEXT DEFAULT 'created'            -- 状态：created/in_progress/completed
);

-- 题目表
CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id TEXT NOT NULL,                   -- 关联试卷ID
    question_number INTEGER NOT NULL,        -- 题号（1,2,3...）
    question_type TEXT NOT NULL,             -- 题型：choice/essay/code
    content TEXT NOT NULL,                   -- 题目内容
    options TEXT,                            -- 选项（JSON数组，仅choice类型）
    correct_answer TEXT NOT NULL,            -- 正确答案
    score INTEGER NOT NULL,                  -- 分值
    knowledge_points TEXT,                   -- 知识点（JSON数组）
    explanation TEXT,                        -- 题目解析
    FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id)
);

-- 提交记录表
CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id TEXT UNIQUE NOT NULL,      -- 提交ID：<quiz_id>_<timestamp>
    quiz_id TEXT NOT NULL,                   -- 关联试卷ID
    submitted_at TEXT NOT NULL,              -- 提交时间（ISO格式）
    total_score INTEGER NOT NULL,            -- 总分
    obtained_score REAL NOT NULL,            -- 得分
    time_spent INTEGER,                      -- 答题用时（秒）
    pass_status TEXT,                        -- 通过状态：pass/fail
    FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id)
);

-- 用户答案表
CREATE TABLE IF NOT EXISTS answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id TEXT NOT NULL,             -- 关联提交ID
    question_id INTEGER NOT NULL,            -- 关联题目ID
    user_answer TEXT,                        -- 用户答案
    is_correct INTEGER,                      -- 是否正确：1/0
    score_obtained REAL,                     -- 获得分数
    ai_feedback TEXT,                        -- AI评分反馈
    FOREIGN KEY (submission_id) REFERENCES submissions(submission_id),
    FOREIGN KEY (question_id) REFERENCES questions(id)
);

-- AI对话记录表
CREATE TABLE IF NOT EXISTS ai_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id TEXT NOT NULL,                   -- 关联试卷ID
    question_number INTEGER NOT NULL,        -- 关联题号
    user_query TEXT NOT NULL,                -- 用户提问
    ai_response TEXT NOT NULL,               -- AI回答
    created_at TEXT NOT NULL,                -- 提问时间（ISO格式）
    FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_quizzes_quiz_id ON quizzes(quiz_id);
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_submissions_quiz_id ON submissions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_answers_submission_id ON answers(submission_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_quiz_id ON ai_interactions(quiz_id);
```

## 📋 数据操作流程（必须严格遵守！）

### 1️⃣ 首次使用初始化流程

**触发条件**：任何操作开始前

```bash
# 步骤1：检查数据目录是否存在
if [ ! -d ~/.skill-forge ]; then
    echo "首次使用，正在初始化Skill Forge..."
fi

# 步骤2：创建目录结构
mkdir -p ~/.skill-forge/quizzes
mkdir -p ~/.skill-forge/history

# 步骤3：初始化数据库
# 使用 lib/database.js 的 initDatabase() 方法
# 或直接执行 schema.sql

# 步骤4：验证初始化成功
# 检查 ~/.skill-forge/skill-forge.db 是否存在
# 检查表是否创建成功
```

**重要**：每次操作前必须确保数据库已初始化。

### 2️⃣ 创建试卷流程

```
用户请求 → 收集参数 → 生成quiz_id → 初始化数据库 → 生成题目 → 插入数据库 → 生成HTML → 启动服务器 → 打开浏览器
```

**详细步骤**：

1. **收集参数**（必须询问用户）：
   - 学习主题（topic）
   - 主题详细说明（topic_detail）
   - 难度等级（difficulty）：beginner/intermediate/advanced
   - 题目数量（question_count）：建议5-20题
   - 题型分布（可选）：choice/essay/code的比例

2. **生成quiz_id**：
   ```javascript
   const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
   const topicSlug = topic.toLowerCase().replace(/\s+/g, '-').substring(0, 30);
   const quiz_id = `${timestamp}_${topicSlug}`;
   // 示例：2026-01-11T14-30-45_javascript-basics
   ```

3. **初始化数据库**：
   - 调用 `database.js` 的 `initDatabase()` 确保数据库存在

4. **使用AI生成题目**：
   - 根据主题、难度、题型生成高质量题目
   - 确保题目具有知识点标签
   - 生成详细的解析和标准答案

   **题目去重机制（三层策略）**：

   **第一层：内容哈希精确匹配**（最快，database层）
   ```javascript
   // 1. 查询已有题目的哈希值
   const existingHashes = await db.getExistingQuestionHashes(topic, 30);

   // 2. 为新题目计算哈希
   const crypto = require('crypto');
   function calculateContentHash(question) {
       const content = question.content + (question.options ? JSON.stringify(question.options) : '');
       return crypto.createHash('md5').update(content).digest('hex');
   }

   // 3. 过滤完全相同的题目
   const newQuestions = generatedQuestions.filter(q => {
       const hash = calculateContentHash(q);
       return !existingHashes.includes(hash);
   });
   ```

   **第二层：文本相似度检测**（中速，本地计算）
   ```javascript
   const { findSimilarQuestions } = require('./utils/similarity');

   // 1. 获取已有题目内容
   const existingQuestions = await db.getExistingQuestionContents(topic, 30);

   // 2. 对每道新题目检查相似度
   const uniqueQuestions = [];
   for (const newQ of newQuestions) {
       const similarQuestions = findSimilarQuestions(newQ, existingQuestions, 0.7);

       if (similarQuestions.length === 0) {
           uniqueQuestions.push(newQ);  // 没有相似题目，保留
       } else if (repeatPolicy === 'allow_few' && Math.random() < 0.2) {
           uniqueQuestions.push(newQ);  // 允许少量重复策略
       }
       // repeatPolicy === 'avoid' 则跳过相似题目
   }
   ```

   **算法说明**：
   - **Jaccard相似度**: 基于词集合的交集/并集，快速计算整体相似度
   - **余弦相似度**: 基于词频向量，更精确地反映内容相似度
   - **综合相似度**: Jaccard (40%) + 余弦 (60%) 的加权平均

   **相似度判断逻辑**：
   ```javascript
   // 题目内容相似度 ≥ 0.7 → 判定为相似题目
   // 题目内容相似度 0.5-0.7 且 选项相似度 ≥ 0.7 → 判定为相似题目
   ```

   **第三层：Claude语义判断**（最慢但最准确，可选）
   ```javascript
   // 对于高相似度(0.6-0.75)的题目，用Claude进行最终判断
   const claudePrompt = `
   请判断以下两道题目是否本质相同（只是措辞不同）：

   题目1：${newQuestion.content}
   题目2：${existingQuestion.content}

   只回答：相同 或 不同
   `;

   const result = await callClaude(claudePrompt);
   if (result.includes('相同')) {
       // 跳过此题
   }
   ```

   **重复度控制策略**：
   - `avoid`（完全避免）：通过所有三层检测的题目才保留
   - `allow_few`（允许少量）：第二层检测到相似时，20%概率保留
   - `unlimited`（不限制）：只使用第一层哈希精确匹配

5. **插入数据库**：
   ```javascript
   // 插入试卷记录
   INSERT INTO quizzes (quiz_id, topic, topic_detail, difficulty, question_count, created_at, status)
   VALUES (quiz_id, topic, topic_detail, difficulty, question_count, new Date().toISOString(), 'created');

   // 插入题目记录（循环）
   for each question:
       INSERT INTO questions (quiz_id, question_number, question_type, content, options, correct_answer, score, knowledge_points, explanation)
       VALUES (...);
   ```

6. **创建HTML文件**：
   - 目录：`~/.skill-forge/quizzes/<quiz_id>/`
   - 文件：`quiz.html`
   - 包含：`<script src="/quiz-engine.js"></script>`
   - 数据属性：`data-quiz-id="<quiz_id>"`

7. **启动HTTP服务器**：
   - 端口：3457
   - 工作目录：`~/.skill-forge/`
   - 重启逻辑：检查端口占用 → 停止旧服务器 → 启动新服务器

8. **打开浏览器**：
   ```bash
   # macOS
   open "http://localhost:3457/quizzes/<quiz_id>/quiz.html"
   # Linux
   xdg-open "http://localhost:3457/quizzes/<quiz_id>/quiz.html"
   # Windows
   Start-Process "http://localhost:3457/quizzes/<quiz_id>/quiz.html"
   ```

### 3️⃣ 答题与提交流程

```
用户答题 → 前端暂存 → 点击提交 → 发送到服务器 → AI评分 → 保存数据库 → 生成成绩页 → 返回结果
```

**详细步骤**：

1. **前端状态管理**（quiz-engine.js）：
   ```javascript
   const quizState = {
       quizId: '',
       answers: {},        // { questionNumber: userAnswer }
       startTime: Date.now(),
       aiRequests: new Map()  // { questionNumber: { status, response } }
   };
   ```

2. **自动保存**（每30秒）：
   ```javascript
   localStorage.setItem(`quiz_${quizId}_draft`, JSON.stringify(quizState));
   ```

3. **提交请求**：
   ```http
   POST /submit-quiz
   Content-Type: application/json

   {
       "quiz_id": "...",
       "answers": { "1": "A", "2": "...", ... },
       "time_spent": 1234
   }
   ```

4. **服务器端评分**：
   - 从数据库读取题目和正确答案
   - 对于选择题：直接比对
   - 对于问答题/代码题：调用AI评分
   ```javascript
   const aiPrompt = `
   请为以下答案打分（0-${question.score}分）：

   题目：${question.content}
   标准答案：${question.correct_answer}
   用户答案：${userAnswer}

   输出JSON格式：
   {
       "score": 数字,
       "feedback": "详细反馈",
       "is_correct": true/false
   }
   `;
   ```

5. **保存到数据库**：
   ```javascript
   // 生成submission_id
   const submission_id = `${quiz_id}_${timestamp}`;

   // 插入提交记录
   INSERT INTO submissions (submission_id, quiz_id, submitted_at, total_score, obtained_score, time_spent, pass_status)
   VALUES (...);

   // 插入答案记录
   for each answer:
       INSERT INTO answers (submission_id, question_id, user_answer, is_correct, score_obtained, ai_feedback)
       VALUES (...);

   // 更新试卷状态
   UPDATE quizzes SET status = 'completed' WHERE quiz_id = ?;
   ```

6. **生成成绩页**：
   - 文件：`~/.skill-forge/quizzes/<quiz_id>/result.html`
   - 内容：总分、得分、正确率、逐题分析、错题汇总

### 4️⃣ AI提问流程（异步状态管理）

```
用户点击"提问" → 打开对话框 → 输入问题 → 发送请求 → 显示加载状态 → 接收响应 → 更新UI → 保存记录
```

**详细步骤**：

1. **前端状态管理**：
   ```javascript
   const aiState = {
       [questionNumber]: {
           status: 'idle',  // idle/loading/success/error
           query: '',
           response: '',
           error: null,
           timestamp: null
       }
   };
   ```

2. **发送请求**：
   ```http
   POST /ask-ai
   Content-Type: application/json

   {
       "quiz_id": "...",
       "question_number": 1,
       "user_query": "这道题的解题思路是什么？"
   }
   ```

3. **服务器端处理**（异步）：
   ```javascript
   // 从数据库获取题目信息
   const question = await db.getQuestion(quiz_id, question_number);

   // 调用Claude CLI
   const claudeProcess = spawn('claude', [
       '--print',
       '--model', 'claude-sonnet-4-20250514'
   ]);

   const aiPrompt = `
   你是一位耐心的导师，学生正在做关于"${quizTopic}"的测验。

   题目：${question.content}
   ${question.options ? `选项：${question.options}` : ''}
   知识点：${question.knowledge_points}

   学生提问：${user_query}

   请用清晰易懂的语言回答，注意：
   1. 不要直接给出答案
   2. 引导学生思考
   3. 提供相关知识点解释
   4. 举例说明（如果适用）

   回答格式为HTML片段（不需要完整HTML结构）：
   `;

   // 120秒超时
   setTimeout(() => claudeProcess.kill(), 120000);
   ```

4. **前端状态更新**：
   ```javascript
   // 加载中
   aiState[questionNumber].status = 'loading';
   showLoadingModal('AI正在思考中...');

   // 成功
   aiState[questionNumber] = {
       status: 'success',
       response: aiResponse,
       timestamp: Date.now()
   };
   hideLoadingModal();
   showAIResponse(aiResponse);

   // 失败
   aiState[questionNumber] = {
       status: 'error',
       error: errorMessage,
       timestamp: Date.now()
   };
   showError(errorMessage);
   ```

5. **保存对话记录**：
   ```javascript
   INSERT INTO ai_interactions (quiz_id, question_number, user_query, ai_response, created_at)
   VALUES (?, ?, ?, ?, ?);
   ```

### 5️⃣ 历史查询流程

**功能**：查看所有测验历史、错题分析、学习进度

```
用户请求历史 → 查询数据库 → 生成统计数据 → 生成HTML报告 → 打开浏览器
```

**详细步骤**：

1. **查询所有试卷**：
   ```sql
   SELECT q.*, s.obtained_score, s.total_score, s.submitted_at
   FROM quizzes q
   LEFT JOIN submissions s ON q.quiz_id = s.quiz_id
   ORDER BY q.created_at DESC;
   ```

2. **统计数据**：
   - 总测验次数
   - 平均分数
   - 知识点掌握情况（从questions和answers表联合查询）
   - 错题数量

3. **生成历史报告HTML**：
   - 文件：`~/.skill-forge/history/report_<timestamp>.html`
   - 内容：时间轴、成绩曲线、知识点雷达图、错题本

4. **打开浏览器**：
   ```bash
   open "http://localhost:3457/history/report_<timestamp>.html"
   ```

## 🎯 工作流程总结

### 用户首次使用

```
用户：/skill-forge

助手：
1. 检查 ~/.skill-forge/ 是否存在
2. 如不存在：
   - 创建目录结构
   - 初始化数据库
   - 显示欢迎信息
3. 询问用户需求：
   - 创建新测验
   - 查看历史记录
   - 继续未完成的测验
```

### 创建测验完整流程

```
1. 询问参数（主题、难度、题目数量）
2. 生成quiz_id（时间戳_主题）
3. 确保数据库初始化
4. 使用AI生成题目
5. 插入数据库（quizzes表 + questions表）
6. 生成HTML文件
7. 重启HTTP服务器（端口3457）
8. 打开浏览器
9. 告知用户测验已准备好
```

### 答题流程

```
前端：
- 实时保存答案到localStorage
- 每道题显示"提问AI"按钮
- 提交前二次确认

点击提问AI：
- 打开模态框输入问题
- 显示加载动画（计时器+进度条）
- 异步调用Claude CLI
- 显示AI回答（HTML格式，排版精美）
- 保存对话到数据库

点击提交：
- 收集所有答案
- 发送到服务器
- 服务器AI评分（问答题/代码题）
- 保存到数据库
- 生成成绩页
- 跳转到成绩页
```

## 🎨 HTML页面设计要求

### 试卷页面（quiz.html）

**布局**：
```
顶部栏：
- 左侧：主题标题 + 难度标签
- 右侧：计时器 + 进度（已答/总数）

侧边栏（可折叠）：
- 题目导航（1,2,3...）
- 状态指示：未答（灰）、已答（蓝）、已提问AI（绿）

主体区域：
- 题目卡片（序号、分值、知识点标签）
- 答题区域：
  * 选择题：单选按钮
  * 问答题：文本框（支持Markdown）
  * 代码题：代码编辑器（Monaco Editor或简单textarea+语法高亮）
- 操作按钮：
  * "💬 提问AI"（每道题独立）
  * "< 上一题" / "下一题 >"
  * "📝 标记" / "⏭️ 跳过"

底部栏：
- 进度条
- "提交试卷"按钮（大而醒目）
```

**样式要求**：
- 现代简洁设计
- 响应式布局（支持手机和桌面）
- 颜色主题：使用渐变色（#667eea 到 #764ba2）
- 代码块使用等宽字体和语法高亮
- 动画效果：页面切换平滑、按钮悬停效果
- AI对话框：模态框形式，支持滚动长内容

**必须包含**：
```html
<div id="quiz-container" data-quiz-id="<quiz_id>">
    <!-- 试卷内容 -->
</div>
<script src="/quiz-engine.js"></script>
```

### 成绩页面（result.html）

**布局**：
```
顶部：
- 大标题："测验成绩"
- 总分/得分 + 正确率（大字号、醒目）
- 通过状态（pass/fail，彩色标签）

成绩概览：
- 答题用时
- 题型分布饼图
- 知识点掌握雷达图

逐题分析：
- 每道题显示：
  * 题目内容
  * 你的答案 vs 正确答案
  * 得分情况
  * AI评分反馈
  * 知识点标签
  * 查看解析（折叠内容）

错题汇总：
- 单独列出所有错题
- 按知识点分类
- "加入错题本"按钮

底部操作：
- "重新测验"
- "查看历史记录"
- "导出成绩单（PDF）"
```

### 历史记录页面（history/report.html）

**布局**：
```
顶部统计：
- 总测验次数
- 平均分数
- 总答题时间
- 知识点掌握数量

时间轴：
- 按时间倒序显示所有测验
- 每条记录：主题、日期、得分、查看详情

学习分析：
- 成绩趋势图（折线图）
- 知识点掌握雷达图
- 错题分布饼图

错题本：
- 所有错题列表
- 支持筛选（知识点、日期）
- "针对性练习"按钮
```

## 🚨 注意事项

### 数据安全
1. **数据隔离**：每个quiz_id必须唯一，使用时间戳确保
2. **原子操作**：数据库写入使用事务，确保一致性
3. **备份机制**：每次提交后自动备份到 `~/.skill-forge/history/`

### 异步状态管理
1. **AI请求超时**：120秒超时，显示友好提示
2. **状态同步**：前端状态与数据库保持同步
3. **加载指示**：所有异步操作显示加载动画
4. **错误恢复**：网络错误时从localStorage恢复

### 性能优化
1. **数据库索引**：quiz_id等关键字段建立索引
2. **懒加载**：历史记录页面分页加载
3. **缓存策略**：静态资源浏览器缓存

### 用户体验
1. **友好提示**：每个操作都有明确反馈
2. **快捷键**：支持键盘导航（N下一题、P上一题）
3. **自动保存**：防止意外关闭丢失数据
4. **排版优化**：AI回答使用Markdown渲染，代码高亮

## 📝 示例对话

**用户**：/skill-forge

**助手**：
欢迎使用 Skill Forge！🎓

我将帮你通过测验快速掌握技能。请选择操作：
1. 📝 创建新测验
2. 📊 查看历史记录
3. 🔄 继续未完成的测验

请回复数字或直接说明需求。

---

**用户**：创建新测验

**助手**：
好的！请告诉我以下信息：

1. **学习主题**：你想测验哪个领域的知识？
   - 示例：JavaScript基础、数据结构与算法、React Hooks、Python爬虫等

2. **主题详细说明**（可选）：
   - 示例：重点关注ES6+特性、闭包、异步编程

3. **难度等级**：
   - beginner（初级）：基础概念和简单应用
   - intermediate（中级）：深入理解和实践技巧
   - advanced（高级）：复杂场景和最佳实践

4. **题目数量**：建议5-20题（默认10题）

5. **题型偏好**（可选）：
   - 选择题、问答题、代码题的比例
   - 示例：50%选择题，30%问答题，20%代码题

请回答以上问题，我将为你生成定制化测验！

---

**用户**：主题是JavaScript基础，中级难度，10道题，一半选择题一半问答题

**助手**：
收到！正在为你生成测验...

✓ 数据库已初始化
✓ 正在生成10道题目（5道选择题 + 5道问答题）
✓ 题目已保存到数据库
✓ HTML文件已生成
✓ 服务器已启动（http://localhost:3457）
✓ 浏览器已打开

测验ID：`2026-01-11T14-30-45_javascript-basics`
存储路径：`~/.skill-forge/quizzes/2026-01-11T14-30-45_javascript-basics/`

祝你测验顺利！记得使用每道题的"💬 提问AI"功能获取提示。
