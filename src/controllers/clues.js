const { db } = require('../../config');

const clues = {};

clues.listTopClueWords = (req, res, next) => {
  db.query(`
SELECT
  clue_word,
  COUNT(*) AS count
FROM clue_words
INNER JOIN clues c ON clue_id=c.id
INNER JOIN puzzles p ON c.puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01'AND '3020-01-01'
AND LENGTH(clue_word) > 0
GROUP BY clue_word
ORDER BY count DESC, clue_word
LIMIT 100;
`, (err, data) => {
    if (err) throw err;

    res.json(data.rows);
  });
};

clues.listTopClueWordsWithTheSameAnswers = (req, res, next) => {
  db.query(`
SELECT
  cw.answer,
  cw.clue_word,
  COUNT(*) AS count
FROM clue_words cw
INNER JOIN clues c ON clue_id=c.id
INNER JOIN puzzles p ON c.puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01'AND '3020-01-01'
AND LENGTH(cw.clue_word) > 0
GROUP BY cw.answer, cw.clue_word
ORDER BY count DESC, cw.clue_word, cw.answer
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