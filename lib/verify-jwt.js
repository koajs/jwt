const JWT = require('jsonwebtoken');
const Promise = require('any-promise');

module.exports = function(token, secret, opts) {
  return new Promise((resolve, reject) => {
    JWT.verify(token, secret, opts, (err, decoded) => {
      if (err) {
        reject(err);
      }
      resolve(decoded);
    });
  });
}
