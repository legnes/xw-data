class Clue {
  constructor() {
    this.text = '';
    this.answer = '';
    this.gridIndex = -1;
    this.gridNumber = -1;
    this._direction = Clue.directions.NONE;
  }

  get direction() {
    return this._direction.key;
  }

  get label() {
    return `${this.gridNumber}${this._direction.label}`;
  }
}

class Direction {
  constructor(key, label, order) {
    this.key = key;
    this.label = label;
    this.order = order;
  }
}

Clue.directions = {
  ACROSS: new Direction('across', 'A', 1),
  DOWN: new Direction('down', 'D', 2),
  NONE: new Direction('none', '', -1)
};

module.exports = Clue;
