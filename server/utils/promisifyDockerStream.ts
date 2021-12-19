const {prototype: {demuxStream}} = require('docker-modem/lib/modem');

/**
 * Promisifies stream into strings
 * @param stream
 * @param exec
 * @returns {Promise}
 */
const promisifyDockerStream = (stream, exec = null, eventEmmiter = null, detached: boolean = false) => new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";

    stream.on('end', () => resolve({stdout, stderr}));
    stream.on('error', reject);

    demuxStream(stream, {
        write: chunk => {
            stdout += chunk.toString();
            eventEmmiter && eventEmmiter.emit('stdout', chunk.toString());
        }
    }, {
        write: chunk => {
            stderr += chunk.toString();
            eventEmmiter && eventEmmiter.emit('stderr', chunk.toString());
        }
    });

    if(eventEmmiter) {
        eventEmmiter.on('stdin', (data) => stream.write(data));
    }

    if(exec && detached){
        let healthCheck = setInterval(async () => {
            const {data: {Running}} = await exec.status();
            if(!Running){
                clearInterval(healthCheck);
                resolve({stdout, stderr});
            }
        }, 1000);
    }
});

module.exports = {promisifyDockerStream};