const NotFoundError = require('../exception/NotFoundError');
const authService = require('../services/AuthService');
const userService = require('../services/UserSevice');
const { sendRefreshToken } = require('../utils/auth');

class AuthController {
    async login(req, res, next) {
        const { username, password } = req.body;
        const source = req.headers['user-agent'];

        try {
            const { _id, tokenVersion, errorLoginTime, token } = await authService.login(username, password, source);
            sendRefreshToken(res, { _id, tokenVersion, errorLoginTime, source });
            res.json({ token, _id, tokenVersion, errorLoginTime });
        } catch (err) {
            next(err);
        }
    }

    async registry(req, res, next) {
        try {
            const rs = await authService.registry(req.body);

            res.status(201).json({ user: rs });
        } catch (err) {
            next(err);
        }
    }
    async logout(req, res, next) {
        try {
            if (req._id) {
                const isLogout = await authService.logout(req._id);
                res.clearCookie(process.env.REFRESH_TOKEN_COOKIE_NAME).json({ logout: isLogout });
                // res.json({ logout: isLogout });
            }
        } catch (error) {
            next(error);
        }
    }

    async confirmAccount(req, res, next) {
        const { username, otp } = req.body;

        try {
            await authService.confirmAccount(username, otp + '');

            res.json();
        } catch (err) {
            next(err);
        }
    }

    async resetOTP(req, res, next) {
        const { username } = req.body;
        try {
            const status = await authService.resetOTP(username);

            res.json(status);
        } catch (err) {
            next(err);
        }
    }

    async confirmPassword(req, res, next) {
        const { username, otp, password } = req.body;

        try {
            await authService.resetPassword(username, otp + '', password);

            res.json();
        } catch (err) {
            next(err);
        }
    }

    async getUserInfo(req, res, next) {
        const { username } = req.params;

        try {
            const user = await userService.getUserSummaryInfo(username);

            return res.json(user);
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new AuthController();
