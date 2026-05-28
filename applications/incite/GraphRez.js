"use strict"
//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

const incite = require("./libincite/incite.js");
const tactile = require("./libtactile/tactile.js");

/**
 * A Rez'd instance of an Incite Graph.
 */
class GraphRez {
    #document
    #entityHostType
    #graph
    #nodeElementMap
    #position

    constructor(graph, position) {
        this.#graph = graph
        this.#position = position;
        this.#entityHostType = "local";
        this.#document = this.DEFAULT_DOCUMENT;

        this.#nodeElementMap = new Map();

        this.subscribe();
    }

    subscribe() {
        this.graph.NodeAddedEvent.connect(this.onNodeAdded.bind(this));
        this.graph.NodeRemovedEvent.connect(this.onNodeRemoved.bind(this));
        incite.InciteStore.graphManager.GraphDeletedEvent.connect(this.onGraphDeleted.bind(this));
    }

    onNodeAdded(graphId, nodeId) {
        const element = new tactile.element.TactileElement({ minWidth: 0.5 });
        this.document.root.addElement(element); // TODO Build an element for the type of node
        // Store elementId by the nodeId;
        this.#nodeElementMap.set(nodeId, element.id);
    }

    onNodeRemoved(graphId, nodeId) {
        const elementId = this.#nodeElementMap.get(nodeId);
        this.document.root.removeElement(elementId);
    }

    onGraphDeleted(graphId) {
        if (graphId !== this.graph.id) return; // Not our concern!

        // Clean up document TODO
        this.document.cleanup();

        this.GraphRezEnding.emit(this.id, this.graph.id);
    }

    /**
     * The graph that is Rez'd into the world
     */
    get graph() {
        return this.#graph;
    }

    /**
     * The id of the graph that is Rez'd into the world
     */
    get graphId() {
        return this.graph.id;
    }

    /**
     * The context in which this graph is to be rendered. See Entities.EntityHostType in the Overte apidocs.
     */
    get entityHostType() {
        return this.#entityHostType;
    }

    set entityHostType(entityHostType) {
        this.#entityHostType = entityHostType;
        // TODO rerender when the host type context changes
    }

    get document() {
        return this.#document;
    }

    set document(doc) {
        // TODO validate and then cleanup old document, if there is one
        this.#document = doc;
        // TODO finalise setup of new document
    }

    get DEFAULT_DOCUMENT() {
        const renderer = new tactile.renderer.TactileRenderer({ // TODO: Only attach renderer when we are ready to render
            position: this.position,
        });

        const options = {
            rows: 4,
            flowDirection: 'column',
            spacing: 0.1,
            margins: { top: 0.1, right: 0.1, bottom: 0.1, left: 0.1 },
        };

        const layout = new tactile.element.GridLayout(options);
        const elements = [layout];

        // for each node in graph:
        for(const node of this.graph.nodes) {
            // create Element for node
            const element = new tactile.element.TactileElement({ minWidth: 0.5 });
            // attach to layout
            layout.addElement(element);
        }

        return new tactile.element.TactileDocument({
            elements: elements,
            renderer: renderer,
            expandToFit: true,
        });
    }

    /**
     * The world position where this Graph has been Rez'd.
     * Note: This should be updated when the entity moves around the world, but it may not be strictly up to date at all times
     */
    get position() {
        // TODO update cached position if cache TTL has expired
        return this.#position;
    }

    set position(pos) {
        this.#position = pos;
        // TODO rerender when the position changes
    }

    /**
     * Rez or relocate this graph in the world at the specified posiition
     * @param {Vec3} [position] - The world coordinates where this graph should be
     */
    rez(position = this.position) {

    }

    // Signals

    /**
     * Emits when the graph is no longer being rezzed into the world.
     */
    GraphRezEnding = new incite.Signal("GraphRezEnding");

}

module.exports = GraphRez;
