const { decode } = require('jsonwebtoken');

module.exports = async (provider, token) => {
  const { header } = decode(token, { complete: true });

  return provider(header);
}
