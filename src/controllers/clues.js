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
GROUP BY p.date, c1.id
ORDER BY p.date;
`, (err, data) => {
    if (err) throw err;

    res.json(data.rows);
  });
};

clues.countDistinct = (req, res, next) => {
  db.query(`
SELECT
  COUNT(DISTINCT answer)
FROM clues;
`, (err, data) => {
    if (err) throw err;

    res.json(data.rows);
  });
};

clues.countSingletons = (req, res, next) => {
  db.query(`
SELECT COUNT(answer)
FROM (
    SELECT answer
    FROM clues
    GROUP BY answer
    HAVING COUNT(*) = 1
) AS singletons;
`, (err, data) => {
    if (err) throw err;

    res.json(data.rows);
  });
};

clues.listTopAnswers = (req, res, next) => {
  db.query(`
SELECT
  answer,
  COUNT(*) AS count
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01'AND '3020-01-01'
GROUP BY answer
ORDER BY count DESC, answer
LIMIT 100;
`, (err, data) => {
    if (err) throw err;

    res.json(data.rows);
  });
};

clues.listTopDirectionRatio = (req, res, next) => {
  db.query(`
SELECT
  answer,
  COUNT(*) as count,
  SUM (CASE WHEN direction='across' THEN 1 ELSE 0 END) as across,
  SUM (CASE WHEN direction='down' THEN 1 ELSE 0 END) as down,
  AVG (CASE WHEN direction='across' THEN 1 ELSE 0 END) as percent_across
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01'AND '3020-01-01'
GROUP BY answer
HAVING COUNT(*) > 100
ORDER BY percent_across ASC, answer
LIMIT 100;
`, (err, data) => {
    if (err) throw err;

    res.json(data.rows);
  });
};

clues.listTopLocationBias = (req, res, next) => {
  db.query(`
SELECT
  answer,
  COUNT(*) as count,
  SUM (CASE WHEN MOD(grid_index, 15) < 7 AND (grid_index / 15) < 7 THEN 1 ELSE 0 END) as northwest,
  SUM (CASE WHEN MOD(grid_index, 15) >= 7 AND (grid_index / 15) < 7 THEN 1 ELSE 0 END) as northeast,
  SUM (CASE WHEN MOD(grid_index, 15) < 7 AND (grid_index / 15) >= 7 THEN 1 ELSE 0 END) as southwest,
  SUM (CASE WHEN MOD(grid_index, 15) >= 7 AND (grid_index / 15) >= 7 THEN 1 ELSE 0 END) as southeast,
  AVG (CASE WHEN MOD(grid_index, 15) < 7 AND (grid_index / 15) < 7 THEN 1 ELSE 0 END) as percent_northwest,
  AVG (CASE WHEN MOD(grid_index, 15) >= 7 AND (grid_index / 15) < 7 THEN 1 ELSE 0 END) as percent_northeast,
  AVG (CASE WHEN MOD(grid_index, 15) < 7 AND (grid_index / 15) >= 7 THEN 1 ELSE 0 END) as percent_southwest,
  AVG (CASE WHEN MOD(grid_index, 15) >= 7 AND (grid_index / 15) >= 7 THEN 1 ELSE 0 END) as percent_southeast
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE (p.date BETWEEN '1000-01-01'AND '3020-01-01') AND (p.width=15) AND (p.height=15)
GROUP BY answer
HAVING COUNT(*) > 100
ORDER BY percent_northwest DESC, answer
LIMIT 100;
`, (err, data) => {
    if (err) throw err;

    res.json(data.rows);
  });
};

clues.listTopClues = (req, res, next) => {
  db.query(`
SELECT
  text,
  COUNT(*) AS count
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01'AND '3020-01-01'
GROUP BY text
ORDER BY count DESC, text
LIMIT 100;
`, (err, data) => {
    if (err) throw err;

    res.json(data.rows);
  });
};

clues.listTopCluesWithTheSameAnswer = (req, res, next) => {
  db.query(`
SELECT
  text,
  answer,
  COUNT(*) AS count
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01'AND '3020-01-01'
GROUP BY text, answer
ORDER BY count DESC, text
LIMIT 100;
`, (err, data) => {
    if (err) throw err;

    res.json(data.rows);
  });
};

module.exports = clues;