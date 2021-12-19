const {ErrorHandlingMiddleware} = require('../middleware/errorMiddleware');

/**
 * Error handling middleware loader
 * @param app
 * @param config
 */
module.exports = ({app, config}) =>
    app.use(ErrorHandlingMiddleware);