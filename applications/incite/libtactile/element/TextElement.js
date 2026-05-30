"use strict"
//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

const TactileElement = require("./TactileElement.js");

/**
 * A TextElement for displaying text
 */
class TextElement extends TactileElement {

    #text

    constructor(options = {}) {
        super(options);
        this.text = options.text ?? "text";

    }

    get type() {
        return 'TextElement';
    }

    get text() {
        return this.#text;
    }

    set text(newText) {
        this.#text = newText;
        this.valid = false;
    }


}

module.exports = TextElement;
