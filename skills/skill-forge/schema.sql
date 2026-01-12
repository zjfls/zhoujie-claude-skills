-- Skill Forge Database Schema
-- SQLite数据库初始化脚本
-- 数据库文件位置：~/.skill-forge/skill-forge.db

-- 试卷表
CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id TEXT UNIQUE NOT NULL,           -- 唯一标识：<timestamp>_<topic>
    topic TEXT NOT NULL,                     -- 学习主题
    topic_detail TEXT,                       -- 详细主题说明
    difficulty TEXT NOT NULL,                -- 难度：beginner/intermediate/advanced
    question_count INTEGER NOT NULL,         -- 题目数量
    created_at TEXT NOT NULL                 -- 创建时间（ISO格式）
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
    source_type TEXT DEFAULT 'ai_generated', -- 题目来源类型：ai_generated/imported/manual
    source_url TEXT,                         -- 来源URL（如果适用）
    source_name TEXT,                        -- 来源名称（如果适用）
    content_hash TEXT,                       -- 内容哈希（用于去重）
    FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id)
);

-- 测验表（新增）- 跟踪答题过程
CREATE TABLE IF NOT EXISTS exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id TEXT UNIQUE NOT NULL,            -- 测验ID：<quiz_id>_<timestamp>
    quiz_id TEXT NOT NULL,                   -- 关联试卷ID
    status TEXT DEFAULT 'in_progress',       -- 状态：in_progress/completed/abandoned
    started_at TEXT NOT NULL,                -- 开始时间（ISO格式）
    FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id)
);

-- 提交记录表
CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id TEXT UNIQUE NOT NULL,      -- 提交ID：<exam_id>_<timestamp>
    exam_id TEXT NOT NULL,                   -- 关联测验ID
    quiz_id TEXT NOT NULL,                   -- 关联试卷ID（冗余字段便于查询）
    submitted_at TEXT NOT NULL,              -- 提交时间（ISO格式）
    total_score INTEGER NOT NULL,            -- 总分
    obtained_score REAL NOT NULL,            -- 得分
    time_spent INTEGER,                      -- 答题用时（秒）
    pass_status TEXT,                        -- 通过状态：pass/fail
    FOREIGN KEY (exam_id) REFERENCES exams(exam_id),
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
    exam_id TEXT NOT NULL,                   -- 关联测验ID
    quiz_id TEXT NOT NULL,                   -- 关联试卷ID（冗余字段便于查询）
    question_number INTEGER NOT NULL,        -- 关联题号
    user_query TEXT NOT NULL,                -- 用户提问
    ai_response TEXT NOT NULL,               -- AI回答
    created_at TEXT NOT NULL,                -- 提问时间（ISO格式）
    FOREIGN KEY (exam_id) REFERENCES exams(exam_id),
    FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_quizzes_quiz_id ON quizzes(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_at ON quizzes(created_at);
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_exams_quiz_id ON exams(quiz_id);
CREATE INDEX IF NOT EXISTS idx_exams_status ON exams(status);
CREATE INDEX IF NOT EXISTS idx_submissions_exam_id ON submissions(exam_id);
CREATE INDEX IF NOT EXISTS idx_submissions_quiz_id ON submissions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at);
CREATE INDEX IF NOT EXISTS idx_answers_submission_id ON answers(submission_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_exam_id ON ai_interactions(exam_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_quiz_id ON ai_interactions(quiz_id);
