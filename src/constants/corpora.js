const zlib = require('zlib');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

const WIKI_CORPUS_PATH = path.join(__dirname, '../../enwiki-20190320-words-frequency.txt.br');

// TODO:
// Corpora take up a lot of memory. Consider other approaches, like redis or traditional database

// NOTE:
// Corpus files are expected to be deduped, free of diacritics/hyphens/underscores, and listed in order of frequency

const createEmptyCorpus = () => ({
  totalTokens: 0,
  data: new Map()
});

async function parseCorpus(outCorpus, path) {
  const readBrotli = zlib.createBrotliDecompress();
  const readStream = fs.createReadStream(path).pipe(readBrotli);

  const lineReader = readline.createInterface({
    input: readStream,
    crlfDelay: Infinity
  });

  for await (const line of lineReader) {
    let [word, frequency] = line.split(' ');
    frequency = +frequency;
    outCorpus.data.set(word, frequency);
    outCorpus.totalTokens += frequency;
  }
}

const corpora = {};

corpora.english = {};
corpora.english.WIKI_CORPUS = createEmptyCorpus();
parseCorpus(corpora.english.WIKI_CORPUS, WIKI_CORPUS_PATH);

module.exports = corpora;