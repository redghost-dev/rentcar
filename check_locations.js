const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data.db');

db.all("SELECT * FROM locations", [], (err, rows) => {
    if (err) {
        throw err;
    }
    console.log(JSON.stringify(rows, null, 2));
});
