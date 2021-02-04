const fs = require('fs');
const path = require('path');
const { db } = require('../config');
const { Puzzle } = require('../lib/puz-parser');

// Usage
// node ingestPuzFiles absolute/path/to/files/dir/

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function underscoreToPascal(str) {
  return str.split('_').map((subStr, idx) => (idx < 1 ? subStr : capitalize(subStr))).join('');
}

const CLUES_COLUMNS = [
  'text',
  'answer',
  'direction',
  'grid_index',
  'grid_number',
  'puzzle_id',
];

const PUZZLES_COLUMNS = [
  'version',
  'width',
  'height',
  'num_clues',
  'solution',
  'title',
  'author',
  'copyright',
  'notes',
  'date',
  'nyt_id',
];

const CROSSES_COLUMNS = [
  'clue1_id',
  'clue2_id',
]

function buildQuery(tableName, columns, obj, returning) {
  return {
    sql: `
INSERT INTO ${tableName}(${columns.join(', ')})
VALUES(${columns.map((col, idx) => `$${idx + 1}`).join(', ')})
${returning ? `RETURNING ${returning}` : ''}
    `,
    values: columns.map((key) => obj[underscoreToPascal(key)])
  };
}

async function ingestPuzzle(puzzle) {
  console.log(`ingesting ${puzzle.title}...`);
  try {
    const puzzleQuery = buildQuery('puzzles', PUZZLES_COLUMNS, puzzle, 'id');
    const puzzleQueryRes = await db.query(puzzleQuery.sql, puzzleQuery.values);
    const puzzleId = puzzleQueryRes.rows[0].id;

    for (const clue of puzzle.clues) {
      const clueQuery = buildQuery('clues', CLUES_COLUMNS, clue, 'id');
      clueQuery.values[5] = puzzleId;
      const clueQueryRes = await db.query(clueQuery.sql, clueQuery.values);
      clue._id = clueQueryRes.rows[0].id;
    }

    for (const clue1 of puzzle.clues) {
      for (const clue2 of clue1.crosses) {
        const crossQuery = buildQuery('crosses', CROSSES_COLUMNS, { clue1Id: clue1._id, clue2Id: clue2._id });
        await db.query(crossQuery.sql, crossQuery.values);
      }
    }
    console.log(`...finished ${puzzle.title}`);
  } catch (e) {
    console.log(e);
  }
}

function ingestPuzzleFile(path) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, async (err, data) => {
      try {
        const nytId = path.match(/.+_([0-9]+).puz/)[1];
        const puzzle = Puzzle.fromPuzFile(data);
        puzzle.nytId = nytId;
        await ingestPuzzle(puzzle);
        resolve();
      } catch(e) {
        reject(e);
      }
    });
  });
}

const PUZ_DIR = process.argv[2];
const puzPaths = fs.readdirSync(PUZ_DIR);
(async () => {
  for (let i = 0; i < puzPaths.length; i++) {
    await ingestPuzzleFile(path.resolve(PUZ_DIR, puzPaths[i]));
  }
  db.end();
})();
