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

query.answerYears = ({ func, countThresh, limit, orderBy } = {}) => (`
SELECT
  answer,
  ${func}(DATE_TRUNC('year', p.date)) AS year,
  COUNT(*) AS occurrences
FROM clues
INNER JOIN puzzles p ON puzzle_id = p.id
GROUP BY answer
${countThresh ? `HAVING COUNT(*) >= ${countThresh}` : ''}
ORDER BY ${orderBy || `${func}(p.date) ${func === 'MIN' ? 'DESC' : 'ASC'}`}
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