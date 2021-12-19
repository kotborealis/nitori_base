export {};

const logger = require(('../logging/logger')).logger('ErrorHandlingMiddleware');

/**
 * Error handling middleware
 * @param err
 * @param req
 * @param res
 * @param next
 */
module.exports.ErrorHandlingMiddleware = function ErrorHandlingMiddleware(err, req, res, next) {
    logger.error(err.message, err);

    res.status(err.status || 500).json({
        message: err.message || err.toString(),
        errors: err.errors || [err.message]
    });
};