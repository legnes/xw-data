const puzzles = require('./controllers/puzzles');
const clues = require('./controllers/clues');

const routesConfig = [
  {
    path: '/puzzles',
    controller: puzzles.list,
    description: 'list all puzzles'
  },
  {
    path: '/puzzles/:id/answers',
    controller: puzzles.get,
    description: 'list a puzzle\'s answers'
  },
  {
    path: '/clues/:answer',
    controller: clues.get,
    description: 'list all clues with a given answer'
  },
];

function routes(app) {
  routesConfig.forEach((routeConfig) => {
    app.get(routeConfig.path, routeConfig.controller);
  });

  app.get('/', (req, res, next) => {
    res.json(routesConfig.map((routeConfig) => ({
      route: routeConfig.path,
      description: routeConfig.description
    })));
  });
}

module.exports = routes;
