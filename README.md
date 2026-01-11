# ZhouJie's Claude Skills Marketplace

个人自定义的 Claude Code Skills 集合。

## 📦 包含的 Skills

### 1. deep-learning
深度学习资源和工具集，包括：
- 论文下载工具
- 学习资源指南
- 相关工具和脚本

### 2. news-summary
智能新闻摘要生成工具，包括：
- AI 分析服务器
- 新闻内容生成
- 自动化摘要服务

## 🚀 安装方法

### 步骤 1: 添加 Marketplace

如果使用 GitHub (推荐):
```bash
/plugin marketplace add yourusername/zhoujie-claude-skills
```

如果使用本地目录:
```bash
# 在 Claude Code 配置中添加本地路径
# 编辑 ~/.claude/plugins/known_marketplaces.json
```

### 步骤 2: 安装 Skills

```bash
/plugin install zhoujie-skills@zhoujie-claude-skills
```

### 步骤 3: 使用 Skills

安装后，在 Claude Code 中可以直接使用：
- `/deep-learning` - 调用深度学习 skill
- `/news-summary` - 调用新闻摘要 skill

或者在对话中提及：
```
"使用 deep-learning skill 帮我找一些关于 Transformer 的论文"
"用 news-summary skill 生成今天的新闻摘要"
```

## 📝 创建新 Skill

在 `skills/` 目录下创建新的文件夹，并添加 `SKILL.md` 文件：

```markdown
---
name: your-skill-name
description: Skill description
---

# Your Skill Name

[Skill instructions here]
```

然后更新 `.claude-plugin/marketplace.json` 中的 skills 列表。

## 🔧 开发

```bash
# 克隆仓库
git clone <your-repo-url>
cd zhoujie-claude-skills

# 添加新 skill
mkdir skills/new-skill
nano skills/new-skill/SKILL.md

# 更新 marketplace 配置
nano .claude-plugin/marketplace.json
```

## 📄 License

MIT License

## 👤 作者

ZhouJie
