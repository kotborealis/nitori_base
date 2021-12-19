import {ExecParams, ExecResult, SandboxPath} from "../Sandbox/Sandbox";

const tar = require('tar-stream');
const shortid = require('shortid');
const logger = require(('../logging/logger')).logger('SandboxedGnuUtils:Compiler');
const {Sandbox} = require('../Sandbox/Sandbox');

enum Compilers { gcc = "g++" };

type CompileOptions = {
    std?: string,
    I?: string[],
    include?: string[]
};

type LinkOptions = {
    output?: SandboxPath,
    L?: string,
};

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
    constructor(sandbox: typeof Sandbox, timeout: number = 60000, compiler_name: Compilers = Compilers.gcc) {
        this.sandbox = sandbox;
        this.compiler_name = compiler_name;
        this.timeout = timeout;
    }

    async compile(sources: SandboxPath[], {
        std = "c++2a",
        I = [],
        include = [],
    }: CompileOptions = {}, execParams: ExecParams) {
        const sandbox = this.sandbox;

        const cpp_file_names = sources
            .filter(name => name.endsWith(".cpp") || name.endsWith(".c"));

        const obj_file_names = cpp_file_names
            .map(name => `/tmp/${shortid.generate()}.o` as SandboxPath);

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
                "-fconcepts",
                name,
                "-o",
                obj_file_names[i]
            ], {...execParams, timeout: this.timeout}) as ExecResult
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
    async link(object_file_names: SandboxPath[], {
        output = "a.out",
        L = ".",
    } : LinkOptions = {}, execParams: ExecParams) {
        const {sandbox} = this;

        const res = await sandbox.exec([
            this.compiler_name,
            ...(L ? [`-L${L}`] : []),
            "-Winvalid-pch",
            "-o", output,
            ...object_file_names
        ], execParams);

        return {
            exec: res,
            output
        };
    }
}

module.exports = Compiler;