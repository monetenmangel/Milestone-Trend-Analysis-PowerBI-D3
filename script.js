// set the dimensions and margins of the graph
var margin = {top: 10, right: 60, bottom: 30, left: 60},
    width = 1100 - margin.left - margin.right,
    height = 900 - margin.top - margin.bottom;

// append the svg object to the body of the page
var svg = d3.select("#my_dataviz")
  .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform",
          "translate(" + margin.left + "," + margin.top + ")");

          // Function to parse 
let parseDate = d3.timeParse("%d.%m.%Y")

// Read the data
// Parse data from CSV; CSV has to be seperated by comma, not semicolon!

d3.csv("MTA_data_example_csv.csv")
    .get(function(error, data) { // this piece of code gives access to the data

// Format Date values in correct format
data.forEach(function(d){
    d.Report_Date = parseDate(d.Report_Date),
    d.Vorr_Ende = parseDate(d.Vorr_Ende)
})

// Check if data has been parsed correctly
console.log(data)

// Group the Data

let sumstat = d3.nest() 
    .key(d => d.Milestone)
    .entries(data);

// Check grouped Data

console.log(sumstat)

// Color Palette

let res = sumstat.map(function(d) { return d.key})
let color = d3.scaleOrdinal()
    .domain(res)
    .range(['#e41a1c','#377eb8','#4daf4a','#984ea3','#ff7f00','#ffffff','#a65628'])


// minimum and maximum Values for the axis
let minDate_report_date = d3.min(data, function(d){ return d.Report_Date})
let minDate_vorr_Ende = d3.min(data, function(d){ return d.Vorr_Ende})
let maxDate_report_date = d3.max(data, function(d){ return d.Report_Date})
let maxDate_vorr_Ende = d3.max(data, function(d){ return d.Report_Date})

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

// Add Milestone Lines

svg.selectAll(".line")
.data(sumstat)
.enter()
.append("path")
    .attr("fill", "none")
    .attr("stroke", function(d){ return color(d.key)})
    .attr("stroke-width", 1.5)
    .attr("d", function(d){
    return d3.line()
        .x(function(d) { return x(d.Report_Date); })
        .y(function(d) { return y0(d.Vorr_Ende); })
        (d.values)
    })

  // Add Milestone Dots
  svg.append('g')
    .selectAll("dot")
    .data(data)
    .enter()
    .append("circle")
      .attr("cx", function (d) { return x(d.Report_Date); } )
      .attr("cy", function (d) { return y0(d.Vorr_Ende); } )
      .attr("r", 2)
      .attr("fill", "grey")

// Add Diagonal line 

svg.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "grey")
    .attr("stroke-width", 1.5)
    .attr("d", d3.line()
        .x(function(d) {return x(d.Report_Date)})
        .y(function(d) { return y1(d.Report_Date)}))

})

