const jwt = require('jsonwebtoken');

module.exports = async (ctx, secretCallback, token) => {
  const dtoken = jwt.decode(token, { complete: true });

  return new Promise((resolve, reject) => {
    secretCallback(ctx.req, dtoken.header, dtoken.payload, (err, secret) => {
      if(err)
        return reject(err);
      resolve(secret);
    });
  });
}
