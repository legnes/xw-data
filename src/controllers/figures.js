const { db } = require('../../config');
const { alea } = require('seedrandom');
const { randomBinomial } = require("d3-random");
const { linear } = require('regression');

const { promiseQuery, answerFrequencies, answerDates, answerTokensAndTypes } = require('../util/query');
const analysis = require('../util/analysis');
const { cleanSearchText, cleanOptionText, cleanNumber, cleanBoolean } = require('../util/url');
const { DEFAULT_HISTOGRAM_2D, DEFAULT_HEATMAP, DEFAULT_HEATMAP_LAYOUT, axisLabels } = require('../util/figure');
const { camelCaseToWords, addInto, numSortBy, sortBy,  } = require('../util/base');

const { english, scrabble } = require('../constants/language');
const { START_YEAR, END_YEAR, DAYS_OF_WEEK } = require('../constants/data');
const { english: { WIKI_CORPUS }} = require('../constants/corpora');

const figures = {};

figures.mostFrequentAnswers = (req, res, next) => {
  const lengthThresh = cleanNumber(req.query.lengthThresh, 3);

  db.query(answerFrequencies({
    where: `LENGTH(answer) >= ${lengthThresh}`,
    having: 'COUNT(*) >= 2',
    orderBy: 'frequency DESC, length DESC, answer',
    limit: 30
  }), (err, data) => {
    if (err) return next(err);

    data.rows.forEach((row, idx) => { row.rank = `${idx + 1}.` });
    res.json({
      rows: data.rows,
      columns: [
        { label: '', key: 'rank'},
        { label: 'answer', key: 'answer'},
        { label: 'count', key: 'frequency'},
      ],
    });
  });
};

figures.lengthFrequency = (req, res, next) => {
  db.query(answerFrequencies(), (err, data) => {
    if (err) return next(err);

    res.json({
      data: [{
        x: data.rows.map(row => +row.length),
        y: data.rows.map(row => Math.log10(+row.frequency)),
        ...DEFAULT_HISTOGRAM_2D
      }],
      layout: axisLabels('answer length', 'frequency (log 10 scale)')
    });
  });
};

figures.lengthFrequencyCorrelations = (req, res, next) => {
  db.query(answerFrequencies(), (err, data) => {
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

figures.lengthFrequencyPmfLengthConditionals = (req, res, next) => {
  db.query(answerFrequencies(), (err, data) => {
    if (err) return next(err);

    const allowedLengths = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
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

    res.json({
      data: traces,
      layout: axisLabels('answer frequency', 'length-conditional probability mass')
    });
  });
};

figures.lengthFrequencyPmfLengthMarginal = (req, res, next) => {
  db.query(answerFrequencies(), (err, data) => {
    if (err) return next(err);

    const types = data.rows.length;
    const lengthMarginal = data.rows.reduce((probs, row) => addInto(probs, +row.length, 1 / types), {});

    res.json({
      data: [{
        x: Object.entries(lengthMarginal).map(([length, prob]) => length),
        y: Object.entries(lengthMarginal).map(([length, prob]) => prob),
        type: 'scatter',
        mode: 'markers+lines',
      }],
      layout: axisLabels('answer length', 'marginal probability mass')
    });
  });
};

figures.lengthTypesAndTokens = (req, res, next) => {
  db.query(answerTokensAndTypes(), (err, data) => {
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

    res.json({
      data: [ tokensTrace, typesTrace, diffTrace ],
      layout: {
        xaxis: { title: { text: 'answer length' }},
      }
    });
  });
};

figures.lengthTypesAndTokensCombined = (req, res, next) => {
  db.query(answerTokensAndTypes(), (err, data) => {
    if (err) return next(err);

    const enData = {};
    for (let [answer, frequency] of WIKI_CORPUS.data) {
      const length = answer.length;
      const counts = enData[length] || {
        tokens: 0,
        types: 0
      };
      counts.tokens += frequency;
      counts.types++;
      enData[length] = counts;
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
      y: lengths.map(length => enData[length] ? enData[length].tokens : 0),
      type: 'scatter',
      mode: 'markers+lines',
      name: 'en tokens',
      yaxis: 'y2'
    };

    const typesTraceEn = {
      x: lengths,
      y: lengths.map(length => enData[length] ? enData[length].types : 0),
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

    res.json({
      data: [ tokensTrace, typesTrace, tokensTraceEn, typesTraceEn ],
      layout
    });
  });
};

figures.mostFrequentLongAnswers = (req, res, next) => {
  db.query(answerFrequencies({
    where: 'LENGTH(answer) >= 14',
    having: '(COUNT(*) > 1 AND LENGTH(answer) > 15) OR (COUNT(*) > 3 AND LENGTH(answer) > 13)',
    orderBy: 'length DESC, frequency DESC, answer'
  }), (err, data) => {
    if (err) return next(err);

    res.json({
      rows: data.rows,
      columns: [
        { label: 'answer', key: 'answer'},
        { label: 'length', key: 'length'},
        { label: 'count', key: 'frequency'},
      ],
    });
  });
};

figures.relativeFrequencyDifference = (req, res, next) => {
  const sortyByAbsDiff = !cleanBoolean(req.query.positive);

  db.query(answerFrequencies(), (err, data) => {
    if (err) return next(err);

    const xwTotal = analysis.sumBy(data.rows, 'frequency');
    const enTotal = WIKI_CORPUS.totalTokens;
    for (let row of data.rows) {
      row.xwFrequency = +row.frequency;
      row.enFrequency = WIKI_CORPUS.data.get(row.answer) || 0;
      row.xwRelativeFrequency = row.xwFrequency / xwTotal;
      row.enRelativeFrequency = row.enFrequency / enTotal;
      row.frequencyDiff = (row.xwRelativeFrequency - row.enRelativeFrequency);
      row.absFrequencyDiff = Math.abs(row.frequencyDiff);
    }
    data.rows.sort(numSortBy(sortyByAbsDiff ? 'absFrequencyDiff' : 'frequencyDiff', true));
    data.rows.length = 100;
    data.rows.forEach(row => {
      row.frequencyDiff = row.frequencyDiff.toFixed(5);
    });

    res.json({
      rows: data.rows,
      columns: [
        { label: 'answer', key: 'answer'},
        { label: 'difference in relative frequency', key: 'frequencyDiff'},
        { label: 'crossword frequency', key: 'xwFrequency'},
        { label: 'english corpus frequency', key: 'enFrequency'},
      ],
    });
  });
};

figures.keyness = (req, res, next) => {
  const enFreqThresh = cleanNumber(req.query.enFreqThresh, 0);
  const lengthThresh = cleanNumber(req.query.lengthThresh, 0);
  const sortSameness = cleanBoolean(req.query.sameness);
  // const effectSizeMetric = cleanOptionText(req.query.effectSizeMetric, ['nfcDiff', 'ratio', 'oddsRatio', 'logRatio', 'percentDiff', 'diffCoeff'], 'nfcDiff');
  const effectSizeMetric = cleanOptionText(req.query.effectSizeMetric, ['relFreqDiff', 'logRatio'], 'relFreqDiff');

  db.query(answerFrequencies(), (err, data) => {
    if (err) return next(err);

    const xwTotal = data.rows.reduce((total, row) => (total + +row.frequency), 0);
    const enTotal = WIKI_CORPUS.totalTokens;
    for (let row of data.rows) {
      const xwFrequency = +row.frequency;
      const enFrequency = WIKI_CORPUS.data.get(row.answer) || 1e-15;
      const combinedFrequency = xwFrequency + enFrequency;
      const combinedTotal = xwTotal + enTotal;
      const xwNormalizedFrequency = xwFrequency / xwTotal;
      const enNormalizedFrequency = enFrequency/ enTotal;
      const xwExpectedValue = xwTotal * combinedFrequency / combinedTotal;
      const enExpectedValue = enTotal * combinedFrequency / combinedTotal;

      // Extra info
      row.enFrequency = enFrequency == 1e-15 ? 0 : enFrequency;

      // Statistical metrics
      row.logLikelihoodG2 = 2 * (xwFrequency * Math.log(xwFrequency / xwExpectedValue) + enFrequency * Math.log(enFrequency / enExpectedValue));
      row.bayesFactor = row.logLikelihoodG2 - Math.log(combinedTotal);

      // Effect size metrics
      const stats = {};
      stats.relFreqDiff = xwNormalizedFrequency - enNormalizedFrequency;
      stats.relativeFrequencyRatio = xwNormalizedFrequency / enNormalizedFrequency;
      stats.oddsRatio = (xwFrequency / (xwTotal - xwFrequency)) / (enFrequency / (enTotal - enFrequency));
      stats.logRatio = Math.log2(stats.relativeFrequencyRatio);
      stats.percentDiff = stats.relFreqDiff * 100 / enNormalizedFrequency;
      stats.diffCoeff = stats.relFreqDiff / (xwNormalizedFrequency + enNormalizedFrequency);
      row.effectSize = stats[effectSizeMetric];
    }

    const rows = data.rows.filter(row => (
      row.bayesFactor > 2 &&
      row.enFrequency >= enFreqThresh
      // +row.length > lengthThresh
    )).sort((a, b) => {
      return b.effectSize - a.effectSize
      // (sortSameness ? -1 : 1) * (Math.abs(b.logRatio) - Math.abs(a.logRatio))
    });
    rows.length = 200;
    rows.forEach(row => {
      row.effectSize = row.effectSize.toFixed(6);
      row.bayesFactor = row.bayesFactor.toFixed(0);
      row.logLikelihoodG2 = row.logLikelihoodG2.toFixed(0);
    });

    res.json({
      rows,
      columns: [
        { label: 'answer', key: 'answer'},
        { label: 'frequency', key: 'frequency'},
        { label: 'english corpus frequency', key: 'enFrequency'},
        { label: camelCaseToWords(effectSizeMetric), key: 'effectSize'},
        { label: 'bayes factor', key: 'bayesFactor'},
        { label: 'log likelihood G2', key: 'logLikelihoodG2'}
      ],
    });
  });
};

figures.answerClues = (req, res, next) => {
  const MAX_RESULT_TERMS = 6;
  const MAX_RESULTS = 500;
  const searchTerms = cleanSearchText(req.query.search);
  if (searchTerms.length < 1) return next(new Error('Missing search terms!'));

  db.query(`
SELECT
  answer,
  DATE_TRUNC('year', p.date) AS year,
  text AS clue
FROM clues
INNER JOIN puzzles p ON puzzle_id = p.id
WHERE ${searchTerms.map(str => (`answer LIKE '${str}'`)).join(' OR ')}
ORDER BY RANDOM()
LIMIT ${MAX_RESULTS};
`, (err, data) => {
    if (err) return next(err);

    data.rows.forEach(row => { row.year = row.year.getFullYear(); });
    data.rows.sort(sortBy('clue', true));

    let foundMultipleAnswers = false;
    if (data.rows.length > 0) {
      const firstAnswer = data.rows[0].answer;
      for (let i = 1, len = data.rows.length; i < len; i++) {
        if (firstAnswer !== data.rows[i].answer) {
          foundMultipleAnswers = true;
          break;
        }
      }
    }

    const columns = [];
    if (foundMultipleAnswers) {
      data.rows.sort(sortBy('answer', true));
      columns.push({ label: 'answer', key: 'answer' });
    }

    res.json({
      rows: data.rows,
      columns: [
        ...columns,
        { label: 'clue', key: 'clue'},
        { label: 'year', key: 'year'},
      ]
    });
  });
};

figures.keynessPerYear = (req, res, next) => {
  db.query(`
SELECT
  answer,
  COUNT(*) frequency,
  DATE_TRUNC('year', p.date) as year
FROM clues
INNER JOIN puzzles p ON puzzle_id = p.id
GROUP BY answer, year;
`, (err, data) => {
    const allTimeWordCounts = {};
    let allTimeTotal = 0;
    const yearlyTotals = {};

    for (const row of data.rows) {
      const frequency = +row.frequency;
      const year = row.year.getFullYear();

      addInto(allTimeWordCounts, row.answer, frequency);
      allTimeTotal += frequency;
      addInto(yearlyTotals, year, frequency);

      row.frequency = frequency;
      row.year = year;
    }

    for (const row of data.rows) {
      const yearFrequency = row.frequency;
      const yearTotal = yearlyTotals[row.year];
      const allTimeFrequency = allTimeWordCounts[row.answer] || 1e-15;
      const combinedFrequency = yearFrequency + allTimeFrequency;
      const combinedTotal = yearTotal + allTimeTotal;
      const yearNormalizedFrequency = yearFrequency / yearTotal;
      const allTimeNormalizedFrequency = allTimeFrequency/ allTimeTotal;
      const yearExpectedValue = yearTotal * combinedFrequency / combinedTotal;
      const allTimeExpectedValue = allTimeTotal * combinedFrequency / combinedTotal;

      // Extra info
      row.allTimeFrequency = allTimeFrequency;

      // Statistical metrics
      const logLikelihoodG2 = 2 * (yearFrequency * Math.log(yearFrequency / yearExpectedValue) + allTimeFrequency * Math.log(allTimeFrequency / allTimeExpectedValue));
      row.bayesFactor = logLikelihoodG2 - Math.log(combinedTotal);

      // Effect size metrics
      row.logRatio = Math.log2(yearNormalizedFrequency / allTimeNormalizedFrequency);
    }

    const rows = data.rows.filter((row) => row.bayesFactor > 2)
                          .sort(numSortBy('logRatio', true))
                          .sort(numSortBy('year', true));

    rows.forEach(row => {
      row.logRatio = row.logRatio.toFixed(2);
      row.bayesFactor = row.bayesFactor.toFixed(2);
    })

    res.json({
      rows,
      columns: [
        { label: 'year', key: 'year'},
        { label: 'answer', key: 'answer'},
        { label: 'frequency', key: 'frequency'},
        { label: 'all time frequency', key: 'allTimeFrequency'},
        { label: 'log ratio', key: 'logRatio'},
        { label: 'bayes factor', key: 'bayesFactor'}
      ],
    });
  });
};

figures.rankFrequencyEn = (req, res, next) => {
  const MAX_RANK = 100000;
  const maxRank = Math.min(cleanNumber(req.query.maxRank, MAX_RANK), MAX_RANK);
  const noFit = cleanBoolean(req.query.noFit);

  const corpusSize = WIKI_CORPUS.totalTokens;
  const words = [], ranks = [], frequencies = [], logFrequencySeries = [];
  let rank = 0;
  for (let [word, frequency] of WIKI_CORPUS.data) {
    if (++rank > maxRank) break;
    words.push(word);
    ranks.push(rank);
    frequencies.push(frequency);
    if (!noFit) {
      logFrequencySeries.push([ Math.log(rank), Math.log(frequency / corpusSize) ])
    }
  }

  const data = [{
    x: ranks,
    y: frequencies,
    text: words,
    type: 'scatter',
    mode: 'lines',
    name: `frequencies`
  }];

  if (!noFit) {
    const fit = linear(logFrequencySeries, { precision: 12 });
    const fitFrequencies = ranks.map(rank => (corpusSize * Math.exp(fit.predict(Math.log(rank))[1])));
    data.push({
      x: ranks,
      y: fitFrequencies,
      type: 'scatter',
      mode: 'lines',
      name: `fit α=${-fit.equation[0].toPrecision(3)} r2=${fit.r2.toPrecision(3)}`
    });
  }

  res.json({
    data,
    layout: axisLabels('rank', 'frequency')
  })
};

figures.decorrelatedRankFrequencyEn = (req, res, next) => {
  const rows = [];
  let i = 0;
  for (let [word, frequency] of WIKI_CORPUS.data) {
    if (++i > 500000) break;
    rows.push({ word, frequency });
  }

  const {
    rankFrequency,
    highFrequencyFit,
    lowFrequencyFit
  } = analysis.decorrelatedRankFrequencyAnalysis(rows, { domainSplitRank: 500 });

  res.json({
    data: [ rankFrequency, highFrequencyFit, lowFrequencyFit ],
    layout: axisLabels('log rank', 'log frequency')
  });
};

figures.decorrelatedRankFrequency = (req, res, next) => {
  db.query(answerFrequencies(), (err, data) => {
    if (err) return next(err);

    const {
      rankFrequency,
      highFrequencyFit,
      lowFrequencyFit
    } = analysis.decorrelatedRankFrequencyAnalysis(data.rows, { domainSplitRank: 500 });

    res.json({
      data: [ rankFrequency, highFrequencyFit, lowFrequencyFit ],
      layout: axisLabels('log rank', 'log frequency')
    });
  });
};

figures.rankFrequencyNumericals = (req, res, next) => {
  db.query(answerFrequencies({
    where: english.NUMERICAL_WORDS.map(str => (`answer = '${str}'`)).join(' OR ')
  }), (err, data) => {
    if (err) return next(err);

    const frequencyByAnswer = data.rows.reduce((dict, row) => {
      dict[row.answer] = row.frequency;
      return dict;
    }, {});

    res.json({
      data: [{
        x: english.NUMERICAL_WORD_VALUES,
        y: english.NUMERICAL_WORDS.map((word) => WIKI_CORPUS.data.get(word)),
        text: english.NUMERICAL_WORDS,
        type: 'scatter',
        mode: 'markers+lines',
        name: 'english'
      }, {
        x: english.NUMERICAL_WORD_VALUES,
        y: english.NUMERICAL_WORDS.map((word) => frequencyByAnswer[word] || 0),
        text: english.NUMERICAL_WORDS,
        type: 'scatter',
        mode: 'markers+lines',
        name: 'crosswords',
        yaxis: 'y2',
        // visible: 'legendonly'
      }],
      layout: {
        xaxis: { title: { text: 'cardinality' }},
        yaxis: { title: { text: 'english frequency' }},
        yaxis2: {
          title : { text: 'crossword frequency' },
          overlaying: 'y',
          side: 'right' ,
        }
      }
    });
  });
};

figures.vowelCountFrequency = (req, res, next) => {
  const wordLength = cleanNumber(req.query.wordLength, 3);

  db.query(answerFrequencies({
    where: `LENGTH(answer) = ${wordLength}`
  }), (err, data) => {
    if (err) return next(err);

    data.rows.forEach(row => {
      row.vowelCount = 0;
      for (let i = 0, len = row.answer.length; i < len; i++) {
        if (english.VOWELS[row.answer[i]]) row.vowelCount++;
      }
    });

    data.rows.sort(numSortBy('vowelCount'));

    const layout = axisLabels('number of vowels', 'frequency');
    layout.xaxis.type = 'category';

    res.json({
      data: [{
        x: data.rows.map(row => row.vowelCount),
        y: data.rows.map(row => +row.frequency),
        ...DEFAULT_HISTOGRAM_2D,
      }],
      layout
    })
  });
};

figures.vowelPlacement = (req, res, next) => {
  const wordLength = cleanNumber(req.query.wordLength, 3);
  if (wordLength > 10) return next('word length too high');
  const byPosition = cleanBoolean(req.query.byPosition);

  db.query(answerFrequencies({
    where: `LENGTH(answer) = ${wordLength}`
  }), (err, data) => {
    if (err) return next(err);

    const totalTokens = analysis.sumBy(data.rows, 'frequency');
    const totalTypes = data.rows.length;

    const wildcardCharacter = byPosition ? '*' : '-';
    const zeroPadding = new Array(wordLength).fill(0).join('');
    const numToVowelBinary = (val) => (
      (zeroPadding + val.toString(2))
        .slice(-wordLength)
        .replace(/1/g, 'V')
        .replace(/0/g, wildcardCharacter)
    );
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

    const dataTrace = {
      x: placements.map(vowelBinary => vowelTypesCounts[vowelBinary] || 0),
      y: placements.map(vowelBinary => vowelTokenCounts[vowelBinary] || 0),
      text: placements,
      type: 'scatter',
      mode: 'text',
      name: ''
    };

    const max = Math.max(...dataTrace.x, ...dataTrace.y);
    const lineTrace = {
      x: [0, max],
      y: [0, max],
      type: 'scatter',
      mode: 'lines',
      name: ''
    };

    res.json({
      data: [ dataTrace, lineTrace ],
      layout: axisLabels('words to choose from', 'answers needed')
    });
  });
};

figures.letterCounts = (req, res, next) => {
  const plotDictionary = cleanBoolean(req.query.dictionary);
  const enLetterFrequencies = plotDictionary ? english.DICTIONARY_LETTER_FREQUENCIES : english.TEXT_LETTER_FREQUENCIES;

  db.query(answerFrequencies(), (err, data) => {
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

    const letters = Object.keys(enLetterFrequencies);

    const dataTrace = {
      x: letters.map(letter => ((enLetterFrequencies[letter]) || 0)),
      y: letters.map(letter => ((letterCounts[letter] / lettersTotal) || 0)),
      text: letters,
      type: 'scatter',
      mode: 'text',
      name: ''
    };

    const max = Math.max(...dataTrace.x, ...dataTrace.y);
    const lineTrace = {
      x: [0, max],
      y: [0, max],
      type: 'scatter',
      mode: 'lines',
      name: ''
    };

    res.json({
      data: [ dataTrace, lineTrace ],
      layout: axisLabels('english frequency', 'crossword frequency')
    });
  });
};

figures.letterScoreFrequency = (req, res, next) => {
  const wordLength = cleanNumber(req.query.wordLength, 3);
  const useScrabbleScore = true;
  const logScale = false;
  // const useScrabbleScore = cleanBoolean(req.query.scrabbleScore);
  // const logScale = cleanBoolean(req.query.logScale);

  db.query(answerFrequencies({
    where: `LENGTH(answer) = ${wordLength}`
  }), (err, data) => {
    if (err) return next(err);

    data.rows.forEach(row => {
      row.letterScore = useScrabbleScore ? analysis.scrabbleScore(row.answer) : analysis.letterFrequencyScore(row.answer);
    });

    res.json({
      data: [{
        x: data.rows.map(row => row.letterScore),
        y: data.rows.map(row => (logScale ? Math.log10(+row.frequency) : +row.frequency)),
        ...DEFAULT_HISTOGRAM_2D
      }],
      layout: axisLabels('scrabble score', 'crossword frequency')
    });
  });
};

figures.vowelPositions = (req, res, next) => {
  db.query(answerFrequencies(), (err, data) => {
    if (err) return next(err);

    const vowelCounts = [];
    const letterCounts = [];
    for (let i = 0, len = data.rows.length; i < len; i++) {
      const answer = data.rows[i].answer;
      for (let j = 0, jlen = answer.length; j < jlen; j++) {
        if (!vowelCounts[j]) vowelCounts[j] = 0;
        if (!letterCounts[j]) letterCounts[j] = 0;

        letterCounts[j]++;
        if (english.VOWELS[answer[j]]) vowelCounts[j]++;
      }
    }

    res.json({
      data: [{
        x: vowelCounts.map((count, idx) => (idx + 1)),
        y: vowelCounts.map((count, idx) => (count / letterCounts[idx])),
        type: 'bar'
      }],
      layout: axisLabels('letter position', 'fraction vowels')
    });
  });
};

figures.vowelsByLength = (req, res, next) => {
  const countTokens = cleanBoolean(req.query.tokens);

  db.query(`
SELECT
  answer
FROM clues
${countTokens ? '' : 'GROUP BY answer'};
`, (err, data) => {
    if (err) return next(err);

    res.json({
      data: [{
        x: data.rows.map(row => row.answer.length),
        y: data.rows.map(row => analysis.countVowels(row.answer)),
        ...DEFAULT_HISTOGRAM_2D
      }],
      layout: axisLabels('answer length', 'num vowels')
    });
  });
};

figures.answerStartsGrid = (req, res, next) => {
  const PUZZLE_DIMENSION = 15;

  db.query(`
SELECT
  grid_index
FROM clues
INNER JOIN puzzles p ON puzzle_id = p.id
WHERE p.width = ${PUZZLE_DIMENSION}
AND p.height = ${PUZZLE_DIMENSION};
`, (err, data) => {
    if (err) return next(err);

    const grid = Array.from({ length: PUZZLE_DIMENSION }, () => new Array(PUZZLE_DIMENSION).fill(0));
    for (const row of data.rows) {
      const idx = row.grid_index;
      const x = idx % PUZZLE_DIMENSION;
      const y = Math.floor(idx / PUZZLE_DIMENSION);
      grid[y][x]++;
    }

    res.json({
      data: [{
        z: grid.reverse(),
        x: Array.from({ length: PUZZLE_DIMENSION }, (val, idx) => `col ${idx + 1}`),
        y: Array.from({ length: PUZZLE_DIMENSION }, (val, idx) => `row ${idx + 1}`).reverse(),
        ...DEFAULT_HEATMAP,
      }],
      layout: DEFAULT_HEATMAP_LAYOUT
    });
  });
};

figures.vowelsGrid = (req, res, next) => {
  const PUZZLE_DIMENSION = 15;

  db.query(`
SELECT
  solution
FROM puzzles
WHERE width = ${PUZZLE_DIMENSION}
AND height = ${PUZZLE_DIMENSION};
`, (err, data) => {
    if (err) return next(err);

    const grid = Array.from({ length: PUZZLE_DIMENSION }, () => new Array(PUZZLE_DIMENSION).fill(0));
    for (const row of data.rows) {
      for (let i = 0, len = row.solution.length; i < len; i++) {
        if (english.VOWELS[row.solution[i]]) {
          const x = i % PUZZLE_DIMENSION;
          const y = Math.floor(i / PUZZLE_DIMENSION);
          grid[y][x]++;
        }
      }
    }

    res.json({
      data: [{
        z: grid.reverse(),
        x: Array.from({ length: PUZZLE_DIMENSION }, (val, idx) => `col ${idx + 1}`),
        y: Array.from({ length: PUZZLE_DIMENSION }, (val, idx) => `row ${idx + 1}`).reverse(),
        ...DEFAULT_HEATMAP
      }],
      layout: DEFAULT_HEATMAP_LAYOUT
    });
  });
};

figures.topLeftAnswers = (req, res, next) => {
  const gridIndex = cleanNumber(req.query.gridIndex, 2) - 1;
  const PUZZLE_DIMENSION = 15;

  db.query(answerFrequencies({
    joinPuzzles: true,
    where:`p.width = ${PUZZLE_DIMENSION} AND p.height = ${PUZZLE_DIMENSION} AND (grid_index = ${gridIndex} OR grid_index = ${gridIndex * PUZZLE_DIMENSION})`,
    orderBy: 'frequency DESC',
    limit: 30
  }), (err, data) => {
    if (err) return next(err);

    data.rows.forEach((row, idx) => { row.rank = `${idx + 1}.` });
    res.json({
      rows: data.rows,
      columns: [
        { label: '', key: 'rank'},
        { label: 'answer', key: 'answer'},
        { label: 'count', key: 'frequency'},
      ],
    });
  });
};

figures.dictionarySizeOverTime = (req, res, next) => {
  const timeBin = cleanOptionText(req.query.timescale, ['year', 'month', 'day'], 'month');

  db.query(`
SELECT
  DATE_TRUNC('${timeBin}', p.date) AS time_bin,
  COUNT(DISTINCT answer) AS dictionary_size
FROM clues
INNER JOIN puzzles p ON puzzle_id = p.id
WHERE p.date BETWEEN '${START_YEAR + 1}-01-01' AND '${END_YEAR - 1}-12-31'
GROUP BY time_bin
ORDER BY time_bin ASC;
`, (err, data) => {
    if (err) return next(err);

    res.json({
      data: [{
        x: data.rows.map(row => row.time_bin),
        y: data.rows.map(row => +row.dictionary_size),
        type: 'scatter',
        mode: 'lines'
      }],
      layout: axisLabels('date', 'unique answers')
    });
  });
};

const YEARS_TO_MS = 365 * 24 * 60 * 60 * 1000;
figures.uniqueAnswersOverTime = (req, res, next) => {
  db.query(`
SELECT
  answer,
  MIN(DATE_TRUNC('month', p.date)) AS month_introduced
FROM clues
INNER JOIN puzzles p ON puzzle_id = p.id
GROUP BY answer
ORDER BY month_introduced;
`, (err, data) => {
    if (err) return next(err);

    const dates = [];
    const dateStrings = [];
    const counts = [];
    let prevDate = data.rows[0].month_introduced;
    const firstTime = prevDate.getTime();
    for (let i = 1, len = data.rows.length; i < len; i++) {
      const date = data.rows[i].month_introduced;
      if (date > prevDate) {
        dates.push((prevDate.getTime() - firstTime) / YEARS_TO_MS);
        dateStrings.push(prevDate.toDateString())
        counts.push(i);
        prevDate = date;
      }
    }

    res.json({
      data: [{
        x: dates,
        y: counts,
        text: dateStrings,
        type: 'scatter',
        mode: 'lines'
      }],
      layout: axisLabels(`years since ${START_YEAR}`, 'cumulative unique answers')
    });
  });
};

figures.herdanByAuthor = (req, res, next) => {
  db.query(`
SELECT
  p.author as author,
  COUNT(*) AS tokens,
  COUNT(DISTINCT answer) AS types
FROM clues
INNER JOIN puzzles p ON puzzle_id = p.id
GROUP BY author;
`, (err, data) => {
    if (err) throw err;

    data.rows.sort(numSortBy('tokens'))
    const logData = data.rows.map(row => ([ Math.log(row.tokens), Math.log(row.types) ]));
    const fit = linear(logData, { precision: 12 });

    const tokens = data.rows.map(row => row.tokens);

    res.json({
      data: [{
        x: tokens,
        y: data.rows.map(row => Math.round(Math.exp(fit.predict(Math.log(row.tokens))[1]))),
        type: 'scatter',
        mode: 'lines',
        name: `fit r2=${fit.r2.toFixed(4)}`
      }, {
        x: tokens,
        y: data.rows.map(row => row.types),
        text: data.rows.map(row => row.author),
        type: 'scatter',
        mode: 'markers',
        name: 'data'
      }],
      layout: axisLabels('unique answers by author', 'total answers by author')
    });
  });
};

figures.countBirthsDeathsOverTime = (req, res, next) => {
  const usageThreshold = cleanNumber(req.query.thresh, 1);
  const timeBin = cleanOptionText(req.query.timescale, ['year', 'month', 'day'], 'month');

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
  INNER JOIN puzzles p ON puzzle_id = p.id
  WHERE p.date BETWEEN '${START_YEAR + 1}-01-01' AND '${END_YEAR - 1}-12-31'
  GROUP BY answer
  HAVING COUNT(*) >= ${usageThreshold}
) answers_by_month_introduced
GROUP BY time_bin
ORDER BY time_bin;
`),
//     promiseQuery(`
// SELECT
//   time_bin_died as time_bin,
//   COUNT(*) as births_deaths
// FROM (
//   SELECT
//     answer,
//     MAX(DATE_TRUNC('${timeBin}', p.date)) AS time_bin_died
//   FROM clues
//   INNER JOIN puzzles p ON puzzle_id = p.id
//   WHERE p.date BETWEEN '${START_YEAR + 1}-01-01' AND '${END_YEAR - 1}-12-31'
//   GROUP BY answer
//   HAVING COUNT(*) >= ${usageThreshold}
// ) answers_by_month_introduced
// GROUP BY time_bin
// ORDER BY time_bin;
// `),
  ];
  Promise.all(queries).then(results => {

    const traces = results.map((rows, idx) => ({
      x: rows.map(row => row.time_bin),
      y: rows.map(row => +row.births_deaths),
      type: 'scatter',
      mode: `lines${timeBin === 'year' ? '+markers' : ''}`,
      name: idx === 0 ? 'births' : 'deaths'
    }));

    res.json({
      data: traces,
      layout: axisLabels('date', 'answer births')
    });
  });
};

figures.mostRecentNewWords = (req, res, next) => {
  const countThresh = cleanNumber(req.query.thresh, 3);

  db.query(answerDates({
    trunc: 'year',
    minCount: countThresh,
    orderBy: 'MIN(p.date) DESC',
    limit: 100
  }), (err, data) => {
    if (err) return next(err);

    const rows = data.rows.map(row => ({
      year: row.first_date.getFullYear(),
      answer: row.answer,
      occurrences: row.occurrences
    }));

    res.json({
      rows: rows,
      columns: [
        { label: 'year introduced', key: 'year'},
        { label: 'answer', key: 'answer'},
        { label: 'occurrences', key: 'occurrences'},
      ],
    });
  });
};

figures.oldestDeadWords = (req, res, next) => {
  const countThresh = cleanNumber(req.query.thresh, 3);

  db.query(answerDates({
    trunc: 'year',
    minCount: countThresh,
    orderBy: 'MAX(p.date) ASC',
    limit: 100
  }), (err, data) => {
    if (err) return next(err);

    data.rows.forEach(row => {
      row.last_date = row.last_date.getFullYear();
      row.first_date = row.first_date.getFullYear();
    });

    res.json({
      rows: data.rows,
      columns: [
        { label: 'year disappeared', key: 'last_date'},
        { label: 'answer', key: 'answer'},
        { label: 'occurrences', key: 'occurrences'},
        { label: 'year introduced', key: 'first_date'},
      ],
    });
  });
};

figures.topNewWordsByYear = (req, res, next) => {
  const minCount = 3; //cleanNumber(req.query.thresh, 2);
  const MAX_WORDS_PER_YEAR = 10;

  db.query(answerDates({
    trunc: 'year',
    minCount,
    orderBy: 'first_date DESC, occurrences DESC, MIN(p.date) DESC'
  }), (err, data) => {
    if (err) return next(err);

    data.rows.forEach(row => { row.year = row.first_date.getFullYear(); });

    const wordsByYear = analysis.groupRowsBy(data.rows, 'year');
    for (const year in wordsByYear) {
      const yearWords = wordsByYear[year];
      yearWords.length = Math.min(yearWords.length, MAX_WORDS_PER_YEAR);
    }

    const rows = Object.values(wordsByYear).flat();
    rows.sort(numSortBy('year', true));

    res.json({
      rows: rows,
      columns: [
        { label: 'year introduced', key: 'year'},
        { label: 'answer', key: 'answer'},
        { label: 'occurrences', key: 'occurrences'},
      ],
    });
  });
};

figures.wordLongevity = (req, res, next) => {
  const minCount = cleanNumber(req.query.minCount, 1);
  const maxCount = cleanNumber(req.query.maxCount, 1000);

  db.query(answerDates({ trunc: 'year', minCount, maxCount }), (err, data) => {
    if (err) return next(err);

    res.json({
      data: [{
        x: data.rows.map(row => (row.first_date.getFullYear())),
        y: data.rows.map(row => (row.last_date.getFullYear())),
        ...DEFAULT_HISTOGRAM_2D
      }],
      layout: axisLabels('year introduced', 'year disappeared')
    });
  });
};

figures.wordLongevityByYear = (req, res, next) => {
  const minCount = cleanNumber(req.query.minCount, 1);
  const maxCount = cleanNumber(req.query.maxCount, 1000);
  const showOutliers = cleanBoolean(req.query.outliers);

  db.query(answerDates({ trunc: 'day', minCount, maxCount }), (err, data) => {
    if (err) return next(err);

    data.rows.forEach(row => {
      row.lifespan = (row.last_date - row.first_date) / 31536000000;
      row.startYear = row.first_date.getFullYear();
    });
    const rowsByStartYear = analysis.groupRowsBy(data.rows, 'startYear');

    res.json({
      data: Object.entries(rowsByStartYear).map(([startYear, rows]) => ({
        y: rows.map(row => row.lifespan),
        text: showOutliers ? rows.map(row => row.answer) : [],
        type: 'box',
        name: startYear,
        boxpoints: showOutliers ? 'outliers' : false,
        showlegend: false
      })),
      layout: axisLabels('year introduced', 'lifespan')
    });
  });
};

figures.frequencyOverTime = (req, res, next) => {
  const MAX_RESULT_TERMS = 6;
  const searchTerms = cleanSearchText(req.query.search);
  if (searchTerms.length < 1) return next(new Error('Missing search terms!'));

  db.query(`
SELECT
  answer,
  DATE_TRUNC('year', p.date) AS date_bin,
  COUNT(*) as frequency
FROM clues
INNER JOIN puzzles p ON puzzle_id = p.id
WHERE ${searchTerms.map(str => (`answer LIKE '${str}'`)).join(' OR ')}
GROUP BY date_bin, answer;
`, (err, data) => {
    if (err) return next(err);

    const answerRows = analysis.groupRowsBy(data.rows, 'answer');
    const answerSums = analysis.sumRowGroupsBy(data.rows, 'answer', 'frequency');

    const dateRange = [ START_YEAR - 1, END_YEAR + 1 ];
    const years = Array.from({ length: END_YEAR - START_YEAR + 1 }, (val, idx) => (idx + START_YEAR));

    const traces = Object.entries(answerRows)
                    .sort(([a], [b]) => (answerSums[b] - answerSums[a]))  // sort by usage for wildcards and cutoff
                    .slice(0, MAX_RESULT_TERMS)                           // only use the highest usage results
                    .sort(([a], [b]) => (searchTerms.indexOf(a) - searchTerms.indexOf(b)))  // re-sort by search order
                    .map(([answer, rows]) => {
      // build a trace for each answer
      let firstYear = END_YEAR + 2;
      const occurrencesByYear = rows.reduce((counts, row) => {
        const year = row.date_bin.getFullYear();
        if (year < firstYear) firstYear = year;
        counts[year] = +row.frequency;
        return counts;
      }, {});

      const answerYears = years.slice(years.indexOf(firstYear));

      return {
        x: answerYears,
        y: answerYears.map(year => (occurrencesByYear[year] || 0)),
        mode: 'lines',
        line: { shape: 'spline' },
        name: answer
      };
    });

    res.json({
      data: traces,
      layout: { xaxis: { range: dateRange }}
    });
  });
};

figures.usageStats = (req, res, next) => {
  const MAX_RESULT_TERMS = 6;
  const searchTerms = cleanSearchText(req.query.search);
  if (searchTerms.length < 1) return next(new Error('Missing search terms!'));

  db.query(`
SELECT
  answer,
  MIN(DATE_TRUNC('year', p.date)) AS year_introduced,
  COUNT(*) as frequency
FROM clues
INNER JOIN puzzles p ON puzzle_id = p.id
WHERE ${searchTerms.map(str => (`answer LIKE '${str}'`)).join(' OR ')}
GROUP BY answer;
`, (err, data) => {
    if (err) return next(err);

    data.rows.forEach(row => { row.year_introduced = row.year_introduced.getFullYear(); });
    data.rows.sort(numSortBy('frequency', true));

    res.json({
      rows: data.rows,
      columns: [
        { label: 'answer', key: 'answer'},
        { label: 'year introduced', key: 'year_introduced'},
        { label: 'all-time occurrences', key: 'frequency'},
      ]
    });
  });
};

// figures.listTopCrosses = (req, res, next) => {
//   db.query(`
// SELECT
//   c1.answer AS answer1,
//   c2.answer AS answer2,
//   COUNT(*) AS count
// FROM crosses
// INNER JOIN clues c1 ON clue1_id=c1.id
// INNER JOIN clues c2 ON clue2_id=c2.id
// GROUP BY c1.answer, c2.answer
// ORDER BY count DESC, c1.answer, c2.answer
// LIMIT 100;
// `, (err, data) => {
//     if (err) throw err;

//     res.json(data.rows);
//   });
// };

module.exports = figures;