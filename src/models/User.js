const bcrypt = require('bcryptjs');
const UserError = require('../exception/UserError');
const NotFoundError = require('../exception/NotFoundError');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const dateUtils = require('../utils/dateUtils');
const ObjectId = mongoose.Types.ObjectId;
const userSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        username: {
            type: String,
            required: true,
            trim: true,
            unique: true,
            lowercase: true,
        },
        password: {
            type: String,
            required: true,
        },
        avatar: {
            type: String,
            default: '',
        },
        avatarColor: {
            type: String,
            default: 'white',
        },
        coverImage: String,
        type: Boolean,
        birthDay: {
            type: Date,
            default: new Date('1999-01-01'),
        },
        gender: {
            type: Boolean,
            default: false,
        },

        contacts: {
            type: [{ name: String, phone: String }],
            default: [],
        },
        otp: String,
        otpTime: Date,
        isActived: {
            type: Boolean,
            default: true,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
        isAdmin: {
            type: Boolean,
            default: false,
        },
        errorLoginTime: {
            type: Number,
            default: 0,
        },
        tokenVersion: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true },
);

// trước khi thực hiện thao tác lưu
userSchema.pre('save', async function (next) {
    const user = this;
    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 8);
    }
    next();
});

//
userSchema.statics.findUser = async (username, password) => {
    const user = await User.findOne({
        username,
        isActived: true,
        isDeleted: false,
    });

    if (!user) throw new NotFoundError('User');

    const isPassword = await bcrypt.compare(password, user.password);
    if (!isPassword) throw new UserError('Password incorrect');

    return user;
};

userSchema.statics.existsById = async (_id) => {
    const user = await User.findOne({ _id, isActived: true });
    if (user) return true;
    return false;
};

userSchema.statics.checkByIds = async (ids, message = 'User') => {
    for (const idEle of ids) {
        const user = await User.findOne({
            _id: idEle,
            isActived: true,
            isDeleted: false,
        });

        if (!user) throw new NotFoundError(message);
    }
};

userSchema.statics.getById = async (_id, message = 'User') => {
    const user = await User.findOne({ _id, isActived: true });
    if (!user) throw new NotFoundError(message);

    const { name, username, birthDay, gender, avatar, avatarColor, coverImage, isAdmin, contacts } = user;

    const userModify = {
        _id,
        name,
        username,
        birthDay: dateUtils.toObject(birthDay),
        gender,
        avatar,
        avatarColor,
        coverImage,
        isAdmin,
        contacts,
    };
    return userModify;
};

userSchema.statics.existsByUsername = async (username) => {
    const user = await User.findOne({
        username,
        isActived: true,
    });
    if (user) return true;
    return false;
};

userSchema.statics.findByUsername = async (username, message = 'User') => {
    const user = await User.findOne({
        username,
        isActived: true,
    });

    if (!user) throw new NotFoundError(message);

    const { _id, name, birthDay, gender, avatar, avatarColor, coverImage } = user;
    return {
        _id,
        name,
        username,
        birthDay: dateUtils.toObject(birthDay),
        gender,
        avatar,
        avatarColor,
        coverImage,
    };
};

userSchema.statics.checkById = async (_id, message = 'User') => {
    const user = await User.findOne({ _id, isActived: true });

    if (!user) throw new NotFoundError(message);

    return user;
};

userSchema.statics.getSummaryById = async (_id, message = 'User') => {
    const user = await User.findOne({ _id, isActived: true });
    if (!user) throw new NotFoundError(message);

    const { name, avatar, avatarColor } = user;
    return {
        _id,
        name,
        avatar,
        avatarColor,
    };
};

userSchema.statics.logout = async (_id) => {
    const user = await User.findOne({ _id });
    if (!user) throw new NotFoundError('User');
    user.tokenVersion += 1;
    try {
        await user.save();
    } catch (error) {
        return false;
    }
    return true;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
