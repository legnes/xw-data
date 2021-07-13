const { db } = require('../../config');

const query = {};

query.promiseQuery = (query) => {
  return new Promise((resolve, reject) => {
    db.query(query, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data.rows);
      }
    });
  });
};

// TODO: add selection override?
query.answerFrequencies = ({ where, having, orderBy, limit, joinPuzzles } = {}) => (`
SELECT
  answer,
  LENGTH(answer) as length,
  COUNT(*) AS frequency
FROM clues
${joinPuzzles ? 'INNER JOIN puzzles p ON puzzle_id = p.id' : ''}
${where ? `WHERE ${where}` : ''}
GROUP BY answer
${having ? `HAVING ${having}` : ''}
${orderBy ? `ORDER BY ${orderBy}` : ''}
${limit ? `LIMIT ${limit}` : ''}
;`);

query.answerDates = ({ trunc, minCount, maxCount, orderBy, limit } = {}) => (`
SELECT
  answer,
  MIN(DATE_TRUNC('${trunc}', p.date)) AS first_date,
  MAX(DATE_TRUNC('${trunc}', p.date)) AS last_date,
  COUNT(*) AS occurrences
FROM clues
INNER JOIN puzzles p ON puzzle_id = p.id
GROUP BY answer
HAVING COUNT(*) >= ${typeof minCount !== 'undefined' ? minCount : 0} AND COUNT(*) <= ${typeof maxCount !== 'undefined' ? maxCount : 10000}
${orderBy ? `ORDER BY ${orderBy}` : ''}
${limit ? `LIMIT ${limit}` : ''}
;`);

query.answerTokensAndTypes = () => (`
SELECT
  LENGTH(answer) as length,
  COUNT(DISTINCT answer) AS types,
  COUNT(*) AS tokens
FROM clues
GROUP BY length
ORDER BY length ASC;
`);

module.exports = query;