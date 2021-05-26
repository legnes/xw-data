// const puzzles = require('./controllers/puzzles');
// const answers = require('./controllers/answers');
// const crosses = require('./controllers/crosses');
// const clues = require('./controllers/clues');
const fs = require('fs');
const path = require('path');
const figures = require('./controllers/figures');
const { dashCaseToWords } = require('./util/base');

// const articles = [
//   'topic',
//   'common-answers-and-word-length'
// ];

const articles = fs.readdirSync(path.join(__dirname, 'views/articles'))
                    .map(filename => path.basename(filename, '.ejs'))
                    .filter(filename => (
                      !path.extname(filename) &&
                      !(process.env.NODE_ENV === 'production' && filename.match(/^unpublished-/)))
                    );

// const apiRoutes = [
//   {
//     path: 'test',
//     controller: answers.topWordsPerYear,
//     description: 'test route'
//   },
//   {
//     path: 'puzzles',
//     controller: puzzles.list,
//     description: 'list all puzzles'
//   },
//   {
//     path: 'puzzles/:id',
//     controller: puzzles.get,
//     description: 'list a puzzle\'s metadata'
//   },
//   {
//     path: 'puzzles/:id/answers',
//     controller: puzzles.getAnswers,
//     description: 'list a puzzle\'s answers'
//   },
//   {
//     path: 'answers/:answer',
//     controller: answers.get,
//     description: 'list all clues with a given answer'
//   },
//   {
//     path: 'stats/answers/top',
//     controller: answers.listTopAnswers,
//     description: 'list top used answers'
//   },
//   {
//     path: 'stats/answers/direction',
//     controller: answers.listTopDirectionRatio,
//     description: 'list answers that are more across or down'
//   },
//   {
//     path: 'stats/answers/location',
//     controller: answers.listTopLocationBias,
//     description: 'list answers that are more likely to be found in a given quadrant'
//   },
//   {
//     path: 'stats/clues/top',
//     controller: clues.listTopClues,
//     description: 'list top used verbatim clues'
//   },
//   {
//     path: 'stats/clues/top',
//     controller: clues.listTopClueWords,
//     description: 'list most common clue words'
//   },
//   {
//     path: 'stats/clues/answers',
//     controller: clues.listTopClueWordsWithTheSameAnswers,
//     description: 'list most common clue word X answer combos'
//   },
//   {
//     path: 'stats/clues/bogus',
//     controller: clues.listBogusClues,
//     description: 'list clues with no text or undefined answer'
//   },
//   {
//     path: 'stats/crosses/top',
//     controller: crosses.listTopCrosses,
//     description: 'list most common crosses'
//   },
// ];

function routes(app) {
  app.get('/api/figures/rankFrequency', figures.rankFrequency);
  app.get('/api/figures/rankFrequencySwadesh', figures.rankFrequencySwadesh);
  app.get('/api/figures/rankFrequencyNumericals', figures.rankFrequencyNumericals);
  app.get('/api/figures/decorrelatedRankFrequency', figures.decorrelatedRankFrequency);
  app.get('/api/figures/decorrelatedRankFrequencyError', figures.decorrelatedRankFrequencyError);
  app.get('/api/figures/rankFrequencyRandom', figures.rankFrequencyRandom);
  app.get('/api/figures/decorrelatedRankFrequencyRandom', figures.decorrelatedRankFrequencyRandom);
  app.get('/api/figures/rankFrequencyEn', figures.rankFrequencyEn);
  app.get('/api/figures/decorrelatedRankFrequencyEn', figures.decorrelatedRankFrequencyEn);
  app.get('/api/figures/decorrelatedRankFrequencyErrorEn', figures.decorrelatedRankFrequencyErrorEn);
  app.get('/api/figures/tokenTypesOverTime', figures.tokenTypesOverTime);
  app.get('/api/figures/tokenTypesOverTimeError', figures.tokenTypesOverTimeError);
  app.get('/api/figures/tokenTypesOverSections', figures.tokenTypesOverSections);
  app.get('/api/figures/frequencyOverTime', figures.frequencyOverTime);
  app.get('/api/figures/lengthByDirection', figures.lengthByDirection);
  app.get('/api/figures/lengthByDayOfWeek', figures.lengthByDayOfWeek);
  app.get('/api/figures/lengthByPuzzleSize', figures.lengthByPuzzleSize);
  app.get('/api/figures/authorCounts', figures.authorCounts);
  app.get('/api/figures/keynessPerYear', figures.keynessPerYear);
  app.get('/api/figures/topNewWordsByYear', figures.topNewWordsByYear);
  app.get('/api/figures/mostRecentNewWords', figures.mostRecentNewWords);
  app.get('/api/figures/oldestDeadWords', figures.oldestDeadWords);
  app.get('/api/figures/countBirthsDeathsOverTime', figures.countBirthsDeathsOverTime);
  app.get('/api/figures/countBirthsDeathsOverTimeErrors', figures.countBirthsDeathsOverTimeErrors);
  app.get('/api/figures/dictionarySizeOverTime', figures.dictionarySizeOverTime);
  app.get('/api/figures/wordLongevity', figures.wordLongevity);
  app.get('/api/figures/keyness', figures.keyness);
  app.get('/api/figures/relativeFrequencyDifference', figures.relativeFrequencyDifference);
  app.get('/api/figures/lengthTypesAndTokens', figures.lengthTypesAndTokens);
  app.get('/api/figures/lengthTypesAndTokensCombined', figures.lengthTypesAndTokensCombined);
  app.get('/api/figures/mostFrequentLongAnswers', figures.mostFrequentLongAnswers);
  app.get('/api/figures/lengthFrequency', figures.lengthFrequency);
  app.get('/api/figures/lengthFrequencyCorrelations', figures.lengthFrequencyCorrelations);
  app.get('/api/figures/lengthFrequencyEn', figures.lengthFrequencyEn);
  app.get('/api/figures/lengthFrequencyCorrelationsEn', figures.lengthFrequencyCorrelationsEn);
  app.get('/api/figures/lengthFrequencyPmfLengthMarginal', figures.lengthFrequencyPmfLengthMarginal);
  app.get('/api/figures/lengthFrequencyPmfFrequencyMarginal', figures.lengthFrequencyPmfFrequencyMarginal);
  app.get('/api/figures/lengthFrequencyPmfLengthConditionals', figures.lengthFrequencyPmfLengthConditionals);
  app.get('/api/figures/lengthFrequencyPmfLengthConditionalsEn', figures.lengthFrequencyPmfLengthConditionalsEn);
  app.get('/api/figures/answerClues', figures.answerClues);
  app.get('/api/figures/simulateHerdan', figures.simulateHerdan);
  app.get('/api/figures/blockSquaresHeatMap', figures.blockSquaresHeatMap);
  app.get('/api/figures/answerStartHeatMap', figures.answerStartHeatMap);
  app.get('/api/figures/answerLengthHeatMap', figures.answerLengthHeatMap);
  app.get('/api/figures/answerRepetitionHeatMap', figures.answerRepetitionHeatMap);
  app.get('/api/figures/letterCounts', figures.letterCounts);
  app.get('/api/figures/letterFrequencyComparison', figures.letterFrequencyComparison);
  app.get('/api/figures/letterScoreFrequency', figures.letterScoreFrequency);
  app.get('/api/figures/vowelCountFrequency', figures.vowelCountFrequency);
  app.get('/api/figures/vowelPlacement', figures.vowelPlacement);
  app.get('/api/figures/vowelPlacementFrequency', figures.vowelPlacementFrequency);
  app.get('/api/figures/mostFrequentAnswers', figures.mostFrequentAnswers);
  app.get('/api/figures/vowelsByLength', figures.vowelsByLength);

  // apiRoutes.forEach(({ path, controller }) => {
  //   app.get(`/api/${path}`, controller);
  // });

  // app.get('/api', (req, res, next) => {
  //   res.json(apiRoutes.map(({ path, description }) => ({
  //     route: `/api/${path}`,
  //     description
  //   })));
  // });

  app.get('/', (req, res, next) => res.render('index', { articles }));

  articles.forEach(article => {
    app.get(`/${article}`, (req, res, next) => res.render('article-template', {
      title: dashCaseToWords(article),
      article
    }));
  });
}

module.exports = routes;
