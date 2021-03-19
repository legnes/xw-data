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
];

const CLUE_WORDS_COLUMNS = [
  'clue_id',
  'answer',
  'clue_word',
  'text_index',
];

function buildRawInsert(tableName, columns, objs, returning) {
  if (!Array.isArray(objs)) objs = [objs];
  return `
INSERT INTO ${tableName}(${columns.join(', ')})
VALUES ${
  objs.map(obj => `(${columns.map(key => {
    let val = obj[underscoreToPascal(key)];
    if (typeof val === 'string') val = val.replace(/'/g, "''");
    return `'${val}'`
  })})`).join(', ')
}
${returning ? `RETURNING ${returning}` : ''};
  `;
}

function buildInsert(tableName, columns, obj, returning) {
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
    const puzzleQuery = buildInsert('puzzles', PUZZLES_COLUMNS, puzzle, 'id');
    const puzzleQueryRes = await db.query(puzzleQuery.sql, puzzleQuery.values);
    const puzzleId = puzzleQueryRes.rows[0].id;
    puzzle.clues.forEach(clue => { clue.puzzleId = puzzleId; });

    const cluesQuery = buildRawInsert('clues', CLUES_COLUMNS, puzzle.clues, 'id');
    const cluesQueryRes = await db.query(cluesQuery);
    puzzle.clues.forEach((clue, idx) => { clue._id = cluesQueryRes.rows[idx].id });

    const clueWords = puzzle.clues.reduce((words, clue) => {
      Array.prototype.push.apply(words, clue.text.split(' ').map((clueWord, idx) => ({
        clueId: clue._id,
        answer: clue.answer,
        clue_word: clueWord.toUpperCase().replace(/[!?",\.\*]/g, ''),
        textIndex: idx
      })));
      return words;
    }. []);
    const clueWordsQuery = buildRawInsert('clue_words', CLUE_WORDS_COLUMNS, clueWords);
    await db.query(clueWordsQuery);

    const crosses = puzzle.clues.reduce((xs, clue) => {
      Array.prototype.push.apply(xs, clue.crosses.map(cross => ({
        clue1Id: clue._id,
        clue2Id: cross._id
      })));
      return xs;
    }, []);
    const crossesQuery = buildRawInsert('crosses', CROSSES_COLUMNS, crosses);
    await db.query(crossesQuery);

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
    if (puzPaths[i].indexOf('.DS_Store') > -1) continue;
    await ingestPuzzleFile(path.resolve(PUZ_DIR, puzPaths[i]));
  }
  db.end();
})();
