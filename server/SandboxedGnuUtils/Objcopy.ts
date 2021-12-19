export {};

class Objcopy {
    sandbox;

    /**
     *
     * @param {Sandbox} sandbox
     */
    constructor(sandbox){
        this.sandbox = sandbox;
    }

    async redefine_sym(obj, old_sym, new_sym, {working_dir = ''} = {}) {
        if(Array.isArray(obj)){
            const result = [];

            for await (let file of obj) {
                const res = await this.sandbox.exec([
                    "objcopy",
                    file,
                    "--redefine-sym",
                    `${old_sym}=${new_sym}`
                ], {working_dir});

                result.push(res);
            }

            return {exec: result};
        }
        else{
            return await this.redefine_sym([obj], old_sym, new_sym);
        }
    }
}

module.exports = Objcopy;