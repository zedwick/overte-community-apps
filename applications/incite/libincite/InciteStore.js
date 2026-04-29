//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

const NodeRegistry = require("./NodeRegistry.js");
const GraphManager = require("./GraphManager.js");

/**
 * Store for all your inciteful needs.
 */
class InciteStore {
    #nodeRegistry
    #graphManager

    constructor(data = {}) {
        this.#nodeRegistry = new NodeRegistry();
        this.#graphManager = new GraphManager();
    }

    get nodeRegistry() {
        return this.#nodeRegistry;
    }

    get graphManager() {
        return this.#graphManager;
    }

    toJSON() {
        return {
            nodeRegistry: this.#nodeRegistry,
            graphManager: this.#graphManager
        }
    }

}

module.exports = new InciteStore(); // Cached, so only one instance is created
