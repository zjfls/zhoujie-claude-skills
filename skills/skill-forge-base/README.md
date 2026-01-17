# Skill Forge 🎓

智能学习测验系统 - 通过AI定制化测验助力技能提升

## 📖 简介

Skill Forge 是一个基于AI的智能学习测验工具，能够根据你的学习主题和难度自动生成定制化试卷，支持实时AI答疑、自动评分、错题分析和学习历史追踪。

### 核心特性

- 🎯 **智能出题**：AI根据主题和难度生成高质量题目
- 💬 **实时答疑**：每道题可向AI导师提问，获得引导式解答
- 📊 **自动评分**：选择题即时判分，问答题和代码题由AI智能评分
- 📈 **学习追踪**：记录所有测验历史，分析知识点掌握情况
- 🔖 **错题本**：自动收集错题，支持针对性复习
- 💾 **自动保存**：答题进度实时保存，防止意外丢失

## 🚀 使用方法

### 安装依赖

```bash
cd skills/skill-forge/lib
npm install sqlite3
```

### 调用Skill

在 Claude Code 中使用：

```bash
/skill-forge
```

或直接说：

```
"帮我创建一个JavaScript测验"
"我想测验一下Python基础"
```

### 创建测验流程

1. **指定学习主题**（必填）
   - 示例：JavaScript基础、数据结构与算法、React Hooks等

2. **选择难度等级**（必填）
   - beginner（初级）：基础概念和简单应用
   - intermediate（中级）：深入理解和实践技巧
   - advanced（高级）：复杂场景和最佳实践

3. **设置题目数量**（建议5-20题）

4. **题型分布**（可选）
   - 选择题：快速检验概念掌握
   - 问答题：考查理解深度
   - 代码题：实战编程能力

## 📂 数据存储

所有数据存储在 `~/.skill-forge/` 目录：

```
~/.skill-forge/
├── skill-forge.db          # SQLite数据库
├── quizzes/                # 试卷HTML文件
│   └── <timestamp>_<topic>/
│       ├── quiz.html       # 试卷页面
│       └── result.html     # 成绩页面
└── history/                # 历史记录备份
```

### 数据库表结构

- **quizzes**：试卷信息
- **questions**：题目详情
- **submissions**：提交记录
- **answers**：用户答案
- **ai_interactions**：AI对话记录

## 🎨 功能详解

### 1. AI提问功能

每道题都有"💬 向AI提问"按钮：

- 点击后输入你的疑问
- AI会引导你思考，而不是直接给答案
- 对话记录会保存到数据库，方便回顾

**示例对话**：

```
学生：这道题的解题思路是什么？
AI：这道题考查的是xxx知识点。首先，我们需要理解...
    你可以从以下角度思考：1) ... 2) ... 3) ...
```

### 2. 自动评分系统

- **选择题**：即时判分，正确/错误
- **问答题**：AI评分，给出详细反馈和部分得分
- **代码题**：AI分析代码质量、逻辑正确性、最佳实践

评分标准：
- 完全正确：满分
- 基本正确（有小瑕疵）：70%-90%
- 部分正确：40%-70%
- 基本错误：0%-40%

### 3. 学习历史分析

通过 `/skill-forge history` 查看：

- 📊 **成绩趋势**：所有测验的分数变化曲线
- 🎯 **知识点掌握**：各知识点的正确率统计
- 📝 **错题本**：按知识点分类的所有错题
- ⏱️ **时间统计**：总学习时间、平均答题速度

### 4. 键盘快捷键

- `Ctrl/Cmd + →` 或 `Ctrl/Cmd + N`：下一题
- `Ctrl/Cmd + ←` 或 `Ctrl/Cmd + P`：上一题

## 🛠️ 技术架构

### 后端（Node.js）

- **HTTP服务器**：端口3457
- **数据库**：SQLite
- **AI集成**：Claude CLI（claude-sonnet-4模型）

### 前端（原生JavaScript）

- **状态管理**：内存+localStorage混合模式
- **异步处理**：Promise + async/await
- **UI交互**：模态框、进度条、实时更新

### 数据流

```
用户答题 → localStorage暂存 → 提交 → 服务器评分 → 数据库持久化 → 生成成绩页
      ↓
  AI提问 → 异步请求 → 轮询状态 → 显示回答 → 保存对话
```

## 📝 示例

### 创建JavaScript测验

```
用户：/skill-forge

助手：欢迎使用 Skill Forge！请选择操作：
      1. 📝 创建新测验
      2. 📊 查看历史记录

用户：创建新测验

助手：请告诉我：
      1. 学习主题：
      2. 难度等级：（beginner/intermediate/advanced）
      3. 题目数量：（5-20题）

用户：主题是JavaScript基础，中级难度，10道题

助手：✓ 正在生成测验...
      ✓ 数据库已初始化
      ✓ 10道题目已生成（5道选择题 + 5道问答题）
      ✓ 服务器已启动
      ✓ 浏览器已打开

      测验ID：2026-01-11T14-30-45_javascript-basics
      祝你测验顺利！
```

### 查看历史记录

```
用户：查看我的学习历史

助手：正在生成历史报告...

      📊 学习统计：
      - 总测验次数：15次
      - 平均分数：82.5分
      - 知识点掌握：JavaScript基础(90%) / 异步编程(75%) / ...

      📝 错题本：
      - 共收集 23 道错题
      - 重点复习：Promise、闭包、原型链

      已打开历史报告页面。
```

## ⚙️ 配置说明

### 环境要求

- Node.js >= 14.0
- SQLite3
- Claude Code CLI

### 配置文件

**位置**: `~/.skill-forge/config.json`

**自动创建**：首次使用时系统自动生成，包含所有默认配置。

**手动编辑**（如需自定义）：

```bash
# 编辑配置文件
vi ~/.skill-forge/config.json
```

**完整配置项**：

```json
{
    "version": "1.0.0",
    "ai": {
        "model": "mcs-1",              // AI模型名称
        "timeout": 120000,             // AI请求超时（毫秒）
        "cliCommand": "claude",        // Claude CLI命令
        "temperature": 0.7             // AI生成温度（0-1）
    },
    "server": {
        "port": 3457,                  // HTTP服务器端口
        "dataDir": "~/.skill-forge"    // 数据存储目录
    },
    "quiz": {
        "defaultDifficulty": "intermediate",  // 默认难度
        "defaultQuestionCount": 10,           // 默认题目数量
        "autoSaveInterval": 30000,            // 自动保存间隔（毫秒）
        "passThreshold": 60                   // 及格分数线（%）
    },
    "deduplication": {
        "enabled": true,               // 启用题目去重
        "policy": "avoid",             // 去重策略
        "similarityThreshold": 0.7,    // 相似度阈值
        "lookbackDays": 30             // 回溯天数
    }
}
```

**常用配置修改**：

```bash
# 修改端口号（如果3457被占用）
# 编辑 config.json，修改 "port": 3457 为其他端口

# 调整及格分数线
# 编辑 config.json，修改 "passThreshold": 60 为其他值（如70）

# 调整AI超时时间
# 编辑 config.json，修改 "timeout": 120000 为其他值

# 修改题目去重策略
# "avoid"（完全避免重复）
# "allow_few"（允许少量重复）
# "unlimited"（不限制重复）
```

**配置生效**：修改配置后需重启服务器：

```bash
# 查找并停止服务器
lsof -ti:3457 | xargs kill -9

# 重新调用skill，服务器会自动启动
/skill-forge
```

## 🔒 数据安全

- **数据隔离**：每个测验使用唯一ID（时间戳+主题）
- **原子操作**：数据库写入使用事务，确保一致性
- **自动备份**：每次提交后备份到 `~/.skill-forge/history/`
- **本地存储**：所有数据存储在本地，不上传云端

## 🐛 故障排除

### 服务器启动失败

```bash
# 检查端口占用
lsof -ti:3457

# 停止旧进程
kill -9 <PID>

# 重新启动
node lib/server.js
```

### 数据库初始化失败

```bash
# 删除旧数据库重新初始化
rm ~/.skill-forge/skill-forge.db

# 重新运行skill
/skill-forge
```

### AI请求超时

- 检查网络连接
- 确认Claude CLI正常工作：`claude --version`
- 增加超时时间：修改 `lib/server.js` 中的 `AI_TIMEOUT`

## 📄 License

MIT License

## 👤 作者

ZhouJie - Skill Forge 智能学习系统

---

**开始你的学习之旅** 🚀

在 Claude Code 中输入 `/skill-forge` 即可开始！
