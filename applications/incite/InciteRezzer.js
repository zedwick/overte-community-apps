"use strict"
//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

const incite = require("./libincite/incite.js");
const GraphRez = require("./GraphRez.js");

/**
 * The Inciting Rezzing Manager; handles loading Incite Graph instances into the world.
 */
class InciteRezzer {

    #availableIds
    #graphRez
    #graphRezMap
    #nextId

    constructor() {
        this.#graphRez = new Set();
        this.#graphRezMap = new Map(); // We're just using the graph's Id to fetch their Rez (temporarily, we may want to rez one graph in multiple locations so they would ultimately need their own IDs)


        this.#nextId = 0;
        this.#availableIds = [];
    }

    /**
     * Get a graph which is currently rez'd
     */
    getGraphRez(graphId) {
        return this.#graphRezMap.get(graphId);
    }

    /**
     * Rez a graph in the world
     * @param {InciteGraph} graph
     * @param {Vec3} position
     */
    rezGraph(graph, position) {
        const graphRez = new GraphRez(graph, position);
        this.addGraphRez(graphRez);
    }

    /**
     * Add a graphRez
     * @param {GraphRez} graphRez - The GraphRez to add
     */
    addGraphRez(graphRez) {
        const id = this.#availableIds.length > 0 ? this.#availableIds.pop() : this.#nextId++;
        console.log("addGraphRez", id);
        graphRez.id = id;
        this.#graphRez.add(graphRez);
        this.#graphRezMap.set(graphRez.id, graphRez);

        // Subscribe to GraphRez signals; derezzed, etc?
        graphRez.GraphRezEnding.connect(this.onGraphRezEnding.bind(this));

        // Emit new GraphRez signal
        this.graphRezAdded.emit(graphRez.id, graphRez.graphId);
    }

    /**
     * Remove a graph to end its rez.
     */
    removeGraphRez(graphRezId) {
        console.log("removeGraphRez", graphRezId);
        const graphRez = this.#graphRezMap.get(graphRezId);
        this.#graphRez.delete(graphRez);
        this.#graphRezMap.delete(graphRezId);

        // Emit removed GraphRez signal
        this.graphRezRemoved.emit(graphRezId, graphRez.graphId);
        graphRez.cleanup();

        this.#availableIds.push(graphRezId);
    }

    onGraphRezEnding(graphRezId, graphId) {
        this.removeGraphRez(graphRezId);
    }

    // signals

    graphRezAdded = new incite.Signal("graphRezAdded"); // graphRezId, graphId
    graphRezRemoved = new incite.Signal("graphRezRemoved"); // graphRezId, graphId
}

module.exports = new InciteRezzer();
