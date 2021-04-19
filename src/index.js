const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');

const routes = require('./routes');

const app = express();
app.use(express.static(__dirname + '/public'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

routes(app);

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server listening`)
});