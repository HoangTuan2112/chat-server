const Conversation = require('../models/Conversation');
const Member = require('../models/Member');
const Message = require('../models/Message');
const ObjectId = require('mongoose').Types.ObjectId;
const dateUtils = require('../utils/dateUtils');
const UserError = require('../exception/UserError');
const User = require('../models/User');
const conversationValidate = require('../validate/conversationValidate');
const messageService = require('../services/MessageService');
const awsS3Service = require('./AwsS3Service');
const userService = require('./UserSevice');
const messageValidate = require('../validate/messageValidate');

class ConversationService {
    async getList(userId) {
        const conversations = await Conversation.getListByUserId(userId);

        const conversationIds = conversations.map((conversationEle) => conversationEle._id);

        return await this.getListSummaryByIds(conversationIds, userId);
    }

    async getListGroup(name, userId) {
        const conversations = await Conversation.getListGroupByNameContainAndUserId(name, userId);

        const conversationIds = conversations.map((conversationEle) => conversationEle._id);

        return await this.getListSummaryByIds(conversationIds, userId);
    }

    async getListPersonal(name, userId) {
        const conversations = await Conversation.getListPersonalByNameContainAndUserId(name, userId);

        const conversationIds = conversations.map((conversationEle) => conversationEle._id);

        return await this.getListSummaryByIds(conversationIds, userId);
    }

    async getListSummaryByIds(ids, userId) {
        const conversationsResult = [];
        for (const id of ids) {
            const conversation = await this.getSummaryByIdAndUserId(id, userId);
            conversationsResult.push(conversation);
        }

        return conversationsResult;
    }

    async getSummaryByIdAndUserId(_id, userId) {
        const member = await Member.getByConversationIdAndUserId(_id, userId);
        const { lastView, isNotify } = member;

        const conversation = await Conversation.findById(_id);
        const { lastMessageId, type, members, leaderId, isJoinFromLink, managerIds } = conversation;

        const lastMessage = lastMessageId ? await messageService.getById(lastMessageId, type) : null;
        const numberUnread = await Message.countUnread(lastView, _id);

        let nameAndAvatarInfo;
        if (type) nameAndAvatarInfo = await this.getGroupConversation(conversation);
        else {
            nameAndAvatarInfo = await this.getPersonalConversation(_id, userId);

            const { members } = conversation;
            const index = members.findIndex((ele) => ele + '' != userId);
            nameAndAvatarInfo.userId = members[index];
            nameAndAvatarInfo.friendStatus = await userService.getFriendStatus(userId, members[index]);
        }

        let lastMessageTempt = {};

        const numberOfDeletedMessages = await Message.countDocuments({
            conversationId: _id,
            deletedUserIds: { $nin: [userId] },
        });
        if (!lastMessage || numberOfDeletedMessages === 0) lastMessageTempt = null;
        else
            lastMessageTempt = {
                ...lastMessage,
                createdAt: dateUtils.toTime(lastMessage.createdAt),
            };

        return {
            _id,
            ...nameAndAvatarInfo,
            type,
            totalMembers: members.length,
            numberUnread,
            leaderId,
            managerIds,
            lastMessage: lastMessageTempt,
            isNotify,
            isJoinFromLink,
        };
    }

    async getPersonalConversation(_id, userId) {
        const datas = await Member.aggregate([
            {
                $match: {
                    conversationId: ObjectId(_id),
                    userId: { $ne: ObjectId(userId) },
                },
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            {
                $unwind: '$user',
            },
            {
                $project: {
                    _id: 0,
                    name: '$user.name',
                    avatar: '$user.avatar',
                    avatarColor: '$user.avatarColor',
                },
            },
        ]);

        return datas[0];
    }

    async getGroupConversation(conversation) {
        const { _id, name, avatar } = conversation;

        let groupName = '';
        let groupAvatar = [];
        if (!name || !avatar) {
            const nameAndAvataresOfGroup = await Conversation.getListNameAndAvatarOfMembersById(_id);

            for (const tempt of nameAndAvataresOfGroup) {
                const nameTempt = tempt.name;
                const { avatar, avatarColor } = tempt;

                groupName += `, ${nameTempt}`;
                groupAvatar.push({ avatar, avatarColor });
            }
        }

        const result = {
            name,
            avatar,
        };

        if (!name) result.name = groupName.slice(2);
        if (!avatar) result.avatar = groupAvatar;

        return result;
    }

    async createConversation(userId1, userId2) {
        const { userName1, userName2, conversationId } = await conversationValidate.validateConversation(
            userId1,
            userId2,
        );

        if (conversationId) return { _id: conversationId, isExists: true };

        const newConversation = new Conversation({
            members: [userId1, userId2],
            type: false,
        });
        const saveConversation = await newConversation.save();
        const { _id } = saveConversation;

        const member1 = new Member({
            conversationId: _id,
            userId: userId1,
            name: userName1,
        });

        const member2 = new Member({
            conversationId: _id,
            userId: userId2,
            name: userName2,
        });

        member1.save().then();
        member2.save().then();

        return { _id, isExists: false };
    }

    async createConversationWhenWasFriend(userId1, userId2) {
        const { _id, isExists } = await this.createConversation(userId1, userId2);

        const newMessage = {
            content: 'giờ đây các bạn đã là bạn bè',
            type: 'NOTIFY',
            conversationId: _id,
        };
        const saveMessage = await messageService.addText(newMessage, userId1);

        return { conversationId: _id, isExists, message: saveMessage };
    }

    async createGroupConversation(myUserId, name, userIds) {
        if (userIds.length <= 0) throw new UserError('userIds invalid');

        const userIdsTempt = [myUserId, ...userIds];
        await User.checkByIds(userIdsTempt);

        const newConversation = new Conversation({
            name,
            leaderId: myUserId,
            members: [myUserId, ...userIds],
            type: true,
        });
        const saveConversation = await newConversation.save();
        const { _id } = saveConversation;

        const newMessage = new Message({
            userId: myUserId,
            content: 'đã tạo nhóm',
            type: 'NOTIFY',
            conversationId: _id,
        });

        await newMessage.save();

        for (const userId of userIdsTempt) {
            const member = new Member({
                conversationId: _id,
                userId,
            });

            await member.save();
        }

        const memberAddMessage = new Message({
            userId: myUserId,
            manipulatedUserIds: [...userIds],
            content: 'đã thêm vào nhóm',
            type: 'NOTIFY',
            conversationId: _id,
        });

        await memberAddMessage.save().then((message) => {
            Conversation.updateOne({ _id }, { lastMessageId: message._id }).then();
        });

        return _id;
    }

    async rename(_id, name, userId) {
        const conversation = await Conversation.getByIdAndUserId(_id, userId);
        const { type } = conversation;

        if (type) {
            const newMessage = new Message({
                userId,
                content: `tên nhóm đã được thay đổi: <b>"${name}"</b> `,
                type: 'NOTIFY',
                conversationId: _id,
            });
            const saveMessage = await newMessage.save();
            await Conversation.updateOne({ _id }, { name, lastMessageId: saveMessage._id });
            await Member.updateOne({ conversationId: _id, userId }, { lastView: saveMessage.createdAt });

            return await messageService.getById(saveMessage._id, true);
        }

        const { members } = conversation;
        const otherUserId = members.filter((userIdEle) => userIdEle != userId);

        await Member.updateOne({ conversationId: _id, userId: otherUserId[0] }, { name });

        return;
    }

    async updateAvatar(_id, file, userId) {
        const { mimetype } = file;
        if (mimetype !== 'image/jpeg' && mimetype !== 'image/png') throw new UserError('Image invalid');

        const conversation = await Conversation.getByIdAndUserId(_id, userId);
        const { type, avatar } = conversation;

        if (!type) throw new UserError('Upload file fail, only for group');

        if (avatar) await awsS3Service.deleteFile(avatar);

        const avatarUrl = await awsS3Service.uploadFile(file);

        const newMessage = new Message({
            userId,
            content: `ảnh đại diện đã được thay đổi `,
            type: 'NOTIFY',
            conversationId: _id,
        });
        const saveMessage = await newMessage.save();
        await Conversation.updateOne({ _id }, { avatar: avatarUrl, lastMessageId: saveMessage._id });
        await Member.updateOne({ conversationId: _id, userId }, { lastView: saveMessage.createdAt });

        return {
            avatar: avatarUrl,
            lastMessage: await messageService.getById(saveMessage._id, true),
        };
    }

    async updateAvatarWithBase64(_id, fileInfo, userId) {
        messageValidate.validateImageWithBase64(fileInfo);

        const conversation = await Conversation.getByIdAndUserId(_id, userId);
        const { type } = conversation;

        if (!type) throw new UserError('only group');

        const { avatar } = conversation;
        if (avatar) await awsS3Service.deleteFile(avatar);

        const { fileName, fileExtension, fileBase64 } = fileInfo;
        const avatarUrl = await awsS3Service.uploadWithBase64(fileBase64, fileName, fileExtension);

        const newMessage = new Message({
            userId,
            content: `ảnh đại diện nhóm đã được thay đổi`,
            type: 'NOTIFY',
            conversationId: _id,
        });
        const saveMessage = await newMessage.save();
        await Conversation.updateOne({ _id }, { avatar: avatarUrl, lastMessageId: saveMessage._id });
        await Member.updateOne({ conversationId: _id, userId }, { lastView: saveMessage.createdAt });

        return {
            avatar: avatarUrl,
            lastMessage: await messageService.getById(saveMessage._id, true),
        };
    }

    async deleteById(conversationId, userId) {
        const conversation = await Conversation.getByIdAndUserId(conversationId, userId);

        const { type, leaderId } = conversation;
        if (!type || leaderId != userId) throw new UserError('Not permission delete group');

        await Member.deleteMany({ conversationId });
        await Message.deleteMany({ conversationId });
        await Conversation.deleteOne({ _id: conversationId });
    }

    async updateConversationNotify(conversationId, isNotify, userId) {
        const member = await Member.getByConversationIdAndUserId(conversationId, userId);

        member.isNotify = isNotify === 1 ? true : false;
        await member.save();
    }

    async getLastViewOfMembers(conversationId, userId) {
        await Member.getByConversationIdAndUserId(conversationId, userId);

        const members = await Member.aggregate([
            {
                $match: {
                    conversationId: ObjectId(conversationId),
                },
            },

            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            {
                $unwind: '$user',
            },
            {
                $project: {
                    _id: 0,
                    user: {
                        _id: 1,
                        name: 1,
                        avatar: 1,
                    },
                    lastView: 1,
                },
            },
        ]);

        return members;
    }

    async updateJoinFromLink(conversationId, isStatus, myId) {
        const conversation = await Conversation.getByIdAndUserId(conversationId, myId);

        const { type, leaderId, managerIds } = conversation;

        const isManager = managerIds.findIndex((userIdEle) => userIdEle + '' === myId);

        if (!type || (leaderId + '' !== myId && isManager === -1)) throw new UserError('you are not leader');

        await Conversation.updateOne({ _id: conversationId }, { $set: { isJoinFromLink: isStatus } });
    }

    async getConversationSummary(conversationId) {
        const conversation = await Conversation.getById(conversationId);
        const { type, isJoinFromLink } = conversation;
        if (!type) throw new UserError('Only conversation group');
        if (!isJoinFromLink) throw new UserError('Conversation not permission join from link');

        const conversationSummary = await Conversation.aggregate([
            { $match: { _id: ObjectId(conversationId) } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'members',
                    foreignField: '_id',
                    as: 'users',
                },
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    avatar: 1,
                    users: {
                        name: 1,
                        avatar: 1,
                        avatarColor: 1,
                    },
                },
            },
        ]);

        return conversationSummary[0];
    }
}

module.exports = new ConversationService();
