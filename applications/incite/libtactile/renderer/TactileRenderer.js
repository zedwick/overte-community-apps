"use strict"
//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

const TactileElements = require("../element/index.js");
const BaseRenderer = require("./BaseRenderer.js");

/**
 * Render TactileElements to an Overte world
 * @property {string} rootEntityId
 * @property {array<string>} entities
 * @property {number} scale - The scale at which to render elements
 * @property {Vec3} originOffset
 * @property {Quant} orientation
 * @property {map} entityMap - entityId, elementId
 * @property {vec3} position
 * @property {Quant} rotation
 * @property {Vec3} dimensions
 * @property {number} rootWidth
 * @property {number} rootHeight
 * @property {number} rendererCount - The number of times this renderer has rendered
 * @property {Vec3} rootPosition - The location in the world where the root element is rendered
 * @property {Vec3} rootEntityPosition - The root entity's position in the world
 * @property {Vec3} rootEntityRotation - The root entity's world rotation
 */
class TactileRenderer extends BaseRenderer {
    #rootEntityId

    constructor(options = {}) {
        super(options);
        //this.element = options.element ?? null;
        this.#rootEntityId = options.rootEntityId ?? null;
        this.entities = options.entities ?? [];
        this.scale = options.scale ?? 1;
        this.originOffset = options.originOffset ?? { x: 0, y: 0, z: 0 };
        this.orientation = options.orientation ?? { x: 0, y: 0, z: 0, w: 1 };
        this.entityMap = new Map();

        this.position = options.position ?? { x: 0, y: 0, z: 0 };
        this.rotation = options.rotation ?? { x: 0, y: 0, z: 0, w: 1 };
        this.dimensions = {x: 0, y: 0, z: 0}
        this.rootWidth = 0;
        this.rootHeight = 0;

        Script.scriptEnding.connect(() => {
            this.cleanup();
        });

        this.rendererCount = 0;
    }

    get rootEntityId() {
        return this.#rootEntityId;
    }

    set rootEntityId(entityId) {
        this.#rootEntityId = entityId;
        return this;
    }

    get rootEntityPosition() {
        return this.position; // TODO: Get updated entity position
    }

    get rootEntityRotation() {
        return this.rotation; // TODO: Get updated entity rotation
    }

    get rootPosition() {
        return this.rootEntityId == undefined ? this.position : this.rootEntityPosition; // TODO: What if the root element somehow has a non-origin x/y?
    }

    addElement(layoutElement, entityId) {
        this.entityMap.set(layoutElement.id, entityId);
        return this;
    }

    removeElement(layoutElementOrId) {
        const id = layoutElementOrId instanceof LayoutElement.id ?? layoutElementOrId;
        Entities.deleteEntity(this.entityMap.get(id));
        this.entities.delete(id);
        this.entityMap.delete(id);
        return this;
    }

    /**
     * Final cleanup tasks before this renderer ceases activities
     */
    cleanup() {
        for (const entityId of this.entities) {
            Entities.deleteEntity(entityId);
        }
    }

    /**
     * Creates an entity to represent the given element
     * @param {TactileElement} element
     * @param {boolean} isRoot - Is this entity the root entity all other entities will be parented to?
     */
    createEntity(element, isRoot, renderType = "local") {
        console.log(`createEntity ... offsetZ=${element.offsetZ}, depth=${element.depth}`);

        console.log(`render element ${this.rendererCount} has a depth of ${element.depth} with offset of ${element.offsetZ} and parent depth of ${element.parent?.depth}`);
        if (isRoot) {
            // this is the root element, save its entityId seperately.
            console.log("Before I create root entity; saving some details...");
            this.dimensions = {x: element.cache.width, y: element.cache.height, z: 0.2};
            console.log(` ... dimensions: ${JSON.stringify(this.dimensions)}`);
            //this.entityOrigin = {x: entityProperties.position.x - (element.cache.width/2), y: entityProperties.position.y - (element.cache.height/2), z: entityProperties.position.z - 0.1}
            console.log(` ... entityOrigin: ${JSON.stringify(this.entityOrigin)}`);
            console.log("...done!");
        }
        const entityProperties = this.entityProperties(element);
        console.log(`Placing entity ${element.id} (${this.rendererCount}) @ ${JSON.stringify(entityProperties.position)}`);
        const entityId = Entities.addEntity(entityProperties, renderType);

        // Store entities for later
        this.entities.push(entityId);
        this.entityMap.set(element.id, entityId);

        if (isRoot) {
            // this is the root element, save its entityId seperately.
            console.log("Created root entity; saving some details...");
            this.rootEntityId = entityId;
            console.log(` ... rootEntityId: ${this.rootEntityId}`);
            console.log("...done!");
        }
        this.rendererCount += 1;
        return entityId;
    }

    /**
     * Creates entityProperties for rendering the given element
     * @param {Object} element
     */
    entityProperties(element) {
        console.log("entityProperties - start");
        const DEFAULT_ENTITY_PROPERTIES = {
            All: {
                description: "",
                rotation: { x: 0, y: 0, z: 0, w: 1 },
                collidesWith: "static,dynamic,kinematic,otherAvatar,myAvatar",
                collisionSoundURL: "",
                cloneable: false,
                ignoreIK: true,
                canCastShadow: true,
                href: "",
                script: "",
                serverScripts: "",
                velocity: {
                    x: 0,
                    y: 0,
                    z: 0
                },
                angularVelocity: {
                    x: 0,
                    y: 0,
                    z: 0
                },
                restitution: 0.5,
                friction: 0.5,
                density: 1000,
                dynamic: false,
            },
            TextElement: {
                type: "Text",
                text: "Text",
                dimensions: {
                    x: 0.65,
                    y: 0.3,
                    z: 0.01
                },
                textColor: { red: 255, green: 255, blue: 255 },
                backgroundColor: { red: 0, green: 0, blue: 0 },
                lineHeight: 0.06,
                faceCamera: false,
            }
        }

        const position = this.TwoToThreeD(element.cache.absoluteX,
                                          element.cache.absoluteY,
                                          element.cache.width,
                                          element.cache.height,
                                          (element.offsetZ*element.depth),
                                          element.id == 0);

        // set default properties
        let properties = { ... DEFAULT_ENTITY_PROPERTIES.All,
                            name: `Tactile Element ${element.id} (${this.rendererCount})`,
                            position: position,
                            rotation: this.rootEntityRotation,
                            parentID: element.id == 0 ? "{00000000-0000-0000-0000-000000000000}" : this.rootEntityId,
                            dimensions: [element.cache.width, element.cache.height, 0.2],
        }

        console.log("entityProperties - switch time!");

        console.log("element.type is", element.type);

        // Add variant-specific properties
        switch(element.type) {
            case 'TextElement':
                console.log("entityProperties - TextElement!");
                properties = { ... properties, ... DEFAULT_ENTITY_PROPERTIES.TextElement }
                properties.text = element.text;
                break;
            default:
                console.log("entityProperties - default!")
                properties.type = "Box";
                break;
        }

        console.log("entityProperties - I switched.");

        return properties;
    }

    /**
     * Updates the entity which the given element is rendered to
     */
    updateEntity(element, isRoot) {
        const entityProperties = this.entityProperties(element);

        Entities.editEntity(this.entityMap.get(element.id), entityProperties);
    }

    /**
     * Renders the given element's current state into the world
     */
    renderElement(element) {
        const entityId = this.entityMap.get(element.id);
        const isRoot = element.id == 0;
        if (entityId) {
            this.updateEntity(element, isRoot);
        } else {
            this.createEntity(element, isRoot); // TODO: IsRoot? need to check if it's a TactileDocument
        }
    }

    /**
     * Convert 2D coordinates to 3D coordinates for rendering to world
     */
    TwoToThreeD(x,
                y,
                width = 0,
                height = 0,
                offsetZ = 0,
                isRoot = false) {
        // true origin
        const rootPosition = this.rootPosition;

        // Adjusted origin
        // 2D elements are positioned by their top left corner, whilst 3D entities are positioned by their center;
        //
        const originX = rootPosition.x -(this.dimensions.x/2);
        const originY = rootPosition.y +(this.dimensions.y/2);

        // Offset from origin
        offsetZ = rootPosition.z + offsetZ;

        print(`TwoToThreeD .. x=${x}, y=${y}, originX=${originX}, originY=${originY}, offsetZ=${offsetZ}, width=${width}, height=${height}, isRoot=${isRoot}`);

        return {
            x: (x) * this.scale + originX + (width/2),
            y: (-y) * this.scale + originY - (height/2), // NOTE: If we need to use this for the root element position after the very first time, this could be wrong
            z: offsetZ, // Bring forward based on depth
        };
    }
}

module.exports = TactileRenderer;
