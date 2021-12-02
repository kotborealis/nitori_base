class Ar {
    sandbox;

    /**
     * ar util
     * @param {Sandbox} sandbox
     */
    constructor(sandbox) {
        this.sandbox = sandbox;
    }

    async cr(archive = "", binaries = [], {working_dir = ''} = {}) {
        await this.sandbox.exec([
            "ar",
            "cr",
            archive,
            ...binaries
        ], {working_dir});
    }
}

module.exports = Ar;