const conversationService = require('../services/ConversationService');
const messageService = require('../services/MessageService');
const memberService = require('../services/MemberService');
const UserError = require('../exception/UserError');

class ConversationController {
    constructor(io) {
        this.io = io;

        this.createConversation = this.createConversation.bind(this);
        this.createGroupConversation = this.createGroupConversation.bind(this);
        this.rename = this.rename.bind(this);
        this.updateAvatar = this.updateAvatar.bind(this);
        this.updateAvatarWithBase64 = this.updateAvatarWithBase64.bind(this);
        this.deleteById = this.deleteById.bind(this);
        this.addManagersForConversation = this.addManagersForConversation.bind(this);
        this.deleteManagersForConversation = this.deleteManagersForConversation.bind(this);
    }

    async getList(req, res, next) {
        const { _id } = req;
        const { name = '', type = 0 } = req.query;

        if (type != 0 && type != 1 && type != 2)
            res.status(400).json({
                message: 'Params Type invalid, only 0 or 1 or 2',
            });

        try {
            let conversations;

            if (type == 0) conversations = await conversationService.getList(_id);

            if (type == 1) conversations = await conversationService.getListPersonal(name, _id);

            if (type == 2) conversations = await conversationService.getListGroup(name, _id);

            res.json(conversations);
        } catch (err) {
            next(err);
        }
    }

    async getOne(req, res, next) {
        const { _id } = req;
        const { id } = req.params;

        try {
            const conversation = await conversationService.getSummaryByIdAndUserId(id, _id);

            res.json(conversation);
        } catch (err) {
            next(err);
        }
    }

    async createConversation(req, res, next) {
        const { _id } = req;
        const { userId } = req.params;

        try {
            const result = await conversationService.createConversation(_id, userId);
            if (!result.isExists) this.io.to(userId + '').emit('create-individual-conversation', result._id);
            res.status(201).json(result);
        } catch (err) {
            next(err);
        }
    }

    async createGroupConversation(req, res, next) {
        const { _id } = req;
        const { name = '', userIds = [] } = req.body;
        console.log('userIds', userIds);
        try {
            const conversationId = await conversationService.createGroupConversation(
                _id,
                name,
                userIds.filter((userIdEle) => userIdEle != _id),
            );

            const userIdsTempt = [_id, ...userIds];
            console.log('userIdsTempt', userIdsTempt);

            userIdsTempt.forEach((userIdEle) => this.io.to(userIdEle + '').emit('create-conversation', conversationId));

            res.status(201).json({ _id: conversationId });
        } catch (err) {
            next(err);
        }
    }

    async rename(req, res, next) {
        const { _id } = req;
        const { id } = req.params;
        const { name } = req.body;

        try {
            if (!name) throw new UserError('Name invalid');

            const message = await conversationService.rename(id, name, _id);
            if (message) {
                this.io.to(id + '').emit('rename-conversation', id, name, message);
            }
            res.json();
        } catch (err) {
            next(err);
        }
    }

    async updateAvatar(req, res, next) {
        const { _id, file } = req;
        const { id } = req.params;

        try {
            const { avatar, lastMessage } = await conversationService.updateAvatar(id, file, _id);
            this.io.to(id + '').emit('update-avatar-conversation', id, avatar, lastMessage);
            this.io.to(id + '').emit('new-message', id, lastMessage);
            res.json({ avatar, lastMessage });
        } catch (err) {
            next(err);
        }
    }

    async updateAvatarWithBase64(req, res, next) {
        const { _id } = req;
        const { id } = req.params;

        try {
            const { avatar, lastMessage } = await conversationService.updateAvatarWithBase64(id, req.body, _id);
            this.io.to(id + '').emit('update-avatar-conversation', id, avatar, lastMessage);
            this.io.to(id + '').emit('new-message', id, lastMessage);
            res.json({ avatar, lastMessage });
        } catch (err) {
            next(err);
        }
    }

    async deleteAllMessage(req, res, next) {
        const { _id } = req;
        const { id } = req.params;

        try {
            await messageService.deleteAll(id, _id);

            res.status(204).json();
        } catch (err) {
            next(err);
        }
    }

    async deleteById(req, res, next) {
        const { _id } = req;
        const { id } = req.params;

        try {
            await conversationService.deleteById(id, _id);
            this.io.to(id).emit('delete-conversation', id);
            res.status(204).json();
        } catch (err) {
            next(err);
        }
    }

    async updateConversationNotify(req, res, next) {
        const { _id } = req;
        const { id, isNotify } = req.params;

        try {
            if (!isNotify || (isNotify != '0' && isNotify != '1')) throw new UserError('Value isNotify only 0 or 1');
            await conversationService.updateConversationNotify(id, parseInt(isNotify), _id);

            res.json();
        } catch (err) {
            next(err);
        }
    }

    async getLastViewOfMembers(req, res, next) {
        const { _id } = req;
        const { id } = req.params;

        try {
            const lastViewOfMembers = await conversationService.getLastViewOfMembers(id, _id);

            res.json(lastViewOfMembers);
        } catch (err) {
            next(err);
        }
    }
    async updateJoinFromLink(req, res, next) {
        const { _id } = req;
        const { id, isStatus } = req.params;

        try {
            if (isStatus !== '0' && isStatus !== '1') throw new UserError('IsStatus must 0 or 1');

            await conversationService.updateJoinFromLink(id, isStatus === '1' ? true : false, _id);

            res.json();
        } catch (err) {
            next(err);
        }
    }

    async getConversationSummary(req, res, next) {
        const { id } = req.params;

        try {
            const conversationSummary = await conversationService.getConversationSummary(id);

            res.json(conversationSummary);
        } catch (err) {
            next(err);
        }
    }

    async addManagersForConversation(req, res, next) {
        const { _id } = req;
        const { id } = req.params;
        const { managerIds } = req.body;

        try {
            const result = await memberService.addManagersForConversation(id, managerIds, _id);
            this.io.to(id + '').emit('add-managers', {
                conversationId: id,
                managerIds: result.managerIds,
            });
            this.io.in(id + '').emit('new-message-group', id, result.message);
            res.status(200).json(result);
        } catch (err) {
            next(err);
        }
    }

    async deleteManagersForConversation(req, res, next) {
        const { _id } = req;
        const { id } = req.params;
        const { managerIds } = req.body;
        console.log(id, managerIds);

        try {
            const result = await memberService.deleteManagersForConversation(id, managerIds, _id);
            this.io.to(id + '').emit('delete-managers', {
                conversationId: id,
                managerIds: result.deleteManagerIds,
            });
            this.io.in(id + '').emit('new-message-group', id, result.message);
            res.status(200).json(result);
        } catch (err) {
            next(err);
        }
    }
}

module.exports = ConversationController;
