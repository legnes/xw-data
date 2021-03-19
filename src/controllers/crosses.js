const { db } = require('../../config');

const crosses = {};

crosses.listTopCrosses = (req, res, next) => {
  db.query(`
SELECT
  c1.answer AS answer1,
  c2.answer AS answer2,
  COUNT(*) AS count
FROM crosses
INNER JOIN clues c1 ON clue1_id=c1.id
INNER JOIN clues c2 ON clue2_id=c2.id
INNER JOIN puzzles p ON c1.puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01'AND '3020-01-01'
GROUP BY c1.answer, c2.answer
ORDER BY count DESC, c1.answer, c2.answer
LIMIT 100;
`, (err, data) => {
    if (err) throw err;

    res.json(data.rows);
  });
};

module.exports = crosses;