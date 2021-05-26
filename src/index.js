const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const compression = require('compression');

const routes = require('./routes');


const app = express();

app.set('view engine', 'ejs');
app.set('views', './src/views');

app.get('*.js.gz', function (req, res, next) {
  res.set('Content-Encoding', 'gzip');
  res.set('Content-Type', 'text/javascript');
  next();
});
app.get('*.js.br', function (req, res, next) {
  res.set('Content-Encoding', 'br');
  res.set('Content-Type', 'text/javascript');
  next();
});
const compressedExtensions = /.*\.js\.(gz|br)$/g;

app.use(compression({
  filter: (req, res) => {
    if (compressedExtensions.test(req.url)) return false;
    return compression.filter(req, res);
  }
}));
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

routes(app);

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server listening`)
});