const { sign } = require('jsonwebtoken');

const createToken = (type, data) => {
    switch (type) {
        case 'accessToken':
            return sign(
                {
                    ...data,
                },
                process.env.ACCESS_TOKEN_SECRET,
                {
                    expiresIn: process.env.JWT_EXPRIED_ACCESS_TOKEN,
                },
            );
        case 'refreshToken':
            return sign(
                {
                    ...data,
                },
                process.env.REFRESH_TOKEN_SECRET,
                {
                    expiresIn: process.env.JWT_EXPRIED_REFRESH_TOKEN,
                },
            );
    }
};

const sendRefreshToken = (res, data) => {
    const refreshToken = createToken('refreshToken', data);

    res.cookie(process.env.REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/refresh_token',
    });
};

module.exports = { createToken, sendRefreshToken };
