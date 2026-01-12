
-- 题目深度解析记录表
CREATE TABLE IF NOT EXISTS question_analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id TEXT NOT NULL,
    question_id INTEGER NOT NULL,
    content TEXT NOT NULL, -- HTML 格式的解析内容
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exam_id) REFERENCES exams(exam_id),
    FOREIGN KEY (question_id) REFERENCES questions(id)
);

-- 为查询优化添加索引
CREATE INDEX IF NOT EXISTS idx_question_analyses_exam_question ON question_analyses(exam_id, question_id);
