const { db } = require('../../config');

const query = {};

query.promiseQuery = (query) => {
  return new Promise((resolve, reject) => {
    db.query(query, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data.rows);
      }
    });
  });
};

module.exports = query;