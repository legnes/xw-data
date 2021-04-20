const { db } = require('../../config');

const answers = {};

answers.get = (req, res, next) => {
  db.query(`
SELECT
  c1.answer,
  p.date,
  p.id,
  c1.grid_number,
  c1.direction,
  c1.text,
  ARRAY_AGG (c2.answer) as crosses
FROM clues c1
INNER JOIN puzzles p ON c1.puzzle_id=p.id
INNER JOIN crosses ON crosses.clue1_id=c1.id
INNER JOIN clues c2 ON crosses.clue2_id=c2.id
WHERE c1.answer='${req.params.answer.toUpperCase()}'
GROUP BY p.date, p.id, c1.id
ORDER BY p.date;
`, (err, data) => {
    if (err) return next(err);

    res.json(data.rows);
  });
};

answers.countDistinct = (req, res, next) => {
  db.query(`
SELECT
  COUNT(DISTINCT answer)
FROM clues;
`, (err, data) => {
    if (err) return next(err);

    res.json(data.rows);
  });
};

answers.countSingletons = (req, res, next) => {
  db.query(`
SELECT COUNT(answer)
FROM (
    SELECT answer
    FROM clues
    GROUP BY answer
    HAVING COUNT(*) = 1
) AS singletons;
`, (err, data) => {
    if (err) return next(err);

    res.json(data.rows);
  });
};

answers.listFrequentons = (req, res, next) => {
  const frequency = 2;
  db.query(`
SELECT
  answer,
  COUNT(answer)
FROM (
    SELECT answer
    FROM clues
    INNER JOIN puzzles p ON puzzle_id=p.id
    WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
    GROUP BY answer
    HAVING COUNT(*) = ${frequency}
) AS frequentons
GROUP BY answer
LIMIT 200;
`, (err, data) => {
    if (err) return next(err);

    res.json(data.rows);
  });
};

answers.listTopAnswers = (req, res, next) => {
  db.query(`
SELECT
  answer,
  COUNT(*) AS count
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
GROUP BY answer
ORDER BY count DESC, answer
LIMIT 100;
`, (err, data) => {
    if (err) return next(err);

    res.json(data.rows);
  });
};

answers.listTopDirectionRatio = (req, res, next) => {
  db.query(`
SELECT
  answer,
  COUNT(*) as count,
  SUM (CASE WHEN direction='across' THEN 1 ELSE 0 END) as across,
  SUM (CASE WHEN direction='down' THEN 1 ELSE 0 END) as down,
  AVG (CASE WHEN direction='across' THEN 1 ELSE 0 END) as percent_across
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
GROUP BY answer
HAVING COUNT(*) > 100
ORDER BY percent_across ASC, answer
LIMIT 100;
`, (err, data) => {
    if (err) return next(err);

    res.json(data.rows);
  });
};

answers.listTopLocationBias = (req, res, next) => {
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
WHERE (p.date BETWEEN '1000-01-01' AND '3020-01-01') AND (p.width=15) AND (p.height=15)
GROUP BY answer
HAVING COUNT(*) > 100
ORDER BY percent_northwest DESC, answer
LIMIT 100;
`, (err, data) => {
    if (err) return next(err);

    res.json(data.rows);
  });
};

answers.tokenTypes = (req, res, next) => {
  db.query(`
SELECT
  COUNT(answer) as tokens,
  COUNT(DISTINCT answer) AS types
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1993-01-01' AND '1994-12-31';
`, (err, data) => {
    if (err) return next(err);

    res.json(data.rows);
  });
};

answers.newWordsByMonth = (req, res, next) => {
  db.query(`
SELECT
  answer
FROM (
  SELECT
    answer,
    MIN(DATE_TRUNC('month', p.date)) AS month_introduced
  FROM clues
  INNER JOIN puzzles p ON puzzle_id=p.id
  WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
  GROUP BY answer
  HAVING COUNT(*)>0
) answers_by_month_introduced
WHERE month_introduced='2017-04-01T04:00:00.000Z';
`, (err, data) => {
    if (err) return next(err);

    res.json(data.rows);
  });
};

answers.topWordsPerYear = (req, res, next) => {
  const queries = [];
  for (let i = DATA_RANGE_START_YEAR; i <= DATA_RANGE_END_YEAR; i++) {
    queries.push(new Promise((resolve, reject) => {
      db.query(`
SELECT
  answer,
  COUNT(*) occurrences,
  DATE_TRUNC('year', p.date) as year
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '${i}-01-01' AND '${i}-12-31'
GROUP BY answer, year
ORDER BY occurrences DESC, answer
LIMIT 10;
`, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data.rows);
        }
      });
    }));
  }
  Promise.all(queries).then((results) => {
    res.json(results);
  });
};

module.exports = answers;