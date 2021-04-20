const fs = require('fs');
const path = require('path');
const { Puzzle } = require('../lib/puz-parser');

// Usage
// node parsePuzFile filename

const filePath = path.join(__dirname, '../puzzles/', process.argv[2]);
fs.readFile(filePath, async (err, data) => {
  const nytId = filePath.match(/.+_([0-9]+).puz/)[1];
  const puzzle = Puzzle.fromPuzFile(data);
  puzzle.nytId = nytId;
  console.log(puzzle);
});
