class PuzExtension {
  constructor(code, length) {
    this.code = code;
    this.length = length;
  }

  parse(dataBuffer, readHead) {
    this.contents = dataBuffer.toString('hex', readHead, readHead + this.length);
  }
}

class GrbsExtension extends PuzExtension {
  constructor(...args) {
    super(...args);
    this.gridToRtblMap = {};
  }

  parse(dataBuffer, readHead) {
    for (let i = 0; i < this.length; i++) {
      const val = dataBuffer.readUInt8(readHead + i);
      if (val) this.gridToRtblMap[i] = val - 1;
    }
  }
}

class RtblExtension extends PuzExtension {
  constructor(...args) {
    super(...args);
    this.rebusContents = {};
  }

  parse(dataBuffer, readHead) {
    dataBuffer.toString('latin1', readHead, readHead + this.length)
              .split(';')
              .forEach((keyVal) => {
      if (keyVal.length < 1) return;
      const [key, val] = keyVal.split(':');
      this.rebusContents[+key] = val;
    });
  }
}

class GextExtension extends PuzExtension {
  constructor(...args) {
    super(...args);
    this.gridMarkers = {};
  }

  parse(dataBuffer, readHead) {
    for (let i = 0; i < this.length; i++) {
      const val = dataBuffer.readUInt8(readHead + i);
      if (val) this.gridMarkers[i] = val;
    }
  }
}

const EXTENSIONS = {
  GRBS: GrbsExtension,
  RTBL: RtblExtension,
  GEXT: GextExtension,
  LTIM: PuzExtension,
  RUSR: PuzExtension,
};

const parseExtension = (dataBuffer, readHead) => {
  const code = dataBuffer.toString('latin1', readHead, readHead += 4);
  const length = dataBuffer.readUInt8(readHead);
  const extensionClass = EXTENSIONS[code];
  if (!extensionClass) return null;
  const extension = new extensionClass(code, length);
  extension.parse(dataBuffer, readHead + 4);
  return extension;
}

module.exports = {
  parseExtension
};