const EventEmitter = require('events').EventEmitter;

type AwaitCallback = (id: string) => any;

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

    await(id, callback: AwaitCallback = (id) => 0) {
        if(Registry.data.has(id)) callback(Registry.data.get(id));
        else this.once(`registered/${id}`, () => callback(Registry.data.get(id)));
    }
}