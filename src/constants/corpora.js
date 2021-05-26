const readline = require('readline');
const fs = require('fs');
const path = require('path');

const { addInto } = require('../util/base');

const WIKI_CORPUS_PATH = path.join(__dirname, '../../enwiki-20190320-words-frequency.txt');

const EMPTY_CORPUS = {
  totalWordTokens: 0,
  totalWordTypes: 0,
  totalDictLetters: 0,
  totalTextLetters: 0,
  wordFrequencies: {},
  wordFrequencyRows: [],
  letterFrequencies: {
    dict: {},
    text: {},
  }
};

async function parseCorpus(outCorpus, path) {
  const fileStream = fs.createReadStream(WIKI_CORPUS_PATH);

  const lineReader = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of lineReader) {
    let [word, frequency] = line.split(' ');
    word = word.toUpperCase();
    frequency = +frequency

    const seenBefore = !!outCorpus.wordFrequencies[word];

    if (!seenBefore) outCorpus.totalWordTypes++;
    outCorpus.totalWordTokens += frequency;
    addInto(outCorpus.wordFrequencies, word, frequency);
    outCorpus.wordFrequencyRows.push({ word, frequency, length: word.length });

    const letters = (word.match(/\w/g) || '').length;
    if (!seenBefore) outCorpus.totalDictLetters += letters;
    outCorpus.totalTextLetters += letters * frequency;
    for (let i = 0, len = word.length; i < len; i++) {
      const letter = word[i];
      if (!/\w/.test(letter)) continue;
      addInto(outCorpus.letterFrequencies.text, letter, frequency);
      if (!seenBefore) addInto(outCorpus.letterFrequencies.dict, letter, 1);
    }
  }

  for (const letter in outCorpus.letterFrequencies.dict) {
    outCorpus.letterFrequencies.dict[letter] /= outCorpus.totalDictLetters;
  }
  for (const letter in outCorpus.letterFrequencies.text) {
    outCorpus.letterFrequencies.text[letter] /= outCorpus.totalTextLetters;
  }
}

const corpora = {};

corpora.english = {};
corpora.english.WIKI_CORPUS = { ...EMPTY_CORPUS };
parseCorpus(corpora.english.WIKI_CORPUS, WIKI_CORPUS_PATH);

module.exports = corpora;