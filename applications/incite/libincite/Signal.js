"use strict"
//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

/**
 * @template {Array<any>} T // TODO: How do I document?
 */
class Signal {
    #name
    #callbacks

    constructor(name) {
        this.#name = name;
        this.#callbacks = new Set();
    }

    get name() {
        return this.#name;
    }

    /**
     * Adds a callback to be ran when this signal is emitted
     * @param {function} callback
     */
    connect(callback) {
        // console.log("Signal", this.#name, "connect",
        //             callback,
        //             JSON.stringify(callback));
        this.#callbacks.add(callback);
    }

    /**
     * Removes a callback so it is no longer ran when this signal is emitted.
     * @param {function} callback
     */
    disconnect(callback) {
        // console.log("Signal", this.#name, "disconnect",
        //             callback,
        //             JSON.stringify(callback));
        this.#callbacks.delete(callback);
    }

    /**
     * Emits this signal
     * @param { * } args
     */
    emit( ... args) {
        // console.log("Signal", this.#name, "emit:", ... args);
        const queue = [ ... this.#callbacks ];


        // console.log("Signal", this.#name, "emit queue:", queue);

        for (let i = 0; i < queue.length; i++) {
            // console.log("Signal", this.#name, "emit #", i, ... args);
            const callback = queue.shift();

            callback( ... args);
        }
    }
}

module.exports = Signal;
