const fs = require('fs');
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

const CLUE_COLUMNS = [
  'text',
  'answer',
  'direction',
  'grid_index',
  'grid_number',
  'puzzle_id'
];

const PUZZLE_COLUMNS = [
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
  'nyt_id'
];

function buildQuery(tableName, columns, obj) {
  return {
    sql: `INSERT INTO ${tableName}(${columns.join(', ')}) VALUES(${columns.map((col, idx) => `$${idx + 1}`).join(', ')})`,
    values: columns.map((key) => obj[underscoreToPascal(key)])
  };
}

async function ingestPuzzle(puzzle) {
  console.log(`ingesting ${puzzle.title}...`);
  try {
    const puzzleQuery = buildQuery('puzzles', PUZZLE_COLUMNS, puzzle);
    const puzzleQueryRes = await db.query(puzzleQuery.sql + ' RETURNING id', puzzleQuery.values);
    const puzzleId = puzzleQueryRes.rows[0].id;

    for (const clue of puzzle.clues) {
      const clueQuery = buildQuery('clues', CLUE_COLUMNS, clue);
      clueQuery.values[5] = puzzleId;
      const clueQueryRes = await db.query(clueQuery.sql, clueQuery.values);
    }
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
puzPaths.forEach((path) => ingestPuzzleFile(PUZ_DIR + path));
