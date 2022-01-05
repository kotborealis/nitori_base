export {};

const config = require('chen.js').config('.config.js');
require('./logging/logger').init(config);

const api = require('./api');
const {Docker} = require('node-docker-api');
const {Sandbox} = require('./Sandbox');

require('./esbuild');

process.on('unhandledRejection', (reason) => console.error('unhandledRejection', reason));

(async () => {
    Sandbox.build(new Docker(config.docker), config);
    api(config);
})();