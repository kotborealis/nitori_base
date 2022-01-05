const sandboxRoute = require('../routes/sandbox');
const testRoute = require('../routes/test');
const editorRoute = require('../routes/editor');
const express = require('express');

/**
 * Configure routes for express app
 * @param app
 * @param config
 */
module.exports = ({app, config}) => {
    app.use('/public/', express.static('public'));
    app.use('/node_modules/', express.static('node_modules'));
    app.use('/sandbox/', sandboxRoute.create(config));
    app.use('/test/', testRoute(config));
    app.use('/editor/', editorRoute.create(config));
};
