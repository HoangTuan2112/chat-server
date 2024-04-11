const Conversation = require('../models/Conversation');
const User = require('../models/User');
const UserError = require('../exception/UserError');
const Member = require('../models/Member');

const memberValidate = {
    validateLeaveGroup: async (conversationId, userId) => {
        const conversation = await Conversation.getByIdAndUserId(conversationId, userId);
        const { type, leaderId } = conversation;
        if (!type || leaderId == userId) throw new UserError("Cant't leave group");
    },

    validateAddMember: async (conversationId, userId, newUserIds) => {
        if (newUserIds.length <= 0) throw new UserError('User must > 0');

        const conversation = await Conversation.getByIdAndUserId(conversationId, userId);

        const { type } = conversation;
        if (!type) throw new UserError("Cant't add member, only group");

        await User.checkByIds(newUserIds);
        const isExistsNewUsers = await Conversation.findOne({
            _id: conversationId,
            members: { $in: newUserIds },
        });
        if (isExistsNewUsers) throw new UserError('User exists in group');
    },

    validateDeleteMember: async (conversationId, userId, deleteUserId) => {
        if (userId === deleteUserId) throw new UserError('Not delete your');

        const conversation = await Conversation.getByIdAndUserId(conversationId, userId);

        const { type, leaderId, managerIds } = conversation;
        const isManager = managerIds.findIndex((userIdEle) => userIdEle + '' === userId);

        if (!type || leaderId + '' == deleteUserId || (leaderId + '' !== userId && isManager === -1))
            throw new UserError('Not permission delete member');

        const isExistsDeleteUser = await Member.existsByConversationIdAndUserId(conversationId, deleteUserId);
        if (!isExistsDeleteUser) throw new UserError('User not exists in group');
    },
};

module.exports = memberValidate;
