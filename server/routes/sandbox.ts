export {};

const {Router} = require('express');
const {Docker} = require('node-docker-api');
const {Sandbox} = require('../Sandbox');
const tar = require('tar-stream');

module.exports.ws = (ws, req) => {
    const {id} = req.params;

    const emitToSandbox = data => {
        Sandbox.registry.get(id)?.emit('stdin', data);
    }

    const sendFromSandbox = data => {
        ws.send(data);
        resetIdleTimeout();
    }

    if(!Sandbox.registry.get(id)) {
        ws.send(`# Sandbox with id ${id} does not exist`);
        ws.close();
        return;
    }

    const timeout = 1000 * 60 * 10 * 10;

    const resetEvents = () => {
        Sandbox.registry.get(id)?.removeListener('stdout', sendFromSandbox);
        Sandbox.registry.get(id)?.removeListener('stderr', sendFromSandbox);
    };

    const cleanup = () => {
        console.log("Cleanup for sandbox from router", {id, timeout});
        Sandbox.registry.get(id)?.stop();
	ws.send(`\n# Sandbox stopped`);
    }

    let idle = { timeout: null };

    const resetIdleTimeout = () => {
        if(idle.timeout) clearTimeout(idle.timeout);
        idle.timeout = setTimeout(cleanup, timeout);
    };

    Sandbox.registry.await(id, 1000, (sandbox, err) => {
        if(err) {
	    ws.send(`# Sandbox with id ${id} not found`);
            ws.close();
            return;
        }

        sendFromSandbox(sandbox.get_out_buffer());

        sandbox.on('stdout', sendFromSandbox);
        sandbox.on('stderr', sendFromSandbox);
    });

    resetIdleTimeout();

    ws.on('message', emitToSandbox);
    ws.on('close', resetEvents);
    ws.on('error', resetEvents);
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

    router.post('/:id/upload/:user', async (req, res) => {
        const {id, user = 'sandbox'} = req.params;

        const tarball = tar.pack();

        const files = req.files.files;

        const sandbox = Sandbox.registry.get(id);

        const uid = Number.parseInt((await sandbox.exec(["id", "-u", user])).stdout);
        const gid = Number.parseInt((await sandbox.exec(["id", "-g", user])).stdout);

        // Setup files
        [files].flat().forEach(({name, data}) => {
            tarball.entry({
                name,
                type: 'file',
                mode: 0o665,
                uid,
                gid
            }, data)
        });

        tarball.finalize();

        await sandbox?.fs_put(tarball, `/sandbox/`);

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

    router.post(`/:id/resize-tty`, async (req, res) => {
        const {id} = req.params;
        const {cols, rows} = req.body;


        await Sandbox.registry.get(id)?.resizeTty({cols, rows});

        res.status(200).end();
    });

    router.post(`/:id/cmd`, async (req, res) => {
        const {id} = req.params;
        const {cmd} = req.body;

        const sandbox = await Sandbox.registry.get(id);
        const result = await sandbox?.exec(["bash", "-c", cmd], {tty: false});

        res.status(200).json(result);
    });

    return router;
};
