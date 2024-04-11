const User = require('../models/User');
const commonUtils = require('../utils/commonUtils');
const userValidate = require('../validate/userValidate');
const NotFoundError = require('../exception/NotFoundError');
const apiKey= process.env.PHONE_API_KEY;
const deviceKey = process.env.DEVICE_SEND;
const OTP_EXPIRE_MINUTE = 1;
const { createToken, sendRefreshToken } = require('../utils/auth');
const { default: axios } = require('axios');
const TypeToken = {
    ACCESS_TOKEN: 'accessToken',
    REFRESTH_TOKEN: 'refreshToken',
};
const COLORS = ['white', 'blue', 'green', 'violet', 'pink'];

class AuthService {
    async login(username, password, source) {
        userValidate.validateLogin(username, password);
        const { _id, tokenVersion, errorLoginTime } = await User.findUser(username, password);

        return await this.generateToken(_id, tokenVersion, errorLoginTime, source);
    }

    async generateToken(_id, tokenVersion, errorLoginTime, source) {
        const token = await createToken(TypeToken.ACCESS_TOKEN, { _id, tokenVersion, errorLoginTime, source });

        return {
            token,
            _id,
            tokenVersion,
            errorLoginTime,
        };
    }

    async registry(dataUser) {
        const data = await userValidate.checkRegistryInfo(dataUser);

        const color = COLORS[Math.floor(Math.random() * (COLORS.length - 1))];
        const avatarColor = color;
        const newUser = new User({
            ...data,
            avatarColor,
            // chua otp
            isActived: false,
        });

        const saveUser = await newUser.save();

        const { _id, username } = saveUser;
        this.sendOTP(_id, username);
    }

    async logout(userId) {
        const isLogout = await User.logout(userId);
        return isLogout;
    }

    async confirmAccount(username, otpPhone) {
        await userValidate.validateConfirmAccount(username, otpPhone);

        const user = await User.findOne({
            username,
            isActived: false,
        });
        if (!user) throw new NotFoundError('User');

        const { otp, otpTime } = user;
        this.checkOTP(otpPhone, otp, otpTime);

        await User.updateOne({ username }, { isActived: true, otp: null, otpTime: null });
    }

    async resetOTP(username) {
        if (!userValidate.validateUsername(username)) throw new UserError('Username invalid');
        const user = await User.findOne({ username });

        if (!user) throw new NotFoundError('User');

        const { _id } = user;
        await this.sendOTP(_id, username);

        return {
            status: user.isActived,
        };
    }

    async resetPassword(username, otpPhone, password) {
        userValidate.validateResetPassword(username, otpPhone, password);

        const user = await User.findOne({
            username,
            isActived: true,
        });
        if (!user) throw new NotFoundError('User');

        const { otp, otpTime } = user;

        this.checkOTP(otpPhone, otp, otpTime);

        const hashPassword = await commonUtils.hashPassword(password);

        await User.updateOne({ username }, { password: hashPassword });
    }

    async sendOTP(_id, username) {
        // if (userValidate.validatePhone(username)) type = false;

        const otp = commonUtils.getRandomOTP();
        const otpTime = new Date();
        otpTime.setMinutes(otpTime.getMinutes() + OTP_EXPIRE_MINUTE);
        await User.updateOne({ _id }, { otp, otpTime });

        console.log('OTP : ', otp);
        console.log('test', process.env.PHONE_OTP_API_URL);
        const params = {
            secret: apiKey, // your API secret from (Tools -> API Keys) page
            mode: 'devices',
            device: deviceKey,
            sim: 1,
            priority: 1,
            phone: `+84${username.slice(1, 10)}`,
            message: `Ma OTP cua ban la ${otp} (${OTP_EXPIRE_MINUTE} phut)`,
        };
        try {
            const res = await axios.post('https://sms.uncgateway.com/api/send/sms', null, { params });

            console.log(res.data);
            console.log(otp);
        } catch (error) {
            console.log(error);
        }
    }

    checkOTP(confirmOtp, currentOtp, expOtp) {
        if (!currentOtp) throw new UserError('OTP không hợp lệ');

        if (new Date() > expOtp) throw new UserError('OTP đã hết hạn');

        if (confirmOtp !== currentOtp) throw new UserError('OTP không hợp lệ');
    }
}

module.exports = new AuthService();
