const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const routes = require('./routes');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

routes(app);

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server listening`)
});