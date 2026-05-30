"use strict"
//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

const TactileElement = require("./TactileElement.js");
const BaseRenderer = require("../renderer/BaseRenderer.js");
const Signal = require("../../libincite/Signal.js");

/**
 * Contains the elements
 *
 * @property {number} _nextID - The next id which can be assigned
 * @property {array<number>} _availableIds - ids which were in use but have since become available
 * @property {Map} _elementMap - elements indexed by their Id
 * @property {array<BaseRenderer>} renderers - renderers attached to this document
 * @property {TactileElement} root - The top level TactileElement container, all other elements are children in the tree below this element
 */
class TactileDocument extends TactileElement {


    constructor(options) {
        super(options);
        console.log("TactileDocument constructor, after super");

        this.expandToFit = options.expandToFit ?? false; // When true will expand the container document size to fit the contents. When false will constrain the contents to fit the container document size.

        this.depth = 0;
        if (!this._availableIds) {
            this._nextId = 1;
            this._availableIds = [];
            this._elementMap = new Map();
        }

        console.log("TactileDocument constructor preparing renderers");
        this.renderers = [];
        if (options.renderer instanceof BaseRenderer) {
            console.log("BaseRenderer being pushed during construction");
            this.renderers.push(options.renderer)
        } else if (Array.isArray(options.renderer)) { // TODO: Is it an array of BaseRenderers?
            console.log("Replacing renderers during construction");
            this.renderers = options.renderer;
        }

        this._elementMap.set(0, this);

    }

    get type() {
        return 'TactileDocument';
    }

    /**
     * The root element; TODO: Should be able to support multiple children...
     */
    get root() {
        return this.elements[0];
    }

    get id() {
        return 0;
    }

    set id(id) {
        return
    }

    /**
     * Called when an element is added as a child of this tree
     */
    _onElementAttachedToTree(element) {
        // This can be called during super construction, which means we don't get a chance to create these variables
        if (!this._availableIds) {
            this._nextId = 1;
            this._availableIds = [];
            this._elementMap = new Map();
        }
        const id = this._availableIds.length > 0 ? this._availableIds.pop() : this._nextId++;
        element.id = id;
        this._elementMap.set(id, element);
    }

    _onElementInvalidated(element) {
        console.info(`Element ${element.id} invalidated! What now?`);

        // mark this document invalid
        if (this.valid) this.valid = false;

        // Schedule a task to relayout after a short delay;
        // Find invalid branches and measure/layout
        this.scheduleUpdate();
    }

    scheduleUpdate() {
        if (this.updateScheduled) return; // We'll just let the update go ahead as planned
        if (typeof Script != 'undefined') { // Are we in Overte?
            Script.setTimeout(() => {
                this.updateScheduled = false;
                this.update();
            }, 100);
        } else { // We're not in Overte, probably node.js.
            setTimeout(() => {
                this.updateScheduled = false;
                this.update();
            }, 100);
        }
        this.updateScheduled = true;

    }

    /**
     * Called when an element of this tree has become valid
     */
    _onElementValidated(element) {
        // Inform renderer of the newly valid element,
        // so they might choose to render it again at some
        // point in the future.

        console.info(`Element ${element.id} validated! What now?`);

        for (const renderer of this.renderers) {
            console.log("Informing rendered of validation.");
            renderer.onElementValidated(this, element);
        }
    }

    /**
     * Add a new renderer responsible for rendering this TactileDocument
     */
    attachRenderer(renderer) {
        this.renderers.push(renderer);
    }

    /**
     * Remove a renderer from this TactileDocument,
     * so it will no longer be repsonsible for rendering.
     */
    detachRenderer(renderer) {
        this.renderers = this.renderers.filter(r => r != renderer);
    }

    update() {
        console.log("Document update");
        console.log("Number of elements:", this.elements.length);

        // iterate through tree
        // when element is not valid; do geometry calc

        // Do element geometry calculations
        if (this.elements.length > 0) { // TODO: Support more than one child element
            console.log("We got elements!");
            if (this.root.valid) return; // Skip if nothing to do.
            console.log("We invalid!");
            const rootSize = this.root.measure();

            const rootWidth = this.expandToFit ? rootSize.width : this.preferredWidth;
            const rootHeight = this.expandToFit ? rootSize.height : this.preferredHeight;

            const totalWidth = rootWidth + this.margins.left + this.margins.right;
            const totalHeight = rootHeight + this.margins.top + this.margins.bottom;

            this.cache.x = 0;
            this.cache.y = 0;
            this.cache.absoluteX = 0;
            this.cache.absoluteY = 0;
            this.cache.width = totalWidth;
            this.cache.height = totalHeight;

            this.valid = true;

            this.root.layout(rootWidth, rootHeight, 0, 0);

        }
    }

    /**
     * Final tasks prior to deletion
     */
    cleanup() {
        for(const renderer of this.renderers) {
            renderer.cleanup();
        }
    }

    /**
     * Emits when this TactileDocument is deleted.
     *
     * @type Signal<(documentId: number) => void>
     */
    documentDeletedEvent = new Signal("DocumentDeletedEvent"); // TODO
}

module.exports = TactileDocument;
