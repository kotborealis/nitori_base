export {};

const logger = require(('./logging/logger')).logger('API');

const express = require('express');
const expressWs = require('express-ws');

const initApiError = require('./loaders/error');
const initApiExpress = require('./loaders/express');
const initApiRoutes = require('./loaders/routes');
const initShutdown = require('./loaders/shutdown');
const {Sandbox} = require('./Sandbox');

module.exports = (config) => {
    const {port} = config.api;

    logger.info(`Initializing api on port ${port}`, config);

    const app = express();
    expressWs(app);

    app.ws('/sandbox/ws/:id', require('./routes/sandbox').ws);
    app.ws('/editor/ws/:id', require('./routes/editor').ws);

    initApiExpress({app, config});
    initApiRoutes({app, config});
    initApiError({app, config});

    initShutdown({config});

    app.listen(port, () => logger.info(`Server running on 0.0.0.0:${port}`));
};
