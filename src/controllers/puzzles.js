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

function isProbablyTheSameAuthor(a, b) {
  if (!a || !b) return false;
  const [fullNameA, willShortzA] = a.split(' / ');
  const [fullNameB, willShortzB] = b.split(' / ');
  if (!willShortzA || !willShortzB) return false;
  const namesA = fullNameA.split(' ');
  const namesB = fullNameB.split(' ');
  const usedIndices = {};
  for (const nameA of namesA) {
    // for (const idxB in namesB) {
    //   if (usedIndices[idxB]) continue;
    //   const nameB = namesB[idxB];
    //   if (nameB.toUpperCase() === nameA.toUpperCase()) {
    //     usedIndices[idxB] = true;
    //     continue;
    //   }
    // }
    let nameMatchIdx = namesB.findIndex((nameB, idx) => (
      !usedIndices[idx] &&
      nameB.toUpperCase() === nameA.toUpperCase()
    ));

    if (nameMatchIdx > -1) {
      usedIndices[nameMatchIdx] = true;
      continue;
    }

    nameMatchIdx = namesB.findIndex((nameB, idx) => (
      !usedIndices[idx] &&
      (nameA[1] === '.' || nameB[1] === '.') &&
      (nameB[0].toUpperCase() === nameA[0].toUpperCase())
    ));

    if (nameMatchIdx > -1) {
      usedIndices[nameMatchIdx] = true;
      continue;
    }

    return false;
  }
  return true;
}

puzzles.authorCounts = (req, res, next) => {
  db.query(`
SELECT
  author,
  COUNT(*) AS count
FROM puzzles
GROUP BY author
ORDER BY count DESC;
`, (err, data) => {
    if (err) throw err;

    const rows = data.rows.reduce((newRows, row) => {
      const existingRow = newRows.find((otherRow) => isProbablyTheSameAuthor(otherRow.author, row.author));
      if (existingRow) {
        existingRow.count += +row.count;
        existingRow.aliases.push(row.author)
      } else {
        newRows.push({
          author: row.author,
          count: +row.count,
          aliases: []
        });
      }
      return newRows
    }, []);
    rows.sort((a, b) => (b.count - a.count));

    const authors = rows.length;
    const sqrtAuthors = Math.floor(Math.sqrt(authors));
    const totalPuzzles = rows.reduce((sum, row) => (sum + (+row.count)), 0);
    const totalPuzzlesBySqrtAuthors = rows.slice(0, sqrtAuthors).reduce((sum, row) => (sum + (+row.count)), 0);
    const ratio = totalPuzzlesBySqrtAuthors / totalPuzzles;
    // console.log(authors, sqrtAuthors, totalPuzzles, totalPuzzlesBySqrtAuthors, ratio);

    let cumulativePuzzles = 0;
    for (const row of rows) {
      row.cumulativePuzzles = cumulativePuzzles += row.count;
    }

    const logCumulativeData = rows.map((row, idx) => [ Math.log(idx + 1), Math.log(row.cumulativePuzzles) ]);
    const cumulativeFit = linear(logCumulativeData, { precision: 12 });

    const logAbsoluteData = rows.map((row, idx) => [ Math.log(idx + 1), Math.log(row.count) ]);
    const absoluteFit = linear(logAbsoluteData, { precision: 12 });

    // res.json(rows);
    const cumulativeTrace = {
      x: rows.map((row, idx) => (idx + 1)),
      y: rows.map(row => row.cumulativePuzzles),
      text: rows.map(row => row.author),
      type: 'scatter',
      mode: 'lines',
      name: 'cumulative puzzles'
    };

    const cumulativeFitTrace = {
      x: rows.map((row, idx) => (idx + 1)),
      y: rows.map((row, idx) => Math.exp(cumulativeFit.predict(Math.log(idx + 1))[1])),
      type: 'scatter',
      mode: 'lines',
      // name: `exp cumulativeFit V α N^h, h = ${cumulativeFit.equation[0]}, r2 = ${cumulativeFit.r2}`
      name: 'cumulative puzzles fit'
    };

    const absoluteTrace = {
      x: rows.map((row, idx) => (idx + 1)),
      y: rows.map(row => row.count),
      text: rows.map(row => row.author),
      type: 'scatter',
      mode: 'lines',
      // yaxis: 'y2',
      name: 'absolute puzzles'
    }

    const absoluteFitTrace = {
      x: rows.map((row, idx) => (idx + 1)),
      y: rows.map((row, idx) => Math.exp(absoluteFit.predict(Math.log(idx + 1))[1])),
      type: 'scatter',
      mode: 'lines',
      // yaxis: 'y2',
      // name: `exp cumulativeFit V α N^h, h = ${cumulativeFit.equation[0]}, r2 = ${cumulativeFit.r2}`
      name: 'absolute puzzles fit'
    };

    // TODO: decorrelate???

    const layout = {
      yaxis2: {
        overlaying: 'y',
        side: 'right'
      }
    };

    const figure = { data: [ cumulativeTrace, cumulativeFitTrace, absoluteTrace, absoluteFitTrace ], layout };
    res.json(figure)
  });
};

module.exports = puzzles;