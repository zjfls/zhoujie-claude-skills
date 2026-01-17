const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');

const DATA_DIR = path.join(os.homedir(), '.skill-forge');
const DB_PATH = path.join(DATA_DIR, 'skill-forge.db');

class DBWriter {
    constructor() {
        this.db = new sqlite3.Database(DB_PATH);
    }

    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve(this);
            });
        });
    }

    close() {
        this.db.close();
    }

    async createQuiz(quizData) {
        const sql = `
            INSERT INTO quizzes (quiz_id, topic, topic_detail, difficulty, question_count, created_at, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            quizData.quiz_id,
            quizData.topic,
            quizData.topic_detail,
            quizData.difficulty,
            quizData.question_count,
            quizData.created_at,
            quizData.status
        ];
        return this.run(sql, params);
    }

    async insertQuestions(quiz_id, questions) {
        const sql = `
            INSERT INTO questions (
                quiz_id, question_number, question_type, content, 
                options, correct_answer, score, knowledge_points, 
                explanation, source_type, source_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                const stmt = this.db.prepare(sql);
                let completed = 0;
                let hasError = false;

                questions.forEach(q => {
                    stmt.run(
                        quiz_id,
                        q.question_number,
                        q.question_type,
                        q.content,
                        q.options,
                        q.correct_answer,
                        q.score,
                        q.knowledge_points,
                        q.explanation,
                        q.source_type,
                        q.source_name,
                        (err) => {
                            if (err) {
                                hasError = true;
                                console.error('Question Insert Error:', err);
                            } else {
                                completed++;
                            }
                        }
                    );
                });

                stmt.finalize(() => {
                    if (hasError) reject(new Error('Errors occurred during question insertion.'));
                    else resolve(completed);
                });
            });
        });
    }
}

module.exports = DBWriter;
