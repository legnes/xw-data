const { db } = require('../../config');

const puzzles = {};

puzzles.list = (req, res, next) => {
  db.query('SELECT title, id FROM puzzles', (err, data) => {
    if (err) throw err;
    res.json(data.rows);
  });
};

puzzles.get = (req, res, next) => {
  db.query(`SELECT grid_number, direction, answer FROM clues WHERE clues.puzzle_id='${req.params.id}';`, (err, data) => {
    if (err) throw err;
    res.json(data.rows);
  });
};

module.exports = puzzles;