import assert from 'assert';

const tar = require('tar-stream');

const config = require('chen.js').config('.config.js');
require('../../server/logging/logger').init(config);

const {Docker} = require('node-docker-api');
const {Sandbox} = require('../../server/Sandbox');
let docker = new Docker(config.docker);

describe('Sandbox', async function () {
    this.timeout(60 * 1000 * 5);

    let sandbox;

    before(async function () {
        this.timeout(1000 * 60 * 5);
        await Sandbox.build(docker, config);
        sandbox = new Sandbox(docker, config);
        await sandbox.start();
    });

    type BashOpts = {
        expectedExitCode?: number | undefined;
        user?: string
    };

    const bash = async (cmd, opts: BashOpts = {expectedExitCode: 0, user: 'sandbox'}) => {
        const res = await sandbox.exec(["bash", "-c", cmd], {user: opts.user});
        console.log(cmd);
        console.log(res.stdout);
        console.log(res.stderr);
        assert.equal(
            res.exitCode,
            opts.expectedExitCode ?? 0
        );
    };

    const has_command = async (name) => bash(`command -v ${name}`);

    it('should have utils', async () => {
        const commands = [
            "g++", "gcc", "make",
            "vim", "gdb",
            "ls", "cat", "cp", "mv", "mkdir"
        ];

        for (let cmd of commands)
            await has_command(cmd);
    });

    it('should have /sandbox manager by sandbox user', async () => {
        await bash("touch /sandbox/.test", {user: `sandbox`});
        await bash("test -f /sandbox/.test", {user: `sandbox`});
        await bash("rm /sandbox/.test", {user: `sandbox`});
    });

    it('should be able to compile something', async () => {
        await bash("echo 'int main() { return 7; }' > main.c");
        await bash("gcc main.c");
        await bash("./a.out", {expectedExitCode: 7});
    });

    it('should upload files with correct permissions', async () => {
        const uid = Number.parseInt((await sandbox.exec(["id", "-u", "sandbox"])).stdout);
        const gid = Number.parseInt((await sandbox.exec(["id", "-g", "sandbox"])).stdout);

        const tarball = tar.pack();
        tarball.entry({
            name: "test.txt",
            type: 'file',
            mode: 0o665,
            uid,
            gid
        }, "TEST_STRING")
        tarball.finalize();

        await sandbox.fs_put(tarball, `/sandbox/`);

        await bash("ls -alh test.txt");
        await bash("test -f test.txt");
        await bash("cat test.txt");
        await bash("echo '' > test.txt");
        await bash("rm test.txt");
    });
});

after(() => Sandbox.destroy_all(docker));