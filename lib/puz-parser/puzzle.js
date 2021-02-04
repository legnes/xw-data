const Clue = require('./clue');

const GRID_DELIMETER = '.';

const defaultOpts = {
  minAnswerLength: 2,
};

class Puzzle {
  constructor(dataBuffer, opts = {}) {
    this.opts = { ...defaultOpts, ...opts };
    this.version = '';
    this.width = -1;
    this.height = -1;
    this.numClues = -1;
    this.solution = '';
    this.board = '';
    this.title = '';
    this.author = '';
    this.copyright = '';
    this.notes = '';
    this.rawClues = [];
    this.clues = [];
    this.date = null;
  }

  hydrateFromPuzFile(dataBuffer) {
    // TODO: checksums
    // TODO: rebuses
    // TODO: notes?
    this.version = dataBuffer.toString('latin1', 0x18, 0x1B);
    this.width = dataBuffer.readUInt8(0x2C);
    this.height = dataBuffer.readUInt8(0x2D);
    this.numClues = dataBuffer.readUInt16LE(0x2E);
    const numberOfSquares = this.width * this.height;
    this.solution = dataBuffer.toString('latin1', 0x34, 0x34 + numberOfSquares);
    this.board = dataBuffer.toString('latin1', 0x34 + numberOfSquares, 0x34 + 2 * numberOfSquares);
    const textLines = dataBuffer.toString('latin1', 0x34 + 2 * numberOfSquares).split('\0');
    this.title = textLines[0];
    this.author = textLines[1];
    this.copyright = textLines[2];
    this.rawClues = textLines.slice(3, 3 + this.numClues);
    this.notes = textLines[3 + this.numClues];
    this.tryExtractDateFromTitle();
    this.parsePuzClues();
  }

  tryExtractDateFromTitle() {
    const datePatterns = [
      // August 10, 2000
      /[A-Za-z]+ [0-9]{1,2}, [0-9]{4}/,
    ]

    for (const pattern of datePatterns) {
      const dateMatch = this.title.match(pattern);
      if (dateMatch) {
        this.date = new Date(dateMatch[0]);
        return;
      }
    }
  }

  parsePuzCluesOfDirection(direction, majorDim, majorStride, minorDim, minorStride) {
    let currentClue = null;
    for (let minorIdx = 0; minorIdx < minorDim; minorIdx++) {
      for (let majorIdx = 0; majorIdx < majorDim; majorIdx++) {
        const gridIndex = minorIdx * minorStride + majorIdx * majorStride;
        const isAnswerSquare = this.solution[gridIndex] !== GRID_DELIMETER;

        // Check if this is the end of an answer
        if (!!currentClue && !isAnswerSquare) {
          currentClue = null;
          continue;
        }

        // Check if this is the beginning of an answer
        const isStartOfAnswer = majorIdx === 0 || this.solution[gridIndex - majorStride] === GRID_DELIMETER;
        let hasRoomForAnswer = true;
        for (let offset = 0; offset < this.opts.minAnswerLength - 1; offset++) {
          if ((majorIdx + offset) >= majorDim || this.solution[gridIndex + offset * majorStride] === GRID_DELIMETER) {
            hasRoomForAnswer = false;
            break;
          }
        }
        if (isAnswerSquare && isStartOfAnswer && hasRoomForAnswer) {
          currentClue = new Clue();
          currentClue._direction = direction;
          currentClue.gridIndex = gridIndex;
          this.clues.push(currentClue);
        }

        // Append answer square to current clue
        if (!!currentClue) {
          currentClue.answer += this.solution[gridIndex];
          currentClue._gridIndices.push(gridIndex);
        }
      }
    }
  }

  // TODO: clean!
  parsePuzClues() {
    this.clues = [];

    this.parsePuzCluesOfDirection(Clue.directions.ACROSS, this.width, 1, this.height, this.width)
    this.parsePuzCluesOfDirection(Clue.directions.DOWN, this.height, this.width, this.width, 1)

    this.clues.sort((a, b) => {
      const indexDiff = a.gridIndex - b.gridIndex;
      const directionDiff = a._direction.order - b._direction.order;
      return indexDiff !== 0 ? indexDiff : directionDiff;
    });

    let gridNumber = 0;
    let gridIndex = -1;
    for (let i = 0; i < this.clues.length; i++) {
      const clue = this.clues[i];
      clue.text = this.rawClues[i];

      if (clue.gridIndex !== gridIndex) {
        gridNumber++;
        gridIndex = clue.gridIndex;
      }

      clue.gridNumber = gridNumber;

      clue.crosses = clue._gridIndices.map(
        (idx) => this.clues.find(
          (otherClue) => (otherClue !== clue) && otherClue._gridIndices.includes(idx)
        )
      );
    }
  }
}

Puzzle.fromPuzFile = (dataBuffer, opts = {}) => {
  const puzzle = new Puzzle(opts);
  puzzle.hydrateFromPuzFile(dataBuffer);
  return puzzle;
};

module.exports = Puzzle;
