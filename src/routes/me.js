const router = require('express').Router();
const MeController = require('../controller/MeController');
const uploadFile = require('../middleware/uploadFile');

const meRouter = (io) => {
    const meController = new MeController(io);

    router.get('/profile', meController.profile);
    router.put('/profile', meController.updateProfile);
    router.patch('/avatar', uploadFile.singleUploadMiddleware, meController.changeAvatar);
    router.patch('/cover-image', uploadFile.singleUploadMiddleware, meController.changeCoverImage);
    router.patch('/avatar/base64', meController.changeAvatarWithBase64);
    router.patch('/cover-image/base64', meController.changeCoverImageWithBase64);
    router.get('/contacts', meController.getContacts);
    router.post('/contacts', meController.syncContacts);
    router.patch('/password', meController.changePassword);

    return router;
};

module.exports = meRouter;
