const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const os = require('os');

// 数据目录：~/.skill-forge/
const DATA_DIR = path.join(os.homedir(), '.skill-forge');
const DB_PATH = path.join(DATA_DIR, 'skill-forge.db');
const QUIZZES_DIR = path.join(DATA_DIR, 'quizzes');
const HISTORY_DIR = path.join(DATA_DIR, 'history');

/**
 * 数据库操作类
 */
class Database {
    constructor() {
        this.db = null;
    }

    /**
     * 初始化数据库（首次使用或每次操作前调用）
     */
    async initDatabase() {
        // 创建目录结构
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
            console.log(`✓ 创建数据目录: ${DATA_DIR}`);
        }
        if (!fs.existsSync(QUIZZES_DIR)) {
            fs.mkdirSync(QUIZZES_DIR, { recursive: true });
        }
        if (!fs.existsSync(HISTORY_DIR)) {
            fs.mkdirSync(HISTORY_DIR, { recursive: true });
        }

        // 打开数据库连接
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(DB_PATH, (err) => {
                if (err) {
                    console.error('数据库打开失败:', err);
                    reject(err);
                    return;
                }
                console.log(`✓ 数据库已连接: ${DB_PATH}`);

                // 读取并执行schema.sql
                const schemaPath = path.join(__dirname, '..', 'schema.sql');
                const schema = fs.readFileSync(schemaPath, 'utf8');

                this.db.exec(schema, (err) => {
                    if (err) {
                        console.error('Schema执行失败:', err);
                        reject(err);
                        return;
                    }
                    console.log('✓ 数据库表已初始化');
                    resolve();
                });
            });
        });
    }

    /**
     * 关闭数据库连接
     */
    close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            } else {
                resolve();
            }
        });
    }

    /**
     * 执行查询（返回单行）
     */
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    /**
     * 执行查询（返回所有行）
     */
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    /**
     * 执行插入/更新/删除
     */
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    }

    // ==================== 试卷相关操作 ====================

    /**
     * 创建试卷记录
     */
    async createQuiz(quizData) {
        const { quiz_id, topic, topic_detail, difficulty, question_count } = quizData;
        const sql = `
            INSERT INTO quizzes (quiz_id, topic, topic_detail, difficulty, question_count, created_at, status)
            VALUES (?, ?, ?, ?, ?, ?, 'created')
        `;
        return this.run(sql, [quiz_id, topic, topic_detail, difficulty, question_count, new Date().toISOString()]);
    }

    /**
     * 获取试卷信息
     */
    async getQuiz(quiz_id) {
        const sql = 'SELECT * FROM quizzes WHERE quiz_id = ?';
        return this.get(sql, [quiz_id]);
    }

    /**
     * 更新试卷状态
     */
    async updateQuizStatus(quiz_id, status) {
        const sql = 'UPDATE quizzes SET status = ? WHERE quiz_id = ?';
        return this.run(sql, [status, quiz_id]);
    }

    /**
     * 获取所有试卷（用于历史记录）
     */
    async getAllQuizzes() {
        const sql = `
            SELECT q.*, s.obtained_score, s.total_score, s.submitted_at, s.pass_status
            FROM quizzes q
            LEFT JOIN submissions s ON q.quiz_id = s.quiz_id
            ORDER BY q.created_at DESC
        `;
        return this.all(sql);
    }

    // ==================== 题目相关操作 ====================

    /**
     * 批量插入题目
     */
    async insertQuestions(quiz_id, questions) {
        const sql = `
            INSERT INTO questions (
                quiz_id, question_number, question_type, content,
                options, correct_answer, score, knowledge_points,
                explanation, source_type, source_url, source_name, content_hash
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const crypto = require('crypto');

        for (const q of questions) {
            // 计算题目内容哈希（用于去重）
            const contentForHash = q.content + (q.options ? JSON.stringify(q.options) : '');
            const content_hash = crypto.createHash('md5').update(contentForHash).digest('hex');

            await this.run(sql, [
                quiz_id,
                q.question_number,
                q.question_type,
                q.content,
                q.options ? JSON.stringify(q.options) : null,
                q.correct_answer,
                q.score,
                JSON.stringify(q.knowledge_points || []),
                q.explanation,
                q.source_type || 'ai_generated',
                q.source_url || null,
                q.source_name || null,
                content_hash
            ]);
        }
    }

    /**
     * 获取试卷的所有题目
     */
    async getQuestions(quiz_id) {
        const sql = 'SELECT * FROM questions WHERE quiz_id = ? ORDER BY question_number';
        const rows = await this.all(sql, [quiz_id]);

        // 解析JSON字段
        return rows.map(row => ({
            ...row,
            options: row.options ? JSON.parse(row.options) : null,
            knowledge_points: JSON.parse(row.knowledge_points || '[]')
        }));
    }

    /**
     * 获取单个题目
     */
    async getQuestion(quiz_id, question_number) {
        const sql = 'SELECT * FROM questions WHERE quiz_id = ? AND question_number = ?';
        const row = await this.get(sql, [quiz_id, question_number]);

        if (row) {
            return {
                ...row,
                options: row.options ? JSON.parse(row.options) : null,
                knowledge_points: JSON.parse(row.knowledge_points || '[]')
            };
        }
        return null;
    }

    /**
     * 获取已做过的题目哈希（用于去重 - 第一层：精确匹配）
     * @param {string} topic - 主题关键词
     * @param {number} days - 查询最近多少天的题目（默认30天）
     * @returns {Array<string>} - 题目内容哈希数组
     */
    async getExistingQuestionHashes(topic, days = 30) {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - days);

        const sql = `
            SELECT DISTINCT q.content_hash
            FROM questions q
            JOIN quizzes qz ON q.quiz_id = qz.quiz_id
            WHERE qz.topic LIKE ?
              AND qz.created_at > ?
              AND q.content_hash IS NOT NULL
        `;

        const rows = await this.all(sql, [`%${topic}%`, daysAgo.toISOString()]);
        return rows.map(row => row.content_hash);
    }

    /**
     * 获取已做过的题目内容（用于语义去重 - 第二层：相似度检测）
     * @param {string} topic - 主题关键词
     * @param {number} days - 查询最近多少天的题目（默认30天）
     * @returns {Array<Object>} - 题目对象数组 [{content, options, question_type}]
     */
    async getExistingQuestionContents(topic, days = 30) {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - days);

        const sql = `
            SELECT q.content, q.options, q.question_type, q.knowledge_points
            FROM questions q
            JOIN quizzes qz ON q.quiz_id = qz.quiz_id
            WHERE qz.topic LIKE ?
              AND qz.created_at > ?
            ORDER BY qz.created_at DESC
        `;

        const rows = await this.all(sql, [`%${topic}%`, daysAgo.toISOString()]);

        return rows.map(row => ({
            content: row.content,
            options: row.options ? JSON.parse(row.options) : null,
            question_type: row.question_type,
            knowledge_points: JSON.parse(row.knowledge_points || '[]')
        }));
    }

    // ==================== 提交相关操作 ====================

    /**
     * 创建提交记录
     */
    async createSubmission(submissionData) {
        const { submission_id, quiz_id, total_score, obtained_score, time_spent, pass_status } = submissionData;
        const sql = `
            INSERT INTO submissions (submission_id, quiz_id, submitted_at, total_score, obtained_score, time_spent, pass_status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        return this.run(sql, [submission_id, quiz_id, new Date().toISOString(), total_score, obtained_score, time_spent, pass_status]);
    }

    /**
     * 获取提交记录
     */
    async getSubmission(submission_id) {
        const sql = 'SELECT * FROM submissions WHERE submission_id = ?';
        return this.get(sql, [submission_id]);
    }

    /**
     * 批量插入答案
     */
    async insertAnswers(answers) {
        const sql = `
            INSERT INTO answers (submission_id, question_id, user_answer, is_correct, score_obtained, ai_feedback)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        for (const a of answers) {
            await this.run(sql, [
                a.submission_id,
                a.question_id,
                a.user_answer,
                a.is_correct ? 1 : 0,
                a.score_obtained,
                a.ai_feedback
            ]);
        }
    }

    /**
     * 获取提交的所有答案
     */
    async getAnswers(submission_id) {
        const sql = `
            SELECT a.*, q.content, q.correct_answer, q.question_number, q.question_type, q.knowledge_points
            FROM answers a
            JOIN questions q ON a.question_id = q.id
            WHERE a.submission_id = ?
            ORDER BY q.question_number
        `;
        const rows = await this.all(sql, [submission_id]);

        return rows.map(row => ({
            ...row,
            knowledge_points: JSON.parse(row.knowledge_points || '[]'),
            is_correct: row.is_correct === 1
        }));
    }

    // ==================== AI对话相关操作 ====================

    /**
     * 保存AI对话记录
     */
    async saveAIInteraction(quiz_id, question_number, user_query, ai_response) {
        const sql = `
            INSERT INTO ai_interactions (quiz_id, question_number, user_query, ai_response, created_at)
            VALUES (?, ?, ?, ?, ?)
        `;
        return this.run(sql, [quiz_id, question_number, user_query, ai_response, new Date().toISOString()]);
    }

    /**
     * 获取某题目的AI对话历史
     */
    async getAIInteractions(quiz_id, question_number) {
        const sql = `
            SELECT * FROM ai_interactions
            WHERE quiz_id = ? AND question_number = ?
            ORDER BY created_at DESC
        `;
        return this.all(sql, [quiz_id, question_number]);
    }

    // ==================== 统计相关操作 ====================

    /**
     * 获取学习统计数据
     */
    async getStatistics() {
        // 总测验次数
        const totalQuizzes = await this.get('SELECT COUNT(*) as count FROM quizzes');

        // 总提交次数
        const totalSubmissions = await this.get('SELECT COUNT(*) as count FROM submissions');

        // 平均分数
        const avgScore = await this.get('SELECT AVG(obtained_score * 100.0 / total_score) as avg FROM submissions');

        // 知识点统计
        const knowledgePoints = await this.all(`
            SELECT q.knowledge_points, a.is_correct
            FROM answers a
            JOIN questions q ON a.question_id = q.id
        `);

        // 解析知识点统计
        const kpStats = {};
        knowledgePoints.forEach(row => {
            const kps = JSON.parse(row.knowledge_points || '[]');
            kps.forEach(kp => {
                if (!kpStats[kp]) {
                    kpStats[kp] = { total: 0, correct: 0 };
                }
                kpStats[kp].total++;
                if (row.is_correct === 1) {
                    kpStats[kp].correct++;
                }
            });
        });

        return {
            totalQuizzes: totalQuizzes.count,
            totalSubmissions: totalSubmissions.count,
            averageScore: avgScore.avg || 0,
            knowledgePointsStats: kpStats
        };
    }

    /**
     * 获取错题列表
     */
    async getWrongQuestions() {
        const sql = `
            SELECT q.*, a.user_answer, a.ai_feedback, s.submitted_at
            FROM answers a
            JOIN questions q ON a.question_id = q.id
            JOIN submissions s ON a.submission_id = s.submission_id
            WHERE a.is_correct = 0
            ORDER BY s.submitted_at DESC
        `;
        const rows = await this.all(sql);

        return rows.map(row => ({
            ...row,
            options: row.options ? JSON.parse(row.options) : null,
            knowledge_points: JSON.parse(row.knowledge_points || '[]')
        }));
    }
}

// 导出单例
const db = new Database();

module.exports = {
    Database,
    db,
    DATA_DIR,
    QUIZZES_DIR,
    HISTORY_DIR
};
