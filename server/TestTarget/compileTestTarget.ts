import {SandboxPath} from "Sandbox/Sandbox";

export {};

const {Objcopy} = require('../SandboxedGnuUtils');
const {Compiler} = require('../SandboxedGnuUtils');
const {Sandbox} = require('../Sandbox');
const {Docker} = require('node-docker-api');
const logger = require(('../logging/logger')).logger('compileTestTarget');

module.exports = (config, testSpecPath: SandboxPath, testTargetPaths: SandboxPath[], sandbox) => {
    const worker = (async function*() {
        logger.info("Compiling", {testSpecPath, testTargetPaths});

        const includePaths = testTargetPaths
            .map(name => require('path').dirname(name))
            .filter((element, index, self) => self.indexOf(element) === index);

        const targetCompiler = new Compiler(sandbox, config.timeout.compilation);
        const {exec: targetCompilerResult, obj: targetBinaries} =
            await targetCompiler.compile(testTargetPaths, {I: includePaths});

        logger.info("Compiled", targetCompilerResult);

        yield {targetCompilerResult};

        if(targetCompilerResult.exitCode !== 0)
            return;

        const objcopy = new Objcopy(sandbox);
        await objcopy.redefine_sym(targetBinaries, "main", config.testing.hijack_main);
        for await(let fn of `exit _exit _Exit abort quick_exit`.split(' '))
            await objcopy.redefine_sym(targetBinaries, fn, config.testing.hijack_exit);

        logger.info("Redefined syms");

        const specCompiler = new Compiler(sandbox, config.timeout.compilation);
        const {exec: specCompilerResult, obj: specBinaries} =
            await specCompiler.compile([testSpecPath],
                {I: ["/opt/nitori/", ...includePaths], include: ["/opt/nitori/testing.hpp"]}, {user: "testrunner"});

        logger.info("Compiled spec", specCompilerResult);

        yield {specCompilerResult};

        if(specCompilerResult.exitCode !== 0)
            return;

        const {exec: linkerResult, output} = await targetCompiler.link(
            [...targetBinaries, ...specBinaries], {}, {user: "testrunner"}
        );

        logger.info("linked", linkerResult);

        yield {linkerResult};

        if(linkerResult.exitCode !== 0)
            return;

        const runnerResult = await sandbox.exec(["valgrind", `--log-file=/sandbox/.valgrind`, `./${output}`], {user: "sandbox", timeout: config.timeout.run});

        const valgrindResult = await sandbox.exec([`cat`, `/sandbox/.valgrind`], {user: "sandbox"});

        runnerResult.stdout += `valgrind memcheck:\n\n` + valgrindParser(config, valgrindResult.stdout);

        logger.info("ran", runnerResult);

        yield {runnerResult};
        return;
    })();

    return {worker};
};

const valgrindParser = (config, output) => {
    output = output
        .split('\n')
        .map(str => str.replace(/^==\d+== /i, '').trim());

    output = output.slice(output.indexOf(``) + 1);
    const valgrindCrashIndex = output.findIndex(str => str.indexOf(`-- VALGRIND INTERNAL ERROR:`) > 2);
    if(valgrindCrashIndex !== -1)
        output = output.slice(0, valgrindCrashIndex);

    output = output
        .map(str => str.replace(new RegExp(config.testing.hijack_main, 'g'), 'main'));

    return output.join('\n');
};