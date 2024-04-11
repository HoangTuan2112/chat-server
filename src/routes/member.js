const router = require('express').Router();
const MemberController = require('../controller/MemberController');

const memberRouter = (io) => {
    const memberController = new MemberController(io);
    router.post('/:userId', memberController.addMember);
    router.delete('/:userId', memberController.deleteMember);
    router.delete('/leave', memberController.leaveGroup);
    return router;
};
module.exports = memberRouter;
