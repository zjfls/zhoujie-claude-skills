const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('/Users/zhoujie/.skill-forge/skill-forge.db');

db.get("SELECT content FROM questions WHERE id = 23", (err, row) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log("Raw content:");
    console.log(row.content);
    console.log("Stringified:");
    console.log(JSON.stringify(row.content));
});

db.close();
