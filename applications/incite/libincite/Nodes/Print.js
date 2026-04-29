//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

const Node = require('./Node.js');

class Print extends Node {
    constructor(data = {}) {
        super(data);
        this.inputs = [
            {
                name: "message",
                types: [
                    'string',
                ],
                value: "",

            },

        ],
        this.outputs = [];
    }



    static get type() {
        return 'print';
    }

    get inputMessage() {
        return this.inputs[0].connectedPort?.value ?? "";
    }

    execute() {
        console.log(this.inputMessage);
    }
}

module.exports = Print;
