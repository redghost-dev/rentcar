const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data.db');

db.all("SELECT pickupDate, dropoffDate FROM quick_reservations LIMIT 5", (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(rows);
});
