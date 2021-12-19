const PromiseTimeout = (promise, timeout) => Promise.race([
    promise,
    timeout > 0 ? new Promise((resolve, reject) => {
        const id = setTimeout(() => {
            clearTimeout(id);
            reject(new PromiseTimeoutError(`Promise timed out in ${timeout}ms.`));
        }, timeout);
    }) : new Promise(() => 0)
]);

class PromiseTimeoutError extends Error {
    constructor(message) {
        super(message);
    }
}

module.exports = {PromiseTimeout, PromiseTimeoutError};