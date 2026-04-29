//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

/**
 * typedef {object} NodePort
 * @property {string} name - The name of this port
 * @property {array<string>} types - The list of types this port accepts
 * @property {object} value - The current value of this port, typically the output
 * @property {object} connectedPort - The port of another node this port is connected to, if connected to a port.
 */

class Node {
    #id
    #graph
    #node
    #data

    constructor(data = {}) {
        this.#id = data.id ?? null;
        this.#data = data.data ?? {};
    };


    static get type() {
        return 'node';
    }

    get type() {
        return this.constructor.type;
    }


    get id() {
        return this.#id;
    }

    set id(id) {
        this.#id = id;
    }

    get graph() {
        return this.#graph;
    }

    set graph(graph) {
        this.#graph = graph;
    }

    get data() {
        return this.#data;
    }

    // JSON.stringify
    toJSON() {
        return {
            id: this.#id,
            type: this.type,
            data: this.#data,
            inputs: this.inputs,
            outputs: this.outputs
        }
    }

    // Show private fields in log (in node.js)
    [inspectCustom]() {
        return {
            id: this.#id,
            type: this.type,
            data: this.#data,
            inputs: this.inputs,
            outputs: this.outputs,
        };
    }

    // Override
    // Node's logic
    execute() {
        throw new Error("Node type "+type+" must implement its own execute function");
    }

    run() {
        if (this.executed) return;

        try {
            console.log("Execute", this.type);
            for(const port of this.inputs) {
                console.log("Port", port.name, "connected to", port.connectedPort?.value ?? "No Port");
            }
            this.execute();
            this.executed = true;
        } catch (error) {
            console.error(`Error executing node $${this.id} ($${this.type}):`, error);
        }
    }

}

module.exports = Node;
