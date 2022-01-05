export {};

const {Router} = require('express');
const Editor = require('../Editor/Editor');

module.exports.ws = (ws, req) => Editor.utils.setupWSConnection(ws, req);

module.exports.create = (config) => {
    const router = Router();

    router.post('/', async (req, res) => {
        const {id} = Editor.createSession();
        res.status(200).json({id});
    });
    return router;
};
