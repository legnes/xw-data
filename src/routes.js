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
    path: 'puzzles/:id/answers',
    controller: puzzles.get,
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
    path: 'stats/crosses/top',
    controller: crosses.listTopCrosses,
    description: 'list most common crosses'
  },
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
