const { db } = require('../../config');
const { linear } = require('regression');

const puzzles = {};

puzzles.list = (req, res, next) => {
  db.query('SELECT title, id FROM puzzles', (err, data) => {
    if (err) throw err;
    res.json(data.rows);
  });
};

puzzles.get = (req, res, next) => {
  db.query(`SELECT * FROM puzzles WHERE id='${req.params.id}';`, (err, data) => {
    if (err) throw err;
    res.json(data.rows);
  });
};

puzzles.getAnswers = (req, res, next) => {
  db.query(`SELECT grid_number, direction, text, answer FROM clues WHERE clues.puzzle_id='${req.params.id}' ORDER BY grid_number ASC;`, (err, data) => {
    if (err) throw err;
    res.json(data.rows);
  });
};

module.exports = puzzles;