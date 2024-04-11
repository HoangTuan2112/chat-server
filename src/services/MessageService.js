const Message = require('../models/Message');
const Member = require('../models/Member');
const UserError = require('../exception/UserError');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const messageValidate = require('../validate/messageValidate');
const commonUtils = require('../utils/commonUtils');
const ArgError = require('../exception/ArgError');
const messageUtils = require('../utils/messageUtils');
const dateUtils = require('../utils/dateUtils');
const awsS3Service = require('../services/AwsS3Service');
const lastViewService = require('../services/LastViewService');

class MessageService {
    async getList(conversationId, userId, page, size) {
        if (!conversationId || !userId || !size || page < 0 || size <= 0) throw new ArgError();

        const conversation = await Conversation.getByIdAndUserId(conversationId, userId);

        const totalMessages = await Message.countDocumentsByConversationIdAndUserId(conversationId, userId);

        const { skip, limit, totalPages } = commonUtils.getPagination(page, size, totalMessages);

        let messages;

        if (conversation.type) {
            const messagesTempt = await Message.getListByConversationIdAndUserIdOfGroup(
                conversationId,
                userId,
                skip,
                limit,
            );

            messages = messagesTempt.map((messageEle) => messageUtils.convertMessageOfGroup(messageEle));
        } else {
            const messagesTempt = await Message.getListByConversationIdAndUserIdOfIndividual(
                conversationId,
                userId,
                skip,
                limit,
            );
            messages = messagesTempt.map((messageEle) => messageUtils.convertMessageOfIndividual(messageEle));
        }

        await lastViewService.updateLastViewOfConversation(conversationId, userId);

        return {
            data: messages,
            page,
            size,
            totalPages,
        };
    }

    async getById(_id, type) {
        if (type) {
            const message = await Message.getByIdOfGroup(_id);

            return messageUtils.convertMessageOfGroup(message);
        }

        const message = await Message.getByIdOfIndividual(_id);
        return messageUtils.convertMessageOfIndividual(message);
    }

    async addText(message, userId) {
        await messageValidate.validateTextMessage(message, userId);

        const { conversationId } = message;

        const newMessage = new Message({
            userId,
            ...message,
        });

        const saveMessage = await newMessage.save();

        return this.updateWhenHasNewMessage(saveMessage, conversationId, userId);
    }

    async addFile(file, type, conversationId, userId) {
        await messageValidate.validateFileMessage(file, type, conversationId, userId);

        const content = await awsS3Service.uploadFile(file);

        const newMessageTempt = {
            userId,
            content,
            type,
        };

        newMessageTempt.conversationId = conversationId;

        const newMessage = new Message({
            ...newMessageTempt,
        });

        const saveMessage = await newMessage.save();

        return this.updateWhenHasNewMessage(saveMessage, conversationId, userId);
    }

    async addFiles(files, type, conversationId, userId) {
        // await messageValidate.validateFileMessage(file, type, conversationId, userId);

        const content = await awsS3Service.uploadFiles(files);

        const newMessageTempt = {
            userId,
            content,
            type,
        };

        newMessageTempt.conversationId = conversationId;

        const newMessage = new Message({
            ...newMessageTempt,
        });

        const saveMessage = await newMessage.save();

        return this.updateWhenHasNewMessage(saveMessage, conversationId, userId);
    }

    async addFileWithBase64(fileInfo, type, conversationId, userId) {
        await messageValidate.validateFileMessageWithBase64(fileInfo, type, conversationId, userId);
        const { fileBase64, fileName, fileExtension } = fileInfo;

        const content = await awsS3Service.uploadWithBase64(fileBase64, fileName, fileExtension);

        const newMessageTempt = {
            userId,
            content,
            type,
        };

        newMessageTempt.conversationId = conversationId;

        const newMessage = new Message({
            ...newMessageTempt,
        });
        const saveMessage = await newMessage.save();

        return this.updateWhenHasNewMessage(saveMessage, conversationId, userId);
    }

    async updateWhenHasNewMessage(saveMessage, conversationId, userId) {
        const { _id } = saveMessage;

        await Conversation.updateOne({ _id: conversationId }, { lastMessageId: _id });

        await lastViewService.updateLastViewOfConversation(conversationId, userId);

        const { type } = await Conversation.findById(conversationId);

        return await this.getById(_id, type);
    }

    async deleteById(_id, user) {
        const message = await Message.getById(_id);
        const { userId, conversationId } = message;

        if (userId != user) throw new UserError('Not permission delete message');

        await Message.updateOne({ _id }, { isDeleted: true });

        let conversationTempt = conversationId;

        return {
            _id,
            conversationId: conversationTempt,
        };
    }

    async deleteOnlyMeById(_id, userId) {
        const message = await Message.getById(_id);
        const { deletedUserIds, isDeleted } = message;

        if (isDeleted) return;

        const index = deletedUserIds.findIndex((id) => id == userId);
        if (index !== -1) return;

        await Message.updateOne({ _id }, { $push: { deletedUserIds: userId } });
    }

    async addReaction(_id, type, userId) {
        const numberType = parseInt(type);
        if (numberType < 1 || numberType > 6) throw new UserError('Reaction type invalid');

        const message = await Message.getById(_id);
        const { isDeleted, deletedUserIds, reacts, conversationId } = message;

        if (isDeleted || deletedUserIds.includes(userId)) throw new UserError('Message was deleted');

        const reactIndex = reacts.findIndex((reactEle) => reactEle.userId == userId);

        const reactTempt = [...reacts];
        if (reactIndex === -1) {
            reactTempt.push({ userId, type });
        } else {
            reactTempt[reactIndex] = { userId, type };
        }

        await Message.updateOne(
            { _id },
            {
                $set: {
                    reacts: reactTempt,
                },
            },
        );
        const user = await User.getSummaryById(userId);

        let conversationTempt = conversationId;

        return {
            _id,
            conversationId: conversationTempt,

            user,
            type,
        };
    }

    async deleteAll(conversationId, userId) {
        await Member.getByConversationIdAndUserId(conversationId, userId);

        Message.updateMany(
            { conversationId, deletedUserIds: { $nin: [userId] } },
            { $push: { deletedUserIds: userId } },
        ).then();
    }

    async getListFiles(conversationId, userId, type, senderId, startTime, endTime) {
        if (type !== 'IMAGE' && type !== 'VIDEO' && type !== 'FILE')
            throw new UserError('Message type invalid, only image, video, file');

        const startDate = dateUtils.toDate(startTime);
        const endDate = dateUtils.toDate(endTime);

        await Conversation.getByIdAndUserId(conversationId, userId);

        const query = {
            conversationId,
            type,
            isDeleted: false,
            deletedUserIds: { $nin: [userId] },
        };

        if (senderId) query.userId = senderId;

        if (startDate && endDate) query.createdAt = { $gte: startDate, $lte: endDate };

        const files = await Message.find(query, {
            userId: 1,
            content: 1,
            type: 1,
            createdAt: 1,
        });

        return files;
    }

    async getAllFiles(conversationId, userId) {
        await Conversation.getByIdAndUserId(conversationId, userId);

        const images = await Message.getListFilesByTypeAndConversationId('IMAGE', conversationId, userId, 0, 8);

        const videos = await Message.getListFilesByTypeAndConversationId('VIDEO', conversationId, userId, 0, 8);
        const files = await Message.getListFilesByTypeAndConversationId('FILE', conversationId, userId, 0, 8);

        return {
            images,
            videos,
            files,
        };
    }

    async shareMessage(messageId, conversationId, userId) {
        const message = await Message.getById(messageId);
        const { content, type } = message;
        await Conversation.getByIdAndUserId(message.conversationId, userId);
        const conversationShare = await Conversation.getByIdAndUserId(conversationId, userId);

        if (type === 'NOTIFY' || type === 'VOTE') throw new UserError('Not share message type is NOTIFY or Vote');

        const newMessage = new Message({
            userId,
            content,
            type,
            conversationId,
        });

        const saveMessage = await newMessage.save();

        const { _id, createdAt } = saveMessage;
        await Conversation.updateOne({ _id: conversationId }, { lastMessageId: _id });

        await Member.updateOne({ conversationId, userId }, { $set: { lastView: createdAt } });

        return await this.getById(_id, conversationShare.type);
    }

    async addNotifyMessage(content, conversationId, userId) {
        const newMessage = new Message({
            userId,
            content,
            type: 'NOTIFY',
            conversationId,
        });

        const { _id, createdAt } = await newMessage.save();

        await Conversation.updateOne({ _id: conversationId }, { lastMessageId: _id });

        await Member.updateOne({ conversationId, userId }, { lastView: createdAt });

        return this.getById(_id, true);
    }
}

module.exports = new MessageService();
