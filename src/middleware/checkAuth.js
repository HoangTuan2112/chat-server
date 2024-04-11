const { verify } = require('jsonwebtoken');

const checkAuth = async (req, res, next) => {
    try {
        const source = req.headers['user-agent'];
        const authHeader = req.header('Authorization');
        const accessToken = authHeader && authHeader.split(' ')[1];
        if (!accessToken) throw new AuthenticationError('not authorization');
        const decodedUser = verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

        req._id = decodedUser._id;

        return next();
    } catch (error) {
        res.status(401).send({
            status: 401,
            error: 'Not authorized',
        });
    }
};

module.exports = checkAuth;
