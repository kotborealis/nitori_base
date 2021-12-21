const EventEmitter = require('events').EventEmitter;

type AwaitCallback = (id: string, err?: Error) => any;

module.exports.Registry = class Registry extends EventEmitter {
    static data = new Map;

    /**
     *
     * @param {Sandbox} sandbox
     */
    register(sandbox) {
        Registry.data.set(sandbox.id, sandbox);
        this.emit(`registered/${sandbox.id}`);
    }

    /**
     *
     * @param {Sandbox} sandbox
     */
    unregister(sandbox) {
        this.emit(`unregistered/${sandbox.id}`);
        Registry.data.delete(sandbox.id);
    }

    get(id) {
        return Registry.data.get(id);
    }

    await(id, timeout: number, callback: AwaitCallback = (id) => 0) {
        if(Registry.data.has(id)) 
            return callback(Registry.data.get(id));

	let timeoutId = null;

	const fn = () => {
            if(timeoutId)
                clearTimeout(timeoutId);
            
            callback(Registry.data.get(id));
        };

        this.once(`registered/${id}`, fn);
        
        timeoutId = setTimeout(() => callback(null, new Error(`timed out after ${timeout}ms`)), timeout);
    }
}
