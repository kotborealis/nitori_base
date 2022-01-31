const {Registry} = require('./Registry');

const {PromiseTimeout} = require('../utils/PromiseTimeout');

const logger = require(('../logging/logger')).logger('Sandbox');

const shortid = require('shortid');
const {PromiseTimeoutError} = require('../utils/PromiseTimeout');

const {promisifyDockerStream} = require('../utils/promisifyDockerStream');

const tar = require('tar-fs');

const EventEmmiter = require('events').EventEmitter;

const instanceId = shortid.generate();

export type SandboxId = string;
export type SandboxPath = string;
export type SandboxUser = "sandbox" | "testbuilder";

export type ExecParams = {
    user?: SandboxUser,
    tty?: boolean,
    working_dir?: SandboxPath,
    timeout?: number,
    interactive?: boolean,
    detached?: boolean
};

export type ExecResult = {
    exitCode: number,
    stdout: string,
    stderr: string
};

/**
 * Docker Sandbox class
 */
class Sandbox extends EventEmmiter {
    public emit: any;
    /**
     * Docker instance
     */
    docker;

    /**
     * Sandbox configuration
     */
    config;

    /**
     * Sandbox container
     */
    container;

    /**
     * Sandbox ID
     */
    id: SandboxId;

    /**
     * debug instance associated with this Sandbox
     */
    debug;

    _running: boolean = false;

    _hideOutput: boolean = false;

    static registry = new Registry;

    interactiveExecSession = null;

    /**
     * Constructor
     * @param docker Docker instance
     * @param config Configuration
     */
    constructor(docker, config) {
        super();
        this.docker = docker;
        this.config = config;
        this.id = shortid.generate();

        Sandbox.registry.register(this);

        logger.info('Sandbox started', {id: this.id, config});
    }

    /**
     * Get all containers created by this instance
     */
    static get_children_containers(docker): Promise<any[]> {
        return docker.container.list({
            all: true,
            filters: JSON.stringify({
                label: [`nitori.parent=${instanceId}`]
            })
        });
    }

    /**
     * Destroy all containers created by this instance
     * @param docker
     * @returns {Promise<void>}
     */
    static async destroy_all(docker) {
        logger.info("Destroying all created Sandbox containers", {instanceId});

        const containers = await Sandbox.get_children_containers(docker);

        logger.info(`Destroying ${containers.length} containers`);

        for await (let container of containers) {
            await container.pause();

            const {data: {Name, Image, State: {Status}}} = await container.status();
            logger.info("Killing container", {Name, Image, Status});

            try {
                await container.kill();
            } catch (e) {
                logger.error("Error during container.kill()", e);
            }

            try {
                await container.delete();
            } catch (e) {
                logger.error("Error during container.delete()", e);
            }
        }
    }

    static build(docker, config) {
        const tarball = tar.pack(config.container.imageContextPath);
        return new Promise((resolve, reject) =>
            docker.image.build(tarball, {t: config.container.Image})
                .then(promisifyDockerStream)
                .then(() => docker.image.get(config.container.Image).status())
                .then((...args) => {
                    logger.info("Successfully built sandbox image");
                    resolve.apply(null, args);
                })
                .catch((...args) => {
                    logger.error("Failed to build sandbox image");
                    reject(...args);
                })
        );
    }

    /**
     * Stop & remove container
     */
    async stop() {
        Sandbox.registry.unregister(this);
        logger.debug("Stop sandbox & delete container", {id: this.id});

        if (!this._running) {
            logger.debug("Already not running", {id: this.id});
            return;
        }
        
        const {container} = this;
        try {
            await container.stop();
            await container.delete({force: true});
        } catch (e) {
            logger.error("Error during container.delete()", e);
        }

        this.emit('stop');

        this._running = false;
    };

    /**
     * Execute command in container
     * @returns {Promise<{stdout, exitCode: *, stderr}>}
     */
    async exec(cmd: string[] = [], {
        user = "sandbox",
        tty = true,
        working_dir = '',
        timeout = 0,
        interactive = false,
        detached = false
    }: ExecParams = {}): Promise<ExecResult> {
        const {container} = this;

        logger.debug(`Execute \`${cmd.join(' ')}\` in \`${working_dir}\` with timeout \`${timeout}\` as user ${user}`, {id: this.id});

	if(interactive)
            this.stdout(`${working_dir}$ ${cmd.join(' ')}`);

        try {
            const exec = await container.exec.create({
                WorkingDir: working_dir ? working_dir : undefined,
                Cmd: cmd,
                AttachStdin: true,
                AttachStdout: true,
                AttachStderr: true,
                Tty: tty,
                User: user
            });

            if(interactive && tty && detached)
		this.interactiveExecSession = exec;

            const dockerStream = await exec.start({hijack: true, stdin: true});
            const {stdout, stderr} = await PromiseTimeout(
                promisifyDockerStream(
                    dockerStream, exec, interactive ? this : null, detached
                ), timeout);

            if (detached)
                return;

            const {data: {ExitCode: exitCode}} = await exec.status();

            if(interactive) {
                this.stdout(stdout);
                this.stderr(stderr);
            }

            logger.debug(`exec result`, {id: this.id, exitCode, stdout, stderr});

            // handle SIGSEGV via exitCode
            if (exitCode === '139') {
                logger.info(`handled sigsegv (return 139)`);
                return {
                    exitCode,
                    stdout: stdout + `\nAbort (segmentation fault)\n`,
                    stderr
                };
            }

            return {exitCode, stdout, stderr};
        } catch (e) {
            if (e instanceof PromiseTimeoutError) {
                logger.info(`Exec timed out in ${timeout}ms.`, {id: this.id});
                await this.stop();
                // 124 is exit code for timeout command
                return {exitCode: 124, stdout: e.message, stderr: ""};
            } else {
                logger.error("Error while executing", e);
            }
        }
    };

    /**
     * Unpack tarball stream into specified path
     * @param tarball
     * @param path
     * @returns {Promise<Object>}
     */
    async fs_put(tarball, path: SandboxPath = '/') {
        console.log("put into", path);
        logger.debug("Fs put into", {path});
        return this.container.fs.put(tarball, {path});
    }

    /**
     * Get tarball from specified path
     * @param path
     * @returns {Promise<Object>}
     */
    async fs_get(path: SandboxPath) {
        logger.debug("Fs get from", {path});
        return this.container.fs.get({path});
    }

    async fs_delete(path: SandboxPath) {
        logger.debug("Fs delete from", {path});
        return this.container.fs.delete({path});
    }

    async resizeTty({cols, rows} = {cols: 0, rows: 0}) {
        logger.debug("Resize tty", {id: this.id, cols, rows});
	return this.interactiveExecSession.resize({h: rows, w: cols});
    }

    /**
     * Create & start container
     * @returns {Promise<void>}
     */
    async start() {
        logger.debug("Start");

        if (this._running) {
            logger.debug("Already running");
            return;
        }

        const {docker, config, id} = this;

        try {
            this.container = await docker.container.create({
                ...config.container,
                name: `${config.sandbox.container_prefix}${id}`,
                Labels: {
                    "nitori.sandbox": id,
                    "nitori.parent": instanceId
                }
            });

            await this.container.start();
        } catch (e) {
            logger.error("Error while creating/starting container", e);
        }

        this._running = true;
    };

    stdout(str: SandboxPath) {
        if (!this._hideOutput)
            this.emit('stdout', str + `\r\n`);
    }

    stderr(str: SandboxPath) {
        if (!this._hideOutput)
            this.emit('stderr', str + `\r\n`);
    }

    /**
     *
     * @param {boolean} state
     */
    hideOutput(state) {
        this._hideOutput = state;
    }

    async debugSession() {
        await this.stdout("# Starting debugging session");
        await this.stdout("# Session will be ended after connection ends");
        this.exec(["/bin/bash"], {interactive: true, detached: true});
    }
}

module.exports = {Sandbox};
export type {Sandbox};
