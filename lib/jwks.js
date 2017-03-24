const jwt = require('jsonwebtoken');

module.exports = async (provider, token) => {
  const { header: {alg, kid} } = jwt.decode(token, { complete: true });
console.log({alg, kid});
  return provider({alg, kid});
}
