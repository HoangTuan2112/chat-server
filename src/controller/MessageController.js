const messageService = require('../services/MessageService');
const UserError = require('../exception/UserError');

class MessageController {
    constructor(io) {
        this.io = io;

        this.getList = this.getList.bind(this);
        this.addText = this.addText.bind(this);
        this.addFile = this.addFile.bind(this);
        this.addFiles = this.addFiles.bind(this);
        this.addFileWithBase64 = this.addFileWithBase64.bind(this);
        this.deleteById = this.deleteById.bind(this);
        this.addReaction = this.addReaction.bind(this);
        this.shareMessage = this.shareMessage.bind(this);
    }

    async getList(req, res, next) {
        const { _id } = req;
        const { conversationId } = req.params;
        const { page = 0, size = 20 } = req.query;

        try {
            const messages = await messageService.getList(conversationId, _id, parseInt(page), parseInt(size));
            this.io.to(conversationId + '').emit('user-last-view', {
                conversationId,
                userId: _id,
                lastView: new Date(),
            });
            res.json(messages);
        } catch (error) {
            next(error);
        }
    }

    async addText(req, res, next) {
        const { _id } = req;

        try {
            const { conversationId } = req.body;
            const message = await messageService.addText(req.body, _id);
            this.io.to(conversationId + '').emit('new-message', conversationId, message);
            this.io
                .in(conversationId + '')
                .emit('has-change-conversation-when-have-new-message', conversationId, message);
            res.status(201).json(message);
        } catch (err) {
            next(err);
        }
    }

    async addFile(req, res, next) {
        const { _id, file } = req;
        const { type, conversationId } = req.query;

        try {
            if (!conversationId || !type) throw new UserError('Params type or conversationId not exists');

            const message = await messageService.addFile(file, type, conversationId, _id);
            this.io.to(conversationId + '').emit('new-message', conversationId, message);
            this.io
                .in(conversationId + '')
                .emit('has-change-conversation-when-have-new-message', conversationId, message);
            res.status(201).json(message);
        } catch (err) {
            next(err);
        }
    }
    async addFiles(req, res, next) {
        const { _id, files } = req;
        console.log('files', files);
        const { type, conversationId } = req.query;

        try {
            if (!conversationId || !type) throw new UserError('Params type or conversationId not exists');

            const message = await messageService.addFiles(files, type, conversationId, _id);
            this.io.to(conversationId + '').emit('new-message', conversationId, message);
            this.io
                .in(conversationId + '')
                .emit('has-change-conversation-when-have-new-message', conversationId, message);
            res.status(201).json(message);
        } catch (err) {
            next(err);
        }
    }

    async addFileWithBase64(req, res, next) {
        const { _id } = req;
        const { type, conversationId, channelId } = req.query;
        try {
            if (!conversationId || !type) throw new UserError('Params type or conversationId not exists');
            const message = await messageService.addFileWithBase64(req.body, type, conversationId, channelId, _id);

            res.status(201).json(message);
        } catch (err) {
            next(err);
        }
    }

    async deleteById(req, res, next) {
        const { _id } = req;
        const { id } = req.params;

        try {
            const { conversationId, channelId } = await messageService.deleteById(id, _id);

            res.status(204).json();
        } catch (err) {
            next(err);
        }
    }

    async deleteOnlyMeById(req, res, next) {
        const { _id } = req;
        const { id } = req.params;

        try {
            await messageService.deleteOnlyMeById(id, _id);

            res.status(204).json();
        } catch (err) {
            next(err);
        }
    }

    async addReaction(req, res, next) {
        const { _id } = req;
        const { id, type } = req.params;

        try {
            const { user, conversationId, channelId } = await messageService.addReaction(id, type, _id);

            res.status(201).json();
        } catch (err) {
            next(err);
        }
    }

    async getListFiles(req, res, next) {
        const { _id } = req;
        const { conversationId } = req.params;
        const { senderId, type = 'ALL', startTime, endTime } = req.query;

        try {
            let files;
            if (type === 'ALL') files = await messageService.getAllFiles(conversationId, _id);
            else files = await messageService.getListFiles(conversationId, _id, type, senderId, startTime, endTime);

            res.json(files);
        } catch (err) {
            next(err);
        }
    }

    async shareMessage(req, res, next) {
        const { _id } = req;
        const { id, conversationId } = req.params;

        try {
            const message = await messageService.shareMessage(id, conversationId, _id);

            res.status(201).json(message);
        } catch (err) {
            next(err);
        }
    }
}

module.exports = MessageController;
