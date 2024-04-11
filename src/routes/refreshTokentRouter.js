const { verify } = require('jsonwebtoken');
const User = require('../models/User');
const { createToken, sendRefreshToken } = require('../utils/auth');

const router = require('express').Router();

router.get('/', async (req, res) => {
    const source = req.headers['user-agent'];
    const refreshToken = req.cookies[process.env.REFRESH_TOKEN_COOKIE_NAME];
    if (!refreshToken) return res.status(401).json();

    try {
        const decodedUser = verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        const existingUser = await User.findOne({
            _id: decodedUser._id,
            isDeleted: false,
        });

        if (!existingUser || existingUser.tokenVersion !== decodedUser.tokenVersion) return res.status(401).json();
        const { _id, tokenVersion, errorLoginTime } = existingUser;
        sendRefreshToken(res, { _id, tokenVersion, errorLoginTime, source });

        return res.json({
            success: true,
            accessToken: createToken('accessToken', { _id, tokenVersion, errorLoginTime, source }),
        });
    } catch (error) {
        console.log('ERROR REFRESHING TOKEN', error);
        return res.status(403).json();
    }
});

module.exports = router;
