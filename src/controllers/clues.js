const { db } = require('../../config');

const clues = {};

clues.get = (req, res, next) => {
  db.query(`SELECT answer, date FROM clues INNER JOIN puzzles ON answer='${req.params.answer.toUpperCase()}' AND puzzle_id=puzzles.id;`, (err, data) => {
    if (err) throw err;
    res.json(data.rows);
  });
};

module.exports = clues;