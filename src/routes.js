const fs = require('fs');
const path = require('path');
const figures = require('./controllers/figures');
const { dashCaseToWords } = require('./util/base');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const articles = fs.readdirSync(path.join(__dirname, 'views/articles'))
                    .map(filename => path.basename(filename, '.ejs'))
                    .filter(filename => (
                      !path.extname(filename) &&
                      !(IS_PRODUCTION && filename.match(/^unpublished-/)))
                    )
                    .map(filename => ({
                      title: dashCaseToWords(filename),
                      filename
                    }));

function routes(app) {
  app.get('/api/figures/mostFrequentAnswers', figures.mostFrequentAnswers);
  app.get('/api/figures/lengthFrequency', figures.lengthFrequency);
  app.get('/api/figures/lengthFrequencyCorrelations', figures.lengthFrequencyCorrelations);
  app.get('/api/figures/lengthFrequencyPmfLengthConditionals', figures.lengthFrequencyPmfLengthConditionals);
  app.get('/api/figures/lengthFrequencyPmfLengthMarginal', figures.lengthFrequencyPmfLengthMarginal);
  app.get('/api/figures/lengthTypesAndTokens', figures.lengthTypesAndTokens);
  app.get('/api/figures/lengthTypesAndTokensCombined', figures.lengthTypesAndTokensCombined);
  app.get('/api/figures/mostFrequentLongAnswers', figures.mostFrequentLongAnswers);
  app.get('/api/figures/relativeFrequencyDifference', figures.relativeFrequencyDifference);
  app.get('/api/figures/keyness', figures.keyness);
  app.get('/api/figures/answerClues', figures.answerClues);
  app.get('/api/figures/keynessPerYear', figures.keynessPerYear);
  app.get('/api/figures/rankFrequencyEn', figures.rankFrequencyEn);
  app.get('/api/figures/decorrelatedRankFrequencyEn', figures.decorrelatedRankFrequencyEn);
  app.get('/api/figures/decorrelatedRankFrequency', figures.decorrelatedRankFrequency);
  app.get('/api/figures/rankFrequencyNumericals', figures.rankFrequencyNumericals);
  app.get('/api/figures/vowelCountFrequency', figures.vowelCountFrequency);
  app.get('/api/figures/vowelPlacement', figures.vowelPlacement);
  app.get('/api/figures/letterCounts', figures.letterCounts);
  app.get('/api/figures/letterScoreFrequency', figures.letterScoreFrequency);
  app.get('/api/figures/vowelPositions', figures.vowelPositions);
  app.get('/api/figures/vowelsByLength', figures.vowelsByLength);
  app.get('/api/figures/answerStartsGrid', figures.answerStartsGrid);
  app.get('/api/figures/vowelsGrid', figures.vowelsGrid);
  app.get('/api/figures/topLeftAnswers', figures.topLeftAnswers);
  app.get('/api/figures/dictionarySizeOverTime', figures.dictionarySizeOverTime);
  app.get('/api/figures/uniqueAnswersOverTime', figures.uniqueAnswersOverTime);
  app.get('/api/figures/countBirthsDeathsOverTime', figures.countBirthsDeathsOverTime);
  app.get('/api/figures/mostRecentNewWords', figures.mostRecentNewWords);
  app.get('/api/figures/oldestDeadWords', figures.oldestDeadWords);
  app.get('/api/figures/topNewWordsByYear', figures.topNewWordsByYear);
  app.get('/api/figures/frequencyOverTime', figures.frequencyOverTime);
  app.get('/api/figures/wordLongevity', figures.wordLongevity);
  app.get('/api/figures/usageStats', figures.usageStats);

  app.get('/', (req, res, next) => res.render('index', { articles }));

  articles.forEach(article => {
    app.get(`/${article.filename}`, forceHttps, (req, res, next) => res.render('article-template', article));
  });

  app.get('/answer-stats', forceHttps, (req, res, next) => res.render('answer-stats'));
}

const forceHttps = (req, res, next) => {
  if (IS_PRODUCTION && req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
};

module.exports = routes;
