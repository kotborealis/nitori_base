const tar = require('tar-stream');
const shortid = require('shortid');
const logger = require(('../logging/logger')).logger('SandboxedGnuUtils:Compiler');

class Compiler {
    sandbox;
    compiler_name;
    timeout;

    /**
     *
     * @param {Sandbox} sandbox
     * @param timeout
     * @param compiler_name
     */
    constructor(sandbox, timeout = 60000, compiler_name = "g++") {
        this.sandbox = sandbox;
        this.compiler_name = compiler_name;
        this.timeout = timeout;
    }

    /**
     *
     * @param source_files Array of {name, content} pairs with source files
     * @param working_dir
     * @param std Which standart to use
     * @param I Include path
     * @param include
     * @returns {Promise<{obj: *, exec: *}>}
     */
    async compile(source_files, {
        working_dir = "/sandbox/",
        std = "c++2a",
        I = [],
        include = [],
    } = {}) {
        const {sandbox} = this;

        const cpp_file_names = source_files
            .map(({name}) => name)
            .filter((name) => name.endsWith(".cpp") || name.endsWith(".c"));

        const obj_file_names = cpp_file_names
            .map((name) => name.slice(0, name.lastIndexOf(".")) + `.${shortid.generate()}.o`);

        logger.debug("creating tarball");

        const tarball = tar.pack();

        // Setup dirs
        source_files
            .map(({name}) => name)
            .map(name => require('path').dirname(name))
            .filter((e, i, s) => s.indexOf(e) === i)
            .forEach(dir => tarball.entry({
                name: `${working_dir}/${dir}`,
                type: 'directory',
                mode: 0o777
            }));

        // Setup files
        source_files
            .forEach(({name, content}) => tarball.entry({
                name: `${working_dir}/${name}`,
                type: 'file',
                mode: 0o644
            }, content));

        tarball.finalize();

        logger.debug("created tarball", {source_files});

        await sandbox.fs_put(tarball);

        logger.debug("uploaded tarball");

        const res = (await Promise.all(cpp_file_names.map((name, i) =>
            sandbox.exec([
                this.compiler_name,
                ...(std ? [`--std=${std}`] : []),
                ...I.map(_ => `-I${_}`),
                ...include.map(_ => [`-include`, _]).flat(),
                "-g3",
                "-c",
                "-Wno-invalid-pch",
                "-Wno-write-strings",
                name,
                "-o",
                obj_file_names[i]
            ], {working_dir, timeout: this.timeout})
        ))).reduce((res, total) => ({
            stdout: total.stdout + '\n\n' + res.stdout,
            stderr: total.stderr + '\n\n' + res.stderr,
            exitCode: res.exitCode || total.exitCode,
        }), {stdout: "", stderr: "", exitCode: 0});

        return {
            exec: res,
            obj: obj_file_names
        };
    };

    /**
     *
     * @param object_file_names
     * @param working_dir
     * @param output Executable name
     * @param L Library path
     * @returns {Promise<{output: string, exec: *}>}
     */
    async link(object_file_names, {
        working_dir = "/sandbox/",
        output = "a.out",
        L = ".",
    } = {}) {
        const {sandbox} = this;

        const res = await sandbox.exec([
            this.compiler_name,
            ...(L ? [`-L${L}`] : []),
            "-Winvalid-pch",
            "-o", output,
            ...object_file_names
        ], {working_dir});

        return {
            exec: res,
            output
        };
    }
}

module.exports = Compiler;