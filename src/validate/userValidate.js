const commonUtils = require('../utils/commonUtils');
const UserError = require('../exception/UserError');
const User = require('../models/User');
const dateUtils = require('../utils/dateUtils');
const bcrypt = require('bcryptjs');

const NAME_INVALID = 'Tên không hợp lệ';
const USERNAME_INVALID = 'Tài khoản không hợp lệ';
const USERNAME_EXISTS_INVALID = 'Tài khoản đã tồn tại';
const PASSWORD_INVALID = 'Mật khẩu không hợp lệ, từ 8 đến 50 kí tự';
const DATE_INVALID = 'Ngày sinh không hợp lệ';
const GENDER_INVALID = 'Giới tính không hợp lệ';
const NAME_REGEX = /\w{1,50}/;

const userValidate = {
 
    validateContact: (phone) => {
        if (!phone) return false;
        const regex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/g;

        return regex.test(phone);
    },
    validateUsername: function (username) {
        if (!username || !this.validatePhone(username)) return false;

        return true;
    },
    // không được trống, 8 <= size <=50
    validatePassword: (password) => {
        if (!password) return false;
        if (password.length < 8 || password.length > 50) return false;

        return true;
    },
    validateBirthDay: (date) => {
        if (!date) return false;

        const { day, month, year } = date;

        if (!day || !month || !year) return false;

        if (year < 1900) return false;

        // check xem có hợp lệ không
        const dateTempt = new Date(`${year}-${month}-${day}`);
        if (dateTempt.toDateString() === 'Invalid Date') return false;

        // check tuổi phải >=10
        const fullyear = dateTempt.getFullYear();
        dateTempt.setFullYear(fullyear + 10);

        if (dateTempt > new Date()) return false;

        return true;
    },
    validateOTP: (otp) => {
        if (!otp) return false;
        const regex = /^[0-9]{6}$/g;

        return regex.test(otp);
    },
    validateLogin: function (username, password) {
        if (!this.validateUsername(username) || !this.validatePassword(password))
            throw new UserError('Info login invalid');
    },
    validateConfirmAccount: function (username, otpPhone) {
        if (!this.validateUsername(username) || !this.validateOTP(otpPhone))
            throw new UserError('Info confirm account invalid');
    },
    validateResetPassword: function (username, otpPhone, password) {
        if (!this.validateUsername(username) || !this.validateOTP(otpPhone) || !this.validatePassword(password))
            throw new UserError('Info reset password invalid');
    },
    validateContactList: function (phones) {
        if (!phones || !Array.isArray(phones)) throw new UserError('Phones invalid');

        phones.forEach((phoneEle) => {
            const { phone, name } = phoneEle;
            if (!name || !phone || !this.validatePhone(phone)) throw new UserError('Phones invalid');
        });
    },
    checkRegistryInfo: async function (userInfo) {
        const { name, username, password } = userInfo;
        const error = {};

        if (!name || !NAME_REGEX.test(name)) error.name = NAME_INVALID;

        if (!this.validateUsername(username)) error.username = USERNAME_INVALID;
        else if (await User.findOne({ username })) error.username = USERNAME_EXISTS_INVALID;

        if (!this.validatePassword(password)) error.password = PASSWORD_INVALID;

        if (!commonUtils.isEmpty(error)) throw new UserError(error);

        return { name, username, password };
    },
    checkProfile: function (profile) {
        const { name, dateOfBirth, gender } = profile;

        const error = {};

        if (!name || !NAME_REGEX.test(name)) error.name = NAME_INVALID;

        if (!this.validateBirthDay(dateOfBirth)) error.dateOfBirth = DATE_INVALID;

        if (gender !== 0 && gender !== 1) error.gender = GENDER_INVALID;

        if (!commonUtils.isEmpty(error)) throw new UserError(error);

        return {
            name,
            birthDay: dateUtils.toDateFromObject(dateOfBirth),
            gender: new Boolean(gender),
        };
    },
    validateEnterPassword: async function (_id, enterPassword) {
        const { password } = await User.checkById(_id);
        const isPasswordMatch = await bcrypt.compare(enterPassword, password);
        if (!isPasswordMatch) throw new UserError('Password wrong');
    },
    validateChangePassword: function (oldPassword, newPassword) {
        if (!this.validatePassword(oldPassword) || !this.validatePassword(newPassword) || oldPassword == newPassword)
            throw new UserError('Body change password invalid');
    },
    validatePhone: (phone) => {
        if (!phone) return false;
        const regex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/g;

        return regex.test(phone);
    },
    validateBirthDay: (date) => {
        if (!date) return false;

        const { day, month, year } = date;

        if (!day || !month || !year) return false;

        if (year < 1900) return false;

        // check xem có hợp lệ không
        const dateTempt = new Date(`${year}-${month}-${day}`);
        if (dateTempt.toDateString() === 'Invalid Date') return false;

        // check tuổi phải >=10
        const fullyear = dateTempt.getFullYear();
        dateTempt.setFullYear(fullyear + 10);

        if (dateTempt > new Date()) return false;

        return true;
    },
};

module.exports = userValidate;
