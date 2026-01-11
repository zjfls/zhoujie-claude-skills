# 深度学习资料搜集 Skill

一个帮助你系统性收集技术学习资料的 Claude Code Skill。

## 功能特点

- **智能询问**：主动询问学习主题、范围和偏好
- **全球资源优先**：以国际权威资源为主，中文资源为辅
- **多维度搜集**：书籍、博客、网站、框架、论文
- **国际购买渠道**：Amazon、O'Reilly、Manning、Springer等
- **权威筛选**：只推荐高质量权威资源
- **论文下载**：自动下载开放获取的学术论文
- **结构化报告**：生成 Markdown 格式的学习资料清单
- **当前目录保存**：所有资料保存在当前工作目录

## 文件结构

```
deep-learning/
├── skill.json           # Skill 配置文件
├── index.md             # 主要工作流程定义
├── resources-guide.md   # 权威资源渠道指南
├── paper-downloader.py  # 论文下载辅助脚本
└── README.md            # 本说明文件
```

## 使用方法

在 Claude Code 中输入类似以下的请求：

```
帮我搜集深度学习的学习资料
```

```
我想学习 Transformer，帮我找一些好的学习资源
```

```
搜集一下强化学习的入门资料
```

Skill 会自动：
1. 询问你的具体需求
2. 搜索并整理资源
3. 尝试下载重要论文
4. 生成结构化报告

## 论文下载脚本

独立使用论文下载功能：

```bash
# 通过 arXiv ID 下载
python paper-downloader.py --arxiv 1706.03762

# 通过 URL 下载
python paper-downloader.py --url "https://arxiv.org/pdf/1706.03762.pdf"

# 通过标题搜索下载
python paper-downloader.py --title "Attention Is All You Need"

# 批量下载
python paper-downloader.py --batch papers.txt

# 指定下载目录
python paper-downloader.py --arxiv 1706.03762 --output ~/my-papers/
```

批量下载文件格式 (papers.txt):
```
arxiv:1706.03762
arxiv:1810.04805
title:BERT: Pre-training of Deep Bidirectional Transformers
url:https://example.com/paper.pdf
```

## 资源保存位置

默认保存到**当前工作目录**：
```
./learning-resources/{主题}/
├── README.md          # 学习资料报告
├── resources.json     # 结构化数据
├── papers/            # 下载的论文
└── notes/             # 学习笔记目录
```

## 支持的资源类型

### 1. 书籍（全球优先）
- 经典教材推荐（Amazon评分、Goodreads）
- 在线免费书籍
- 国际购买渠道：Amazon、O'Reilly、Manning、Springer、Packt等

### 2. 博客和教程（全球优先）
- 官方文档
- 国际知名博客：Towards Data Science、Machine Learning Mastery、Distill.pub、Lil'Log等
- 中文教程（辅助）

### 3. 课程平台（全球优先）
- Coursera / edX / Udacity
- fast.ai（强烈推荐）
- MIT OCW / Stanford Online
- YouTube：3Blue1Brown, StatQuest
- B站优质课程（辅助）

### 4. 框架和工具
- 官方仓库和文档
- GitHub Stars和活跃度
- 学习曲线评估

### 5. 论文
- 综述论文（Survey）
- 经典论文（Seminal）
- 最新研究（SOTA）
- 自动下载（arXiv、Papers With Code等）

## 版本历史

- v1.1.0 (2024-12) - 更新版本
  - 全球资源优先策略
  - 添加国际购买渠道
  - 资料保存到当前目录
- v1.0.0 (2024-12) - 初始版本
  - 基本资料搜集功能
  - 论文下载支持
  - 结构化报告生成
