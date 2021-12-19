import {ExecParams, SandboxPath} from '../Sandbox/Sandbox';

class Ar {
    sandbox;

    /**
     * ar util
     * @param {Sandbox} sandbox
     */
    constructor(sandbox) {
        this.sandbox = sandbox;
    }

    async cr(archive: string = "", binaries: SandboxPath[] = [], params: ExecParams = {}) {
        await this.sandbox.exec([
            "ar",
            "cr",
            archive,
            ...binaries
        ], params);
    }
}

module.exports = Ar;