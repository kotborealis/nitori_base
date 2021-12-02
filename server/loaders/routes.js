const sandboxRoute = require('../routes/sandbox');

/**
 * Configure routes for express app
 * @param app
 * @param config
 */
module.exports = ({app, config}) => {
    app.use('/sandbox/', sandboxRoute.create(config));
};
