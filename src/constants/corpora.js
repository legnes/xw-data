const readline = require('readline');
const fs = require('fs');
const path = require('path');

const WIKI_CORPUS_PATH = path.join(__dirname, '../../enwiki-20190320-words-frequency.txt');

const EMPTY_CORPUS = {
  total: 0,
  countsByWord: {},
  frequencyRows: []
};

async function parseCorpus(outCorpus, path) {
  const fileStream = fs.createReadStream(WIKI_CORPUS_PATH);

  const lineReader = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of lineReader) {
    const [word, frequency] = line.split(' ');
    outCorpus.total += +frequency;
    outCorpus.countsByWord[word.toUpperCase()] = (outCorpus.countsByWord[word.toUpperCase()] || 0) + +frequency;
  }

  outCorpus.frequencyRows = Object.entries(outCorpus.countsByWord).map(([word, frequency]) => ({ word, frequency, length: word.length }));
}

const corpora = {};

corpora.english = {};
corpora.english.WIKI_CORPUS = { ...EMPTY_CORPUS };
parseCorpus(corpora.english.WIKI_CORPUS, WIKI_CORPUS_PATH);

module.exports = corpora;