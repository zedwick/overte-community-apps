"use strict"
//
//  Created by Zedwick, 2026
//  Copyright 2026 Overte e.V.
//

const Layout = require("./Layout.js");

/**
 * Base Layout class
 *
 */
class ColumnLayout extends Layout {
    constructor(options) {
        super(options);

    }

    get type() {
        return 'ColumnLayout';
    }

    measure() {
        // Let's measure the width and height of each row, to accomodate the desired element sizes
        console.log("Meausuring...");

        let totalWidth = this.preferredWidth;
        let totalChildWidth = 0;
        let totalChildHeight = 0;
        let totalHeight = this.margins.top;
        this.visibleElements.forEach((element, index) => {

            const dimensions = element.measure();
            const width = dimensions.width;
            const height = dimensions.height;

            totalChildHeight += height

            if (totalChildWidth < width) totalChildWidth = width;
            totalHeight += (index != 0 ? this.spacing : 0) + height;
        });
        totalHeight += this.margins.bottom;
        totalHeight = Math.max(totalHeight, this.preferredHeight);

        if (totalChildWidth > totalWidth) totalWidth = totalChildWidth + this.margins.left + this.margins.right;
        totalWidth = Math.max(totalWidth, this.preferredWidth);

        let measuredWidth = Math.max(this.minWidth, Math.min(totalWidth, this.maxWidth));
        let measuredHeight = Math.max(this.minHeight, Math.min(totalHeight, this.maxHeight));
        measuredWidth = measuredWidth !== Infinity ? measuredWidth : Number.MAX_SAFE_INTEGER;
        measuredHeight = measuredHeight !== Infinity ? measuredHeight : Number.MAX_SAFE_INTEGER;

        console.log("... Measured!");

        console.log(`width: ${measuredWidth}, height: ${measuredHeight}`);

        this.cache.measuredWidth = measuredWidth;
        this.cache.measuredHeight = measuredHeight;
        this.cache.totalChildWidth = totalChildWidth;
        this.cache.totalChildHeight = totalChildHeight;

        return {
            width: measuredWidth,
            height: measuredHeight,
        }
    }

    layout(availableWidth, availableHeight, x, y) {
        console.log(`availableWidth: ${availableWidth}, availableHeight: ${availableHeight}, x: ${x}, y: ${y}`)

        const maxWidth = Math.max(this.minWidth, Math.min(availableWidth, this.maxWidth));
        const maxHeight = Math.max(this.minHeight, Math.min(availableHeight, this.maxHeight));

        const finalWidth = Math.min(this.cache.measuredWidth, maxWidth);
        const finalHeight = Math.min(this.cache.measuredHeight, maxHeight);

        const innerMeasuredWidth = this.cache.measuredWidth - this.margins.left - this.margins.right;
        const innerMeasuredHeight = this.cache.measuredHeight - this.margins.top - this.margins.bottom;

        const innerWidth = finalWidth - this.margins.left - this.margins.right;
        const innerHeight = finalHeight - this.margins.top - this.margins.bottom;

        const scaleX = innerWidth / innerMeasuredWidth;
        const scaleY = innerHeight / innerMeasuredHeight;

        const visibleElements = this.visibleElements;
        const numElements = visibleElements.length;

        const contentWidth = innerWidth;
        const contentHeight = (innerHeight - (this.spacing * (numElements-1)));
        const genericCellHeight = contentHeight / numElements;

        const finalSpacing = (innerHeight - (this.cache.totalChildHeight * scaleX)) / visibleElements.length;

        this.cache.x = x;
        this.cache.y = y;
        this.cache.absoluteX = (this.parent ? this.parent.cache.absoluteX : 0) + x;
        this.cache.absoluteY = (this.parent ? this.parent.cache.absoluteY : 0) + y;
        this.cache.width = finalWidth;
        this.cache.height = finalHeight;

        const currentX = this.margins.left;
        let currentY = this.margins.top;

        console.log("Calculating positions...");
        this.visibleElements.forEach((element, index) => {
            const cellWidth = contentWidth;
            const cellHeight = genericCellHeight;

            if (index != 0) currentY += this.spacing;

            element.layout(cellWidth, cellHeight, currentX, currentY);

        currentY += cellHeight;

        });

        console.log("totalWidth:", finalWidth, "totalHeight:", finalHeight);

        this.valid = true;

        return this.cache;
    }

}

module.exports = ColumnLayout;
