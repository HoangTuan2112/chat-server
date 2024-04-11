const meService = require('../services/MeService');

class MeController {
    constructor(io) {
        this.io = io;
    }

    async profile(req, res, next) {
        const { _id } = req;
        const profile = await meService.getProfile(_id);
        return res.json(profile);
    }

    async updateProfile(req, res, next) {
        const { _id } = req;

        try {
            await meService.updateProfile(_id, req.body);
            res.json();
        } catch (err) {
            next(err);
        }
    }

    async changeAvatar(req, res, next) {
        const { _id, file } = req;

        try {
            const avatar = await meService.changeAvatar(_id, file);

            return res.json({ avatar });
        } catch (err) {
            next(err);
        }
    }

    async changeCoverImage(req, res, next) {
        const { _id, file } = req;

        try {
            const coverImage = await meService.changeCoverImage(_id, file);

            return res.json({ coverImage });
        } catch (err) {
            next(err);
        }
    }

    async changeAvatarWithBase64(req, res, next) {
        const { _id } = req;

        try {
            const avatar = await meService.changeAvatarWithBase64(_id, req.body);

            return res.json({ avatar });
        } catch (err) {
            next(err);
        }
    }

    async changeCoverImageWithBase64(req, res, next) {
        const { _id } = req;

        try {
            const coverImage = await meService.changeCoverImageWithBase64(_id, req.body);

            return res.json({ coverImage });
        } catch (err) {
            next(err);
        }
    }

    async getContacts(req, res, next) {
        const { _id } = req;

        try {
            const contacts = await meService.getContacts(_id);

            res.json(contacts);
        } catch (err) {
            next(err);
        }
    }

    async syncContacts(req, res, next) {
        const { _id } = req;
        const { phones } = req.body;

        try {
            await meService.syncContacts(_id, phones);

            res.status(201).json();
        } catch (err) {
            next(err);
        }
    }

    async changePassword(req, res, next) {
        const { _id } = req;
        const { oldPassword, newPassword } = req.body;

        try {
            await meService.changePassword(_id, oldPassword, newPassword);

            res.status(200).json();
        } catch (err) {
            next(err);
        }
    }
}

module.exports = MeController;
