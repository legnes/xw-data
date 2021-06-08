const Clue = require('./clue');
const { parseExtension } = require('./extensions');

const GRID_DELIMETER = '.';

const defaultOpts = {
  minAnswerLength: 3,
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
    this.extensions = {};
    this.date = null;
  }

  hydrateFromPuzFile(dataBuffer) {
    // TODO: checksums

    // Header
    this.version = dataBuffer.toString('latin1', 0x18, 0x1B);
    this.width = dataBuffer.readUInt8(0x2C);
    this.height = dataBuffer.readUInt8(0x2D);
    this.numClues = dataBuffer.readUInt16LE(0x2E);
    const numberOfSquares = this.width * this.height;

    // Board
    let readHead = 0x34;
    this.solution = dataBuffer.toString('latin1', readHead, readHead += numberOfSquares);
    this.board = dataBuffer.toString('latin1', readHead, readHead += numberOfSquares);

    // Text lines
    const textLines = dataBuffer.toString('latin1', readHead).split('\0');
    this.title = textLines[0];
    this.author = textLines[1];
    this.copyright = textLines[2];
    this.rawClues = textLines.slice(3, 3 + this.numClues);
    this.notes = textLines[3 + this.numClues];
    // TODO: this is maybe a little roundabout?
    readHead += textLines.slice(0, 4 + this.numClues).join('.').length + 1;

    // Extensions
    while (readHead < dataBuffer.length) {
      const extension = parseExtension(dataBuffer, readHead);
      if (extension) {
        this.extensions[extension.code] = extension;
        // NOTE: 9 = 4 from code + 2 from length + 2 from checksum
        readHead += 9 + extension.length;
      } else {
        break;
      }
    }

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

  isBlockSquare(gridIndex) {
    return this.solution[gridIndex] === GRID_DELIMETER;
  }

  getSquareContents(gridIndex) {
    let contents = this.solution[gridIndex];
    if (this.extensions.RTBL && this.extensions.GRBS) {
      const rtblIndex = this.extensions.GRBS.gridToRtblMap[gridIndex];
      const rebus = this.extensions.RTBL.rebusContents[rtblIndex];
      if (rebus) contents = rebus;
    }
    return contents;
  }

  parsePuzCluesOfDirection(direction, majorDim, majorStride, minorDim, minorStride) {
    let currentClue = null;
    for (let minorIdx = 0; minorIdx < minorDim; minorIdx++) {
      for (let majorIdx = 0; majorIdx < majorDim; majorIdx++) {
        const gridIndex = minorIdx * minorStride + majorIdx * majorStride;
        const isAnswerSquare = !this.isBlockSquare(gridIndex);

        // Check if this is the end of an answer
        if (!!currentClue && !isAnswerSquare) {
          currentClue = null;
          continue;
        }

        // Check if this is the beginning of an answer
        const isStartOfAnswer = majorIdx === 0 || this.isBlockSquare(gridIndex - majorStride);
        let hasRoomForAnswer = true;
        for (let offset = 1; offset < this.opts.minAnswerLength; offset++) {
          if ((majorIdx + offset) >= majorDim || this.isBlockSquare(gridIndex + offset * majorStride)) {
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
          currentClue.answer += this.getSquareContents(gridIndex);
          currentClue._gridIndices.push(gridIndex);
        }
      }

      // At the end of each major dim traversal, clue clears
      currentClue = null;
    }
  }

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
