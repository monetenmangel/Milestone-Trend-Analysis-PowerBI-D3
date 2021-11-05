/*
 *  Power BI Visual CLI
 *
 *  Copyright (c) Microsoft CorporationAll rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

'use strict';

import 'core-js/stable';
import './../style/visual.less';
import powerbi from 'powerbi-visuals-api';
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import DataView = powerbi.DataView;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;
import { VisualSettings } from './settings';
import * as d3 from 'd3';


// Build Interface for Data Structure

    interface ILineChartRow {
        index: string,
        milestone: string,
        report_date: Date,
        vor_ende: Date        
    }

export class Visual implements IVisual {
    private target: HTMLElement;
    private settings: VisualSettings;
    private container: d3.Selection<HTMLDivElement, any, HTMLDivElement, any>;

    constructor(options: VisualConstructorOptions) {
        console.log('Visual constructor', options);
        this.target = options.element;

        /** Create the chart container when the visual loads */
            this.container = d3.select(this.target)
                .append('div')
                    .attr('id', 'my_dataviz');
    }

    public update(options: VisualUpdateOptions) {
        console.log('Visual update', options);
        this.settings = Visual.parseSettings(options && options.dataViews && options.dataViews[0]);
         
         /** Clear down existing plot */
            this.container.selectAll('*').remove();

        /** Test 1: Data view has both fields added */
            let dataViews = options.dataViews;
            console.log('Test 1: Valid data view...');
            if (!dataViews
                || !dataViews[0]
                || !dataViews[0].categorical
                || !dataViews[0].categorical.categories
                || !dataViews[0].categorical.values
                || !dataViews[0].metadata
            ) {
                console.log('Test 1 FAILED. No data to draw table.');
                return;
            }

            let categorical = dataViews[0].categorical;

 
        // Map Data in JSON Structure

            let data: ILineChartRow[] = categorical.categories[0].values.map(
                (cat, idx) => (
                    {
                        index: <string>cat,
                        milestone: <string>categorical.values[0].values[idx],
                        report_date: <Date>categorical.values[1].values[idx],
                        vor_ende: <Date>categorical.values[2].values[idx]
                    }
                )
            );

        // Check the result

            console.log(data);
        
        // Create groups for every milestone

            let sumstat = d3.nest<ILineChartRow>()
                    .key(d => d.milestone)
                    .entries(data)
        
        // Check the result

            console.log(sumstat)

        // Set Dimensions 

        let margin = {top: 10, right: 60, bottom: 30, left: 60},
            width = options.viewport.width - margin.left - margin.right,
            height = options.viewport.height - margin.top - margin.bottom;

        // Append the svg object to the body of the page

        var svg = this.container
                .append('svg')
                    .attr('width', width + margin.left + margin.right)
                    .attr('height', height + margin.top + margin.bottom)
                .append('g')
                    .attr('transform',
                        'translate(' + margin.left + ',' + margin.top + ')');

    // Set Minimum and Maximum Values for the axes

    let minDate_report_date = d3.min(data, function(d){ return d.report_date})
    let maxDate_report_date = d3.max(data, function(d){ return d.report_date})
    
    // Add X axis

    let x = d3.scaleTime()
        .domain([minDate_report_date,maxDate_report_date])
        .range([0,width]);
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));

    // Add Y0 axis

    let y0 = d3.scaleTime()
        .domain([minDate_report_date,maxDate_report_date])
        .range([height,0])
    svg.append("g")
        .call(d3.axisLeft(y0))

    // Add Y1 axis

    let y1 = d3.scaleTime()
        .domain([minDate_report_date,maxDate_report_date])
        .range([height,0])
    svg.append("g")
        .attr("transform", "translate( " + width + ", 0 )")
        .call(d3.axisRight(y1))

    }

    private static parseSettings(dataView: DataView): VisualSettings {
        return VisualSettings.parse(dataView) as VisualSettings;
    }

    /**
     * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the
     * objects and properties you want to expose to the users in the property pane.
     *
     */
    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
        return VisualSettings.enumerateObjectInstances(this.settings || VisualSettings.getDefault(), options);
    }
}