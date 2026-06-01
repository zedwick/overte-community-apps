//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

const Graph = require("./Graph.js");
const Node = require("./Nodes/Node.js");
const InciteStore = require("./InciteStore.js");

/**
 * Builds graphs from a variety of sources and for varying contexts.
 */
class GraphBuilder {
    constructor(data = {}) {
        this._id = null;
        this._url = null;
        this._nodes = [];
        this._connections = [];
        this._assertions = [];
    }

    setId(id) {
        this._id = id;
        return this;
    }

    setUrl(url) {
        this._url = url;
        return this;
    }

    addNode(node) {
        this._nodes.push(node);
        return this;
    }

    addNodes(nodes) {
        this._nodes.push(...nodes);
        return this;
    }

    addConnection(connection) {
        this._connections.push(connection);
        return this;
    }

    addConnections(connections) {
        this._connections.push(...connections);
        return this;
    }

    addAssertion(assertion) {
        this._assertions.push(assertion);
        return this;
    }

    addAssertions(assertions) {
        this._assertions.push(...assertions);
        return this;
    }

    /**
     * Build a new Graph object with the data provided.
     * return {Graph}
     */
    build() {
        const graph = new Graph({
            id: this._id,
            url: this._url,
            nodes: this._nodes,
            connections: this._connections,
            assertions: this._assertions
        });

        // Let the node know which graph it is a part of
        for (const nodeIndex in graph.nodes) {
            graph.nodes[nodeIndex].graph = graph;
        }
        return graph;
    }

    /**
     * Loads Graph data from json. Accepts partial data.
     * @param {(string|object)} jsonData - JSON string or object
     * @return {GraphBuilder}
     */
    fromJson(jsonData) {
        const data = typeof jsonData == 'string'
                        ? JSON.parse(jsonData)
                        : jsonData;

        // TODO: Improve validation
        if (data.id != undefined) this._id = data.id;
        if (data.url != undefined) this._url = data.url;
        if (data.nodes != undefined) {
            const nodeRegistry = InciteStore.nodeRegistry;
            for (const index in data.nodes) {
                const nodeData = data.nodes[index];
                const node = nodeRegistry.get(nodeData.type);
                const graphNode = new node({
                    id: Number(index),
                    data: nodeData.data ?? {}
                });
                //console.log(graphNode);
                this._nodes.push(graphNode);
            }
        }
        if (data.connections != undefined) {
            for (const index in data.connections) {
                const connectionData = data.connections[index];
                this._connections.push(connectionData);
            }
        }
        if (data.assertions != undefined) {
            for (const index in data.assertions) {
                const connectionData = data.assertions[index];
                this._assertions.push(connectionData);
            }
        }

        return this;
    }

    /**
     * Resets all data associated with this GraphBuilder.
     * @return {GraphBuilder}
     */
    reset() {
        this._id = null;
        this._url = url;
        this._nodes = [];
        this._connections = [];
        this._assertions = [];
        return this;
    }


}

module.exports = GraphBuilder;
