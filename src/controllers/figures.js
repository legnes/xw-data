const { db } = require('../../config');
const { alea } = require('seedrandom');
const { randomBinomial } = require("d3-random");
const { linear } = require('regression');

const { promiseQuery } = require('../util/query');
const analysis = require('../util/analysis');
const { cleanText, cleanNumber, cleanBoolean } = require('../util/url');
const { DEFAULT_HISTOGRAM_2D } = require('../util/figure');
const { addInto, numSortBy } = require('../util/base');

const { english, scrabble } = require('../constants/language');
const { START_YEAR, END_YEAR, DAYS_OF_WEEK } = require('../constants/data');
const { english: { WIKI_CORPUS }} = require('../constants/corpora');

// TODO:
//  - use OVER and PARTITION BY??

const figures = {};

figures.mostFrequentAnswers = (req, res, next) => {
  const lengthThresh = cleanNumber(req.query.lengthThresh, 3);
  db.query(`
SELECT
  answer,
  LENGTH(answer) as length,
  COUNT(*) AS count
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
AND LENGTH(answer) >= ${lengthThresh}
GROUP BY answer
HAVING COUNT(*) > 1
ORDER BY count DESC, length DESC, answer
LIMIT 30;
`, (err, data) => {
    if (err) return next(err);

    data.rows.forEach((row, idx) => { row.rank = `${idx + 1}.` });
    res.json({
      rows: data.rows,
      columns: [
        { label: '', key: 'rank'},
        { label: 'answer', key: 'answer'},
        { label: 'count', key: 'count'},
      ],
    });
  });
};

figures.lengthFrequency = (req, res, next) => {
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

    res.json({
      data: [
        {
          x: data.rows.map(row => +row.length),
          y: data.rows.map(row => Math.log10(+row.frequency)),
          ...DEFAULT_HISTOGRAM_2D
        }
      ],
      layout: {
        xaxis: { title: { text: 'answer length' }},
        yaxis: { title: { text: 'frequency (log 10 scale)' }}
      }
    });
  });
};

figures.lengthFrequencyCorrelations = (req, res, next) => {
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

    const lengthRanks = analysis.rankRowGroupCounts(data.rows, 'length');
    const frequencyRanks = analysis.rankRowGroupCounts(data.rows, 'frequency');
    data.rows.forEach((row) => {
      row.logFrequency = Math.log(+row.frequency);
      row.lengthRank = lengthRanks[row.length];
      row.frequencyRank = frequencyRanks[row.frequency];
    });

    const correlationResults = [
      { keyX: 'length', keyY: 'frequency' , name: 'Pearson', variables: 'Length vs Frequency' },
      { keyX: 'length', keyY: 'logFrequency', name: 'Pearson', variables: 'Length vs Log Frequency' },
      { keyX: 'lengthRank', keyY: 'frequencyRank', name: 'Spearman (rank Pearson)', variables: 'Length vs Frequency' },
    ].map(test => analysis.runCorrelationTest(data.rows, test));

    res.json({
      rows: correlationResults,
      columns: [
        { label: 'test name', key: 'name'},
        { label: 'test variables', key: 'variables'},
        { label: 'correlation coefficient', key: 'coeff'},
        { label: 'fisher transformation z score', key: 'zScore'}
      ],
    });
  });
};

figures.lengthFrequencyEn = (req, res, next) => {
  res.json({
    data: [
      {
        x: Object.entries(WIKI_CORPUS.wordFrequencies).map(([word, frequency]) => word.length),
        y: Object.entries(WIKI_CORPUS.wordFrequencies).map(([word, frequency]) => Math.log10(frequency)),
        ...DEFAULT_HISTOGRAM_2D
      }
    ],
    layout: {
      xaxis: { title: { text: 'answer length' }},
      yaxis: { title: { text: 'frequency (log 10 scale)' }}
    }
  });
};

figures.lengthFrequencyCorrelationsEn = (req, res, next) => {
  const rows = Object.entries(WIKI_CORPUS.wordFrequencies).map(([answer, frequency]) => ({ answer, frequency, length: answer.length }));
  const lengthRanks = analysis.rankRowGroupCounts(rows, 'length');
  const frequencyRanks = analysis.rankRowGroupCounts(rows, 'frequency');
  rows.forEach((row) => {
    row.logFrequency = Math.log(+row.frequency);
    row.lengthRank = lengthRanks[row.length];
    row.frequencyRank = frequencyRanks[row.frequency];
  });

  const correlationResults = [
    { keyX: 'length', keyY: 'frequency' , name: 'Pearson', variables: 'Length vs Frequency' },
    { keyX: 'length', keyY: 'logFrequency', name: 'Pearson', variables: 'Length vs Log Frequency' },
    { keyX: 'lengthRank', keyY: 'frequencyRank', name: 'Spearman (rank Pearson)', variables: 'Length vs Frequency' },
  ].map(test => analysis.runCorrelationTest(rows, test));

  res.json({
    rows: correlationResults,
    columns: [
      { label: 'test name', key: 'name'},
      { label: 'test variables', key: 'variables'},
      { label: 'correlation coefficient', key: 'coeff'},
      { label: 'fisher transformation z score', key: 'zScore'}
    ],
  });
};

figures.lengthFrequencyPmfLengthConditionals = (req, res, next) => {
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
    // const tokens = analysis.sumBy(data.rows, 'frequency');
    const types = data.rows.length;
    const lengthSums = {};
    const pmf = data.rows.reduce((probs, row) => {
      const length = +row.length;
      const frequency = +row.frequency;
      if (allowedLengths.indexOf(length) < 0) return probs;

      const freqProbs = probs[length] || {};
      probs[length] = freqProbs;

      addInto(freqProbs, frequency, 1 / types);
      addInto(lengthSums, length, 1 / types);

      return probs;
    }, {});

    const traces = Object.entries(pmf).map(([length, freqProbs]) => ({
      x: Object.entries(freqProbs).map(([frequency, prob]) => frequency),
      y: Object.entries(freqProbs).map(([frequency, prob]) => (prob / lengthSums[length])),
      type: 'scatter',
      mode: 'lines',
      name: `L = ${length}`
    }));

    const layout = {
      xaxis: { title: { text: 'answer frequency' }},
      yaxis: { title: { text: 'length-conditional probability mass' }}
    };

    const figure = { data: traces, layout };
    res.json(figure);
  });
};

figures.lengthFrequencyPmfLengthMarginal = (req, res, next) => {
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
    // const tokens = analysis.sumBy(data.rows, 'frequency');
    const types = data.rows.length;
    const lengthMarginal = data.rows.reduce((probs, row) => addInto(probs, +row.length, 1 / types), {});

    const dataTrace = {
      x: Object.entries(lengthMarginal).map(([length, prob]) => length),
      y: Object.entries(lengthMarginal).map(([length, prob]) => prob),
      type: 'scatter',
      mode: 'markers+lines',
    };

    const layout = {
      xaxis: { title: { text: 'answer length' }},
      yaxis: { title: { text: 'marginal probability mass' }}
    };

    const figure = { data: [ dataTrace ], layout };
    res.json(figure);
  });
};

figures.lengthTypesAndTokens = (req, res, next) => {
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
    };

    const diffTrace = {
      x: lengths,
      y: data.rows.map(row => (row.tokens - row.types)),
      type: 'scatter',
      mode: 'markers+lines',
      name: 'tokens - types',
      visible: 'legendonly'
    };

    const layout = {
      xaxis: { title: { text: 'answer length' }},
    };

    const figure = { data: [ tokensTrace, typesTrace, diffTrace ], layout };
    res.json(figure)
  });
};

figures.lengthTypesAndTokensCombined = (req, res, next) => {
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
    for (const [answer, frequency] of Object.entries(WIKI_CORPUS.wordFrequencies)) {
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
      xaxis: { title: { text: 'answer length' }},
      yaxis: { title: { text: 'crosswords' }},
      yaxis2: {
        overlaying: 'y',
        side: 'right',
        title: { text: 'english' }
      }
    };

    const figure = { data: [ tokensTrace, typesTrace, tokensTraceEn, typesTraceEn ], layout };
    res.json(figure)
  });
};

figures.mostFrequentLongAnswers = (req, res, next) => {
  db.query(`
SELECT
  answer,
  LENGTH(answer) as length,
  COUNT(*) AS count
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
AND LENGTH(answer) > 13
GROUP BY answer
HAVING (COUNT(*) > 1 AND LENGTH(answer) > 15) OR (COUNT(*) > 3 AND LENGTH(answer) > 13)
ORDER BY length DESC, count DESC, answer;
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

figures.rankFrequency = (req, res, next) => {
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

figures.rankFrequencySwadesh = (req, res, next) => {
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

    const swadeshRows = english.SWADESH_LIST.map((word) => ({ word, frequency: WIKI_CORPUS.wordFrequencies[word]})).sort(numSortBy('frequency', true));

    const frequencies = data.rows.reduce((freqs, row) => {
      if (english.SWADESH_LIST.includes(row.answer)) {
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

figures.rankFrequencyNumericals = (req, res, next) => {
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

    const numberRows = english.NUMERICAL_WORDS.map((word) => ({ word, frequency: WIKI_CORPUS.wordFrequencies[word]})).sort(numSortBy('frequency', true));

    const frequencies = data.rows.reduce((freqs, row) => {
      if (english.NUMERICAL_WORDS.includes(row.answer)) {
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

figures.decorrelatedRankFrequency = (req, res, next) => {
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
    const {
      rankFrequency,
      highFrequencyFit,
      lowFrequencyFit
    } = analysis.decorrelatedRankFrequencyAnalysis(data.rows, { domainSplitRank: 500 });

    const figure = { data: [ rankFrequency, highFrequencyFit, lowFrequencyFit ], layout: {} };
    res.json(figure)
  });
};

figures.decorrelatedRankFrequencyError = (req, res, next) => {
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
    const {
      errors,
      highFrequencyZeroErrorLine,
      lowFrequencyZeroErrorLine
    } = analysis.decorrelatedRankFrequencyAnalysis(data.rows, { domainSplitRank: 500 });

    const figure = { data: [ errors, highFrequencyZeroErrorLine, lowFrequencyZeroErrorLine ], layout: {} };
    res.json(figure)
  });
};

figures.rankFrequencyEn = (req, res, next) => {
  let rows = WIKI_CORPUS.wordFrequencyRows;
  rows = rows.sort((a, b) => (b.frequency - a.frequency));//.slice(0, 200000);
  const corpusSize = WIKI_CORPUS.totalWordTokens;

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

figures.decorrelatedRankFrequencyEn = (req, res, next) => {
  const {
    rankFrequency,
    highFrequencyFit,
    lowFrequencyFit
  } = analysis.decorrelatedRankFrequencyAnalysis(WIKI_CORPUS.wordFrequencyRows, { domainSplitRank: 5000 });

  const figure = { data: [ rankFrequency, highFrequencyFit, lowFrequencyFit ], layout: {} };
  res.json(figure)
};

figures.decorrelatedRankFrequencyErrorEn = (req, res, next) => {
  const {
    errors,
    highFrequencyZeroErrorLine,
    lowFrequencyZeroErrorLine
  } = analysis.decorrelatedRankFrequencyAnalysis(WIKI_CORPUS.wordFrequencyRows, { domainSplitRank: 5000 });

  const figure = { data: [ errors, highFrequencyZeroErrorLine, lowFrequencyZeroErrorLine ], layout: {} };
  res.json(figure)
};

figures.rankFrequencyRandom = (req, res, next) => {
  const dictionarySize = 1000;
  const corpusSize = 1000000;
  const dictionary = Array.from({ length: dictionarySize }, (val, idx) => idx);
  const wordCounts = {};
  for (let i = 0; i < corpusSize; i++) {
    const word = dictionary[Math.floor(Math.random() * dictionarySize)];
    addInto(wordCounts, word, 1);
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

figures.decorrelatedRankFrequencyRandom = (req, res, next) => {
  const dictionarySize = 1000;
  const corpusSize = 1000000;
  const dictionary = Array.from({ length: dictionarySize }, (val, idx) => idx);
  const corpusA = {};
  const corpusB = {};
  for (let i = 0; i < corpusSize; i++) {
    const wordA = dictionary[Math.floor(Math.random() * dictionarySize)];
    addInto(corpusA, wordA, 1);

    const wordB = dictionary[Math.floor(Math.random() * dictionarySize)];
    addInto(corpusB, wordB, 1);
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

figures.simulateHerdan = (req, res, next) => {
  const referenceCorpusTypes = cleanNumber(req.query.refTypes, 1000);
  const referenceCorpusZipfPower = cleanNumber(req.query.refZipf, 1.01);
  const documentTokens = cleanNumber(req.query.docSize, 100);

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

  const figure = { data: [ dataTrace, fitTrace ], layout: {} };
  res.json(figure);
};

figures.lengthFrequencyPmfFrequencyMarginal = (req, res, next) => {
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

    // const tokens = analysis.sumBy(data.rows, 'frequency');
    const types = data.rows.length;
    const frequencyMarginal = data.rows.reduce((probs, row) => addInto(probs, +row.frequency, 1 / types), {});

    const dataTrace = {
      x: Object.entries(frequencyMarginal).map(([frequency, prob]) => frequency),
      y: Object.entries(frequencyMarginal).map(([frequency, prob]) => prob),
      type: 'scatter',
      mode: 'markers+lines',
    };

    const figure = { data: [ dataTrace ], layout: {} };
    res.json(figure);
  });
};

figures.lengthFrequencyPmfLengthConditionalsEn = (req, res, next) => {
  // const allowedLengths = [4, 6, 8, 10, 14];
  const allowedLengths = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  // const tokens = analysis.sumBy(data.rows, 'frequency');
  const rows = Object.entries(WIKI_CORPUS.wordFrequencies).map(([answer, frequency]) => ({ answer, frequency, length: answer.length }));
  const types = rows.length;
  const lengthSums = {};
  const pmf = rows.reduce((probs, row) => {
    const length = +row.length;
    const frequency = +row.frequency;
    if (allowedLengths.indexOf(length) < 0) return probs;

    const freqProbs = probs[length] || {};
    probs[length] = freqProbs;

    addInto(freqProbs, frequency, 1 / types);
    addInto(lengthSums, length, 1 / types);

    return probs;
  }, {});

  const traces = Object.entries(pmf).map(([length, freqProbs]) => ({
    x: Object.entries(freqProbs).map(([frequency, prob]) => frequency),
    y: Object.entries(freqProbs).map(([frequency, prob]) => (prob / lengthSums[length])),
    type: 'scatter',
    mode: 'lines',
    name: `l = ${length}`
  }));

  const figure = { data: traces, layout: {} };
  res.json(figure);
};

figures.lengthOccurrenceDistribution = (req, res, next) => {
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

figures.lengthDictionaryDistribution = (req, res, next) => {
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

figures.lengthTypesAndTokensEnglish = (req, res, next) => {
  const countsByLength = {};
  for (const [answer, frequency] of Object.entries(WIKI_CORPUS.wordFrequencies)) {
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

  // const enTotal = WIKI_CORPUS.totalWordTokens;
  //   const enFrequency = WIKI_CORPUS.wordFrequencies[row.answer] || 1e-15;

  const layout = {
    // yaxis2: {
    //   overlaying: 'y',
    //   side: 'right'
    // }
  };

  const figure = { data: [ tokensTrace, typesTrace ], layout };
  res.json(figure);
};

figures.lengthByPuzzleSize = (req, res, next) => {
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

    const binnedData = analysis.groupRowsBy(data.rows, binPuzzleSize);
    for (const bin in binnedData) {
      binnedData[bin] = analysis.sumRowGroupsBy(binnedData[bin], 'length', 'occurrences');
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

figures.lengthByDayOfWeek = (req, res, next) => {
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

    const totals = analysis.sumRowGroupsBy(data.rows, 'day_of_week', 'occurrences');
    const dowData = analysis.groupRowsBy(data.rows, 'day_of_week');
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

figures.lengthByDirection = (req, res, next) => {
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

    const totals = analysis.sumRowGroupsBy(data.rows, 'direction', 'occurrences');
    const dirData = analysis.groupRowsBy(data.rows, 'direction');
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

// TODO: THIS IS VERY VERY SLOW
figures.tokenTypesOverTime = (req, res, next) => {
  const queries = [];
  // TODO: env var for this? Query for this?
  for (let i = 1994; i <= END_YEAR; i++) {
    queries.push(promiseQuery(`
SELECT
  COUNT(answer) as tokens,
  COUNT(DISTINCT answer) AS types,
  MAX(DATE_TRUNC('month', p.date)) AS date_bin_end
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '${START_YEAR}-01-01' AND '${i}-06-30';
`));
    queries.push(promiseQuery(`
SELECT
  COUNT(answer) as tokens,
  COUNT(DISTINCT answer) AS types,
  MAX(DATE_TRUNC('month', p.date)) AS date_bin_end
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '${START_YEAR}-01-01' AND '${i}-12-31';
`));
  }

  Promise.all(queries).then((results) => {

    const logData = results.map(result => [ Math.log(+(result[0].tokens)), Math.log(+(result[0].types)) ]);
    // TODO: use logarithmic instead of linear???
    const fit = linear(logData, { precision: 12 });

    const rows = results.map(result => ({ logTokens: Math.log(+(result[0].tokens)), logTypes: Math.log(+(result[0].types)) }));
    const pearson = analysis.pearsonCorrelationCoeffBy(rows, 'logTokens', 'logTypes');
    // console.log(pearson);

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

// TODO: THIS IS VERY VERY SLOW
figures.tokenTypesOverTimeError = (req, res, next) => {
  const queries = [];
  // TODO: env var for this? Query for this?
  for (let i = 1994; i <= END_YEAR; i++) {
    queries.push(promiseQuery(`
SELECT
  COUNT(answer) as tokens,
  COUNT(DISTINCT answer) AS types,
  MAX(DATE_TRUNC('month', p.date)) AS date_bin_end
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '${START_YEAR}-01-01' AND '${i}-06-30';
`));
    queries.push(promiseQuery(`
SELECT
  COUNT(answer) as tokens,
  COUNT(DISTINCT answer) AS types,
  MAX(DATE_TRUNC('month', p.date)) AS date_bin_end
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '${START_YEAR}-01-01' AND '${i}-12-31';
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

figures.tokenTypesOverSections = (req, res, next) => {
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
    // console.log(fit.string, fit.r2);

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

figures.frequencyOverTime = (req, res, next) => {
  const MAX_RESULT_TERMS = 10;
  const searchTerms = cleanText(req.query.search);
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

    const answerRows = analysis.groupRowsBy(data.rows, 'answer');
    const answerSums = analysis.sumRowGroupsBy(data.rows, 'answer', 'occurrences');

    const dateRange = [ START_YEAR - 1, END_YEAR + 1 ];
    const years = Array.from({ length: END_YEAR - START_YEAR + 1 }, (val, idx) => (idx + START_YEAR));

    const traces = Object.entries(answerRows)
                    .sort(([a], [b]) => answerSums[b] - answerSums[a])
                    .slice(0, MAX_RESULT_TERMS)
                    .sort(([a], [b]) => (searchTerms.indexOf(a) - searchTerms.indexOf(b)))
                    .map(([answer, rows]) => {
      let firstYear = END_YEAR + 2;
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

figures.topNewWordsByYear = (req, res, next) => {
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
    const wordsByYear = analysis.groupRowsBy(data.rows, 'year_introduced');

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

figures.countBirthsDeathsOverTime = (req, res, next) => {
  const timeBin = (req.query.timescaleYears === 'true') ? 'year' : 'month';
  const lifetimeUsageThreshold = cleanNumber(req.query.thresh, 1);

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

figures.countBirthsDeathsOverTimeErrors = (req, res, next) => {
  const timeBin = (req.query.timescaleYears === 'true') ? 'year' : 'month';
  const lifetimeUsageThreshold = cleanNumber(req.query.thresh, 1);

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
    const startDate = new Date(`${START_YEAR - 1}-12-31`);
    const endDate = new Date(`${END_YEAR + 2}-01-01`);
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

figures.dictionarySizeOverTime = (req, res, next) => {
  const timeBin = (req.query.timescaleYears === 'true') ? 'year' : 'month';
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

figures.wordLongevity = (req, res, next) => {
  const lifetimeUsageThreshold = cleanNumber(req.query.thresh, 1);
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

figures.mostRecentNewWords = (req, res, next) => {
  const lifetimeUsageThreshold = cleanNumber(req.query.thresh, 3);

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

figures.oldestDeadWords = (req, res, next) => {
  const lifetimeUsageThreshold = cleanNumber(req.query.thresh, 3);
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

figures.keynessPerYear = (req, res, next) => {
  const queries = [promiseQuery(`
SELECT
  answer,
  COUNT(*) frequency
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3000-01-01'
GROUP BY answer;`
  )];
  for (let i = START_YEAR; i <= END_YEAR; i++) {
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

figures.keyness = (req, res, next) => {
  const enFreqThresh = cleanNumber(req.query.enFreqThresh, 0);
  const lengthThresh = cleanNumber(req.query.lengthThresh, 0);
  const sortSameness = cleanBoolean(req.query.sameness);
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
    const enTotal = WIKI_CORPUS.totalWordTokens;
    // console.log(xwTotal, enTotal);
    for (row of data.rows) {
      const xwFrequency = +row.frequency;
      const enFrequency = WIKI_CORPUS.wordFrequencies[row.answer] || 1e-15;
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
    const rows = data.rows.filter((row) => (
      row.bayesFactor > 2 &&
      row.enFrequency >= enFreqThresh &&
      row.answer.length > lengthThresh
    )).sort((a, b) => (
      (sortSameness ? -1 : 1) * (Math.abs(b.logRatio) - Math.abs(a.logRatio))
    ));

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
};

figures.relativeFrequencyDifference = (req, res, next) => {
  const sortyByAbsDiff = req.query.positive !== 'true';
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
    const xwTotal = analysis.sumBy(data.rows, 'frequency');
    const enTotal = WIKI_CORPUS.totalWordTokens;
    // console.log(xwTotal, enTotal);
    for (row of data.rows) {
      row.xwFrequency = +row.frequency;
      row.enFrequency = WIKI_CORPUS.wordFrequencies[row.answer] || 0;
      row.xwRelativeFrequency = row.xwFrequency / xwTotal;
      row.enRelativeFrequency = row.enFrequency / enTotal;
      row.frequencyDiff = (row.xwRelativeFrequency - row.enRelativeFrequency).toFixed(5);
      row.absFrequencyDiff = Math.abs(row.frequencyDiff);
    }
    data.rows.sort(numSortBy(sortyByAbsDiff ? 'absFrequencyDiff' : 'frequencyDiff', true));

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
};

figures.answerClues = (req, res, next) => {
  const searchTerms = cleanText(req.query.search)
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
figures.blockSquaresHeatMap = (req, res, next) => {
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
    // console.log(grid);
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

figures.answerStartHeatMap = (req, res, next) => {
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

    data.rows.sort(numSortBy('count'));
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

figures.answerLengthHeatMap = (req, res, next) => {
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

figures.answerRepetitionHeatMap = (req, res, next) => {
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

figures.authorCounts = (req, res, next) => {
  db.query(`
SELECT
  author,
  COUNT(*) AS count
FROM puzzles
GROUP BY author
ORDER BY count DESC;
`, (err, data) => {
    if (err) throw err;

    const rows = data.rows.reduce((newRows, row) => {
      const existingRow = newRows.find((otherRow) => analysis.isProbablyTheSameAuthor(otherRow.author, row.author));
      if (existingRow) {
        existingRow.count += +row.count;
        existingRow.aliases.push(row.author)
      } else {
        newRows.push({
          author: row.author,
          count: +row.count,
          aliases: []
        });
      }
      return newRows
    }, []);
    rows.sort((a, b) => (b.count - a.count));

    const authors = rows.length;
    const sqrtAuthors = Math.floor(Math.sqrt(authors));
    const totalPuzzles = rows.reduce((sum, row) => (sum + (+row.count)), 0);
    const totalPuzzlesBySqrtAuthors = rows.slice(0, sqrtAuthors).reduce((sum, row) => (sum + (+row.count)), 0);
    const ratio = totalPuzzlesBySqrtAuthors / totalPuzzles;
    // console.log(authors, sqrtAuthors, totalPuzzles, totalPuzzlesBySqrtAuthors, ratio);

    let cumulativePuzzles = 0;
    for (const row of rows) {
      row.cumulativePuzzles = cumulativePuzzles += row.count;
    }

    const logCumulativeData = rows.map((row, idx) => [ Math.log(idx + 1), Math.log(row.cumulativePuzzles) ]);
    const cumulativeFit = linear(logCumulativeData, { precision: 12 });

    const logAbsoluteData = rows.map((row, idx) => [ Math.log(idx + 1), Math.log(row.count) ]);
    const absoluteFit = linear(logAbsoluteData, { precision: 12 });

    // res.json(rows);
    const cumulativeTrace = {
      x: rows.map((row, idx) => (idx + 1)),
      y: rows.map(row => row.cumulativePuzzles),
      text: rows.map(row => row.author),
      type: 'scatter',
      mode: 'lines',
      name: 'cumulative puzzles'
    };

    const cumulativeFitTrace = {
      x: rows.map((row, idx) => (idx + 1)),
      y: rows.map((row, idx) => Math.exp(cumulativeFit.predict(Math.log(idx + 1))[1])),
      type: 'scatter',
      mode: 'lines',
      // name: `exp cumulativeFit V α N^h, h = ${cumulativeFit.equation[0]}, r2 = ${cumulativeFit.r2}`
      name: 'cumulative puzzles fit'
    };

    const absoluteTrace = {
      x: rows.map((row, idx) => (idx + 1)),
      y: rows.map(row => row.count),
      text: rows.map(row => row.author),
      type: 'scatter',
      mode: 'lines',
      // yaxis: 'y2',
      name: 'absolute puzzles'
    }

    const absoluteFitTrace = {
      x: rows.map((row, idx) => (idx + 1)),
      y: rows.map((row, idx) => Math.exp(absoluteFit.predict(Math.log(idx + 1))[1])),
      type: 'scatter',
      mode: 'lines',
      // yaxis: 'y2',
      // name: `exp cumulativeFit V α N^h, h = ${cumulativeFit.equation[0]}, r2 = ${cumulativeFit.r2}`
      name: 'absolute puzzles fit'
    };

    // TODO: decorrelate???

    const layout = {
      yaxis2: {
        overlaying: 'y',
        side: 'right'
      }
    };

    const figure = { data: [ cumulativeTrace, cumulativeFitTrace, absoluteTrace, absoluteFitTrace ], layout };
    res.json(figure)
  });
};

figures.letterCounts = (req, res, next) => {
  const plotDictionary = cleanBoolean(req.query.dictionary);
  const enLetterFrequencies = plotDictionary ? english.DICTIONARY_LETTER_FREQUENCIES : english.TEXT_LETTER_FREQUENCIES;
  // const enLetterFrequencies = plotDictionary ? WIKI_CORPUS.letterFrequencies.dict : WIKI_CORPUS.letterFrequencies.text;
  db.query(`
SELECT
  answer,
  COUNT(*) AS frequency
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
GROUP BY answer;
`, (err, data) => {
    if (err) return next(err);

    let lettersTotal = 0;
    const letterCounts = {};
    data.rows.forEach(row => {
      const letters = (row.answer.match(/\w/g) || '').length;
      lettersTotal += letters * (plotDictionary ? 1 : +row.frequency);
      for (let i = 0, len = row.answer.length; i < len; i++) {
        const letter = row.answer[i];
        addInto(letterCounts, letter, plotDictionary ? 1 : +row.frequency);
      }
    });

    const letters = Object.keys(enLetterFrequencies).sort((a, b) => {
      const diffA = (letterCounts[a] / lettersTotal) - enLetterFrequencies[a];
      const diffB = (letterCounts[b] / lettersTotal) - enLetterFrequencies[b];
      return diffB - diffA;
    });

    const dataTrace = {
      x: letters,
      y: letters.map(letter => (letterCounts[letter] / lettersTotal)),
      type: 'bar',
      name: 'crossword answers'
    };

    const enTrace = {
      x: letters,
      y: letters.map(letter => enLetterFrequencies[letter]),
      type: 'bar',
      name: 'english'
    };

    const scrabbleTrace = {
      x: letters,
      y: letters.map(letter => scrabble.LETTER_FREQUENCIES[letter]),
      type: 'bar',
      name: 'scrabble'
    };

    const figure = { data: [ dataTrace, enTrace/*, scrabbleTrace*/ ] };
    res.json(figure)
  });
};

figures.letterFrequencyComparison = (req, res, next) => {
  db.query(`
SELECT
  answer,
  COUNT(*) AS frequency
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
GROUP BY answer;
`, (err, data) => {
    if (err) return next(err);

    let textLettersTotal = 0;
    let dictLettersTotal = 0;
    const textLetterCounts = {};
    const dictLetterCounts = {};
    data.rows.forEach(row => {
      const letters = (row.answer.match(/\w/g) || '').length;
      dictLettersTotal += letters;
      textLettersTotal += letters * +row.frequency;
      for (let i = 0, len = row.answer.length; i < len; i++) {
        const letter = row.answer[i];
        addInto(dictLetterCounts, letter, 1);
        addInto(textLetterCounts, letter, +row.frequency);
      }
    });

    const letters = Object.keys(english.DICTIONARY_LETTER_FREQUENCIES);

    const dataTrace = {
      // x: letters.map(letter => ((dictLetterCounts[letter] / dictLettersTotal) - WIKI_CORPUS.letterFrequencies.dict[letter])),
      // y: letters.map(letter => ((textLetterCounts[letter] / textLettersTotal) - WIKI_CORPUS.letterFrequencies.text[letter])),
      x: letters.map(letter => ((dictLetterCounts[letter] / dictLettersTotal) - english.DICTIONARY_LETTER_FREQUENCIES[letter])),
      y: letters.map(letter => ((textLetterCounts[letter] / textLettersTotal) - english.TEXT_LETTER_FREQUENCIES[letter])),
      text: letters,
      type: 'scatter',
      mode: 'text'
    };

    const layout = {
      xaxis: { title: { text: 'diff dictionary frequency' }},
      yaxis: { title: { text: 'diff text frequency' }}
    };

    const figure = { data: [ dataTrace ], layout };
    res.json(figure)
  });
};

figures.letterScoreFrequency = (req, res, next) => {
  const wordLength = cleanNumber(req.query.wordLength, 3);
  const scrabbleScore = cleanBoolean(req.query.scrabbleScore);
  const logScale = cleanBoolean(req.query.logScale);
  db.query(`
SELECT
  answer,
  COUNT(*) AS frequency
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
AND LENGTH(answer) = ${wordLength}
GROUP BY answer;
`, (err, data) => {
    if (err) return next(err);

    data.rows.forEach(row => {
      row.letterScore = scrabbleScore ? analysis.scrabbleScore(row.answer) : analysis.letterFrequencyScore(row.answer);
    });

    const dataTrace = {
      x: data.rows.map(row => row.letterScore),
      y: data.rows.map(row => (logScale ? Math.log10(+row.frequency) : +row.frequency)),
      ...DEFAULT_HISTOGRAM_2D
    };

    const figure = { data: [ dataTrace ]};
    res.json(figure)
  });
};

figures.vowelPlacement = (req, res, next) => {
  const wordLength = cleanNumber(req.query.wordLength, 3);
  if (wordLength > 10) return next('word length too high');
  const tokenTypeSort = cleanBoolean(req.query.tokenTypeSort);
  const byPosition = cleanBoolean(req.query.byPosition);
  db.query(`
SELECT
  answer,
  COUNT(*) AS frequency
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
AND LENGTH(answer) = ${wordLength}
GROUP BY answer;
`, (err, data) => {
    if (err) return next(err);

    const totalTokens = analysis.sumBy(data.rows, 'frequency');
    const totalTypes = data.rows.length;

    const wildcardCharacter = byPosition ? '*' : '-';
    const zeroPadding = new Array(wordLength).fill(0).join('');
    const numToVowelBinary = (val) => ((zeroPadding + val.toString(2)).slice(-wordLength).replace(/1/g, 'V').replace(/0/g, wildcardCharacter));
    const numPlacements = byPosition ? wordLength : 2 ** wordLength;
    const placements = Array.from({ length: numPlacements }, (val, idx) => numToVowelBinary(byPosition ? 2 ** idx : idx));

    const vowelTokenCounts = {};
    const vowelTypesCounts = {};

    if (byPosition) {
      data.rows.forEach(row => {
        for (let i = 0, len = row.answer.length; i < len; i++) {
          const letter = row.answer[i];
          if (english.VOWELS[letter]) {
            const vowelBinary = numToVowelBinary(2 ** i);
            addInto(vowelTokenCounts, vowelBinary, +row.frequency / totalTokens);
            addInto(vowelTypesCounts, vowelBinary, 1 / totalTypes);
          }
        }
      });
    } else {
      const vowelBinaryHelper = new Array(wordLength).fill(wildcardCharacter);
      data.rows.forEach(row => {
        for (let i = 0, len = row.answer.length; i < len; i++) {
          const letter = row.answer[i];
          vowelBinaryHelper[i] = english.VOWELS[letter] ? 'V' : wildcardCharacter
        }
        const vowelBinary = vowelBinaryHelper.join('');
        addInto(vowelTokenCounts, vowelBinary, +row.frequency / totalTokens);
        addInto(vowelTypesCounts, vowelBinary, 1 / totalTypes);
      });
    }

    if (tokenTypeSort) {
      placements.sort((a, b) => ((vowelTokenCounts[b] / vowelTypesCounts[b]) - (vowelTokenCounts[a] / vowelTypesCounts[a])));
    } else {
      placements.sort((a, b) => (b < a ? -1 : 1));
    }

    const typesTrace = {
      x: placements,
      y: placements.map(vowelBinary => vowelTypesCounts[vowelBinary]),
      type: 'bar',
      name: 'types'
    };

    const tokensTrace = {
      x: placements,
      y: placements.map(vowelBinary => vowelTokenCounts[vowelBinary]),
      type: 'bar',
      name: 'tokens',
      // yaxis: 'y2',
    };

    const layout = {
      xaxis: {
        type: 'category'
      }
    };

    const figure = { data: [ tokensTrace, typesTrace ], layout };
    res.json(figure)
  });
};

figures.vowelPlacementFrequency = (req, res, next) => {
  const wordLength = cleanNumber(req.query.wordLength, 3);
  if (wordLength > 10) return next('word length too high');
  const freqSort = cleanBoolean(req.query.freqSort);
  const logScale = cleanBoolean(req.query.logScale);
  db.query(`
SELECT
  answer,
  COUNT(*) AS frequency
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
AND LENGTH(answer) = ${wordLength}
GROUP BY answer;
`, (err, data) => {
    if (err) return next(err);

    const totalTokens = analysis.sumBy(data.rows, 'frequency');
    const totalTypes = data.rows.length;

    const wildcardCharacter = '-';
    const vowelBinaryHelper = new Array(wordLength).fill(wildcardCharacter);
    data.rows.forEach(row => {
      for (let i = 0, len = row.answer.length; i < len; i++) {
        const letter = row.answer[i];
        vowelBinaryHelper[i] = english.VOWELS[letter] ? 'V' : wildcardCharacter
      }
      row.vowelBinary = vowelBinaryHelper.join('');
    });

    if (freqSort) {
      data.rows.sort(numSortBy('frequency', true));
    } else {
      data.rows.sort((a, b) => (b.vowelBinary < a.vowelBinary ? -1 : 1));
    }
    const typeCounts = analysis.countRowGroups(data.rows, 'vowelBinary');
    const typeCountRows = Object.entries(typeCounts);

    const frequencyTrace = {
      x: data.rows.map(row => row.vowelBinary),
      y: data.rows.map(row => (logScale ? Math.log10(+row.frequency) : +row.frequency)),
      ...DEFAULT_HISTOGRAM_2D,
    };

    const typeTrace = {
      x: typeCountRows.map(([vowelBinary, count]) => vowelBinary),
      y: typeCountRows.map(([vowelBinary, count]) => count),
      type: 'scatter',
      mode: 'lines+markers',
      name: '# word types',
      yaxis: 'y2'
    };

    const layout = {
      xaxis: {
        type: 'category'
      },
      yaxis2: {
        overlaying: 'y',
        side: 'right'
      },
      showlegend: true,
    };

    const figure = { data: [ frequencyTrace, typeTrace ], layout };
    res.json(figure)
  });
};

figures.vowelCountFrequency = (req, res, next) => {
  const wordLength = cleanNumber(req.query.wordLength, 3);
  const freqSort = cleanBoolean(req.query.freqSort);
  const logScale = cleanBoolean(req.query.logScale);
  db.query(`
SELECT
  answer,
  COUNT(*) AS frequency
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
AND LENGTH(answer) = ${wordLength}
GROUP BY answer;
`, (err, data) => {
    if (err) return next(err);

    data.rows.forEach(row => {
      row.vowelCount = 0;
      for (let i = 0, len = row.answer.length; i < len; i++) {
        if (english.VOWELS[row.answer[i]]) row.vowelCount++;
      }
    });

    data.rows.sort(numSortBy(freqSort ? 'frequency' : 'vowelCount', freqSort ? true : false));

    const countsTrace = {
      x: data.rows.map(row => row.vowelCount),
      y: data.rows.map(row => (logScale ? Math.log10(+row.frequency) : +row.frequency)),
      ...DEFAULT_HISTOGRAM_2D,
    };

    const layout = {
      xaxis: {
        type: 'category'
      },
    };

    const figure = { data: [ countsTrace ], layout };
    res.json(figure)
  });
};

figures.vowelsByLength = (req, res, next) => {
  const countTokens = cleanBoolean(req.query.tokens);
  db.query(`
SELECT
  answer
FROM clues
INNER JOIN puzzles p ON puzzle_id=p.id
WHERE p.date BETWEEN '1000-01-01' AND '3020-01-01'
${countTokens ? '' : 'GROUP BY answer'};
`, (err, data) => {
    if (err) return next(err);

    const dataTrace = {
      x: data.rows.map(row => row.answer.length),
      y: data.rows.map(row => analysis.countVowels(row.answer)),
      ...DEFAULT_HISTOGRAM_2D
    };

    const layout = {
      xaxis: { title: { text: 'answer length' }},
      yaxis: { title: { text: 'num vowels' }}
    };

    const figure = { data: [ dataTrace ], layout };
    res.json(figure)
  });
};

module.exports = figures;