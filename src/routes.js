const puzzles = require('./controllers/puzzles');
const clues = require('./controllers/clues');

function routes(app) {
  app.get('/puzzles', puzzles.list);
  app.get('/puzzles/:id/answers', puzzles.get);
  app.get('/clues/:answer', clues.get);
}

module.exports = routes;
