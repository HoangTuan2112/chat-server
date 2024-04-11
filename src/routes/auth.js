const router = require('express').Router();
const authController = require('../controller/AuthController');

const checkAuth = require('../middleware/checkAuth');

router.post('/login', authController.login);
router.post('/registry', authController.registry);
router.post('/logout', checkAuth, authController.logout);
router.post('/confirm', authController.confirmAccount);
router.post('/reset-otp', authController.resetOTP);
router.post('/confirm-password', authController.confirmPassword);
router.get('/users/:username', authController.getUserInfo);
module.exports = router;
