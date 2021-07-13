const { alea } = require('seedrandom');
const { randomBinomial } = require("d3-random");
const { linear } = require('regression');

const { addInto, pushInto, numSort, numSortBy } = require('./base');
const { DEFAULT_HISTOGRAM_2D } = require('./figure');

const { scrabble: { LETTER_SCORES }, english } = require('../constants/language');

const analysis = {};

// NOTE:
// This util is meant to help analyze row data.
// Largely it expects data to be an array of objects, and will perform operations
// on the values stored in those objects at given property names.

function getGroupName(row, groupKey) {
  return typeof groupKey === 'function' ? groupKey(row) : row[groupKey];
}

analysis.groupRowsBy = (rows, groupKey) => {
  return rows.reduce((groups, row) => pushInto(groups, getGroupName(row, groupKey), row), {});
};

analysis.sumRowGroupsBy = (rows, groupKey, sumKey) => {
  return rows.reduce((sums, row) => addInto(sums, getGroupName(row, groupKey), +(row[sumKey])), {});
};

analysis.countRowGroups = (rows, groupKey) => {
  return rows.reduce((counts, row) => addInto(counts, getGroupName(row, groupKey), 1), {});
};

analysis.rankRowGroupCounts = (rows, groupKey, asc=true) => {
  const counts = analysis.countRowGroups(rows, groupKey);
  let countSum = 0;
  return Object.keys(counts).sort(numSort(!asc)).reduce((ranks, groupName) => {
    const groupCount = counts[groupName];
    let rank = 0;
    for (let i = 1; i <= groupCount; i++) {
      rank += countSum + i;
    }
    ranks[groupName] = rank / groupCount;
    countSum += groupCount;
    return ranks;
  }, {});
};

analysis.sumBy = (rows, key) => {
  return rows.reduce((sum, row) => (sum + +row[key]), 0);
};

analysis.averageBy = (rows, key) => {
  return analysis.sumBy(rows, key) / rows.length;
};

analysis.standardDeviationBy = (rows, key) => {
  const mean = analysis.averageBy(rows, key);
  const variance = rows.reduce((v, row) => (v + ((+row[key] - mean) ** 2)), 0) / rows.length;
  return Math.sqrt(variance);
};

analysis.covarianceBy = (rows, keyX, keyY) => {
  // TODO: Could combine these iterations
  const expectedX = analysis.averageBy(rows, keyX);
  const expectedY = analysis.averageBy(rows, keyY);
  return rows.reduce((c, row) => (c + ((+row[keyX] - expectedX) * (+row[keyY] - expectedY))), 0) / rows.length;
};

analysis.pearsonCorrelationCoeffBy = (rows, keyX, keyY) => {
  // TODO: Could combine these iterations
  const deviationX = analysis.standardDeviationBy(rows, keyX);
  const deviationY = analysis.standardDeviationBy(rows, keyY);
  const covariance = analysis.covarianceBy(rows, keyX, keyY);
  return covariance / (deviationX * deviationY);
};

// function pearsonCorrelationCoeffWithPermutationBy(rows, keyX, keyY) {
//   const coeff = analysis.pearsonCorrelationCoeffBy(rows, keyX, keyY);
//   const rowMap = Array.from(rows, (row, idx) => idx);
//   const numTests = 1000;
//   let countGreater = 0;
//   for (let i = 0; i < numTests; i++) {
//     shuffle(rowMap);
//     rows.forEach((row, idx) => { row.testY = rows[rowMap[idx]][keyY]; });
//     const testCoeff = analysis.pearsonCorrelationCoeffBy(rows, keyX, 'testY');
//     console.log(testCoeff);
//     if (Math.abs(testCoeff) > Math.abs(coeff)) countGreater++;
//   }
//   rows.forEach((row, idx) => { delete row.testY });
//   return {
//     coeff,
//     pVal: countGreater / numTests
//   }
// }

// // https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
// function shuffle(arr) {
//   let currentIndex = arr.length;
//   while (currentIndex > 0) {
//     const randomIndex = Math.floor(Math.random() * currentIndex--);
//     const temp = arr[currentIndex];
//     arr[currentIndex] = arr[randomIndex];
//     arr[randomIndex] = temp;
//   }
//   return arr;
// }

// Test specified by object with params:
//  - keyX: property name for x value
//  - keyY: property name for y value
analysis.runCorrelationTest = (rows, test) => {
  const coeff = analysis.pearsonCorrelationCoeffBy(rows, test.keyX, test.keyY);
  const standardError = 1 / Math.sqrt(rows.length - 3);
  const fisherTransformation = Math.atanh(coeff);
  const zScore = fisherTransformation / standardError;
  return { coeff: coeff.toFixed(3), standardError, fisherTransformation, zScore: zScore.toFixed(3), ...test };
};

// rows: [...{ word, frequency }]
// optiosn: { domainSplit }
analysis.decorrelatedRankFrequencyAnalysis = (rows, opts = {}) => {
  const domainSplitRank = opts.domainSplitRank || 1000;

  const prng = alea('seed one');
  const getBinomialSampler = randomBinomial.source(prng);

  // Split into frequencyA (used for frequency) and frequencyB (used for rank)
  let corpusASize = 0;
  const decorrelatedFrequencies = rows.map((row) => {
    const frequencyA = getBinomialSampler(+row.frequency, 0.5)();
    const frequencyB = +row.frequency - frequencyA;

    if (frequencyA < 1 || frequencyB < 1) {
      return null;
    }

    corpusASize += frequencyA

    return {
      word: row.word,
      frequencyA,
      frequencyB
    };
  }).filter((val) => (!!val)).sort(numSortBy('frequencyB', true));

  // Assemble some helpful arrays
  const logRanks = [];
  const logFrequencies = [];
  const highFrequencyFitData = [];
  const lowFrequencyFitData = [];
  for (let i = 0, len = decorrelatedFrequencies.length; i < len; i++) {
    const rank = i + 1;
    const frequency = decorrelatedFrequencies[i].frequencyA;
    const logRank = Math.log(rank);
    const logFrequency = Math.log(frequency);
    const logNormalizedFrequency = Math.log(frequency / corpusASize);
    const fitData = [ logRank, logNormalizedFrequency ];
    const fitDomain = (rank <= domainSplitRank) ? highFrequencyFitData : lowFrequencyFitData;

    logRanks.push(logRank);
    logFrequencies.push(logFrequency);
    fitDomain.push(fitData);
  }

  // Fit data to two domains
  const highFrequencyFit = linear(highFrequencyFitData, { precision: 12 });
  const lowFrequencyFit = linear(lowFrequencyFitData, { precision: 12 });
  const highFrequencyPredict = (logRank) => (Math.log(corpusASize) + highFrequencyFit.predict(logRank)[1]);
  const lowFrequencyPredict = (logRank) => (Math.log(corpusASize) + lowFrequencyFit.predict(logRank)[1]);

  // Assemble fit data
  const highFrequencyLogRankRange = [logRanks[0], logRanks[domainSplitRank]];
  const lowFrequencyLogRankRange = [logRanks[domainSplitRank + 1], logRanks[logRanks.length - 1]];
  const highFrequencyFitLogFrequencies = highFrequencyLogRankRange.map(highFrequencyPredict);
  const lowFrequencyFitLogFrequencies = lowFrequencyLogRankRange.map(lowFrequencyPredict);

  // Assemble error data
  const logErrors = logRanks.map((logRank, idx) => {
    const rank = idx + 1;
    const logFrequency = logFrequencies[idx];
    const fitLogFrequency = (rank <= domainSplitRank) ? highFrequencyPredict(logRank) : lowFrequencyPredict(logRank);
    return logFrequency - fitLogFrequency;
  });

  // Styling

  // Assemble traces
  return {
    rankFrequency: {
      x: logRanks,
      y: logFrequencies,
      ...DEFAULT_HISTOGRAM_2D
    },
    highFrequencyFit: {
      x: highFrequencyLogRankRange,
      y: highFrequencyFitLogFrequencies,
      type: 'scatter',
      mode: 'lines',
      // name: `Zipf's law high frequency domain, k=${Math.exp(highFrequencyFit.equation[1]).toPrecision(3)} α=${-highFrequencyFit.equation[0].toPrecision(3)} r2=${highFrequencyFit.r2.toPrecision(3)}`
      name: `α=${-highFrequencyFit.equation[0].toPrecision(2)} r2=${highFrequencyFit.r2.toPrecision(2)}`
    },
    lowFrequencyFit: {
      x: lowFrequencyLogRankRange,
      y: lowFrequencyFitLogFrequencies,
      type: 'scatter',
      mode: 'lines',
      // name: `Zipf's law low frequency domain, k=${Math.exp(lowFrequencyFit.equation[1]).toPrecision(3)} α=${-lowFrequencyFit.equation[0].toPrecision(3)} r2=${lowFrequencyFit.r2.toPrecision(3)}`
      name: `α=${-lowFrequencyFit.equation[0].toPrecision(2)} r2=${lowFrequencyFit.r2.toPrecision(2)}`
    },
    errors: {
      x: logRanks,
      y: logErrors,
      ...DEFAULT_HISTOGRAM_2D
    },
    highFrequencyZeroErrorLine: {
      x: highFrequencyLogRankRange,
      y: [0, 0],
      type: 'scatter',
      mode: 'lines'
    },
    lowFrequencyZeroErrorLine: {
      x: lowFrequencyLogRankRange,
      y: [0, 0],
      type: 'scatter',
      mode: 'lines'
    },
  };
};

analysis.isProbablyTheSameAuthor = (a, b) => {
  if (!a || !b) return false;
  try {
    const [fullNameA, willShortzA] = a.split(' / ');
    const [fullNameB, willShortzB] = b.split(' / ');
    if (!willShortzA || !willShortzB) return false;
    const namesA = fullNameA.split(' ');
    const namesB = fullNameB.split(' ');
    const usedIndices = {};
    for (const nameA of namesA) {
      // for (const idxB in namesB) {
      //   if (usedIndices[idxB]) continue;
      //   const nameB = namesB[idxB];
      //   if (nameB.toUpperCase() === nameA.toUpperCase()) {
      //     usedIndices[idxB] = true;
      //     continue;
      //   }
      // }
      let nameMatchIdx = namesB.findIndex((nameB, idx) => (
        !usedIndices[idx] &&
        nameB.toUpperCase() === nameA.toUpperCase()
      ));

      if (nameMatchIdx > -1) {
        usedIndices[nameMatchIdx] = true;
        continue;
      }

      nameMatchIdx = namesB.findIndex((nameB, idx) => (
        !usedIndices[idx] &&
        (nameA[1] === '.' || nameB[1] === '.') &&
        (nameB[0].toUpperCase() === nameA[0].toUpperCase())
      ));

      if (nameMatchIdx > -1) {
        usedIndices[nameMatchIdx] = true;
        continue;
      }

      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
};

analysis.scrabbleScore = (word) => {
  let score = 0;
  for (let i = 0, len = word.length; i < len; i++) {
    score += (LETTER_SCORES[word[i]] || 0);
  }
  return score;
};

analysis.letterFrequencyScore = (word) => {
  const frequencies = english.DICTIONARY_LETTER_FREQUENCIES;
  const maxFrequency = Math.max(...Object.values(frequencies));
  let score = 0;
  for (let i = 0, len = word.length; i < len; i++) {
    // Get 1 point for ever order of factor of 2 less frequent than the most frequent
    score += 1 + Math.log2(maxFrequency / (frequencies[word[i]] || maxFrequency));
  }
  return score;
};

analysis.countVowels = (word) => {
  let numVowels = 0;
  for (let i = 0, len = word.length; i < len; i++) {
    if (english.VOWELS[word[i]]) numVowels++;
  }
  return numVowels;
};

analysis.percentVowels = (word) => {
  return analysis.countVowels(word) / word.length;
};

module.exports = analysis;