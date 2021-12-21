require('express-async-errors');
const cors = require('cors');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');

/**
 * Configure base middleware for express app
 * @param app
 * @param config
 */
module.exports = ({app, config}) => {
    // Allow cross-origin requests
    app.use(cors({credentials: true, origin: true, exposedHeaders: '*'}));

    // Body parser middleware
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(bodyParser.json());

    app.use(fileUpload(config.api));
};
