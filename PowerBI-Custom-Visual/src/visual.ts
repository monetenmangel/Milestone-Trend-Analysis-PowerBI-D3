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

//####################################################################################################################
// TEIL 1
//####################################################################################################################

//-------------------------------------------------------------------------------------------------------------------
// Import
//-------------------------------------------------------------------------------------------------------------------

'use strict';

import 'core-js/stable';
import 'regenerator-runtime/runtime'; 
import '../style/visual.less';
import './../style/visual.less';
import powerbi from 'powerbi-visuals-api';
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import DataView = powerbi.DataView;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import ISandboxExtendedColorPalette = powerbi.extensibility.ISandboxExtendedColorPalette;
import { VisualSettings } from './settings';
import { valueFormatter } from "powerbi-visuals-utils-formattingutils";

import ITooltipService = powerbi.extensibility.ITooltipService;
import {
    createTooltipServiceWrapper,
    ITooltipServiceWrapper,
} from 'powerbi-visuals-utils-tooltiputils'



import * as d3 from 'd3';

//-------------------------------------------------------------------------------------------------------------------
// Interfaces
//-------------------------------------------------------------------------------------------------------------------

// Build Interface for Data Structure

interface ILineChartRow {
    milestone: string,
    report_date: Date,
    vor_ende: Date,
    tooltip: string                
}

// Interface for diagonale

interface IDiagonal {
    begin: Date
    end: Date
}

//-------------------------------------------------------------------------------------------------------------------
// Klassen
//-------------------------------------------------------------------------------------------------------------------

// Möglichkeiten für das Drop-Down Menü - wird in settings.ts importiert
// hier definiert, da logischer
export enum DateTypes {
    Month = <any>"Month",
    Quarter = <any>"Quarter",
    Year = <any>"Year"
}

// Helferklasse, damit Datumswerte, die in den Daten liegen als Date-Format importiert werden und nicht als string
export class Utils {
    public static RESET_TIME(date: Date): Date {
        return new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate());
    }
    
    public static PARSE_DATE(value: any): Date {
        const typeOfValue: string = typeof value;
        let date: Date = value;
    
        if (typeOfValue === "number") {
            date = new Date(value, 0);
        }
    
        if (typeOfValue === "string") {
            date = new Date(value);
        }
    
        if (date && date instanceof Date && date.toString() !== "Invalid Date") {
            return Utils.RESET_TIME(date);
        }
    
        return undefined;
    }
}

// Definiere das Visual mit allen notwendigen properties
export class Visual implements IVisual {
    private target: HTMLElement;
    private settings: VisualSettings;
    private container: d3.Selection<HTMLDivElement, any, HTMLDivElement, any>; // private container: d3.Selection<any, any, any, any>;???
    private svg: d3.Selection<SVGElement, any, any, any>
    private tooltipServiceWrapper: ITooltipServiceWrapper;

//####################################################################################################################
// TEIL 2
//####################################################################################################################

//-------------------------------------------------------------------------------------------------------------------
// Constructor
//-------------------------------------------------------------------------------------------------------------------

constructor(options: VisualConstructorOptions) {

    console.log('Visual constructor', options);
    this.target = options.element;

    /** Create the chart container when the visual loads */
    this.container = d3.select(this.target)
        .append('div')
            .attr('id', 'my_dataviz');
            
    this.tooltipServiceWrapper = createTooltipServiceWrapper(
        options.host.tooltipService,
        options.element)  

    }
        
//####################################################################################################################
// TEIL 2
//####################################################################################################################

//-------------------------------------------------------------------------------------------------------------------
// Update Methode
//-------------------------------------------------------------------------------------------------------------------

public update(options: VisualUpdateOptions) {
        console.log('Visual update', options);
    this.settings = Visual.parseSettings(options && options.dataViews && options.dataViews[0]);
          
    //Clear down existing plot
    this.container.selectAll('*').remove();

//-------------------------------------------------------------------------------------------------------------------
// Valide Daten
//-------------------------------------------------------------------------------------------------------------------

    //Test 1: Data view has both fields added
    let dataViews = options.dataViews;
    console.log('Test 1: Valid data view...');
    if (!dataViews
        || !dataViews[0]
        || !dataViews[0].table
        || !dataViews[0].table.rows
        || !dataViews[0].table.columns
        || !dataViews[0].metadata
    ) {
    console.log('Test 1 FAILED. No data to draw table.');
    return;
    }

//-------------------------------------------------------------------------------------------------------------------
// Daten im Modell speichern
//-------------------------------------------------------------------------------------------------------------------

    let table = dataViews[0].table

     // Map Data in JSON Structure

    let data: ILineChartRow[] = table.rows.map(
        (cat, idx) => (
            {
                milestone: <string>table.rows[idx][0],
                report_date: Utils.PARSE_DATE(table.rows[idx][1]),
                vor_ende: Utils.PARSE_DATE(table.rows[idx][2]),
                tooltip: <string>table.rows[idx][3],
            })
    )

    // Check the result

    console.log(data);    
  
    // Create groups for every milestone

        let sumstat = d3.nest<ILineChartRow>()
                .key(d => d.milestone)
                .entries(data)
    
    // Check the result

    console.log(sumstat)

//-------------------------------------------------------------------------------------------------------------------
// Daten für Diagonale
//-------------------------------------------------------------------------------------------------------------------

    // Format Dates - notwendig für die Einstellung des Betrachtungszeitraums

    let parseDate = d3.timeParse("%d.%m.%Y")

    // Add Project Begin and and from formatting pane 

    let diagonale: IDiagonal = {
        begin: parseDate(this.settings.dataPoint.projektStart),
        end: parseDate(this.settings.dataPoint.projektEnd)
    }  

    console.log(diagonale)

//-------------------------------------------------------------------------------------------------------------------
// "Leinwand" bauen
//-------------------------------------------------------------------------------------------------------------------
   
    // Set Dimensions 

    let margin = {top: 10, right: 30, bottom: 30, left: 60},
        width = options.viewport.width - margin.left - margin.right,
        height = options.viewport.height - margin.top - margin.bottom;

    // Append the svg object to the body of the page

    let svg = this.container
            .append('svg')
                .attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom)
            .append('g')
                .attr('transform',
                    'translate(' + margin.left + ',' + margin.top + ')');

//-------------------------------------------------------------------------------------------------------------------
// Achsen definieren
//-------------------------------------------------------------------------------------------------------------------

    // Set Minimum and Maximum for the report date

    let minDate_report_date = parseDate(this.settings.dataPoint.projektStart)
    let maxDate_report_date = parseDate(this.settings.dataPoint.projektEnd)

    // Define x position

    let x = d3.scaleTime()
        .domain([minDate_report_date,maxDate_report_date])
        .range([0,width])

    // Define y0 position

    let y0 = d3.scaleTime()
        .domain([minDate_report_date,maxDate_report_date])
        .range([height,0])

    // Define y1 position

    let y1 = d3.scaleTime()
        .domain([minDate_report_date,maxDate_report_date])
        .range([height,0])

//-------------------------------------------------------------------------------------------------------------------
// Diagonale zeichnen
//-------------------------------------------------------------------------------------------------------------------

    // Add diagonal Line first so it is behind the dots

    svg.append("line")
    .attr("y1", y1(minDate_report_date))
    .attr("y2", y1(maxDate_report_date))
    .attr("x1", x(minDate_report_date))
    .attr("x2", x(maxDate_report_date))
    .style("stroke", "darkgrey")
    .attr("stroke-width", 1.5)

//-------------------------------------------------------------------------------------------------------------------
// Meilenstein-Linien zeichnen
//-------------------------------------------------------------------------------------------------------------------

    //array with colors
    let colors =    ["#A09ABC", "#D87CAC", "#0EAD69", "#F9A03F", "#372549", "#B75D69",
                    "#E4572E", "#2E282A", "#76B041", "#2E282A", "#8D6B94", "#9DCDC0",
                    "#AC9969", "#7776BC", "#FF674D", "#243E36", "#5C164E", "#0D00A4",
                    "#754043", "#C8963E", "#745C97", "#BFCDE0", "#94A89A", "#232ED1",
                    "#E71D36", "#011627", "#2EC4B6", "#BF8B85", "#D4C685", "#2F4550",
                    "#673C4F", "#83B5D1", "#BDD358", "#999799", "#7353BA", "#99F7AB",
                    "#ED6A5A", "#5CA4A9", "#989788", "#40C9A2", "#664147", "#A72608",
                    "#C493B0", "#6A7FDB", "#45CB85", "#E08DAC", "#274029", "#64B6AC",
                    "#3BCEAC", "##D87CAC", "#0EAD69", "#F9A03F", "#372549", "#B75D69",
                    "#E4572E", "#2E282A", "#76B041", "#2E282A", "#8D6B94", "#9DCDC0",
                    "#AC9969", "#7776BC", "#FF674D", "#243E36", "#5C164E", "#0D00A4",
                    "#754043", "#C8963E", "#745C97", "#BFCDE0", "#94A89A", "#232ED1",
                    "#E71D36", "#011627", "#2EC4B6", "#BF8B85", "#D4C685", "#2F4550",
                    "#673C4F", "#83B5D1", "#BDD358", "#999799", "#7353BA", "#99F7AB",
                    "#ED6A5A", "#5CA4A9", "#989788", "#40C9A2", "#664147", "#A72608",
                    "#C493B0", "#6A7FDB", "#45CB85", "#E08DAC", "#274029", "#64B6AC",
                    "#3BCEAC", "##D87CAC", "#0EAD69", "#F9A03F", "#372549", "#B75D69",
                    "#E4572E", "#2E282A", "#76B041", "#2E282A", "#8D6B94", "#9DCDC0",
                    "#AC9969", "#7776BC", "#FF674D", "#243E36", "#5C164E", "#0D00A4",
                    "#754043", "#C8963E", "#745C97", "#BFCDE0", "#94A89A", "#232ED1",
                    "#E71D36", "#011627", "#2EC4B6", "#BF8B85", "#D4C685", "#2F4550",
                    "#673C4F", "#83B5D1", "#BDD358", "#999799", "#7353BA", "#99F7AB",
                    "#ED6A5A", "#5CA4A9", "#989788", "#40C9A2", "#664147", "#A72608",
                    "#C493B0", "#6A7FDB", "#45CB85", "#E08DAC", "#274029", "#64B6AC",]

    // Add Milestone lines

    if (this.settings.dataPoint.dataColor == true) {
    svg.selectAll(".line")
    .data(sumstat)
    .enter()
    .append("path")
        .attr("fill", "none")
        .attr("stroke", 
            function (ss, i) {return colors[i]}
        )
        .attr("stroke-width", this.settings.dataPoint.thickness)
        .attr("d", function(d){
        return d3.line<ILineChartRow>()
            .x(function(d) { return x(d.report_date); })
            .y(function(d) { return y0(d.vor_ende); })
            (d.values)
        })
    } else {
        svg.selectAll(".line")
    .data(sumstat)
    .enter()
    .append("path")
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-width", this.settings.dataPoint.thickness)
        .attr("d", function(d){
        return d3.line<ILineChartRow>()
            .x(function(d) { return x(d.report_date); })
            .y(function(d) { return y0(d.vor_ende); })
            (d.values)
        })
    }     


//-------------------------------------------------------------------------------------------------------------------
// Meilenstein-Punkte zeichnen
//-------------------------------------------------------------------------------------------------------------------

    // Add Milestone Dots

    let selection = svg.append('g')
    .selectAll("dot")
    .data(data)
    .enter()
    .append("circle")
        .attr("cx", function (d) { return x(d.report_date); } ) // gives x coordinate
        .attr("cy", function (d) { return y0(d.vor_ende); } ) // gives y coordinate
        .attr("r", this.settings.dataPoint.thickness * 2) // defines size of the dot
        .style("fill", "black")

//-------------------------------------------------------------------------------------------------------------------
// Tooltips
//-------------------------------------------------------------------------------------------------------------------

    // Tooltips, je nach dem, ob diese eingestellt wurden oder nicht
    // Date muss als string übergeben werden --> richtige Teile des Datums nehmen und zusammensetzen

if (this.settings.dataPoint.tooltipReportDate == true &&
    this.settings.dataPoint.tooltipVorEnde == true &&
    this.settings.dataPoint.tooltipFree == true){
    this.tooltipServiceWrapper.addTooltip(selection, (data: ILineChartRow) =>  [{
            displayName: data.milestone,
            value: data.tooltip + "\n" +
                this.settings.dataPoint.labelTooltip3  + "\n" +
                this.settings.dataPoint.labelTooltip1 + " " + data.vor_ende.getDate() + "." + (data.vor_ende.getMonth()+1) + "." + data.vor_ende.getFullYear() + "\n" +
                this.settings.dataPoint.labelTooltip2 + " " + data.report_date.getDate() + "." + (data.report_date.getMonth()+1) + "." + data.report_date.getFullYear()
            
    }]);
} else if (this.settings.dataPoint.tooltipReportDate == true &&
    this.settings.dataPoint.tooltipVorEnde == true &&
    this.settings.dataPoint.tooltipFree == false){
    this.tooltipServiceWrapper.addTooltip(selection, (data: ILineChartRow) =>  [{
        displayName: data.milestone,
        value: data.tooltip + "\n" +
            this.settings.dataPoint.labelTooltip1 + " " + data.vor_ende.getDate() + "." + (data.vor_ende.getMonth()+1) + "." + data.vor_ende.getFullYear() + "\n" +
            this.settings.dataPoint.labelTooltip2 + " " + data.report_date.getDate() + "." + (data.report_date.getMonth()+1) + "." + data.report_date.getFullYear()
        
}]);
} else if (this.settings.dataPoint.tooltipReportDate == true &&
    this.settings.dataPoint.tooltipVorEnde == false &&
    this.settings.dataPoint.tooltipFree == false){
    this.tooltipServiceWrapper.addTooltip(selection, (data: ILineChartRow) =>  [{
        displayName: data.milestone,
        value: data.tooltip + "\n" +
            this.settings.dataPoint.labelTooltip1 + " " + data.vor_ende.getDate() + "." + (data.vor_ende.getMonth()+1) + "." + data.vor_ende.getFullYear() + "\n" 
        
}]);
} else if (this.settings.dataPoint.tooltipReportDate == false &&
    this.settings.dataPoint.tooltipVorEnde == true &&
    this.settings.dataPoint.tooltipFree == true){
    this.tooltipServiceWrapper.addTooltip(selection, (data: ILineChartRow) =>  [{
        displayName: data.milestone,
        value: data.tooltip + "\n" +
            this.settings.dataPoint.labelTooltip3 + "\n" +
            this.settings.dataPoint.labelTooltip2 + " " + data.report_date.getDate() + "." + (data.report_date.getMonth()+1) + "." + data.report_date.getFullYear()
        
}]);
} else if (this.settings.dataPoint.tooltipReportDate == false &&
    this.settings.dataPoint.tooltipVorEnde == false &&
    this.settings.dataPoint.tooltipFree == true){
    this.tooltipServiceWrapper.addTooltip(selection, (data: ILineChartRow) =>  [{
        displayName: data.milestone,
        value: data.tooltip + "\n" +
            this.settings.dataPoint.labelTooltip3 + "\n"
        
}]);
} else if (this.settings.dataPoint.tooltipReportDate == false &&
    this.settings.dataPoint.tooltipVorEnde == true &&
    this.settings.dataPoint.tooltipFree == false){
    this.tooltipServiceWrapper.addTooltip(selection, (data: ILineChartRow) =>  [{
        displayName: data.milestone,
        value: data.tooltip + "\n" +
            this.settings.dataPoint.labelTooltip2 + " " + data.report_date.getDate() + "." + (data.report_date.getMonth()+1) + "." + data.report_date.getFullYear()
        
}]);
} else if (this.settings.dataPoint.tooltipReportDate == true &&
    this.settings.dataPoint.tooltipVorEnde == false &&
    this.settings.dataPoint.tooltipFree == true){
    this.tooltipServiceWrapper.addTooltip(selection, (data: ILineChartRow) =>  [{
        displayName: data.milestone,
        value: data.tooltip + "\n" +
            this.settings.dataPoint.labelTooltip3 + "\n" +
            this.settings.dataPoint.labelTooltip1 + " " + data.report_date.getDate() + "." + (data.report_date.getMonth()+1) + "." + data.report_date.getFullYear()
        
}]);
} else {
    this.tooltipServiceWrapper.addTooltip(selection, (data: ILineChartRow) =>  [{
        displayName: data.milestone,
        value: data.tooltip + "\n" + ""
        
}]);
}

//-------------------------------------------------------------------------------------------------------------------
// "Cheat" Viereck
//-------------------------------------------------------------------------------------------------------------------

    // Viereck um Linien links der y-achse zu verstecken, falls der Betrachtungszeitraum angepasst wird

    svg.append("rect")
        .attr("x", 0 - margin.left)
        .attr("y", 0)
        .attr("width", margin.left)
        .attr("height", options.viewport.height)
        .attr("fill", "white")

//-------------------------------------------------------------------------------------------------------------------
// Achsen zeichnen
//-------------------------------------------------------------------------------------------------------------------

// Definition von bestimmten Zeitintervallen in Millisekunden, um diese als axis ticks darstellen zu können

const MillisecondsInASecond: number = 1000;
    const MillisecondsInAMinute: number = 60 * MillisecondsInASecond;
    const MillisecondsInAHour: number = 60 * MillisecondsInAMinute;
    const MillisecondsInADay: number = 24 * MillisecondsInAHour;
    const MillisecondsInAMonth: number = 30 * MillisecondsInADay;
    const MillisecondsInAYear: number = 365 * MillisecondsInADay;
    const MillisecondsInAQuarter: number = MillisecondsInAYear / 4;

    const begin: Date = parseDate(this.settings.dataPoint.projektStart);
    const end: Date = parseDate(this.settings.dataPoint.projektEnd);

    // X Axis
    
    if (this.settings.dateType.type == DateTypes.Month){
        let dateTypeMilliseconds: number = MillisecondsInAMonth;

        let ticks: number = Math.ceil(Math.round(end.valueOf() - begin.valueOf()) / dateTypeMilliseconds);
        ticks = ticks < 2 ? 2 : ticks;
    
        // Add X axis - month
    
        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x)
            .ticks(ticks)
            )

    } else if (this.settings.dateType.type == DateTypes.Quarter){
        let dateTypeMilliseconds: number = MillisecondsInAQuarter;

        let ticks: number = Math.ceil(Math.round(end.valueOf() - begin.valueOf()) / dateTypeMilliseconds);
        ticks = ticks < 2 ? 2 : ticks;
    
        // Add X axis - Quarter
    
        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x)
            .ticks(ticks)
            )

    } else {let dateTypeMilliseconds: number = MillisecondsInAYear;
    
        let ticks: number = Math.ceil(Math.round(end.valueOf() - begin.valueOf()) / dateTypeMilliseconds);
        ticks = ticks < 2 ? 2 : ticks;
    
        // Add X axis - Year
    
        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x)
            .ticks(ticks)
            )
    
    }    

    // Y0 axis

    if (this.settings.dateType.type == DateTypes.Month){
        let dateTypeMilliseconds: number = MillisecondsInAMonth;

        let ticks: number = Math.ceil(Math.round(end.valueOf() - begin.valueOf()) / dateTypeMilliseconds);
        ticks = ticks < 2 ? 2 : ticks;
    
        // Add X axis - month
    
        svg.append("g")
        .call(d3.axisLeft(y0)
        .ticks(ticks))

    } else if (this.settings.dateType.type == DateTypes.Quarter){
        let dateTypeMilliseconds: number = MillisecondsInAQuarter;

        let ticks: number = Math.ceil(Math.round(end.valueOf() - begin.valueOf()) / dateTypeMilliseconds);
        ticks = ticks < 2 ? 2 : ticks;
    
        // Add Y0 axis - Quarter
    
        svg.append("g")
        .call(d3.axisLeft(y0)
        .ticks(ticks))

    } else {let dateTypeMilliseconds: number = MillisecondsInAYear;
    
        let ticks: number = Math.ceil(Math.round(end.valueOf() - begin.valueOf()) / dateTypeMilliseconds);
        ticks = ticks < 2 ? 2 : ticks;
    
        // Add Y0 axis - Quarter
        
        svg.append("g")
        .call(d3.axisLeft(y0)
        .ticks(ticks))
    
    }   

    // Add Y1 axis
    
    svg.append("g")
        .attr("transform", "translate( " + width + ", 0 )")
        .call(d3.axisRight(y1) // Remove the axis ticks
            .ticks(0))
        .call(g => g.select(".domain")
            .remove()) // Remove the axis itself


//-------------------------------------------------------------------------------------------------------------------
// Labels einfügen
//-------------------------------------------------------------------------------------------------------------------

// Loop iterates through sumstat object and places for every first Item of "Vorr_Ende" a textfield
// As text is the i version of the key of the sumstat object used

// Labels placed at the end of the lines

if (this.settings.dataPoint.dataColor == true){
    for ( let i = 0; i < Object.keys(sumstat).length; i++) {
        svg.append("g").selectAll("text")
            .data(sumstat)
            .enter()
            .append("text")
                .attr("x", x(sumstat[i].values[Object.keys(sumstat[i].values).length - 1].report_date) + 8)
                .attr("y", y1(sumstat[i].values[Object.keys(sumstat[i].values).length - 1].vor_ende) + 3)
                .attr("font-size", this.settings.dataPoint.radius) // gets infos from the settings.ts file
                .style("fill", colors[i])
                .text(sumstat[i].key)
        }
} else {
    for ( let i = 0; i < Object.keys(sumstat).length; i++) {
        svg.append("g").selectAll("text")
            .data(sumstat)
            .enter()
            .append("text")
                .attr("x", x(sumstat[i].values[Object.keys(sumstat[i].values).length - 1].report_date) + 8)
                .attr("y", y1(sumstat[i].values[Object.keys(sumstat[i].values).length - 1].vor_ende) + 3)
                .attr("font-size", this.settings.dataPoint.radius) // gets infos from the settings.ts file
                .style("fill", "black")
                .text(sumstat[i].key)
        }
}

  
//####################################################################################################################
// TEIL 4
//####################################################################################################################
   
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