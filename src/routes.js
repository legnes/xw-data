const puzzles = require('./controllers/puzzles');
const clues = require('./controllers/clues');
const crosses = require('./controllers/crosses');
const clueWords = require('./controllers/clueWords');

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
    controller: clues.get,
    description: 'list all clues with a given answer'
  },
  {
    path: 'stats/answers/top',
    controller: clues.listTopAnswers,
    description: 'list top used answers'
  },
  {
    path: 'stats/answers/direction',
    controller: clues.listTopDirectionRatio,
    description: 'list answers that are more across or down'
  },
  {
    path: 'stats/answers/location',
    controller: clues.listTopLocationBias,
    description: 'list answers that are more likely to be found in a given quadrant'
  },
  {
    path: 'stats/clues/top',
    controller: clues.listTopClues,
    description: 'list top used clues'
  },
  {
    path: 'stats/crosses/top',
    controller: crosses.listTopCrosses,
    description: 'list most common crosses'
  },
  {
    path: 'stats/clueWords/top',
    controller: clueWords.listTopAnswerWords,
    description: 'list most common clue word X answer combos'
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
