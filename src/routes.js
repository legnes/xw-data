const puzzles = require('./controllers/puzzles');
const answers = require('./controllers/answers');
const crosses = require('./controllers/crosses');
const clues = require('./controllers/clues');

const apiRoutes = [
  {
    path: 'puzzles',
    controller: puzzles.list,
    description: 'list all puzzles'
  },
  {
    path: 'puzzles/:id',
    controller: puzzles.get,
    description: 'list a puzzle\'s metadata'
  },
  {
    path: 'puzzles/:id/answers',
    controller: puzzles.getAnswers,
    description: 'list a puzzle\'s answers'
  },
  {
    path: 'answers/:answer',
    controller: answers.get,
    description: 'list all clues with a given answer'
  },
  {
    path: 'stats/answers/top',
    controller: answers.listTopAnswers,
    description: 'list top used answers'
  },
  {
    path: 'stats/answers/direction',
    controller: answers.listTopDirectionRatio,
    description: 'list answers that are more across or down'
  },
  {
    path: 'stats/answers/location',
    controller: answers.listTopLocationBias,
    description: 'list answers that are more likely to be found in a given quadrant'
  },
  {
    path: 'stats/clues/top',
    controller: clues.listTopClues,
    description: 'list top used verbatim clues'
  },
  {
    path: 'stats/clues/top',
    controller: clues.listTopClueWords,
    description: 'list most common clue words'
  },
  {
    path: 'stats/clues/answers',
    controller: clues.listTopClueWordsWithTheSameAnswers,
    description: 'list most common clue word X answer combos'
  },
  {
    path: 'stats/clues/bogus',
    controller: clues.listBogusClues,
    description: 'list clues with no text or undefined answer'
  },
  {
    path: 'stats/crosses/top',
    controller: crosses.listTopCrosses,
    description: 'list most common crosses'
  },
  {
    path: 'stats/answers/lengthTokens',
    controller: answers.lengthOccurrenceDistribution,
    description: 'get counts of how many tokens there are for each length of answer'
  },
  {
    path: 'stats/answers/lengthTypes',
    controller: answers.lengthDictionaryDistribution,
    description: 'get counts of how many types there are for each length of answer'
  },
  // {
  //   path: 'stats/answers/rankFrequency',
  //   controller: answers.rankFrequency,
  //   description: 'for each word, get its rank (nth most frequent) and overall frequency'
  // },
  // {
  //   path: 'stats/answers/rankFrequencyDecorrelated',
  //   controller: answers.decorrelatedRankFrequency,
  //   description: 'for each word, get its decorrelated rank (nth most frequent) and overall frequency'
  // },
  // {
  //   path: 'stats/answers/rankFrequencyDecorrelatedHistogram',
  //   controller: answers.decorrelatedRankFrequencyHistogram,
  //   description: 'for each word, get its decorrelated rank (nth most frequent) and overall frequency'
  // },
  // {
  //   path: 'stats/answers/rankFrequencyDecorrelatedErrorHistogram',
  //   controller: answers.decorrelatedRankFrequencyErrorHistogram,
  //   description: 'for each word, get its decorrelated rank (nth most frequent) and overall frequency'
  // },
  {
    path: 'stats/answers/rankFrequency',
    controller: answers.rankFrequency,
    description: 'for each word, get its rank (nth most frequent) and overall frequency'
  },
  {
    path: 'stats/answers/rankFrequencySwadesh',
    controller: answers.rankFrequencySwadesh,
    description: 'for each swadesh word, get its english rank (nth most frequent) and overall xw answer frequency'
  },
  {
    path: 'stats/answers/rankFrequencyNumericals',
    controller: answers.rankFrequencyNumericals,
    description: 'for each numerical word, get its english rank (nth most frequent) and overall xw answer frequency'
  },
  {
    path: 'stats/answers/decorrelatedRankFrequency',
    controller: answers.decorrelatedRankFrequency,
    description: 'for each word, get its decorrelated rank (nth most frequent) and overall frequency'
  },
  {
    path: 'stats/answers/decorrelatedRankFrequencyError',
    controller: answers.decorrelatedRankFrequencyError,
    description: 'for each word, get its decorrelated rank (nth most frequent) and overall frequency errors'
  },
  {
    path: 'stats/answers/rankFrequencyRandom',
    controller: answers.rankFrequencyRandom,
    description: 'for each word in a random corpus, get its rank (nth most frequent) and overall frequency'
  },
  {
    path: 'stats/answers/decorrelatedRankFrequencyRandom',
    controller: answers.decorrelatedRankFrequencyRandom,
    description: 'for each word in a random corpus, get its decorrelated rank (nth most frequent) and overall frequency'
  },
  {
    path: 'stats/answers/rankFrequencyEn',
    controller: answers.rankFrequencyEn,
    description: 'for each word in english corpus, get its rank (nth most frequent) and overall frequency'
  },
  {
    path: 'stats/answers/decorrelatedRankFrequencyEn',
    controller: answers.decorrelatedRankFrequencyEn,
    description: 'for each word in a english corpus, get its decorrelated rank (nth most frequent) and overall frequency'
  },
  {
    path: 'stats/answers/decorrelatedRankFrequencyErrorEn',
    controller: answers.decorrelatedRankFrequencyErrorEn,
    description: 'for each word in a english corpus, get its decorrelated rank (nth most frequent) and overall frequency errors'
  },
  {
    path: 'stats/answers/tokenTypesOverTime',
    controller: answers.tokenTypesOverTime,
    description: 'for several chunks of time, get the cumulative tokens vs types'
  },
  {
    path: 'stats/answers/tokenTypesOverTimeError',
    controller: answers.tokenTypesOverTimeError,
    description: 'for several chunks of time, get the cumulative tokens vs types error from herdan fit'
  },
  // {
  //   path: 'stats/answers/tokenTypesOverTimeAnalysis',
  //   controller: answers.tokenTypesOverTimeAnalysis,
  //   description: 'for several chunks of time, get the cumulative tokens vs types statistical analysis'
  // },
  {
    path: 'stats/answers/tokenTypesOverSections',
    controller: answers.tokenTypesOverSections,
    description: 'for several chunks of time, get the cumulative tokens vs types'
  },
  {
    path: 'stats/answers/frequencyOverTime',
    controller: answers.frequencyOverTime,
    description: 'for a given comma-separated bunch of words/wildcards, get their frequency year by year. query param "search"'
  },
  {
    path: 'stats/answers/lengthByDirection',
    controller: answers.lengthByDirection,
    description: 'answer length distributions for directions'
  },
  {
    path: 'stats/answers/lengthByDayOfWeek',
    controller: answers.lengthByDayOfWeek,
    description: 'answer length distributions for days of the week'
  },
  {
    path: 'stats/answers/lengthByPuzzleSize',
    controller: answers.lengthByPuzzleSize,
    description: 'answer length distributions for puzzle sizes'
  },
  {
    path: 'stats/puzzles/authorCounts',
    controller: puzzles.authorCounts,
    description: 'cumulative puzzles penned by cumulative authors'
  },
  {
    path: 'stats/answers/keynessPerYear',
    controller: answers.keynessPerYear,
    description: 'key words per year'
  },
  {
    path: 'stats/answers/topNewWordsByYear',
    controller: answers.topNewWordsByYear,
    description: 'for each year, some high-frequency words introduced that year'
  },
  {
    path: 'stats/answers/mostRecentNewWords',
    controller: answers.mostRecentNewWords,
    description: 'most recent words to be introduced'
  },
  {
    path: 'stats/answers/oldestDeadWords',
    controller: answers.oldestDeadWords,
    description: 'oldest words never to appear again'
  },
  {
    path: 'stats/answers/countBirthsDeathsOverTime',
    controller: answers.countBirthsDeathsOverTime,
    description: 'words introduced/died over time'
  },
  {
    path: 'stats/answers/countBirthsDeathsOverTimeErrors',
    controller: answers.countBirthsDeathsOverTimeErrors,
    description: 'words introduced/died over time'
  },
  {
    path: 'stats/answers/dictionarySizeOverTime',
    controller: answers.dictionarySizeOverTime,
    description: 'distinct words used over time'
  },
  {
    path: 'stats/answers/wordLongevity',
    controller: answers.wordLongevity,
    description: 'histogram of word lifespan lengths'
  },
  {
    path: 'stats/answers/keyness',
    controller: answers.keyness,
    description: 'words with high keyness compared to an english corpus'
  },
  {
    path: 'stats/answers/relativeFrequencyDifference',
    controller: answers.relativeFrequencyDifference,
    description: 'words with high relative frequency differences'
  },
  {
    path: 'stats/answers/lengthTypesAndTokens',
    controller: answers.lengthTypesAndTokens,
    description: 'get counts of how many types and tokens there are for each length of answer in english corpus'
  },
  {
    path: 'stats/answers/lengthTypesAndTokensCombined',
    controller: answers.lengthTypesAndTokensCombined,
    description: 'get counts of how many types and tokens there are for each length of answer for both xw and en'
  },
  {
    path: 'stats/answers/mostFrequentLongAnswers',
    controller: answers.mostFrequentLongAnswers,
    description: 'gets most frequent answers of length > ??? TODO: Make this variable'
  },
  {
    path: 'stats/answers/lengthFrequency',
    controller: answers.lengthFrequency,
    description: 'gets most type length vs frequency histogram'
  },
  {
    path: 'stats/answers/lengthFrequencyCorrelations',
    controller: answers.lengthFrequencyCorrelations,
    description: 'gets correlation stats for type length vs frequency'
  },
  {
    path: 'stats/answers/lengthFrequencyEn',
    controller: answers.lengthFrequencyEn,
    description: 'gets most type length vs frequency histogram'
  },
  {
    path: 'stats/answers/lengthFrequencyCorrelationsEn',
    controller: answers.lengthFrequencyCorrelationsEn,
    description: 'gets correlation stats for type length vs frequency'
  },
  {
    path: 'stats/answers/lengthFrequencyPmfLengthMarginal',
    controller: answers.lengthFrequencyPmfLengthMarginal,
    description: 'gets length marginal for length vs frequency pmf'
  },
  {
    path: 'stats/answers/lengthFrequencyPmfFrequencyMarginal',
    controller: answers.lengthFrequencyPmfFrequencyMarginal,
    description: 'gets frequency marginal for length vs frequency pmf'
  },
  {
    path: 'stats/answers/lengthFrequencyPmfLengthConditionals',
    controller: answers.lengthFrequencyPmfLengthConditionals,
    description: 'gets length-conditional distributions for length vs frequency pmf'
  },
  {
    path: 'stats/answers/lengthFrequencyPmfLengthConditionalsEn',
    controller: answers.lengthFrequencyPmfLengthConditionalsEn,
    description: 'gets length-conditional distributions for length vs frequency pmf for english corpus'
  },
  {
    path: 'stats/answers/answerClues',
    controller: answers.answerClues,
    description: 'gets clues for an answer'
  },
  {
    path: 'stats/answers/simulateHerdan',
    controller: answers.simulateHerdan,
    description: 'Simulates herdan\'s law given corpus size N and zipf power s'
  },
  {
    path: 'stats/answers/blockSquaresHeatMap',
    controller: answers.blockSquaresHeatMap,
    description: ''
  },
  {
    path: 'stats/answers/answerStartHeatMap',
    controller: answers.answerStartHeatMap,
    description: ''
  },
  {
    path: 'stats/answers/answerLengthHeatMap',
    controller: answers.answerLengthHeatMap,
    description: ''
  },
  {
    path: 'stats/answers/answerRepetitionHeatMap',
    controller: answers.answerRepetitionHeatMap,
    description: ''
  },
  {
    path: 'test',
    controller: answers.topNewWordsByYear,
    description: 'test route'
  }
];

function routes(app) {
  apiRoutes.forEach(({ path, controller }) => {
    app.get(`/api/${path}`, controller);
  });

  app.get('/api', (req, res, next) => {
    res.json(apiRoutes.map(({ path, description }) => ({
      route: `/api/${path}`,
      description
    })));
  });
}

module.exports = routes;
