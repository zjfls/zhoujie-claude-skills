# Skill Forge Architecture Reference

This document contains the technical details, data schemas, and internal workflows for the Skill Forge system.

## 🗄️ Data Storage Architecture

### Data Directory Structure

All data is stored in **`~/.skill-forge/`**:

```
~/.skill-forge/
├── skill-forge.db          # SQLite database (Core Data)
├── config.json             # Configuration file
├── quizzes/                # Generated Quiz HTML files
│   └── <timestamp>_<topic>/
│       ├── quiz.html       # Quiz Interface
│       └── result.html     # Result Interface
└── history/                # History backups and reports
    └── <timestamp>_backup.json
```

### Database Schema (SQLite)

Location: `~/.skill-forge/skill-forge.db`

```sql
-- Quiz Templates
CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id TEXT UNIQUE NOT NULL,           -- <timestamp>_<topic>
    topic TEXT NOT NULL,
    topic_detail TEXT,
    difficulty TEXT NOT NULL,
    question_count INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    status TEXT DEFAULT 'created'
);

-- Exam Instances
CREATE TABLE IF NOT EXISTS exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id TEXT UNIQUE NOT NULL,            -- <quiz_id>_<timestamp>
    quiz_id TEXT NOT NULL,
    status TEXT DEFAULT 'in_progress',       -- in_progress/completed/abandoned
    started_at TEXT NOT NULL,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id) ON DELETE CASCADE
);

-- Questions
CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id TEXT NOT NULL,
    question_number INTEGER NOT NULL,
    question_type TEXT NOT NULL,             -- choice/essay/code
    content TEXT NOT NULL,
    options TEXT,                            -- JSON array
    correct_answer TEXT NOT NULL,
    score INTEGER NOT NULL,
    knowledge_points TEXT,                   -- JSON array
    explanation TEXT,
    source_type TEXT DEFAULT 'ai_generated',
    source_url TEXT,
    source_name TEXT,
    content_hash TEXT,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id) ON DELETE CASCADE
);

-- Submissions
CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id TEXT UNIQUE NOT NULL,
    exam_id TEXT NOT NULL,
    quiz_id TEXT NOT NULL,
    submitted_at TEXT NOT NULL,
    total_score INTEGER NOT NULL,
    obtained_score REAL NOT NULL,
    time_spent INTEGER,
    pass_status TEXT,
    FOREIGN KEY (exam_id) REFERENCES exams(exam_id) ON DELETE CASCADE,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id) ON DELETE CASCADE
);

-- Answers
CREATE TABLE IF NOT EXISTS answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id TEXT NOT NULL,
    question_id INTEGER NOT NULL,
    user_answer TEXT,
    is_correct INTEGER,
    score_obtained REAL,
    ai_feedback TEXT,
    FOREIGN KEY (submission_id) REFERENCES submissions(submission_id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id)
);

-- AI Interactions
CREATE TABLE IF NOT EXISTS ai_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id TEXT NOT NULL,
    quiz_id TEXT NOT NULL,
    question_number INTEGER NOT NULL,
    user_query TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (exam_id) REFERENCES exams(exam_id) ON DELETE CASCADE,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id) ON DELETE CASCADE
);
```

## ⚙️ Configuration

Location: `~/.skill-forge/config.json`

```json
{
    "version": "1.0.0",
    "ai": {
        "model": "mcs-1",
        "timeout": 120000,
        "cliCommand": "claude",
        "temperature": 0.7
    },
    "server": {
        "port": 3457,
        "dataDir": "~/.skill-forge"
    },
    "deduplication": {
        "enabled": true,
        "policy": "avoid",
        "similarityThreshold": 0.7,
        "lookbackDays": 30
    }
}
```

## 🔄 Core Workflows

### 1. Initialization
The `Database.initDatabase()` method automatically checks for `~/.skill-forge` existence, creates subdirectories, creates `config.json` if missing, and initializes the SQLite schema. This runs on every operation start.

### 2. Quiz Taking Flow
1.  **Start**: User accesses Dashboard (`http://localhost:3457`).
2.  **Take Quiz**: Navigation to `/quiz/:quiz_id`.
    *   Creates an `exam` record in DB.
3.  **Submit**:
    *   POST `/api/submit-quiz`.
    *   Backend grades the quiz (using AI for essay/code).
    *   Saves `submission` and `answers`.
4.  **Result**: Redirects to `/result/:quiz_id`.

### 3. History & Reports
*   **API**: `/api/history` fetches usage stats.
*   **Report Generation**: `/api/generate-history-report` creates static HTML reports in `~/.skill-forge/history/`.
