const {Router} = require('express');
const {Docker} = require('node-docker-api');
const {Sandbox} = require('../Sandbox');
const tar = require('tar-stream');

module.exports.ws = (ws, req) => {
    const {id} = req.params;

    const emitToSandbox = data => {
        console.log("ets", data.data);
        Sandbox.registry.get(id)?.emit('stdin', data.data);
    }
    const sendFromSandbox = data => {
        console.log("sfs", data);
        ws.send(data);
    }

    Sandbox.registry.await(id, () => {
        Sandbox.registry.get(id)?.on('stdout', sendFromSandbox);
        Sandbox.registry.get(id)?.on('stderr', sendFromSandbox);
    });

    const cleanup = () => {
        Sandbox.registry.get(id)?.stop();
    }

    ws.on('message', emitToSandbox);
    ws.on('close', cleanup);
    ws.on('error', cleanup);
};

const consumeStream = stream => new Promise((resolve, reject) => {
    const _buf = [];
    stream.on("data",  chunk => _buf.push(chunk));
    stream.on("end",   () => resolve(Buffer.concat(_buf)));
    stream.on("error", err => reject(err));
});


module.exports.create = (config) => {
    const router = Router();

    router.post('/', async (req, res) => {
        const docker = new Docker(config.docker);
        const sandbox = new Sandbox(docker, config);
        await sandbox.start();
        sandbox.debugSession();

        Sandbox.registry.register(sandbox);

        res.status(201).json({id: sandbox.id});
    });

    router.post('/:id/upload', async (req, res) => {
        const {id} = req.params;

        const tarball = tar.pack();

        const files = req.files.files;

        // Setup files
        [files].flat().forEach(({name, data}) => tarball.entry({
            name: `/sandbox/${name}`,
            type: 'file',
            mode: 0o666
        }, data));

        tarball.finalize();

        await Sandbox.registry.get(id)?.fs_put(tarball);

        res.status(200).end();
    });

    router.post('/:id/download/', async (req, res) => {
        const {id} = req.params;
        const {path} = req.body;

        const files = [];
        
        const extract = tar.extract();

        extract.on('entry', async (header, stream, next) => {
            const content = (await consumeStream(stream)).toString();
            files.push({header, content});
            next();
        });

        extract.on('finish', () => {
            res.status(200).json({path, files});
        });

        const tarball = await Sandbox.registry.get(id)?.fs_get(path);
        tarball.pipe(extract);
    });

    return router;
};