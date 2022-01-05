const utils = require('./utils');
const shortid = require('shortid');

const createSession = () => ({id: shortid.generate()});

module.exports = {
    utils,
    createSession
};