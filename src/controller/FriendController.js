const friendService = require('../services/FriendService');

class FriendController {
    constructor(io) {
        this.io = io;
        this.acceptFriend = this.acceptFriend.bind(this);
        this.sendFriendInvite = this.sendFriendInvite.bind(this);
        this.deleteFriend = this.deleteFriend.bind(this);
        this.deleteFriendInvite = this.deleteFriendInvite.bind(this);
        this.deleteInviteWasSend = this.deleteInviteWasSend.bind(this);
    }
    async getFriendRequest(req, res, next) {
        const { _id } = req;
        const { userId } = req.params;
        try {
            const friend = await friendService.getFriendRequest(_id, userId);
            res.json(friend);
        } catch (err) {
            next(err);
        }
    }
    async getListFriends(req, res, next) {
        const { _id } = req;
        const { name = '' } = req.query;

        try {
            const friends = await friendService.getList(name, _id);

            res.json(friends);
        } catch (err) {
            next(err);
        }
    }

    async acceptFriend(req, res, next) {
        const { _id } = req;
        const { userId } = req.params;

        try {
            const result = await friendService.acceptFriend(_id, userId);
            this.io.to(userId + '').emit('accept-friend', { _id });
            const { conversationId, isExists, message } = result;
            if (isExists) this.io.to(conversationId + '').emit('new-message', conversationId, message);
            else {
                this.io.to(_id + '').emit('create-individual-conversation-when-was-friend', conversationId);
                this.io.to(userId + '').emit('create-individual-conversation-when-was-friend', conversationId);
            }
            res.status(201).json(result);
        } catch (err) {
            next(err);
        }
    }

    async deleteFriend(req, res, next) {
        const { _id } = req;
        const { userId } = req.params;
        try {
            await friendService.deleteFriend(_id, userId);
            this.io.to(userId + '').emit('deleted-friend', _id);
            res.status(204).json();
        } catch (err) {
            next(err);
        }
    }

    async getListFriendInvites(req, res, next) {
        const { _id } = req;
        try {
            const friendInvites = await friendService.getListInvites(_id);
            res.json(friendInvites);
        } catch (err) {
            next(err);
        }
    }

    async deleteFriendInvite(req, res, next) {
        const { _id } = req;
        const { userId } = req.params;

        try {
            await friendService.deleteFriendInvite(_id, userId);
            this.io.to(userId + '').emit('deleted-friend-invite', _id);
            res.status(204).json();
        } catch (err) {
            next(err);
        }
    }

    async getListFriendInvitesWasSend(req, res, next) {
        const { _id } = req;
        try {
            const friendInvites = await friendService.getListInvitesWasSend(_id);

            res.json(friendInvites);
        } catch (err) {
            next(err);
        }
    }

    async sendFriendInvite(req, res, next) {
        const { _id } = req;
        const { userId } = req.params;
        try {
            await friendService.sendFriendInvite(_id, userId);
            const friendRequest = await friendService.getFriendRequest(userId, _id);
            if (friendRequest) this.io.to(userId + '').emit('send-friend-invite', friendRequest);

            res.status(201).json();
        } catch (err) {
            next(err);
        }
    }

    async deleteInviteWasSend(req, res, next) {
        const { _id } = req;
        const { userId } = req.params;

        try {
            await friendService.deleteInviteWasSend(_id, userId);
            this.io.to(userId + '').emit('deleted-invite-was-send', _id);
            res.status(204).json();
        } catch (err) {
            next(err);
        }
    }

    async getSuggestFriends(req, res, next) {
        const { _id } = req;
        const { page = 0, size = 12 } = req.query;

        try {
            const suggestFriends = await friendService.getSuggestFriends(_id, parseInt(page), parseInt(size));

            res.json(suggestFriends);
        } catch (err) {
            next(err);
        }
    }
}

module.exports = FriendController;
