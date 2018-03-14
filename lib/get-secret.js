const { decode } = require('jsonwebtoken');

module.exports = async (provider, token) => {
    const decoded = decode(token, { complete: true });

    if (!decoded || !decoded.header) {
        throw new Error('Invalid token');
    }

    return provider(decoded.header, decoded.payload);
};
