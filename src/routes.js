const puzzles = require('./controllers/puzzles');
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
    path: 'clues/:answer',
    controller: clues.get,
    description: 'list all clues with a given answer'
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
