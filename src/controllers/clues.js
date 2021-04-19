const { db } = require('../../config');
const { alea } = require('seedrandom');
const { randomBinomial } = require("d3-random");

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

clues.listBogusClues = (req, res, next) => {
  db.query(`
SELECT
  puzzle_id,
  COUNT(*) AS count
FROM clues
WHERE text IS NULL
GROUP BY puzzle_id;
`, (err, data) => {
    if (err) throw err;

    res.json(data.rows);
  });
};

clues.frequencyRank = (req, res, next) => {
  const prng = alea('seed one');
  const getBinomialSampler = randomBinomial.source(prng);

  db.query(`
SELECT
  clue_word,
  COUNT(*) AS frequency
FROM clue_words
INNER JOIN clues c ON clue_id=c.id
INNER JOIN puzzles p ON c.puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01'AND '3020-01-01'
AND LENGTH(clue_word) > 0
GROUP BY clue_word
ORDER BY frequency DESC, clue_word
LIMIT 200;
`, (freqErr, freqData) => {
    if (freqErr) throw freqErr;

    let corpusSize = 0;
    let decorrelatedCorpusSize = 0;
    const data = freqData.rows.map(({ frequency, clue_word }, idx) => {

      frequency = parseInt(frequency, 10);
      corpusSize += frequency;

      const decorrelatedFrequency = getBinomialSampler(frequency, 0.5)();
      decorrelatedCorpusSize += decorrelatedFrequency;

      return {
        word: clue_word,
        rank: idx + 1,
        frequency,
        frequencyNormalized: 0,
        decorrelatedRank: 0,
        decorrelatedFrequency,
        decorrelatedFrequencyNormalized: 0,
      };
    });

    data.sort((rowA, rowB) => ((rowB.frequency - rowB.decorrelatedFrequency) - (rowA.frequency - rowA.decorrelatedFrequency)));
    data.forEach((row, idx) => {
      row.frequencyNormalized = row.frequency / corpusSize;
      row.decorrelatedRank = idx + 1;
      row.decorrelatedFrequencyNormalized = row.decorrelatedFrequency / decorrelatedCorpusSize;
    });
    data.sort((rowA, rowB) => (rowA.rank - rowB.rank));

    res.json(data);
  });
};

clues.lengthOccurrenceDistribution = (req, res, next) => {
  db.query(`
SELECT
  LENGTH(clue_word) as length,
  COUNT(*) AS occurrences
FROM clue_words
INNER JOIN clues c ON clue_id=c.id
INNER JOIN puzzles p ON c.puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01'AND '3020-01-01'
GROUP BY length
ORDER BY length ASC;
`, (err, data) => {
    if (err) throw err;

    res.json(data.rows);
  });
};

clues.lengthDictionaryDistribution = (req, res, next) => {
  db.query(`
SELECT
  LENGTH(clue_word) as length,
  COUNT(DISTINCT clue_word) AS types
FROM clue_words
INNER JOIN clues c ON clue_id=c.id
INNER JOIN puzzles p ON c.puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01'AND '3020-01-01'
GROUP BY length
ORDER BY length ASC;
`, (err, data) => {
    if (err) throw err;

    res.json(data.rows);
  });
};

module.exports = clues;