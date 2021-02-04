const { db } = require('../../config');

const clues = {};

clues.get = (req, res, next) => {
  db.query(`
SELECT
  c1.answer,
  p.date,
  c1.grid_number,
  c1.direction,
  c1.text,
  ARRAY_AGG (c2.answer) as crosses
FROM clues c1
INNER JOIN puzzles p ON c1.puzzle_id=p.id
INNER JOIN crosses ON crosses.clue1_id=c1.id
INNER JOIN clues c2 ON crosses.clue2_id=c2.id
WHERE c1.answer='${req.params.answer.toUpperCase()}'
GROUP BY p.date, c1.id;
`, (err, data) => {
    if (err) throw err;

    res.json(data.rows);
  });
};

module.exports = clues;