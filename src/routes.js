const puzzles = require('./controllers/puzzles');
const clues = require('./controllers/clues');
const crosses = require('./controllers/crosses');

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
    path: 'clues/:answer',
    controller: clues.get,
    description: 'list all clues with a given answer'
  },
  {
    path: 'stats/clues/top',
    controller: clues.listTopInstances,
    description: 'list top used answers'
  },
  {
    path: 'stats/clues/direction',
    controller: clues.listTopDirectionRatio,
    description: 'list answers that are more across or down'
  },
  {
    path: 'stats/clues/location',
    controller: clues.listTopLocationBias,
    description: 'list answers that are more likely to be found in a given quadrant'
  },
  {
    path: 'stats/crosses/top',
    controller: crosses.listTopInstances,
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
