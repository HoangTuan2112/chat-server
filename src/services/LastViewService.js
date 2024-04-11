const Member = require('../models/Member');

class LastViewService {
    async updateLastViewOfConversation(conversationId, userId) {
        await Member.updateOne({ conversationId, userId }, { $set: { lastView: new Date() } });
    }
}

module.exports = new LastViewService();
