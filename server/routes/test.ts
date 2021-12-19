export {};

const {Router} = require('express');
const {Docker} = require('node-docker-api');
const tar = require('tar-stream');
const compileTestTarget = require('../TestTarget/compileTestTarget');
const {Sandbox} = require('../Sandbox');

module.exports = (config) => {
    const router = Router();

    router.post('/:id', async (req, res) => {
        const {id} = req.params;

        const testSpec = req.body.testSpec;
        const testTargets = [req.body.testTargets].flat();

        const {worker} = compileTestTarget(config, testSpec, testTargets, await Sandbox.registry.get(id));

        for await (const result of worker) {
            res.write(JSON.stringify(result));
            res.write('\n');
        }

        res.end();
    });

    return router;
};