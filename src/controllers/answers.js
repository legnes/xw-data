const { db } = require('../../config');
const { alea } = require('seedrandom');
const { randomBinomial } = require("d3-random");
const { linear } = require('regression');

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const wikiCorpusPath = path.join(__dirname, '../../enwiki-20190320-words-frequency.txt');

const DATA_RANGE_START_YEAR = 1993;
const DATA_RANGE_END_YEAR = 2021;

// https://en.wikipedia.org/wiki/Swadesh_list#Swadesh_207_list
const SWADESH_LIST = ['I', 'YOU', 'HE', 'WE', 'THEY', 'THIS', 'THAT', 'HERE', 'THERE', 'WHO', 'WHAT', 'WHERE', 'WHEN', 'HOW', 'NOT', 'ALL', 'MANY', 'SOME', 'FEW', 'OTHER', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'BIG', 'LONG', 'WIDE', 'THICK', 'HEAVY', 'SMALL', 'SHORT', 'NARROW', 'THIN', 'WOMAN', 'MAN', 'CHILD', 'WIFE', 'HUSBAND', 'MOTHER', 'FATHER', 'ANIMAL', 'FISH', 'BIRD', 'DOG', 'LOUSE', 'SNAKE', 'WORM', 'TREE', 'FOREST', 'STICK', 'FRUIT', 'SEED', 'LEAF', 'ROOT', 'BARK', 'FLOWER', 'GRASS', 'ROPE', 'SKIN', 'MEAT', 'BLOOD', 'BONE', 'FAT', 'EGG', 'HORN', 'TAIL', 'FEATHER', 'HAIR', 'HEAD', 'EAR', 'EYE', 'NOSE', 'MOUTH', 'TOOTH', 'TONGUE', 'FINGERNAIL', 'FOOT', 'LEG', 'KNEE', 'HAND', 'WING', 'BELLY', 'GUTS', 'NECK', 'BACK', 'BREAST', 'HEART', 'LIVER', 'DRINK', 'EAT', 'BITE', 'SUCK', 'SPIT', 'VOMIT', 'BLOW', 'BREATHE', 'LAUGH', 'SEE', 'HEAR', 'KNOW', 'THINK', 'SMELL', 'FEAR', 'SLEEP', 'LIVE', 'DIE', 'KILL', 'FIGHT', 'HUNT', 'HIT', 'CUT', 'SPLIT', 'STAB', 'SCRATCH', 'DIG', 'SWIM', 'FLY', 'WALK', 'COME', 'LIE', 'SIT', 'STAND', 'TURN', 'FALL', 'GIVE', 'HOLD', 'SQUEEZE', 'RUB', 'WASH', 'WIPE', 'PULL', 'PUSH', 'THROW', 'TIE', 'SEW', 'COUNT', 'SAY', 'SING', 'PLAY', 'FLOAT', 'FLOW', 'FREEZE', 'SWELL', 'SUN', 'MOON', 'STAR', 'WATER', 'RAIN', 'RIVER', 'LAKE', 'SEA', 'SALT', 'STONE', 'SAND', 'DUST', 'EARTH', 'CLOUD', 'FOG', 'SKY', 'WIND', 'SNOW', 'ICE', 'SMOKE', 'FIRE', 'ASH', 'BURN', 'ROAD', 'MOUNTAIN', 'RED', 'GREEN', 'YELLOW', 'WHITE', 'BLACK', 'NIGHT', 'DAY', 'YEAR', 'WARM', 'COLD', 'FULL', 'NEW', 'OLD', 'GOOD', 'BAD', 'ROTTEN', 'DIRTY', 'STRAIGHT', 'ROUND', 'SHARP', 'DULL', 'SMOOTH', 'WET', 'DRY', 'CORRECT', 'NEAR', 'FAR', 'RIGHT', 'LEFT', 'AT', 'IN', 'WITH', 'AND', 'IF', 'BECAUSE', 'NAME'];
const NUMERICAL_WORDS = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN', 'TWENTY', 'THIRTY', 'FOURTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY', 'HUNDRED'];

const answers = {};

// https://stackoverflow.com/questions/37679987/efficient-computation-of-n-choose-k-in-node-js
// const binomial = (function() {
//   // step 1: a basic LUT with a few steps of Pascal's triangle
//   const binomials = [
//     [1],
//     [1,1],
//     [1,2,1],
//     [1,3,3,1],
//     [1,4,6,4,1],
//     [1,5,10,10,5,1],
//     [1,6,15,20,15,6,1],
//     [1,7,21,35,35,21,7,1],
//     [1,8,28,56,70,56,28,8,1],
//   ];

//   // step 2: a function that builds out the LUT if it needs to.
//   function binomial(n,k) {
//     while (n >= binomials.length) {
//       let s = binomials.length;
//       let nextRow = [];
//       nextRow[0] = 1;
//       for(let i = 1, prev = s - 1; i < s; i++) {
//         nextRow[i] = binomials[prev][i - 1] + binomials[prev][i];
//       }
//       nextRow[s] = 1;
//       binomials.push(nextRow);
//     }
//     return binomials[n][k];
//   }

//   return binomial;
// }());

// https://www.w3resource.com/javascript-exercises/javascript-math-exercise-20.php
// const chooseCache = {};
// function binomial(n, k) {
//   if (chooseCache[`${n}${k}`]) return chooseCache[`${n}${k}`];
//   let coeff = 1;
//   for (let x = n - k + 1; x <= n; x++) coeff *= x;
//   for (x = 1; x <= k; x++) coeff /= x;
//   chooseCache[`${n}${k}`] = coeff;
//   return coeff;
// }

// https://gist.github.com/ferreiro/84148bb8c7a4a7c0af7b
// function binomial(n, k) {
//   numerator = fact(n);
//   denominator = fact(n - k) * fact(k);
//   return numerator / denominator;
// }
// // Factorial function.
// const factCache = {};
// let primed = false;
// function fact(x) {
//   if(x == 0) return 1;

//   if (!primed) {
//     primed = true;
//     for (let i = 0; i < 1000000; i++) {
//       fact(i);
//     }
//     console.log('primed', fact(100));
//   }

//   if (!factCache[x]) factCache[x] = x * fact(x-1);
//   return factCache[x];
// }
// fact(123456);

// const binCache = {};
// function binomial(n, k) {
//   let prod = 1;
//   for (let i = 1; i <= k; i++) {
//     prod *= (n + 1 - i) / i;
//   }
//   return prod;
// }
// console.log(binomial(800000, 10));

function promiseQuery(query) {
  return new Promise((resolve, reject) => {
    db.query(query, (err, data) => {
      if (err) {
        console.log('err', err)
        reject(err);
      } else {
        console.log('done');
        resolve(data.rows);
      }
    });
  });
}

answers.get = (req, res, next) => {
  db.query(`
SELECT
  c1.answer,
  p.date,
  c1.grid_number,
  c1.direction,
  c1.text,
  ARRAY_AGG (c2.answer) as crosses
FROM clues c1
INNER JOIN puzzles p ON c1.puzzle_id=p.id
INNER JOIN crosses ON crosses.clue1_id=c1.id
INNER JOIN clues c2 ON crosses.clue2_id=c2.id
WHERE c1.answer='${req.params.answer.toUpperCase()}'
GROUP BY p.date, c1.id
ORDER BY p.date;
`, (err, data) => {
    if (err) return next(err);

    res.json(data.rows);
  });
};

answers.countDistinct = (req, res, next) => {
  db.query(`
SELECT
  COUNT(DISTINCT answer)
FROM clues;
`, (err, data) => {
    if (err) return next(err);

    res.json(data.rows);
  });
};

answers.countSingletons = (req, res, next) => {
  db.query(`
SELECT COUNT(answer)
FROM (
    SELECT answer
    FROM clues
    GROUP BY answer
    HAVING COUNT(*) = 1
) AS singletons;
`, (err, data) => {
    if (err) return next(err);

    res.json(data.rows);
  });
};

answers.listFrequentons = (req, res, next) => {
  const frequency = 2;
  db.query(`
SELECT
  answer,
  COUNT(answer)
FROM (
    SELECT answer
    FROM clues
    INNER JOIN puzzles p ON puzzle_id=p.id
    WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
    GROUP BY answer
    HAVING COUNT(*) = ${frequency}
) AS frequentons
GROUP BY answer
LIMIT 200;
`, (err, data) => {
    if (err) return next(err);

    res.json(data.rows);
  });
};

answers.listTopAnswers = (req, res, next) => {
  db.query(`
SELECT
  answer,
  COUNT(*) AS count
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
GROUP BY answer
ORDER BY count DESC, answer
LIMIT 100;
`, (err, data) => {
    if (err) return next(err);

    res.json(data.rows);
  });
};

answers.mostFrequentLongAnswers = (req, res, next) => {
  db.query(`
SELECT
  answer,
  LENGTH(answer) as length,
  COUNT(*) AS count
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
AND LENGTH(answer) > 11
GROUP BY answer
HAVING COUNT(*) > 1
ORDER BY count DESC, length DESC, answer;
`, (err, data) => {
    if (err) return next(err);

    // for (const row of data.rows) {
    //   row.dateIntroduced = new Date(row.date_introduced).toDateString();
    // }

    const figure = {
      rows: data.rows,
      columns: [
        { label: 'answer', key: 'answer'},
        { label: 'length', key: 'length'},
        { label: 'count', key: 'count'},
      ],
    };

    res.json(figure);
  });
};

answers.listTopDirectionRatio = (req, res, next) => {
  db.query(`
SELECT
  answer,
  COUNT(*) as count,
  SUM (CASE WHEN direction='across' THEN 1 ELSE 0 END) as across,
  SUM (CASE WHEN direction='down' THEN 1 ELSE 0 END) as down,
  AVG (CASE WHEN direction='across' THEN 1 ELSE 0 END) as percent_across
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
GROUP BY answer
HAVING COUNT(*) > 100
ORDER BY percent_across ASC, answer
LIMIT 100;
`, (err, data) => {
    if (err) return next(err);

    res.json(data.rows);
  });
};

answers.listTopLocationBias = (req, res, next) => {
  db.query(`
SELECT
  answer,
  COUNT(*) as count,
  SUM (CASE WHEN MOD(grid_index, 15) < 7 AND (grid_index / 15) < 7 THEN 1 ELSE 0 END) as northwest,
  SUM (CASE WHEN MOD(grid_index, 15) >= 7 AND (grid_index / 15) < 7 THEN 1 ELSE 0 END) as northeast,
  SUM (CASE WHEN MOD(grid_index, 15) < 7 AND (grid_index / 15) >= 7 THEN 1 ELSE 0 END) as southwest,
  SUM (CASE WHEN MOD(grid_index, 15) >= 7 AND (grid_index / 15) >= 7 THEN 1 ELSE 0 END) as southeast,
  AVG (CASE WHEN MOD(grid_index, 15) < 7 AND (grid_index / 15) < 7 THEN 1 ELSE 0 END) as percent_northwest,
  AVG (CASE WHEN MOD(grid_index, 15) >= 7 AND (grid_index / 15) < 7 THEN 1 ELSE 0 END) as percent_northeast,
  AVG (CASE WHEN MOD(grid_index, 15) < 7 AND (grid_index / 15) >= 7 THEN 1 ELSE 0 END) as percent_southwest,
  AVG (CASE WHEN MOD(grid_index, 15) >= 7 AND (grid_index / 15) >= 7 THEN 1 ELSE 0 END) as percent_southeast
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE (p.date BETWEEN '1000-01-01' AND '3020-01-01') AND (p.width=15) AND (p.height=15)
GROUP BY answer
HAVING COUNT(*) > 100
ORDER BY percent_northwest DESC, answer
LIMIT 100;
`, (err, data) => {
    if (err) return next(err);

    res.json(data.rows);
  });
};

function sortFn(key, desc) {
  return (a, b) => ((desc ? -1 : 1) * (+a[key] - +b[key]));
}

// rows: [...{ word, frequency }]
// optiosn: { domainSplit }
function decorrelatedRankFrequencyAnalysis(rows, opts = {}) {
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
  }).filter((val) => (!!val)).sort(sortFn('frequencyB', true));

  // Assemble some helpful arrays
  const logRanks = [];
  const logFrequencies = [];
  const highFrequencyLogRankNormalizedFrequencies = [];
  const lowFrequencyLogRankNormalizedFrequencies = [];
  for (let i = 0, len = decorrelatedFrequencies.length; i < len; i++) {
    const rank = i + 1;
    const frequency = decorrelatedFrequencies[i].frequencyA;
    const logRank = Math.log(rank);
    const logFrequency = Math.log(frequency);
    const logNormalizedFrequency = Math.log(frequency / corpusASize);
    const logRankNormalizedFrequency = [ logRank, logNormalizedFrequency ];

    logRanks.push(logRank);
    logFrequencies.push(logFrequency);

    if (rank <= domainSplitRank) {
      highFrequencyLogRankNormalizedFrequencies.push(logRankNormalizedFrequency)
    } else {
      lowFrequencyLogRankNormalizedFrequencies.push(logRankNormalizedFrequency)
    }
  }

  // Fit data to two domains
  const highFrequencyFit = linear(highFrequencyLogRankNormalizedFrequencies, { precision: 12 });
  const lowFrequencyFit = linear(lowFrequencyLogRankNormalizedFrequencies, { precision: 12 });
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
  const colorscale = [
    ['0', 'rgba(255,255,255, 0)'],
    ['0.00000001', 'rgb(0, 0, 0, 1)'],
    ['0.0001', 'rgb(10,136,186)'],
    ['0.001', 'rgb(12,51,131)'],
    ['0.01', 'rgb(242,211,56)'],
    ['0.1', 'rgb(242,143,56)'],
    ['1', 'rgb(217,30,30)']
  ];

  // Assemble traces
  return {
    rankFrequency: {
      x: logRanks,
      y: logFrequencies,
      type: 'histogram2d',
      histfunc: 'count',
      colorscale
    },
    highFrequencyFit: {
      x: highFrequencyLogRankRange,
      y: highFrequencyFitLogFrequencies,
      type: 'scatter',
      mode: 'lines',
      // name: `Zipf's law high frequency domain, k=${Math.exp(highFrequencyFit.equation[1]).toPrecision(3)} a=${-highFrequencyFit.equation[0].toPrecision(3)} r2=${highFrequencyFit.r2.toPrecision(3)}`
      name: `k=${Math.exp(highFrequencyFit.equation[1]).toPrecision(2)} a=${-highFrequencyFit.equation[0].toPrecision(2)} r2=${highFrequencyFit.r2.toPrecision(2)}`
    },
    lowFrequencyFit: {
      x: lowFrequencyLogRankRange,
      y: lowFrequencyFitLogFrequencies,
      type: 'scatter',
      mode: 'lines',
      // name: `Zipf's law low frequency domain, k=${Math.exp(lowFrequencyFit.equation[1]).toPrecision(3)} a=${-lowFrequencyFit.equation[0].toPrecision(3)} r2=${lowFrequencyFit.r2.toPrecision(3)}`
      name: `k=${Math.exp(lowFrequencyFit.equation[1]).toPrecision(2)} a=${-lowFrequencyFit.equation[0].toPrecision(2)} r2=${lowFrequencyFit.r2.toPrecision(2)}`
    },
    errors: {
      x: logRanks,
      y: logErrors,
      type: 'histogram2d',
      histfunc: 'count',
      colorscale
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

answers.rankFrequency = (req, res, next) => {
  db.query(`
SELECT
  answer,
  COUNT(*) AS frequency
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
GROUP BY answer
ORDER BY frequency DESC, answer;
`, (err, data) => {
    if (err) return next(err);

    const dataTrace = {
      x: data.rows.map((row, idx) => (idx + 1)),
      y: data.rows.map((row) => +row.frequency),
      text: data.rows.map((row) => row.answer),
      type: 'scatter',
      mode: 'lines',
    };

    const figure = { data: [ dataTrace ], layout: {} };
    res.json(figure)
  });
};

answers.rankFrequencySwadesh = (req, res, next) => {
  db.query(`
SELECT
  answer,
  COUNT(*) AS frequency
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
GROUP BY answer
ORDER BY frequency DESC, answer;
`, (err, data) => {
    if (err) return next(err);

    const swadeshRows = SWADESH_LIST.map((word) => ({ word, frequency: wikiCorpus.countsByWord[word]})).sort(sortFn('frequency', true));

    const frequencies = data.rows.reduce((freqs, row) => {
      if (SWADESH_LIST.includes(row.answer)) {
        freqs[row.answer] = +row.frequency;
      }
      return freqs;
    }, {});

    const dataTrace = {
      x: swadeshRows.map((row, idx) => (idx + 1)),
      y: swadeshRows.map((row) => frequencies[row.word]),
      text: swadeshRows.map((row) => row.word),
      type: 'scatter',
      mode: 'markers',
    };

    const figure = { data: [ dataTrace ], layout: {} };
    res.json(figure)
  });
};

answers.rankFrequencyNumericals = (req, res, next) => {
  db.query(`
SELECT
  answer,
  COUNT(*) AS frequency
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
GROUP BY answer
ORDER BY frequency DESC, answer;
`, (err, data) => {
    if (err) return next(err);

    const numberRows = NUMERICAL_WORDS.map((word) => ({ word, frequency: wikiCorpus.countsByWord[word]})).sort(sortFn('frequency', true));

    const frequencies = data.rows.reduce((freqs, row) => {
      if (NUMERICAL_WORDS.includes(row.answer)) {
        freqs[row.answer] = +row.frequency;
      }
      return freqs;
    }, {});

    const dataTrace = {
      x: numberRows.map((row, idx) => (idx + 1)),
      y: numberRows.map((row) => frequencies[row.word]),
      text: numberRows.map((row) => row.word),
      type: 'scatter',
      mode: 'markers+lines',
    };

    const figure = { data: [ dataTrace ], layout: {} };
    res.json(figure)
  });
};

answers.decorrelatedRankFrequency = (req, res, next) => {
  db.query(`
SELECT
  answer,
  COUNT(*) AS frequency
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
GROUP BY answer
ORDER BY frequency DESC, answer;
`, (err, data) => {
    if (err) return next(err);
    const analysis = decorrelatedRankFrequencyAnalysis(data.rows, { domainSplitRank: 500 });
    const figure = { data: [ analysis.rankFrequency, analysis.highFrequencyFit, analysis.lowFrequencyFit ], layout: {} };
    res.json(figure)
  });
};

answers.decorrelatedRankFrequencyError = (req, res, next) => {
  db.query(`
SELECT
  answer,
  COUNT(*) AS frequency
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
GROUP BY answer
ORDER BY frequency DESC, answer;
`, (err, data) => {
    if (err) return next(err);
    const analysis = decorrelatedRankFrequencyAnalysis(data.rows, { domainSplitRank: 500 });
    const figure = { data: [ analysis.errors, analysis.highFrequencyZeroErrorLine, analysis.lowFrequencyZeroErrorLine ], layout: {} };
    res.json(figure)
  });
};

answers.rankFrequencyEn = (req, res, next) => {
  let rows = wikiCorpus.frequencyRows;
  rows = rows.sort((a, b) => (b.frequency - a.frequency));//.slice(0, 200000);
  const corpusSize = wikiCorpus.total;

  const ranks = [], frequencies = [], logFrequencySeries = [];
  for (let i = 0, len = rows.length; i < len; i++) {
    const rank = i + 1;
    const frequency = +rows[i].frequency;
    ranks.push(rank);
    frequencies.push(frequency);
    logFrequencySeries.push([ Math.log(rank), Math.log(frequency / corpusSize) ])
  }
  // TODO: use logarithmic instead of linear???
  const fit = linear(logFrequencySeries, { precision: 12 });
  const fitFrequencies = ranks.map(rank => (corpusSize * Math.exp(fit.predict(Math.log(rank))[1])));

  const dataTrace = {
    x: ranks,
    y: frequencies,
    text: rows.map(row => row.word),
    type: 'scatter',
    mode: 'lines',
    name: 'Raw frequencies'
  };

  const fitTrace = {
    x: ranks,
    y: fitFrequencies,
    type: 'scatter',
    mode: 'lines',
    name: `Zipf's law fit, k=${Math.exp(fit.equation[1]).toPrecision(3)} a=${-fit.equation[0].toPrecision(3)} r2=${fit.r2.toPrecision(3)}`
  };

  const figure = { data: [ dataTrace, fitTrace ], layout: {} };
  res.json(figure)
};

answers.decorrelatedRankFrequencyEn = (req, res, next) => {
  const analysis = decorrelatedRankFrequencyAnalysis(wikiCorpus.frequencyRows, { domainSplitRank: 5000 });
  const figure = { data: [ analysis.rankFrequency, analysis.highFrequencyFit, analysis.lowFrequencyFit ], layout: {} };
  res.json(figure)
};

answers.decorrelatedRankFrequencyErrorEn = (req, res, next) => {
  const analysis = decorrelatedRankFrequencyAnalysis(wikiCorpus.frequencyRows, { domainSplitRank: 5000 });
  const figure = { data: [ analysis.errors, analysis.highFrequencyZeroErrorLine, analysis.lowFrequencyZeroErrorLine ], layout: {} };
  res.json(figure)
};

answers.rankFrequencyRandom = (req, res, next) => {
  const dictionarySize = 1000;
  const corpusSize = 1000000;
  const dictionary = Array.from({ length: dictionarySize }, (val, idx) => idx);
  const wordCounts = {};
  for (let i = 0; i < corpusSize; i++) {
    const word = dictionary[Math.floor(Math.random() * dictionarySize)];
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  }
  const rows = Object.entries(wordCounts).map(([word, frequency]) => ({ word, frequency })).sort((a, b) => (b.frequency - a.frequency));

  const dataTrace = {
    x: rows.map((val, idx) => (idx + 1)),
    y: rows.map(val => val.frequency),
    type: 'scatter',
    mode: 'markers',
    // mode: 'lines+markers+text'
    // name: 'Raw Frequencies'
  };

  const figure = { data: [ dataTrace ], layout: {} };
  res.json(figure)
};

answers.decorrelatedRankFrequencyRandom = (req, res, next) => {
  const dictionarySize = 1000;
  const corpusSize = 1000000;
  const dictionary = Array.from({ length: dictionarySize }, (val, idx) => idx);
  const corpusA = {};
  const corpusB = {};
  for (let i = 0; i < corpusSize; i++) {
    const wordA = dictionary[Math.floor(Math.random() * dictionarySize)];
    corpusA[wordA] = (corpusA[wordA] || 0) + 1;

    const wordB = dictionary[Math.floor(Math.random() * dictionarySize)];
    corpusB[wordB] = (corpusB[wordB] || 0) + 1;
  }
  const rowsA = Object.entries(corpusA).map(([word, frequency]) => ({ word, frequency })).sort((a, b) => (b.frequency - a.frequency));

  const dataTrace = {
    x: rowsA.map((val, idx) => (idx + 1)),
    y: rowsA.map(({ word, frequency }) => corpusB[word]),
    type: 'scatter',
    mode: 'markers',
    // mode: 'lines+markers+text'
    // name: 'Raw Frequencies'
  };

  const figure = { data: [ dataTrace ], layout: {} };
  res.json(figure)
};

// answers.decorrelatedRankFrequency = (req, res, next) => {
//   const prng = alea('seed one');
//   const getBinomialSampler = randomBinomial.source(prng);

//   db.query(`
// SELECT
//   answer,
//   COUNT(*) AS frequency
// FROM clues
// INNER JOIN puzzles p ON puzzle_id=p.id
// WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
// GROUP BY answer
// ORDER BY frequency DESC, answer;
// `, (err, data) => {
//     if (err) return next(err);

//     let corpusSize = 0;
//     let splitFrequencies = data.rows.map((row) => {
//       const splitFrequency = getBinomialSampler(+row.frequency, 0.5)();
//       const rankFrequency = +row.frequency - splitFrequency;
//       if (splitFrequency < 1 || rankFrequency < 1) {
//         return null;
//       }
//       corpusSize += splitFrequency
//       return {
//         frequency: splitFrequency,
//         rankFrequency
//       };
//     });
//     splitFrequencies = splitFrequencies.filter(val => !!val).sort((a, b) => (b.rankFrequency - a.rankFrequency));

//     // data
//     const ranks = [], frequencies = [], logFrequencySeries = [];
//     for (let i = 0, len = splitFrequencies.length; i < len; i++) {
//       const rank = i + 1;
//       const frequency = splitFrequencies[i].frequency;
//       ranks.push(rank);
//       frequencies.push(frequency);
//       logFrequencySeries.push([ Math.log(rank), Math.log(frequency / corpusSize) ])
//     }
//     const ranks1 = ranks.slice(0, 1000);
//     const ranks2 = ranks.slice(1000);

//     // fits
//     // TODO: use logarithmic instead of linear???
//     const fit1 = linear(logFrequencySeries.slice(0, 1000), { precision: 12 });
//     const fit2 = linear(logFrequencySeries.slice(1000, 9000), { precision: 12 });
//     const fitFrequencies1 = ranks1.map(rank => (corpusSize * Math.exp(fit1.predict(Math.log(rank))[1])));
//     const fitFrequencies2 = ranks2.map(rank => (corpusSize * Math.exp(fit2.predict(Math.log(rank))[1])));

//     // errors
//     const errors1 = fitFrequencies1.map((freq, idx) => (frequencies[idx] - freq));
//     const errors2 = fitFrequencies2.map((freq, idx) => (frequencies[1000 + idx] - freq));

//     const dataTrace = {
//       x: ranks,
//       y: frequencies,
//       text: data.rows.map(row => row.answer),
//       type: 'scatter',
//       mode: 'histogram2d', // TODO: make this markers!
//       // name: 'Raw Frequencies'
//     };

//     const fitTrace1 = {
//       x: ranks1,
//       y: fitFrequencies1,
//       type: 'scatter',
//       mode: 'lines',
//       // name: `Zipf's Law, k=${Math.exp(fit.equation[1]).toPrecision(3)} a=${-fit.equation[0].toPrecision(3)} r2=${fit.r2.toPrecision(3)}`
//     };

//     const fitTrace2 = {
//       x: ranks2,
//       y: fitFrequencies2,
//       type: 'scatter',
//       mode: 'lines',
//       // name: `Zipf's Law, k=${Math.exp(fit.equation[1]).toPrecision(3)} a=${-fit.equation[0].toPrecision(3)} r2=${fit.r2.toPrecision(3)}`
//     };

//     const errorTrace1 = {
//       x: ranks1,
//       y: errors1,
//       type: 'scatter',
//       mode: 'lines',
//       yaxis: 'y2'
//     };

//     const errorTrace2 = {
//       x: ranks2,
//       y: errors2,
//       type: 'scatter',
//       mode: 'lines',
//       yaxis: 'y2'
//     };

//     const layout = {
//       yaxis2: {
//         overlaying: 'y',
//         side: 'right'
//       }
//     };

//     const figure = { data: [ dataTrace, fitTrace1, fitTrace2, errorTrace1, errorTrace2 ], layout };
//     res.json(figure)
//   });
// };

// answers.decorrelatedRankFrequencyHistogram = (req, res, next) => {
//   const prng = alea('seed one');
//   const getBinomialSampler = randomBinomial.source(prng);

//   db.query(`
// SELECT
//   answer,
//   COUNT(*) AS frequency
// FROM clues
// INNER JOIN puzzles p ON puzzle_id=p.id
// WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
// GROUP BY answer
// ORDER BY frequency DESC, answer;
// `, (err, data) => {
//     if (err) return next(err);

//     let corpusSize = 0;
//     let splitFrequencies = data.rows.map((row) => {
//       const splitFrequency = getBinomialSampler(+row.frequency, 0.5)();
//       const rankFrequency = +row.frequency - splitFrequency;
//       if (splitFrequency < 1 || rankFrequency < 1) {
//         return null;
//       }
//       corpusSize += splitFrequency
//       return {
//         frequency: splitFrequency,
//         rankFrequency
//       };
//     });
//     splitFrequencies = splitFrequencies.filter(val => !!val).sort((a, b) => (b.rankFrequency - a.rankFrequency));

//     // data
//     const logRanks = [], logFrequencies = [], logRankFrequencySeries = [];
//     for (let i = 0, len = splitFrequencies.length; i < len; i++) {
//       const logRank = Math.log(i + 1);
//       const logFrequency = Math.log(splitFrequencies[i].frequency / corpusSize);
//       logRanks.push(logRank);
//       logFrequencies.push(logFrequency);
//       logRankFrequencySeries.push([ logRank, logFrequency ])
//     }
//     const logRanks1 = logRanks.slice(0, 1000);
//     const logRanks2 = logRanks.slice(1000);

//     // fits
//     // TODO: use logarithmic instead of linear???
//     const fit1 = linear(logRankFrequencySeries.slice(0, 1000), { precision: 12 });
//     const fit2 = linear(logRankFrequencySeries.slice(1000, 9000), { precision: 12 });
//     const fitFrequencies1 = logRanks1.map(logRank => (fit1.predict(logRank)[1]));
//     const fitFrequencies2 = logRanks2.map(logRank => (fit2.predict(logRank)[1]));

//     const fitTrace1 = {
//       x: logRanks1,
//       y: fitFrequencies1,
//       type: 'scatter',
//       mode: 'lines',
//       // name: `Zipf's Law, k=${Math.exp(fit.equation[1]).toPrecision(3)} a=${-fit.equation[0].toPrecision(3)} r2=${fit.r2.toPrecision(3)}`
//     };

//     const fitTrace2 = {
//       x: logRanks2,
//       y: fitFrequencies2,
//       type: 'scatter',
//       mode: 'lines',
//       // name: `Zipf's Law, k=${Math.exp(fit.equation[1]).toPrecision(3)} a=${-fit.equation[0].toPrecision(3)} r2=${fit.r2.toPrecision(3)}`
//     };

//     const histogramTrace = {
//       x: logRanks,
//       y: logFrequencies,
//       text: data.rows.map(row => row.answer),
//       type: 'histogram2d',
//       mode: 'lines', // TODO: make this markers!
//       // histnorm: 'percent', 'probability', 'density', 'probability density'
//       // autobinx: false,
//       // xbins: {
//       //   start: -3,
//       //   end: 3,
//       //   size: 0.1
//       // },
//       // autobiny: false,
//       // ybins: {
//       //   start: -2.5,
//       //   end: 4,
//       //   size: 0.1
//       // },
//       colorscale: [
//         ['0', 'rgba(255,255,255, 0)'],
//         ['0.0001', 'rgb(10,136,186)'],
//         ['0.001', 'rgb(12,51,131)'],
//         ['0.01', 'rgb(242,211,56)'],
//         ['0.1', 'rgb(242,143,56)'],
//         ['1', 'rgb(217,30,30)']
//       ],
//       // name: 'Raw Frequencies'
//     };

//     const figure = { data: [ histogramTrace, fitTrace1, fitTrace2 ], layout: {} };
//     res.json(figure)
//   });
// };

// answers.decorrelatedRankFrequencyErrorHistogram = (req, res, next) => {
//   const prng = alea('seed one');
//   const getBinomialSampler = randomBinomial.source(prng);

//   db.query(`
// SELECT
//   answer,
//   COUNT(*) AS frequency
// FROM clues
// INNER JOIN puzzles p ON puzzle_id=p.id
// WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
// GROUP BY answer
// ORDER BY frequency DESC, answer;
// `, (err, data) => {
//     if (err) return next(err);

//     let corpusSize = 0;
//     let splitFrequencies = data.rows.map((row) => {
//       const splitFrequency = getBinomialSampler(+row.frequency, 0.5)();
//       const rankFrequency = +row.frequency - splitFrequency;
//       if (splitFrequency < 1 || rankFrequency < 1) {
//         return null;
//       }
//       corpusSize += splitFrequency
//       return {
//         frequency: splitFrequency,
//         rankFrequency
//       };
//     });
//     splitFrequencies = splitFrequencies.filter(val => !!val).sort((a, b) => (b.rankFrequency - a.rankFrequency));

//     // data
//     const logRanks = [], logFrequencies = [], logRankFrequencySeries = [];
//     for (let i = 0, len = splitFrequencies.length; i < len; i++) {
//       const logRank = Math.log(i + 1);
//       const logFrequency = Math.log(splitFrequencies[i].frequency / corpusSize);
//       logRanks.push(logRank);
//       logFrequencies.push(logFrequency);
//       logRankFrequencySeries.push([ logRank, logFrequency ])
//     }
//     const logRanks1 = logRanks.slice(0, 1000);
//     const logRanks2 = logRanks.slice(1000);

//     // fits
//     // TODO: use logarithmic instead of linear???
//     const fit1 = linear(logRankFrequencySeries.slice(0, 1000), { precision: 12 });
//     const fit2 = linear(logRankFrequencySeries.slice(1000, 9000), { precision: 12 });
//     const fitFrequencies1 = logRanks1.map(logRank => (fit1.predict(logRank)[1]));
//     const fitFrequencies2 = logRanks2.map(logRank => (fit2.predict(logRank)[1]));

//     // errors
//     const logErrors1 = fitFrequencies1.map((logFreq, idx) => (logFrequencies[idx] - logFreq));
//     const logErrors2 = fitFrequencies2.map((logFreq, idx) => (logFrequencies[1000 + idx] - logFreq));

//     const errorTrace = {
//       x: [...logRanks1, ...logRanks2],
//       y: [...logErrors1, ...logErrors2],
//       type: 'histogram2d',
//       colorscale: [
//         ['0', 'rgba(255,255,255, 0)'],
//         ['0.0001', 'rgb(10,136,186)'],
//         ['0.001', 'rgb(12,51,131)'],
//         ['0.01', 'rgb(242,211,56)'],
//         ['0.1', 'rgb(242,143,56)'],
//         ['1', 'rgb(217,30,30)']
//       ],
//     };

//     const fitTrace1 = {
//       x: [Math.log(1), Math.log(1000)],
//       y: [0, 0],
//       type: 'scatter',
//       mode: 'lines',
//       // name: `Zipf's Law, k=${Math.exp(fit.equation[1]).toPrecision(3)} a=${-fit.equation[0].toPrecision(3)} r2=${fit.r2.toPrecision(3)}`
//     };

//     const fitTrace2 = {
//       x: [Math.log(1000), Math.log(logRanks.length)],
//       y: [0, 0],
//       type: 'scatter',
//       mode: 'lines',
//       // name: `Zipf's Law, k=${Math.exp(fit.equation[1]).toPrecision(3)} a=${-fit.equation[0].toPrecision(3)} r2=${fit.r2.toPrecision(3)}`
//     };

//     const figure = { data: [ errorTrace, fitTrace1, fitTrace2 ], layout: {} };
//     res.json(figure)
//   });
// };

// answers.complicatedFrequencyRank = (req, res, next) => {
//   const prng = alea('seed one');
//   const getBinomialSampler = randomBinomial.source(prng);

//   db.query(`
// SELECT
//   answer,
//   COUNT(*) AS frequency
// FROM clues
// INNER JOIN puzzles p ON puzzle_id=p.id
// WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
// GROUP BY answer
// ORDER BY frequency DESC, answer;
// `, (freqErr, freqData) => {
//     if (freqErr) throw freqErr;

//     let corpusSize = 0;
//     let decorrelatedCorpusSize = 0;
//     const data = freqData.rows.map(({ frequency, answer }, idx) => {

//       frequency = parseInt(frequency, 10);
//       corpusSize += frequency;

//       const decorrelatedFrequency = getBinomialSampler(frequency, 0.5)();
//       decorrelatedCorpusSize += decorrelatedFrequency;

//       return {
//         word: answer,
//         rank: idx + 1,
//         frequency,
//         frequencyNormalized: 0,
//         decorrelatedRank: 0,
//         decorrelatedFrequency,
//         decorrelatedFrequencyNormalized: 0,
//       };
//     });

//     data.sort((rowA, rowB) => ((rowB.frequency - rowB.decorrelatedFrequency) - (rowA.frequency - rowA.decorrelatedFrequency)));
//     data.forEach((row, idx) => {
//       row.frequencyNormalized = row.frequency / corpusSize;
//       row.decorrelatedRank = idx + 1;
//       row.decorrelatedFrequencyNormalized = row.decorrelatedFrequency / decorrelatedCorpusSize;
//     });
//     data.sort((rowA, rowB) => (rowA.rank - rowB.rank));

//     const zipfData = data.map(({ rank, frequencyNormalized}) => [ Math.log(rank), Math.log(frequencyNormalized) ]);
//     const decorrelatedZipfData = data.filter(({ decorrelatedFrequency, decorrelatedFrequencyNormalized }) => (decorrelatedFrequency > 0)).map(({ decorrelatedRank, decorrelatedFrequencyNormalized }) => [ Math.log(decorrelatedRank), Math.log(decorrelatedFrequencyNormalized) ]);

//     // TODO: use logarithmic instead of linear???
//     const zipfFit = linear(zipfData, { precision: 12 });
//     const decorrelatedZipfFit = linear(decorrelatedZipfData, { precision: 12 });

//     // const mzData = data.map(({ rank, frequencyNormalized}) => [ Math.log(rank + 2.7), Math.log(frequencyNormalized) ]);
//     // const decorrelatedMzData = data.filter(({ decorrelatedFrequency, decorrelatedFrequencyNormalized }) => (decorrelatedFrequency > 0)).map(({ decorrelatedRank, decorrelatedFrequencyNormalized }) => [ Math.log(decorrelatedRank + 2.7), Math.log(decorrelatedFrequencyNormalized) ]);

//     // const mzFit = linear(mzData, { precision: 12 });
//     // const decorrelatedMzFit = linear(decorrelatedMzData, { precision: 12 });

//     // let beta = 0;
//     // let chi2 = Infinity;
//     // let testBeta = beta;
//     // let testZipfData = zipfData.map(p => p.slice());
//     // let mzFit = zipfFit;
//     // for (let i = 0; i < 200; i++) {
//     //   testZipfData.forEach((p, idx) => { p[0] = zipfData[idx][0] + testBeta });
//     //   const testZipfFit = linear(testZipfData, { precision: 12 });
//     //   const testChi2 = testZipfData.reduce((sum, [x, y]) => {
//     //     const observed = y;
//     //     const expected = testZipfFit.predict(x)[1];
//     //     return sum + ((observed - expected) * (observed - expected) / Math.abs(expected));
//     //   }, 0);
//     //   if (testChi2 < chi2 || Math.random() < 0.01) {
//     //     beta = testBeta;
//     //     chi2 = testChi2
//     //     mzFit = testZipfFit;
//     //   }
//     //   testBeta = beta + 4 * (Math.random() * 2 - 1);
//     //   console.log(beta, chi2, testBeta, testChi2);
//     // }

//     // console.log('\n\n\n');

//     // let decorBeta = 0;
//     // let decorChi2 = Infinity;
//     // testBeta = decorBeta;
//     // testZipfData = decorrelatedZipfData.map(p => p.slice());
//     // let decorrelatedMzFit = decorrelatedZipfFit;
//     // for (let i = 0; i < 200; i++) {
//     //   testZipfData.forEach((p, idx) => { p[0] = decorrelatedZipfData[idx][0] + testBeta });
//     //   const testZipfFit = linear(testZipfData, { precision: 12 });
//     //   const testChi2 = testZipfData.reduce((sum, [x, y]) => {
//     //     const observed = y;
//     //     const expected = testZipfFit.predict(x)[1];
//     //     return sum + ((observed - expected) * (observed - expected) / Math.abs(expected));
//     //   }, 0);
//     //   if (testChi2 < decorChi2 || Math.random() < 0.01) {
//     //     decorBeta = testBeta;
//     //     decorChi2 = testChi2;
//     //     decorrelatedMzFit = testZipfFit;
//     //   }
//     //   testBeta = decorBeta + 4 * (Math.random() * 2 - 1);
//     //   console.log(decorBeta, decorChi2, testBeta, testChi2);
//     // }

//     console.log(zipfFit.string, zipfFit.equation, 'r2:', zipfFit.r2, 'k:', Math.exp(zipfFit.equation[1]), 'a:', -zipfFit.equation[0]);
//     console.log(decorrelatedZipfFit.string, decorrelatedZipfFit.equation, 'r2:', decorrelatedZipfFit.r2, 'k:', Math.exp(decorrelatedZipfFit.equation[1]), 'a:', -decorrelatedZipfFit.equation[0]);
//     // console.log(mzFit.string, mzFit.equation, 'r2:', mzFit.r2, 'k:', Math.exp(mzFit.equation[1]), 'a:', -mzFit.equation[0]);
//     // console.log(decorrelatedMzFit.string, decorrelatedMzFit.equation, 'r2:', decorrelatedMzFit.r2, 'k:', Math.exp(decorrelatedMzFit.equation[1]), 'a:', -decorrelatedMzFit.equation[0]);

//     // Ok so here's where I got:
//     // Zipf can be linearly refressed
//     // Mandelbrot zipf is better (gets the tail falloff I think?) but is harder to fit, I couldn't figure out how to do it right
//     // There are other models too like yule-simon and log normal that I didn't look t
//     // Can just plot rank/freq, but technically should be decorrelated to make error/deviation from fit line meaningful
//     // To do that, split corpus in half i.e. sample from binomial dist for each word
//     // results seem to say: v good fit on non-decorrelated, bad fit on decorrelated. Need to look at graphs to characterize.
//     // But some thoughts are: this should basically be because of equal-ish distribution across part of speech, but different
//     // number of wordds in each part of speech ctegory (decreasing tiered look)
//     // combined with a need for medium-specificity words (???). Neither totally applies to this scenario, so maybe that will indicate a difference.

//     // One way to do this is with MLE. worth looking up what that is and how to do it.
//     //

//     res.json(data.slice(0, 100));
//     // res.json(data);
//   });
// };

answers.simulateHerdan = (req, res, next) => {
  const referenceCorpusTypes = cleanQueryParamNumber(req.query.refTypes, 1000);
  const referenceCorpusZipfPower = cleanQueryParamNumber(req.query.refZipf, 1.01);
  const documentTokens = cleanQueryParamNumber(req.query.docSize, 100);

  let normalization = 0;
  for (let n = 1; n <= referenceCorpusTypes; n++) {
    normalization += (1 / (n ** referenceCorpusZipfPower));
  }

  let sum = 0;
  const normalizedFrequencies = [];
  // const zipfFrequencies = [];
  for (let rank = 1; rank <= referenceCorpusTypes; rank++) {
    const f = (1 / (rank ** referenceCorpusZipfPower)) / normalization;
    // zipfFrequencies.push(f);
    sum += f;
    normalizedFrequencies.push(sum);
  }

  const prng = alea('seed one');
  const types = {};
  const tokenCounts = [];
  const typeCounts = [];
  const fitData = [];
  for (let i = 1; i <= documentTokens; i++) {
    const sample = prng();
    let type = 0;
    while (normalizedFrequencies[type] < sample && type < referenceCorpusTypes) { type++; }
    types[type] = true;
    tokenCounts.push(i);
    typeCounts.push(Object.keys(types).length);
    fitData.push([Math.log(i), Math.log(Object.keys(types).length)]);
  }
  const fit = linear(fitData, { precision: 12 });

  const dataTrace = {
    x: tokenCounts,
    y: typeCounts,
    type: 'scatter',
    mode: 'lines'
  };

  const fitTrace = {
    x: tokenCounts,
    y: tokenCounts.map((tokens) => Math.exp(fit.predict(Math.log(tokens))[1])),
    type: 'scatter',
    mode: 'lines',
    name: `Herdan's fit, k=${Math.exp(fit.equation[1]).toFixed(2)} h=${fit.equation[0].toFixed(2)} r2=${fit.r2.toFixed(2)}`
  };

  // const zipfTrace = {
  //   x: Array.from({length: referenceCorpusTypes}, (v, idx) => (idx + 1)),
  //   y: zipfFrequencies,
  //   type: 'scatter',
  //   mode: 'lines'
  // };

  const layout = {
    // yaxis: { type: 'log' }
  };

  const figure = { data: [ dataTrace, fitTrace ], layout };
  res.json(figure);
};

function averageBy(rows, key) {
  return sumBy(rows, key) / rows.length;
}

function standardDeviationBy(rows, key) {
  const mean = averageBy(rows, key);
  const variance = rows.reduce((v, row) => (v + ((+row[key] - mean) ** 2)), 0) / rows.length;
  return Math.sqrt(variance);
}

function covarianceBy(rows, keyX, keyY) {
  const expectedX = averageBy(rows, keyX);
  const expectedY = averageBy(rows, keyY);
  return rows.reduce((c, row) => (c + ((+row[keyX] - expectedX) * (+row[keyY] - expectedY))), 0) / rows.length;
}

function pearsonCorrelationCoeffBy(rows, keyX, keyY) {
  const deviationX = standardDeviationBy(rows, keyX);
  const deviationY = standardDeviationBy(rows, keyY);
  const covariance = covarianceBy(rows, keyX, keyY);
  return covariance / (deviationX * deviationY);
}

function runCorrelationTest(rows, test) {
  const coeff = pearsonCorrelationCoeffBy(rows, test.keyX, test.keyY);
  const standardError = 1 / Math.sqrt(rows.length - 3);
  const fisherTransformation = Math.atanh(coeff);
  const zScore = fisherTransformation / standardError;
  return { coeff: coeff.toFixed(3), standardError, fisherTransformation, zScore: zScore.toFixed(3), ...test };
}

// function pearsonCorrelationCoeffWithPermutationBy(rows, keyX, keyY) {
//   const coeff = pearsonCorrelationCoeffBy(rows, keyX, keyY);
//   const rowMap = Array.from(rows, (row, idx) => idx);
//   const numTests = 1000;
//   let countGreater = 0;
//   for (let i = 0; i < numTests; i++) {
//     shuffle(rowMap);
//     rows.forEach((row, idx) => { row.testY = rows[rowMap[idx]][keyY]; });
//     const testCoeff = pearsonCorrelationCoeffBy(rows, keyX, 'testY');
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

answers.lengthFrequency = (req, res, next) => {
  db.query(`
SELECT
  answer,
  LENGTH(answer) as length,
  COUNT(*) AS frequency
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
GROUP BY answer;
`, (err, data) => {
    if (err) return next(err);

    const dataTrace = {
      x: data.rows.map(row => +row.length),
      y: data.rows.map(row => Math.log10(+row.frequency)),
      type: 'histogram2d',
      colorscale: [
        ['0', 'rgba(255,255,255, 0)'],
        ['0.0001', 'rgb(10,136,186)'],
        ['0.001', 'rgb(12,51,131)'],
        ['0.01', 'rgb(242,211,56)'],
        ['0.1', 'rgb(242,143,56)'],
        ['1', 'rgb(217,30,30)']
      ]
    };

    const layout = {
      // yaxis: { type: 'log' }
    };

    const figure = { data: [ dataTrace ], layout };
    res.json(figure);
  });
};

answers.lengthFrequencyCorrelations = (req, res, next) => {
  db.query(`
SELECT
  answer,
  LENGTH(answer) as length,
  COUNT(*) AS frequency
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
GROUP BY answer;
`, (err, data) => {
    if (err) return next(err);

    const lengthRanks = rankGroupRows(data.rows, 'length');
    const frequencyRanks = rankGroupRows(data.rows, 'frequency');
    data.rows.forEach((row) => {
      row.logFrequency = Math.log(+row.frequency);
      row.lengthRank = lengthRanks[row.length];
      row.frequencyRank = frequencyRanks[row.frequency];
    });

    const correlationResults = [
      { keyX: 'length', keyY: 'frequency' , name: 'Pearson', variables: 'Length vs Frequency' },
      { keyX: 'length', keyY: 'logFrequency', name: 'Pearson', variables: 'Length vs Log Frequency' },
      { keyX: 'lengthRank', keyY: 'frequencyRank', name: 'Spearman (rank Pearson)', variables: 'Length vs Frequency' },
    ].map(test => runCorrelationTest(data.rows, test));

    const figure = {
      rows: correlationResults,
      columns: [
        { label: 'test name', key: 'name'},
        { label: 'test variables', key: 'variables'},
        { label: 'correlation coefficient', key: 'coeff'},
        { label: 'fisher transformation z score', key: 'zScore'}
      ],
    };

    res.json(figure);
  });
};

answers.lengthFrequencyEn = (req, res, next) => {
  // parseWikiCorpus().then((wikiCorpus) => {
    const dataTrace = {
      x: Object.entries(wikiCorpus.countsByWord).map(([word, frequency]) => word.length),
      y: Object.entries(wikiCorpus.countsByWord).map(([word, frequency]) => Math.log10(frequency)),
      type: 'histogram2d',
      colorscale: [
        ['0', 'rgba(255,255,255, 0)'],
        ['0.0001', 'rgb(10,136,186)'],
        ['0.001', 'rgb(12,51,131)'],
        ['0.01', 'rgb(242,211,56)'],
        ['0.1', 'rgb(242,143,56)'],
        ['1', 'rgb(217,30,30)']
      ]
    };

    const layout = {
      // yaxis: { type: 'log' }
    };

    const figure = { data: [ dataTrace ], layout };
    res.json(figure);
  // });
};

answers.lengthFrequencyCorrelationsEn = (req, res, next) => {
  // parseWikiCorpus().then((wikiCorpus) => {
    const rows = Object.entries(wikiCorpus.countsByWord).map(([answer, frequency]) => ({ answer, frequency, length: answer.length }));
    const lengthRanks = rankGroupRows(rows, 'length');
    const frequencyRanks = rankGroupRows(rows, 'frequency');
    rows.forEach((row) => {
      row.logFrequency = Math.log(+row.frequency);
      row.lengthRank = lengthRanks[row.length];
      row.frequencyRank = frequencyRanks[row.frequency];
    });

    const correlationResults = [
      { keyX: 'length', keyY: 'frequency' , name: 'Pearson', variables: 'Length vs Frequency' },
      { keyX: 'length', keyY: 'logFrequency', name: 'Pearson', variables: 'Length vs Log Frequency' },
      { keyX: 'lengthRank', keyY: 'frequencyRank', name: 'Spearman (rank Pearson)', variables: 'Length vs Frequency' },
    ].map(test => runCorrelationTest(rows, test));

    const figure = {
      rows: correlationResults,
      columns: [
        { label: 'test name', key: 'name'},
        { label: 'test variables', key: 'variables'},
        { label: 'correlation coefficient', key: 'coeff'},
        { label: 'fisher transformation z score', key: 'zScore'}
      ],
    };

    res.json(figure);
  // });
};

answers.lengthFrequencyPmfLengthMarginal = (req, res, next) => {
  db.query(`
SELECT
  answer,
  LENGTH(answer) as length,
  COUNT(*) AS frequency
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
GROUP BY answer;
`, (err, data) => {
    if (err) return next(err);

    // TODO: rewrite in query?
    // const tokens = sumBy(data.rows, 'frequency');
    const types = data.rows.length;
    const lengthMarginal = data.rows.reduce((probs, row) => {
      const length = +row.length;
      probs[length] = (probs[length] || 0) + (1 / types);
      return probs;
    }, {});

    const dataTrace = {
      x: Object.entries(lengthMarginal).map(([length, prob]) => length),
      y: Object.entries(lengthMarginal).map(([length, prob]) => prob),
      type: 'scatter',
      mode: 'markers+lines',
    };

    const layout = {
      // yaxis: { type: 'log' }
    };

    const figure = { data: [ dataTrace ], layout };
    res.json(figure);
  });
};

answers.lengthFrequencyPmfFrequencyMarginal = (req, res, next) => {
  db.query(`
SELECT
  answer,
  LENGTH(answer) as length,
  COUNT(*) AS frequency
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
GROUP BY answer;
`, (err, data) => {
    if (err) return next(err);

    // const tokens = sumBy(data.rows, 'frequency');
    const types = data.rows.length;
    const frequencyMarginal = data.rows.reduce((probs, row) => {
      const frequency = +row.frequency;
      probs[frequency] = (probs[frequency] || 0) + (1 / types);
      return probs;
    }, {});

    const dataTrace = {
      x: Object.entries(frequencyMarginal).map(([frequency, prob]) => frequency),
      y: Object.entries(frequencyMarginal).map(([frequency, prob]) => prob),
      type: 'scatter',
      mode: 'markers+lines',
    };

    const layout = {
      // yaxis: { type: 'log' }
    };

    const figure = { data: [ dataTrace ], layout };
    res.json(figure);
  });
};

answers.lengthFrequencyPmfLengthConditionals = (req, res, next) => {
  db.query(`
SELECT
  answer,
  LENGTH(answer) as length,
  COUNT(*) AS frequency
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
GROUP BY answer;
`, (err, data) => {
    if (err) return next(err);

    // const allowedLengths = [4, 6, 8, 10, 14];
    const allowedLengths = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    // const tokens = sumBy(data.rows, 'frequency');
    const types = data.rows.length;
    const pmf = data.rows.reduce((probs, row) => {
      const length = +row.length;
      const frequency = +row.frequency;
      if (allowedLengths.indexOf(length) < 0) return probs;

      const freqProbs = probs[length] || {};
      probs[length] = freqProbs;

      freqProbs[frequency] = (freqProbs[frequency] || 0) + (1 / types);

      return probs;
    }, {});

    const traces = Object.entries(pmf).map(([length, freqProbs]) => ({
      x: Object.entries(freqProbs).map(([frequency, prob]) => frequency),
      y: Object.entries(freqProbs).map(([frequency, prob]) => prob),
      type: 'scatter',
      mode: 'lines',
      name: `l = ${length}`
    }));

    const layout = {
      // yaxis: { type: 'log' }
    };

    const figure = { data: traces, layout };
    res.json(figure);
  });
};

answers.lengthFrequencyPmfLengthConditionalsEn = (req, res, next) => {
  // parseWikiCorpus().then((wikiCorpus) => {
    // const allowedLengths = [4, 6, 8, 10, 14];
    const allowedLengths = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    // const tokens = sumBy(data.rows, 'frequency');
    const rows = Object.entries(wikiCorpus.countsByWord).map(([answer, frequency]) => ({ answer, frequency, length: answer.length }));
    const types = rows.length;
    const pmf = rows.reduce((probs, row) => {
      const length = +row.length;
      const frequency = +row.frequency;
      if (allowedLengths.indexOf(length) < 0) return probs;

      const freqProbs = probs[length] || {};
      probs[length] = freqProbs;

      freqProbs[frequency] = (freqProbs[frequency] || 0) + (1 / types);

      return probs;
    }, {});

    const traces = Object.entries(pmf).map(([length, freqProbs]) => ({
      x: Object.entries(freqProbs).map(([frequency, prob]) => frequency),
      y: Object.entries(freqProbs).map(([frequency, prob]) => prob),
      type: 'scatter',
      mode: 'lines',
      name: `l = ${length}`
    }));

    const layout = {
      // yaxis: { type: 'log' }
    };

    const figure = { data: traces, layout };
    res.json(figure);
  // });
};

answers.lengthOccurrenceDistribution = (req, res, next) => {
  db.query(`
SELECT
  LENGTH(answer) as length,
  COUNT(*) AS occurrences
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
GROUP BY length
ORDER BY length ASC;
`, (err, data) => {
    if (err) return next(err);
    // res.json(data.rows);

    const trace = {
      x: data.rows.map(row => row.length),
      y: data.rows.map(row => row.occurrences),
      type: 'bar'
    };
    const figure = { data: [ trace ], layout: {} };
    res.json(figure)
  });
};

answers.lengthDictionaryDistribution = (req, res, next) => {
  db.query(`
SELECT
  LENGTH(answer) as length,
  COUNT(DISTINCT answer) AS types
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
GROUP BY length
ORDER BY length ASC;
`, (err, data) => {
    if (err) return next(err);
    // res.json(data.rows);

    const trace = {
      x: data.rows.map(row => row.length),
      y: data.rows.map(row => row.types),
      type: 'bar'
    };
    const figure = { data: [ trace ], layout: {} };
    res.json(figure)
  });
};

answers.lengthTypesAndTokens = (req, res, next) => {
  db.query(`
SELECT
  LENGTH(answer) as length,
  COUNT(DISTINCT answer) AS types,
  COUNT(*) AS tokens
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
GROUP BY length
ORDER BY length ASC;
`, (err, data) => {
    if (err) return next(err);

    const lengths = data.rows.map(row => row.length);

    const tokensTrace = {
      x: lengths,
      y: data.rows.map(row => row.tokens),
      type: 'scatter',
      mode: 'markers+lines',
      name: 'tokens'
    };

    const typesTrace = {
      x: lengths,
      y: data.rows.map(row => row.types),
      type: 'scatter',
      mode: 'markers+lines',
      name: 'types',
      // yaxis: 'y2'
    };

    const layout = {
      // yaxis2: {
      //   overlaying: 'y',
      //   side: 'right'
      // }
    };

    const figure = { data: [ tokensTrace, typesTrace ], layout };
    res.json(figure)
  });
};

answers.lengthTypesAndTokensEnglish = (req, res, next) => {
  // parseWikiCorpus().then((wikiCorpus) => {
    const countsByLength = {};
    for (const [answer, frequency] of Object.entries(wikiCorpus.countsByWord)) {
      const length = answer.length;
      const counts = countsByLength[length] || {
        tokens: 0,
        types: 0
      };
      counts.tokens += frequency;
      counts.types++;
      countsByLength[length] = counts;
    }
    const lengths = Object.keys(countsByLength).sort((a, b) => (+b - +a));

    const tokensTrace = {
      x: lengths,
      y: lengths.map(length => countsByLength[length].tokens),
      type: 'scatter',
      mode: 'markers+lines',
      name: 'tokens'
    };

    const typesTrace = {
      x: lengths,
      y: lengths.map(length => countsByLength[length].types),
      type: 'scatter',
      mode: 'markers+lines',
      name: 'types',
      // yaxis: 'y2'
    };

    // const enTotal = wikiCorpus.total;
    //   const enFrequency = wikiCorpus.countsByWord[row.answer] || 1e-15;

    const layout = {
      // yaxis2: {
      //   overlaying: 'y',
      //   side: 'right'
      // }
    };

    const figure = { data: [ tokensTrace, typesTrace ], layout };
    res.json(figure)
  // });
};

answers.lengthTypesAndTokensCombined = (req, res, next) => {
  // parseWikiCorpus().then((wikiCorpus) => {
    db.query(`
  SELECT
    LENGTH(answer) as length,
    COUNT(DISTINCT answer) AS types,
    COUNT(*) AS tokens
  FROM clues
  INNER JOIN puzzles p ON puzzle_id=p.id
  WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
  GROUP BY length
  ORDER BY length ASC;
  `, (err, data) => {
      if (err) return next(err);

      const countsByLength = {};
      for (const [answer, frequency] of Object.entries(wikiCorpus.countsByWord)) {
        const length = answer.length;
        const counts = countsByLength[length] || {
          tokens: 0,
          types: 0
        };
        counts.tokens += frequency;
        counts.types++;
        countsByLength[length] = counts;
      }

      const lengths = data.rows.map(row => row.length);

      const tokensTrace = {
        x: lengths,
        y: data.rows.map(row => row.tokens),
        type: 'scatter',
        mode: 'markers+lines',
        name: 'xw tokens'
      };

      const typesTrace = {
        x: lengths,
        y: data.rows.map(row => row.types),
        type: 'scatter',
        mode: 'markers+lines',
        name: 'xw types',
        // yaxis: 'y2'
      };

      const tokensTraceEn = {
        x: lengths,
        y: lengths.map(length => countsByLength[length] ? countsByLength[length].tokens : 0),
        type: 'scatter',
        mode: 'markers+lines',
        name: 'en tokens',
        yaxis: 'y2'
      };

      const typesTraceEn = {
        x: lengths,
        y: lengths.map(length => countsByLength[length] ? countsByLength[length].types : 0),
        type: 'scatter',
        mode: 'markers+lines',
        name: 'en types',
        yaxis: 'y2'
      };

      const layout = {
        yaxis2: {
          overlaying: 'y',
          side: 'right'
        }
      };

      const figure = { data: [ tokensTrace, typesTrace, tokensTraceEn, typesTraceEn ], layout };
      res.json(figure)
    });
  // });
};

answers.lengthByPuzzleSize = (req, res, next) => {
  db.query(`
SELECT
  LENGTH(answer) as length,
  p.width * p.height as puzzle_size,
  COUNT(*) AS occurrences
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
GROUP BY length, puzzle_size;
`, (err, data) => {
    if (err) return next(err);
    // let sizes = data.rows.reduce((psizes, row) => {
    //   if (psizes.indexOf(+(row.puzzle_size)) < 0) psizes.push(+(row.puzzle_size));
    //   return psizes;
    // }, []);
    // sizes.sort((a, b) => a - b);
    // console.log('sizes', sizes);

    // let lengths = data.rows.reduce((lens, row) => {
    //   if (lens.indexOf(+(row.length)) < 0) lens.push(+(row.length));
    //   return lens;
    // }, []);
    // lengths.sort((a, b) => a - b);
    // console.log('lengths', lengths);

    // console.log(sizes, lengths);

    // const table = [];
    // for (let i = 0; i < lengths.length; i++) {
    //   const row = [];
    //   for (let j = 0; j < sizes.length; j++) {
    //     row.push(0);
    //   }
    //   table.push(row);
    // }

    // for (const row of data.rows) {
    //   const lengthIdx = lengths.indexOf(+(row.length));
    //   const sizeIndex = sizes.indexOf(+(row.puzzle_size));
    //   table[lengthIdx][sizeIndex] = +(row.occurrences);
    // }
    // console.log(table);

    const binSize = 200;
    const binPuzzleSize = (row) => {
      const puzzleSizeBin = (+row.puzzle_size) / binSize;
      return `${Math.floor(puzzleSizeBin) * binSize}-${Math.ceil(puzzleSizeBin) * binSize}`
    };

    const binnedData = regroupRows(data.rows, binPuzzleSize);
    for (const bin in binnedData) {
      binnedData[bin] = sumGroupRows(binnedData[bin], 'length', 'occurrences');
    }

    const traces = Object.entries(binnedData).sort((a, b) => a[0].localeCompare(b[0])).map(([bin, lengthDistribution]) => {
      const lengthEntries = Object.entries(lengthDistribution);
      const total = lengthEntries.reduce((sum, [length, occurrences]) => (sum + occurrences), 0);
      return {
        x: lengthEntries.map(([length, occurrences]) => length),
        y: lengthEntries.map(([length, occurrences]) => (occurrences / total)),
        type: 'scatter',
        mode: 'markers+lines',
        name: bin
      };
    });

    const figure = { data: traces, layout: {} };

    res.json(figure);

    // res.json(data.rows);
  });
};

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
answers.lengthByDayOfWeek = (req, res, next) => {
  db.query(`
SELECT
  LENGTH(answer) as length,
  EXTRACT(DOW FROM p.date) as day_of_week,
  COUNT(*) AS occurrences
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
GROUP BY length, day_of_week
ORDER BY day_of_week, length;
`, (err, data) => {
    if (err) return next(err);

    const totals = sumGroupRows(data.rows, 'day_of_week', 'occurrences');
    const dowData = regroupRows(data.rows, 'day_of_week');
    const traces = Object.entries(dowData).map(([dow, rows]) => ({
      x: rows.map(row => row.length),
      y: rows.map(row => (+row.occurrences / totals[dow])),
      type: 'scatter',
      mode: 'markers+lines',
      name: DAYS_OF_WEEK[dow]
    }));

    const figure = { data: traces, layout: {} };

    res.json(figure);
  });
};

answers.lengthByDirection = (req, res, next) => {
  db.query(`
SELECT
  LENGTH(answer) as length,
  direction,
  COUNT(*) AS occurrences
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
GROUP BY length, direction
ORDER BY direction, length;
`, (err, data) => {
    if (err) return next(err);

    const totals = sumGroupRows(data.rows, 'direction', 'occurrences');
    const dirData = regroupRows(data.rows, 'direction');
    const traces = Object.entries(dirData).map(([dir, rows]) => ({
      x: rows.map(row => row.length),
      y: rows.map(row => (+row.occurrences / totals[dir])),
      type: 'bar',
      name: dir
    }));

    const figure = { data: traces, layout: {} };
    res.json(figure)
  });
};

answers.tokenTypes = (req, res, next) => {
  db.query(`
SELECT
  COUNT(answer) as tokens,
  COUNT(DISTINCT answer) AS types
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1993-01-01' AND '1994-12-31';
`, (err, data) => {
    if (err) return next(err);

    res.json(data.rows);
  });
};

answers.tokenTypesOverTime = (req, res, next) => {
  const queries = [];
  // TODO: env var for this? Query for this?
  for (let i = 1994; i <= DATA_RANGE_END_YEAR; i++) {
    queries.push(promiseQuery(`
SELECT
  COUNT(answer) as tokens,
  COUNT(DISTINCT answer) AS types,
  MAX(DATE_TRUNC('month', p.date)) AS date_bin_end
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '${DATA_RANGE_START_YEAR}-01-01' AND '${i}-06-30';
`));
    queries.push(promiseQuery(`
SELECT
  COUNT(answer) as tokens,
  COUNT(DISTINCT answer) AS types,
  MAX(DATE_TRUNC('month', p.date)) AS date_bin_end
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '${DATA_RANGE_START_YEAR}-01-01' AND '${i}-12-31';
`));
  }

  Promise.all(queries).then((results) => {

    const logData = results.map(result => [ Math.log(+(result[0].tokens)), Math.log(+(result[0].types)) ]);
    // TODO: use logarithmic instead of linear???
    const fit = linear(logData, { precision: 12 });

    const rows = results.map(result => ({ logTokens: Math.log(+(result[0].tokens)), logTypes: Math.log(+(result[0].types)) }));
    const pearson = pearsonCorrelationCoeffBy(rows, 'logTokens', 'logTypes');
    console.log(pearson);

    const trace = {
      x: results.map(result => +(result[0].tokens)),
      y: results.map(result => +(result[0].types)),
      text: results.map(result => result[0].date_bin_end),
      type: 'scatter',
      mode: 'lines+markers',
    };

    const fitTrace = {
      x: results.map(result => +(result[0].tokens)),
      y: results.map(result => Math.exp(fit.predict(Math.log(+(result[0].tokens)))[1])),
      type: 'scatter',
      mode: 'lines',
      name: `Herdan's fit, k=${Math.exp(fit.equation[1]).toFixed(2)} h=${fit.equation[0].toFixed(2)} r2=${fit.r2.toFixed(2)}`
    };

    const figure = { data: [ trace, fitTrace ], layout: {} };
    res.json(figure)
  });
};

answers.tokenTypesOverTimeError = (req, res, next) => {
  const queries = [];
  // TODO: env var for this? Query for this?
  for (let i = 1994; i <= DATA_RANGE_END_YEAR; i++) {
    queries.push(promiseQuery(`
SELECT
  COUNT(answer) as tokens,
  COUNT(DISTINCT answer) AS types,
  MAX(DATE_TRUNC('month', p.date)) AS date_bin_end
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '${DATA_RANGE_START_YEAR}-01-01' AND '${i}-06-30';
`));
    queries.push(promiseQuery(`
SELECT
  COUNT(answer) as tokens,
  COUNT(DISTINCT answer) AS types,
  MAX(DATE_TRUNC('month', p.date)) AS date_bin_end
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '${DATA_RANGE_START_YEAR}-01-01' AND '${i}-12-31';
`));
  }

  Promise.all(queries).then((results) => {

    const logData = results.map(result => [ Math.log(+(result[0].tokens)), Math.log(+(result[0].types)) ]);
    // TODO: use logarithmic instead of linear???
    const fit = linear(logData, { precision: 12 });

    const trace = {
      x: results.map(result => +(result[0].tokens)),
      y: results.map(result => (+(result[0].types) - Math.exp(fit.predict(Math.log(+(result[0].tokens)))[1]))),
      text: results.map(result => result[0].date_bin_end),
      type: 'scatter',
      mode: 'lines+markers',
    };

    // const fitTrace = {
    //   x: results.map(result => +(result[0].tokens)),
    //   y: results.map(result => ),
    //   type: 'scatter',
    //   mode: 'lines',
    //   name: `Herdan's fit, k=${Math.exp(fit.equation[1]).toFixed(2)} h=${fit.equation[0].toFixed(2)} r2=${fit.r2.toFixed(2)}`
    // };

    const figure = { data: [ trace ], layout: {} };
    res.json(figure)
  });
};

// answers.tokenTypesOverTimeAnalysis = (req, res, next) => {
//   const queries = [];
//   // TODO: env var for this? Query for this?
//   for (let i = 1994; i <= DATA_RANGE_END_YEAR; i++) {
//     queries.push(promiseQuery(`
// SELECT
//   COUNT(answer) as tokens,
//   COUNT(DISTINCT answer) AS types,
//   MAX(DATE_TRUNC('month', p.date)) AS date_bin_end
// FROM clues
// INNER JOIN puzzles p ON puzzle_id=p.id
// WHERE p.date BETWEEN '${DATA_RANGE_START_YEAR}-01-01' AND '${i}-06-30';
// `));
//     queries.push(promiseQuery(`
// SELECT
//   COUNT(answer) as tokens,
//   COUNT(DISTINCT answer) AS types,
//   MAX(DATE_TRUNC('month', p.date)) AS date_bin_end
// FROM clues
// INNER JOIN puzzles p ON puzzle_id=p.id
// WHERE p.date BETWEEN '${DATA_RANGE_START_YEAR}-01-01' AND '${i}-12-31';
// `));
//   }

//   Promise.all(queries).then((results) => {
//     db.query(`
// SELECT
//   answer,
//   COUNT(*) AS frequency
// FROM clues
// INNER JOIN puzzles p ON puzzle_id=p.id
// WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
// GROUP BY answer
// ORDER BY frequency DESC, answer;
// `, (err, data) => {

//     const corpusSize = sumBy(data.rows, 'frequency');
//     const binomialRecord = {};
//     const binomial = (n, k) => { binomialRecord[`n: ${n}, k: ${k}`] = true; return 1 };
//     const corpusBinomial = (mr, n) => (binomial(corpusSize - mr, n) / binomial(corpusSize, n));

//     const tokens = results.map(result => +(result[0].tokens));
//     const types = results.map(result => +(result[0].types));
//     const averageTypes = tokens.map(tokens => data.rows.reduce((sum, row) => (sum + (1 - corpusBinomial(+row.frequency, tokens))), 0));
//     console.log('done avg types')
//     // const variances = tokens.map(tokens => {
//     //   const sum1 = data.rows.reduce((sum, row) => (sum + (corpusBinomial(+row.frequency, tokens) * (1 - corpusBinomial(+row.frequency, tokens)))), 0);

//     //   let sum2 = 0;
//     //   for (let r = 1; r < data.rows.length; r++) {
//     //     for (let s = 0; s < r; s++) {
//     //       const mr = +data.rows[r].frequency;
//     //       const ms = +data.rows[s].frequency;
//     //       sum2 += corpusBinomial(mr + ms, tokens) - (corpusBinomial(mr, tokens) * corpusBinomial(ms, tokens));
//     //     }
//     //   }

//     //   return sum1 + (2 * sum2);
//     // });
//     // console.log('done variances')
//     // const anomalies = tokens.map((tokens, idx) => ((types[idx] - averageTypes[idx]) / Math.sqrt(variances[idx])));
//     // console.log('done anomalies')

//     const typesTrace = {
//       x: tokens,
//       y: types,
//       type: 'scatter',
//       mode: 'lines'
//     };

//     const averageTypesTrace = {
//       x: tokens,
//       y: averageTypes,
//       type: 'scatter',
//       mode: 'lines'
//     };

//     // const anomalyTrace = {
//     //   x: tokens,
//     //   y: anomalies,
//     //   type: 'scatter',
//     //   mode: 'lines',
//     //   yaxis: 'y2'
//     // };

//     const layout = {
//       yaxis2: {
//         overlaying: 'y',
//         side: 'right'
//       }
//     };

//     // const figure = { data: [ typesTrace, averageTypesTrace, anomalyTrace ], layout };
//     const figure = { data: [ typesTrace, averageTypesTrace ], layout };
//     res.json(figure)
//     console.log(JSON.stringify(binomialRecord));
//     });
//   });
// };

answers.tokenTypesOverSections = (req, res, next) => {
  const numBins = 64;
  const binSize = Math.floor(255 / numBins);
  const hexOffsets = Array.from({ length: binSize }, (val, idx) => idx);
  const queries = [];
  for (let i = 0; i < numBins; i++) {
    const binHexes = hexOffsets.map((offset) => (i * binSize + offset).toString(16).padStart(2, '0'));
    queries.push(promiseQuery(`
SELECT
  COUNT(c.answer) as tokens,
  COUNT(DISTINCT c.answer) AS types
FROM clues c
INNER JOIN puzzles p ON c.puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3000-01-01'
AND (${binHexes.map((hex) => (`TEXT(c.id) LIKE '${hex}%'`)).join(' OR ')});
`));
  }

  Promise.all(queries).then((results) => {

    const logData = results.map(result => [ Math.log(+(result[0].tokens)), Math.log(+(result[0].types)) ]);
    // TODO: use logarithmic instead of linear???
    const fit = linear(logData, { precision: 12 });
    console.log(fit.string, fit.r2);

    const trace = {
      x: results.map(result => +(result[0].tokens)),
      y: results.map(result => +(result[0].types)),
      type: 'scatter',
      mode: 'markers',
    };

    const fitTrace = {
      x: results.map(result => +(result[0].tokens)),
      y: results.map(result => Math.exp(fit.predict(Math.log(+(result[0].tokens)))[1])),
      type: 'scatter',
      mode: 'lines',
      // name: `exp fit V α N^h, h = ${fit.equation[0]}, r2 = ${fit.r2}`
    };

    const figure = { data: [ trace, fitTrace ], layout: {} };
    res.json(figure);
  });
};

function regroupRows(rows, groupBy) {
  return rows.reduce((groups, row) => {
    const groupKey = typeof groupBy === 'function' ? groupBy(row) : row[groupBy];
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(row);
    return groups;
  }, {});
}

function sumGroupRows(rows, groupBy, sumKey) {
  return rows.reduce((sums, row) => {
    const groupKey = typeof groupBy === 'function' ? groupBy(row) : row[groupBy];
    if (!sums[groupKey]) sums[groupKey] = 0;
    sums[groupKey] += +(row[sumKey]);
    return sums;
  }, {});
}

function countGroupRows(rows, groupBy) {
  return rows.reduce((counts, row) => {
    const groupKey = typeof groupBy === 'function' ? groupBy(row) : row[groupBy];
    if (!counts[groupKey]) counts[groupKey] = 0;
    counts[groupKey]++;
    return counts;
  }, {});
}

function rankGroupRows(rows, groupBy, asc=true) {
  const counts = countGroupRows(rows, groupBy);
  let countSum = 0;
  return Object.keys(counts).sort((a, b) => ((+a - +b) * (asc ? 1 : -1))).reduce((ranks, group) => {
    const groupCount = counts[group];
    let rank = 0;
    for (let i = 1; i <= groupCount; i++) {
      rank += countSum + i;
    }
    ranks[group] = rank / groupCount;
    countSum += groupCount;
    return ranks;
  }, {});
}

function sumBy(rows, key) {
  return rows.reduce((sum, row) => (sum + +row[key]), 0);
}

function cleanQueryParamSearchTerms(search) {
  const MAX_SEARCH_TERMS = 10;
  // TODO: add extra protections to this?
  return decodeURI(search)
          .split(',')
          .map(str => str.replace(/\s/g, ''))
          .filter(str => (/^[\w\*]+$/.test(str)))
          .slice(0, MAX_SEARCH_TERMS)
          .map(str => str.toUpperCase().replace(/\*/g, '_'));
}

function cleanQueryParamNumber(str, defaultVal) {
  let val = parseInt(str, 10);
  return isNaN(val) ? defaultVal : val;
}

answers.frequencyOverTime = (req, res, next) => {
  const MAX_RESULT_TERMS = 10;
  const searchTerms = cleanQueryParamSearchTerms(req.query.search)
  if (searchTerms.length < 1) return next(new Error('Missing search terms'));

  db.query(`
SELECT
  answer,
  DATE_TRUNC('year', p.date) AS date_bin,
  COUNT(*) as occurrences
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE ${searchTerms.map(str => (`answer LIKE '${str}'`)).join(' OR ')}
GROUP BY date_bin, answer;
`, (err, data) => {
    if (err) return next(err);

    const answerRows = regroupRows(data.rows, 'answer');
    const answerSums = sumGroupRows(data.rows, 'answer', 'occurrences');

    const dateRange = [ DATA_RANGE_START_YEAR - 1, DATA_RANGE_END_YEAR + 1 ];
    const years = Array.from({ length: DATA_RANGE_END_YEAR - DATA_RANGE_START_YEAR + 1 }, (val, idx) => (idx + DATA_RANGE_START_YEAR));

    const traces = Object.entries(answerRows)
                    .sort(([a], [b]) => answerSums[b] - answerSums[a])
                    .slice(0, MAX_RESULT_TERMS)
                    .sort(([a], [b]) => (searchTerms.indexOf(a) - searchTerms.indexOf(b)))
                    .map(([answer, rows]) => {
      let firstYear = DATA_RANGE_END_YEAR + 2;
      const yearCounts = rows.reduce((counts, row) => {
        const year = new Date(row.date_bin).getFullYear();
        if (year < firstYear) firstYear = year;
        counts[year] = +row.occurrences;
        return counts;
      }, {});

      const answerYears = years.slice(years.indexOf(firstYear));

      return {
        x: answerYears,
        y: answerYears.map(year => (yearCounts[year] || 0)),
        // type: 'bar',
        mode: 'lines',
        line: {shape: 'spline'},
        name: answer
      };
    });

    const figure = { data: traces, layout: { xaxis: { range: dateRange }}};
    res.json(figure);
  });
};

answers.topNewWordsByYear = (req, res, next) => {
  const MAX_WORDS_PER_YEAR = 10;
  db.query(`
SELECT
  answer,
  MIN(DATE_TRUNC('year', p.date)) as year_introduced,
  COUNT(*) as occurrences
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
GROUP BY answer
ORDER BY year_introduced DESC, occurrences DESC, answer;
`, (err, data) => {
    const wordsByYear = regroupRows(data.rows, 'year_introduced');

    for (const year in wordsByYear) {
      const yearWords = wordsByYear[year];
      yearWords.length = MAX_WORDS_PER_YEAR;
      for (const row of yearWords) {
        row.year = new Date(row.year_introduced).getFullYear();
      }
    }

    const figure = {
      rows: Object.values(wordsByYear).flat(),
      columns: [
        { label: 'year', key: 'year'},
        { label: 'answer', key: 'answer'},
        { label: 'occurrences', key: 'occurrences'},
      ],
    };

    res.json(figure);
  });
};

answers.countBirthsDeathsOverTime = (req, res, next) => {
  const timeBin = (req.query.timescale === 'year') ? 'year' : 'month';
  const lifetimeUsageThreshold = cleanQueryParamNumber(req.query.thresh, 1);

  const queries = [
    promiseQuery(`
SELECT
  time_bin_introduced as time_bin,
  COUNT(*) as births_deaths
FROM (
  SELECT
    answer,
    MIN(DATE_TRUNC('${timeBin}', p.date)) AS time_bin_introduced
  FROM clues
  INNER JOIN puzzles p ON puzzle_id=p.id
  WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
  GROUP BY answer
  HAVING COUNT(*)>=${lifetimeUsageThreshold}
) answers_by_month_introduced
GROUP BY time_bin
ORDER BY time_bin;
`),
    promiseQuery(`
SELECT
  time_bin_died as time_bin,
  COUNT(*) as births_deaths
FROM (
  SELECT
    answer,
    MAX(DATE_TRUNC('${timeBin}', p.date)) AS time_bin_died
  FROM clues
  INNER JOIN puzzles p ON puzzle_id=p.id
  WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
  GROUP BY answer
  HAVING COUNT(*)>=${lifetimeUsageThreshold}
) answers_by_month_introduced
GROUP BY time_bin
ORDER BY time_bin;
`),
  ];
  Promise.all(queries).then(results => {
    const traces = results.map((rows, idx) => ({
      x: rows.map(row => row.time_bin),
      y: rows.map(row => +row.births_deaths),
      type: 'scatter',
      mode: 'lines',
      name: idx === 0 ? 'births' : 'deaths'
    }));
    const figure = { data: traces, layout: {} };
    res.json(figure);
  });
};

answers.countBirthsDeathsOverTimeErrors = (req, res, next) => {
  const timeBin = (req.query.timescale === 'year') ? 'year' : 'month';
  const lifetimeUsageThreshold = cleanQueryParamNumber(req.query.thresh, 1);

  const queries = [
    promiseQuery(`
SELECT
  time_bin_introduced as time_bin,
  COUNT(*) as births_deaths
FROM (
  SELECT
    answer,
    MIN(DATE_TRUNC('${timeBin}', p.date)) AS time_bin_introduced
  FROM clues
  INNER JOIN puzzles p ON puzzle_id=p.id
  WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
  GROUP BY answer
  HAVING COUNT(*)>=${lifetimeUsageThreshold}
) answers_by_time_bin_introduced
GROUP BY time_bin
ORDER BY time_bin;
`),
    promiseQuery(`
SELECT
  time_bin_died as time_bin,
  COUNT(*) as births_deaths
FROM (
  SELECT
    answer,
    MAX(DATE_TRUNC('${timeBin}', p.date)) AS time_bin_died
  FROM clues
  INNER JOIN puzzles p ON puzzle_id=p.id
  WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
  GROUP BY answer
  HAVING COUNT(*)>=${lifetimeUsageThreshold}
) answers_by_time_bin_died
GROUP BY time_bin
ORDER BY time_bin;
`),
  ];
  Promise.all(queries).then(results => {
    const startDate = new Date(`${DATA_RANGE_START_YEAR - 1}-12-31`);
    const endDate = new Date(`${DATA_RANGE_END_YEAR + 2}-01-01`);
    const dateDiff = (date, fromStart) => {
      const start = fromStart ? startDate : date;
      const end = fromStart ? date : endDate;
      let diff = end.getFullYear() - start.getFullYear();
      if (timeBin === 'month') {
        diff *= 12;
        diff += end.getMonth() - start.getMonth();
      }
      return diff;
    }

    const fits = results.map((rows, idx) => linear(rows.map(row => ([Math.log(dateDiff(new Date(row.time_bin), idx === 0)), Math.log(+row.births_deaths)]))), { precision: 12 })
    const traces = results.map((rows, idx) => ({
      x: rows.map(row => row.time_bin),
      y: rows.map(row => +row.births_deaths - Math.exp(fits[idx].predict(Math.log(dateDiff(new Date(row.time_bin), idx === 0)))[1])),
      type: 'scatter',
      mode: 'lines',
      name: idx === 0 ? 'births' : 'deaths'
    }));
    const figure = { data: traces, layout: {} };
    res.json(figure);
  });
};

answers.dictionarySizeOverTime = (req, res, next) => {
  const timeBin = (req.query.timescale === 'year') ? 'year' : 'month';
  db.query(`
SELECT
  DATE_TRUNC('${timeBin}', p.date) AS time_bin,
  COUNT(DISTINCT answer) AS dictionary_size
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
GROUP BY time_bin
ORDER BY time_bin ASC;
`, (err, data) => {
    if (err) return next(err);

    const trace = {
      x: data.rows.map(row => row.time_bin),
      y: data.rows.map(row => +row.dictionary_size),
      type: 'sctter',
      mode: 'lines'
    };

    const figure = { data: [ trace ], layout: {} };
    res.json(figure);
  });
};

answers.wordLongevity = (req, res, next) => {
  const lifetimeUsageThreshold = cleanQueryParamNumber(req.query.thresh, 1);
  db.query(`
SELECT
  answer,
  COUNT(*) as occurrences,
  (DATE_PART('year', MAX(p.date)) - DATE_PART('year', MIN(p.date))) * 12 + (DATE_PART('month', MAX(p.date)) - DATE_PART('month', MIN(p.date))) AS lifespan_months
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
GROUP BY answer
HAVING COUNT(*)>=${lifetimeUsageThreshold}
ORDER BY lifespan_months DESC;
`, (err, data) => {
    if (err) return next(err);

    const trace = {
      x: data.rows.map(row => (+row.lifespan_months / 12)),
      type: 'histogram',
      xbins: {
        size: 0.5
      }
    };

    const figure = { data: [ trace ], layout: {} };
    res.json(figure);
  });
};

// answers.binnedUsageData = (req, res, next) => {
//   const lifetimeUsageThreshold = cleanQueryParamNumber(req.query.thresh, 1);
//   db.query(`
// SELECT
//   answer,
//   COUNT(*) as occurrences,
//   (DATE_PART('year', MAX(p.date)) - DATE_PART('year', MIN(p.date))) * 12 + (DATE_PART('month', MAX(p.date)) - DATE_PART('month', MIN(p.date))) AS lifespan_months
// FROM clues
// INNER JOIN puzzles p ON puzzle_id=p.id
// WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
// GROUP BY answer
// HAVING COUNT(*)>=${lifetimeUsageThreshold}
// ORDER BY lifespan_months DESC;
// `, (err, data) => {
//     if (err) return next(err);

//     const trace = {
//       x: data.rows.map(row => (+row.lifespan_months / 12)),
//       type: 'histogram',
//       xbins: {
//         size: 0.5
//       }
//     };

//     const figure = { data: [ trace ], layout: {} };
//     res.json(figure);
//   });
// };

answers.newWordsByMonth = (req, res, next) => {
  db.query(`
SELECT
  answer
FROM (
  SELECT
    answer,
    MIN(DATE_TRUNC('month', p.date)) AS month_introduced
  FROM clues
  INNER JOIN puzzles p ON puzzle_id=p.id
  WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
  GROUP BY answer
  HAVING COUNT(*)>0
) answers_by_month_introduced
  const lifetimeUsageThreshold = cleanQueryParamNumber(req.query.thresh, 3);
WHERE month_introduced='2017-04-01T04:00:00.000Z';
`, (err, data) => {
    if (err) return next(err);

    res.json(data.rows);
  });
};

answers.mostRecentNewWords = (req, res, next) => {
  const lifetimeUsageThreshold = cleanQueryParamNumber(req.query.thresh, 3);

  db.query(`
SELECT
  answer,
  MIN(p.date) AS date_introduced,
  COUNT(*) AS occurrences
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
GROUP BY answer
HAVING COUNT(*)>=${lifetimeUsageThreshold}
ORDER BY date_introduced DESC
LIMIT 1000;
`, (err, data) => {
    if (err) return next(err);

    for (const row of data.rows) {
      row.dateIntroduced = new Date(row.date_introduced).toDateString();
    }

    const figure = {
      rows: data.rows,
      columns: [
        { label: 'date introduced', key: 'dateIntroduced'},
        { label: 'answer', key: 'answer'},
        { label: 'occurrences', key: 'occurrences'},
      ],
    };

    res.json(figure);
  });
};

answers.oldestDeadWords = (req, res, next) => {
  const lifetimeUsageThreshold = cleanQueryParamNumber(req.query.thresh, 3);
  db.query(`
SELECT
  answer,
  MAX(p.date) AS date_died,
  COUNT(*) AS occurrences
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
GROUP BY answer
HAVING COUNT(*)>=${lifetimeUsageThreshold}
ORDER BY date_died ASC
LIMIT 1000;
`, (err, data) => {
    if (err) return next(err);

    for (const row of data.rows) {
      row.dateDied = new Date(row.date_died).toDateString();
    }

    const figure = {
      rows: data.rows,
      columns: [
        { label: 'date died', key: 'dateDied'},
        { label: 'answer', key: 'answer'},
        { label: 'occurrences', key: 'occurrences'},
      ],
    };

    res.json(figure);
  });
};

answers.topWordsPerYear = (req, res, next) => {
  const queries = [];
  for (let i = DATA_RANGE_START_YEAR; i <= DATA_RANGE_END_YEAR; i++) {
    queries.push(new Promise((resolve, reject) => {
      db.query(`
SELECT
  answer,
  COUNT(*) occurrences,
  DATE_TRUNC('year', p.date) as year
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '${i}-01-01' AND '${i}-12-31'
GROUP BY answer, year
ORDER BY occurrences DESC, answer
LIMIT 10;
`, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data.rows);
        }
      });
    }));
  }
  Promise.all(queries).then((results) => {
    res.json(results);
  });
};

answers.keynessPerYear = (req, res, next) => {
  const queries = [promiseQuery(`
SELECT
  answer,
  COUNT(*) frequency
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3000-01-01'
GROUP BY answer;`
  )];
  for (let i = DATA_RANGE_START_YEAR; i <= DATA_RANGE_END_YEAR; i++) {
    queries.push(promiseQuery(`
SELECT
  answer,
  COUNT(*) frequency,
  DATE_TRUNC('year', p.date) as year
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '${i}-01-01' AND '${i}-12-31'
GROUP BY answer, year;`
    ));
  }
  Promise.all(queries).then((results) => {
    const totals = results.map((yearlyCounts) => yearlyCounts.reduce((total, yearlyCount) => (total + +yearlyCount.frequency), 0));
    const allTimeCountsByWord = results.shift().reduce((countsByWord, wordCount) => {
      countsByWord[wordCount.answer] = +wordCount.frequency;
      return countsByWord;
    }, {});
    const allTimeTotal = totals.shift();
    for (const yearIndex in results) {
      const yearlyCounts = results[yearIndex];
      for (const yearlyCount of yearlyCounts) {
        const yearlyFrequency = +yearlyCount.frequency;
        const yearlyTotal = +totals[yearIndex];
        const allTimeFrequency = allTimeCountsByWord[yearlyCount.answer] || 1e-15;
        const combinedFrequency = yearlyFrequency + allTimeFrequency;
        const combinedTotal = yearlyTotal + allTimeTotal;
        const yearlyNormalizedFrequency = yearlyFrequency / yearlyTotal;
        const allTimeNormalizedFrequency = allTimeFrequency/ allTimeTotal;
        const logRatio = Math.log2(yearlyNormalizedFrequency / allTimeNormalizedFrequency);
        const differenceCoefficient = (yearlyNormalizedFrequency - allTimeNormalizedFrequency) / (yearlyNormalizedFrequency + allTimeNormalizedFrequency);
        const yearlyExpectedValue = yearlyTotal * combinedFrequency / combinedTotal;
        const allTimeExpectedValue = allTimeTotal * combinedFrequency / combinedTotal;
        const logLikelihoodG2 = 2 * (yearlyFrequency * Math.log(yearlyFrequency / yearlyExpectedValue) + allTimeFrequency * Math.log(allTimeFrequency / allTimeExpectedValue));
        const bayesFactor = logLikelihoodG2 - Math.log(combinedTotal);
        yearlyCount.allTimeFrequency = allTimeFrequency;
        yearlyCount.logRatio = logRatio.toFixed(2);
        yearlyCount.differenceCoefficient = differenceCoefficient.toFixed(2);
        yearlyCount.logLikelihoodG2 = logLikelihoodG2.toFixed(2);
        yearlyCount.bayesFactor = bayesFactor.toFixed(2);
        yearlyCount.year = new Date(yearlyCount.year).getFullYear()
        // console.log(yearlyFrequency, yearlyTotal, allTimeFrequency, allTimeTotal, logLikelihoodG2, bayesFactor, logRatio);
      }
      results[yearIndex] = yearlyCounts.filter((result) => result.bayesFactor > 2).sort((a, b) => Math.abs(b.logRatio) - Math.abs(a.logRatio));
    }

    const figure = {
      rows: results.flat(),
      columns: [
        { label: 'year', key: 'year'},
        { label: 'answer', key: 'answer'},
        { label: 'frequency', key: 'frequency'},
        { label: 'all time frequency', key: 'allTimeFrequency'},
        { label: 'log ratio', key: 'logRatio'},
        { label: 'difference coefficient', key: 'differenceCoefficient'},
        { label: 'log likelihood G2', key: 'logLikelihoodG2'},
        { label: 'bayes factor', key: 'bayesFactor'}
      ],
    }

    res.json(figure);
  });
};

async function parseWikiCorpus() {
  const fileStream = fs.createReadStream(wikiCorpusPath);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    const [word, frequency] = line.split(' ');
    wikiCorpus.total += +frequency;
    wikiCorpus.countsByWord[word.toUpperCase()] = (wikiCorpus.countsByWord[word.toUpperCase()] || 0) + +frequency;
  }

  wikiCorpus.frequencyRows = Object.entries(wikiCorpus.countsByWord).map(([word, frequency]) => ({ word, frequency, length: word.length }));
}

const wikiCorpus = {
  total: 0,
  countsByWord: {},
  frequencyRows: []
};
parseWikiCorpus();


answers.keyness = (req, res, next) => {
  const enThresh = cleanQueryParamNumber(req.query.enThresh, 0);
  // parseWikiCorpus().then((wikiCorpus) => {
    db.query(`
SELECT
  answer,
  COUNT(*) frequency
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3000-01-01'
GROUP BY answer;
`, (err, data) => {
      if (err) return next(err);
      const xwTotal = data.rows.reduce((total, row) => (total + +row.frequency), 0);
      const enTotal = wikiCorpus.total;
      console.log(xwTotal, enTotal);
      for (row of data.rows) {
        const xwFrequency = +row.frequency;
        const enFrequency = wikiCorpus.countsByWord[row.answer] || 1e-15;
        const combinedFrequency = xwFrequency + enFrequency;
        const combinedTotal = xwTotal + enTotal;
        const xwNormalizedFrequency = xwFrequency / xwTotal;
        const enNormalizedFrequency = enFrequency/ enTotal;
        const logRatio = Math.log2(xwNormalizedFrequency / enNormalizedFrequency);
        const differenceCoefficient = (xwNormalizedFrequency - enNormalizedFrequency) / (xwNormalizedFrequency + enNormalizedFrequency);
        const xwExpectedValue = xwTotal * combinedFrequency / combinedTotal;
        const enExpectedValue = enTotal * combinedFrequency / combinedTotal;
        const logLikelihoodG2 = 2 * (xwFrequency * Math.log(xwFrequency / xwExpectedValue) + enFrequency * Math.log(enFrequency / enExpectedValue));
        const bayesFactor = logLikelihoodG2 - Math.log(combinedTotal);
        row.enFrequency = enFrequency == 1e-15 ? 0 : enFrequency;
        row.logRatio = logRatio.toFixed(2);
        row.differenceCoefficient = differenceCoefficient.toFixed(2);
        row.logLikelihoodG2 = logLikelihoodG2.toFixed(2);
        row.bayesFactor = bayesFactor.toFixed(2);
      }
      const rows = data.rows.filter((row) => (row.bayesFactor > 2 && row.enFrequency >= enThresh)).sort((a, b) => Math.abs(b.logRatio) - Math.abs(a.logRatio));

      // Sameness?
      // const rows = data.rows.filter((row) => (row.bayesFactor > 2 && row.enFrequency >= enThresh)).sort((a, b) => Math.abs(a.logRatio) - Math.abs(b.logRatio));

      // Length?
      // const rows = data.rows.filter((row) => (row.bayesFactor > 2 && row.enFrequency >= enThresh && row.answer.length > 5)).sort((a, b) => Math.abs(b.logRatio) - Math.abs(a.logRatio));

      const figure = {
        rows: rows.slice(0, 1000),
        columns: [
          { label: 'answer', key: 'answer'},
          { label: 'frequency', key: 'frequency'},
          { label: 'english corpus frequency', key: 'enFrequency'},
          { label: 'log ratio', key: 'logRatio'},
          { label: 'difference coefficient', key: 'differenceCoefficient'},
          { label: 'log likelihood G2', key: 'logLikelihoodG2'},
          { label: 'bayes factor', key: 'bayesFactor'}
        ],
      }

      res.json(figure);
    });
  // });
};

answers.relativeFrequencyDifference = (req, res, next) => {
  const sortyByAbsDiff = req.query.positive !== 'true';
  // parseWikiCorpus().then((wikiCorpus) => {
    db.query(`
SELECT
  answer,
  COUNT(*) frequency
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3000-01-01'
GROUP BY answer;
`, (err, data) => {
      if (err) return next(err);
      const xwTotal = sumBy(data.rows, 'frequency');
      const enTotal = wikiCorpus.total;
      console.log(xwTotal, enTotal);
      for (row of data.rows) {
        row.xwFrequency = +row.frequency;
        row.enFrequency = wikiCorpus.countsByWord[row.answer] || 0;
        row.xwRelativeFrequency = row.xwFrequency / xwTotal;
        row.enRelativeFrequency = row.enFrequency / enTotal;
        row.frequencyDiff = (row.xwRelativeFrequency - row.enRelativeFrequency).toFixed(5);
        row.absFrequencyDiff = Math.abs(row.frequencyDiff);
      }
      data.rows.sort(sortFn(sortyByAbsDiff ? 'absFrequencyDiff' : 'frequencyDiff', true));

      const figure = {
        rows: data.rows.slice(0, 100),
        columns: [
          { label: 'answer', key: 'answer'},
          { label: 'difference in relative frequencies', key: 'frequencyDiff'},
          { label: 'crossword frequency', key: 'xwFrequency'},
          { label: 'english corpus frequency', key: 'enFrequency'},
        ],
      }

      res.json(figure);
    });
  // });
};

answers.answerClues = (req, res, next) => {
  const searchTerms = cleanQueryParamSearchTerms(req.query.search)
  if (searchTerms.length < 1) return next(new Error('Missing search terms'));

  db.query(`
SELECT
  DATE_TRUNC('year', p.date) AS year,
  text AS clue
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE ${searchTerms.map(str => (`answer LIKE '${str}'`)).join(' OR ')}
ORDER BY p.date DESC
LIMIT 100;
`, (err, data) => {
    if (err) return next(err);

    data.rows.forEach(row => { row.year = new Date(row.year).getFullYear(); });

    const figure = {
      rows: data.rows,
      columns: [
        { label: 'clue', key: 'clue'},
        { label: 'year', key: 'year'},
      ]
    };

    res.json(figure);
  });
};

// TODO: make a table for this
answers.blockSquaresHeatMap = (req, res, next) => {
  const PUZZLE_DIMENSION = 15;
  db.query(`
SELECT
  solution
FROM puzzles
WHERE date BETWEEN '1000-01-01' AND '3000-01-01'
AND width = ${PUZZLE_DIMENSION}
AND height = ${PUZZLE_DIMENSION};
`, (err, data) => {
    if (err) return next(err);

    const grid = Array.from({ length: PUZZLE_DIMENSION }, () => new Array(PUZZLE_DIMENSION).fill(0));
    console.log(grid);
    for (const row of data.rows) {
      for (let i = 0, len = row.solution.length; i < len; i++) {
        if (row.solution[i] === '.') {
          const x = i % PUZZLE_DIMENSION;
          const y = PUZZLE_DIMENSION - Math.floor(i / PUZZLE_DIMENSION) - 1;
          grid[y][x]++;
        }
      }
    }

    const trace = {
      z: grid,
      x: Array.from({ length: PUZZLE_DIMENSION }, (val, idx) => (`c${idx + 1}`)),
      y: Array.from({ length: PUZZLE_DIMENSION }, (val, idx) => (`r${PUZZLE_DIMENSION - idx}`)),
      type: 'heatmap',
      colorscale: [
        [0, '#ffffff'],
        [1, '#000000']
      ]
    };

    const figure = { data: [ trace ], layout: {} };
    res.json(figure);
  });
};

answers.answerStartHeatMap = (req, res, next) => {
  const PUZZLE_DIMENSION = 15;
  db.query(`
SELECT
  COUNT(*) AS count,
  grid_index
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3000-01-01'
AND p.width = ${PUZZLE_DIMENSION}
AND p.height = ${PUZZLE_DIMENSION}
GROUP BY grid_index;
`, (err, data) => {
    if (err) return next(err);

    const grid = Array.from({ length: PUZZLE_DIMENSION }, () => new Array(PUZZLE_DIMENSION).fill(0));
    data.rows.forEach(row => {
      const x = row.grid_index % PUZZLE_DIMENSION;
      const y = PUZZLE_DIMENSION - Math.floor(row.grid_index / PUZZLE_DIMENSION) - 1;
      grid[y][x] = row.count;
    });

    data.rows.sort(sortFn('count'));
    const max = +data.rows[data.rows.length - 1].count;
    const median = +data.rows[Math.floor(data.rows.length / 2)].count;

    const trace = {
      z: grid,
      x: Array.from({ length: PUZZLE_DIMENSION }, (val, idx) => (`c${idx + 1}`)),
      y: Array.from({ length: PUZZLE_DIMENSION }, (val, idx) => (`r${PUZZLE_DIMENSION - idx}`)),
      type: 'heatmap',
      colorscale: [
        [0, '#0000ff'],
        [median / max, '#B4B4B4'],
        [1, '#ff0000'],
      ]
    };

    const figure = { data: [ trace ], layout: {} };
    res.json(figure);
  });
};

answers.answerLengthHeatMap = (req, res, next) => {
  const PUZZLE_DIMENSION = 15;
  db.query(`
SELECT
  PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY LENGTH(answer)) AS median_length,
  AVG(LENGTH(answer)) AS mean_length,
  MAX(LENGTH(answer)) as max_length,
  MIN(LENGTH(answer)) as min_length,
  COUNT(*) AS count,
  grid_index
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3000-01-01'
AND p.width = ${PUZZLE_DIMENSION}
AND p.height = ${PUZZLE_DIMENSION}
GROUP BY grid_index;
`, (err, data) => {
    if (err) return next(err);

    const grid = Array.from({ length: PUZZLE_DIMENSION }, () => new Array(PUZZLE_DIMENSION).fill(0));
    const labels = Array.from({ length: PUZZLE_DIMENSION }, () => new Array(PUZZLE_DIMENSION).fill(0));
    data.rows.forEach(row => {
      const x = row.grid_index % PUZZLE_DIMENSION;
      const y = PUZZLE_DIMENSION - Math.floor(row.grid_index / PUZZLE_DIMENSION) - 1;
      grid[y][x] = row.median_length;
      labels[y][x] = `total: ${row.count}`;
    });

    const trace = {
      z: grid,
      x: Array.from({ length: PUZZLE_DIMENSION }, (val, idx) => (`c${idx + 1}`)),
      y: Array.from({ length: PUZZLE_DIMENSION }, (val, idx) => (`r${PUZZLE_DIMENSION - idx}`)),
      text: labels,
      type: 'heatmap',
      // colorscale: [
      //   [0, '#000000'],
      //   [1, '#ffffff']
      // ]
    };

    const figure = { data: [ trace ], layout: {} };
    res.json(figure);
  });
};

answers.answerRepetitionHeatMap = (req, res, next) => {
  const PUZZLE_DIMENSION = 15;
  db.query(`
SELECT
  COUNT(DISTINCT answer) AS types,
  COUNT(*) AS tokens,
  grid_index
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3000-01-01'
AND p.width = ${PUZZLE_DIMENSION}
AND p.height = ${PUZZLE_DIMENSION}
GROUP BY grid_index;
`, (err, data) => {
    if (err) return next(err);

    const grid = Array.from({ length: PUZZLE_DIMENSION }, () => new Array(PUZZLE_DIMENSION).fill(0));
    const labels = Array.from({ length: PUZZLE_DIMENSION }, () => new Array(PUZZLE_DIMENSION).fill(0));
    data.rows.forEach(row => {
      const x = row.grid_index % PUZZLE_DIMENSION;
      const y = PUZZLE_DIMENSION - Math.floor(row.grid_index / PUZZLE_DIMENSION) - 1;
      grid[y][x] = 1 - (+row.types / +row.tokens);
      labels[y][x] = `types: ${row.types} tokens: ${row.tokens}`;
    });

    const trace = {
      z: grid,
      x: Array.from({ length: PUZZLE_DIMENSION }, (val, idx) => (`c${idx + 1}`)),
      y: Array.from({ length: PUZZLE_DIMENSION }, (val, idx) => (`r${PUZZLE_DIMENSION - idx}`)),
      text: labels,
      type: 'heatmap',
      // colorscale: [
      //   [0, '000000'],
      //   [0.8, '#0000ff'],
      //   [0.9, '#B4B4B4'],
      //   [1, '#ff0000']
      // ]
    };

    const figure = { data: [ trace ], layout: {} };
    res.json(figure);
  });
};

module.exports = answers;