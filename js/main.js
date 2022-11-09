
// margin conventions & svg drawing area - since we only have one chart, it's ok to have these stored as global variables
// ultimately, we will create dashboards with multiple graphs where having the margin conventions live in the global
// variable space is no longer a feasible strategy.

let margin = {top: 40, right: 40, bottom: 60, left: 60};

let width = 600 - margin.left - margin.right;
let height = 500 - margin.top - margin.bottom;

let svg = d3.select("#chart-area").append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
	.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");


// Date parser
let formatDate = d3.timeFormat("%Y"); // Returns: "2020"
let parseDate = d3.timeParse("%Y"); // Returns: Wed Jan 01 2020 00:00:00 GMT-0500 (EST)

let xscale = d3.scaleTime().domain([0,0]).range([0,width]);
let yscale = d3.scaleLinear().domain([0,0]).range([height,0]);
let durationscale = d3.scaleLinear().domain([0, 0]).range([0,20])
// let color = d3.scaleLinear().range(["#8dd3c7","#ffffb3","#bebada","#fb8072","#80b1d3","#fdb462","#b3de69","#fccde5","#d9d9d9","#bc80bd","#ccebc5","#ffed6f"]);
let color = d3.scaleOrdinal().range(["goldenrod", "darkorange", "peachpuff", "lightpink", "navy", "royalblue", "teal", "mediumseagreen", "yellowgreen", "mediumvioletred", "rosybrown", "lightskyblue", "forestgreen"]);

// Axes
let xAxis = d3.axisBottom();
xAxis.scale(xscale)
	.tickFormat(formatDate);

let yAxis = d3.axisRight();
yAxis.scale(yscale);

let xAxisGroup = svg.append("g").attr("class", "axis x-axis")
	.attr("transform", "translate(0," + (height) + ")");

let yAxisGroup = svg.append("g").attr("class", "axis y-axis");

svg.append("text")
	.attr("transform","translate(" + (width-30) + " ," + (height-10) + ")")
	.style("text-anchor", "middle")
	.text("Year");

svg.append("text")
	.attr("id", "yaxislabel");

svg.append("text")
	.attr("id", "chartTitle");

let plottype;

// Initialize data
loadData();

// FIFA world cup
let data;


// Load CSV file
function loadData() {
	d3.csv("data/TheBeatlesCleaned.csv", row => {
		row.year = parseDate(row.year);
		// row.album = +row.album;
		row.tracks = +row.trackNum;
		row.grammys = +row.acousticness;
		row.streams = +row.duration_ms;

		return row;
	}).then(csv => {


		// grab slider location in your DOM
		slider = document.getElementById("time-period-slider");
		lowerLabel = document.getElementById("lowerlabel");
		upperLabel = document.getElementById("upperlabel");

		// define slider functionality - notice that you need to provide the slider's location
		noUiSlider.create(slider, {
			start: [formatDate(d3.min(csv.map(d=>d.year))), formatDate(d3.max(csv.map(d=>d.year)))],
		connect: true,
		behaviour: 'drag',
		step: 1,
		margin: 1,
		range: {
			'min': [parseInt(formatDate(d3.min(csv.map(d=>d.year))))],
			'max': [parseInt(formatDate(d3.max(csv.map(d=>d.year))))]
		}

		});

		// attach an event listener to the slider
		slider.noUiSlider.on('slide', function (values, handle) {
			plottype = d3.select("#plot-type").property("value");
			updateFilters(csv, values)


		});

		// Listen for changes in rank selector
		d3.select("#plot-type").on("change", function() {
			plottype = d3.select("#plot-type").property("value");
			updateFilters(csv, slider.noUiSlider.get());

		})

		csv.sort((a,b)=> a.year - b.year);

		// Set default load state
		xscale.domain([d3.min(csv.map(d=>d.year)), d3.max(csv.map(d=>d.year))]);
		yscale.domain([0,d3.max(csv.map(d=>d.tracks))]);
		durationscale.domain([0,d3.max(csv.map(d=>(d.streams/60000)))]);
		color.domain([csv.map(d=>d.album)])

		// svg.append("path")
		// 	.datum(csv, d=>d.year)
		// 	.attr("class", "line")
		// 	.attr("fill", "none")
		// 	.style("stroke", "#69b3a2")
		// 	.style("stroke-width", 1.5)
		// 	.attr("d", d3.line().x(d => xscale(d.year))
		// 		.y(d => yscale(d.tracks)));;



		console.log(xscale);
		// Store csv data in global variable
		data = csv;
		updateVisualization("tracks");

	});
}

function updateFilters(csv, values) {

	addElement("lowerlabel", Math.floor(values[0]));
	addElement("upperlabel", Math.floor(values[1]));

	// Filter dataset for elements between those years
	let rangeData = csv.filter(function(d) {
		if (parseInt(formatDate(d.year)) < values[1]+1 && parseInt(formatDate(d.year)) >= values[0]) {
			return d
		}
	});

	// Update x and y scales of filtered data
	xscale.domain([d3.min(rangeData.map(d=>d.year)),d3.max(rangeData.map(d=>d.year))]);
	yscale.domain([0,d3.max(rangeData.map(d=>d[plottype]))]);

	data = rangeData;
	updateVisualization(plottype);
}

// Render visualization
function updateVisualization(plottype) {

	// console.log(data);
	// console.log(plottype);


	// Update element for line plot
	// d3.select(".line")
	// 	.datum(data, d=>d.year)
	// 	.transition()
	// 	.duration(800)
	// 	.attr("d",
	// 		d3.line()
	// 			.x(d => xscale(d.year))
	// 			.y(d => yscale(d[plottype])));

	// Update circles for individual data points
	let circles = svg.selectAll("circle")
		.data(data, d=>d.song);

	circles.exit().remove()
	circles.enter()
		.append("circle")
		.attr("class", "track")
		.on("mouseover", function(event, d) {

			showEdition(d);
		})
		.merge(circles)
		.transition()
		.duration(800)
		.attr("fill", d=>color(d.album))
		.attr("r", d => durationscale(d.streams/60000))
		.attr("cx", d => xscale(d.year))
		.attr("cy", d => yscale(d[plottype]));


	// Update axes:
	xAxis.scale(xscale);
	yAxis.scale(yscale);
	xAxisGroup.transition().duration(800).call(xAxis);
	yAxisGroup.transition().duration(800).call(yAxis);


	// Modify ugly plottypes to short labels
	let plottypelabel = "";
	if (plottype === "tracks") {
		plottypelabel = "Number of Tracks";
	}
	else if (plottype === "streams") {
		plottypelabel = "Total Streams To Date";
	}
	else { plottypelabel = plottype; }


	// Update axis label for y axis
	svg.select("#yaxislabel")
		.attr("transform","rotate(-90)")
		.attr("y", -30)
		.attr("x", 350-height)
		.attr("dy", "1em")
		.style("text-anchor", "middle")
		.text(plottypelabel);

	// Update chart title
	svg.select("#chartTitle")
		.attr("transform","translate(" + (width/2) + " ," + (0) + ")")
		.style("text-anchor", "middle")
		.text(plottypelabel + " By Year");




}


// Show details for a specific Album
function showEdition(d){

	// d3.select("")
	// title, winner, goals, average goals, matches, teams, average attendance.

	// Toggle visibility of placeholder and detail table
	d3.select("table")
		.style("visibility", "visible");

	d3.select("#albumdetail")
		.style("display", "block");

	d3.select("#placeholder")
		.style("visibility", "hidden");

	// Render selected album image
	d3.select("img")
		.attr("src", "img/" + d.image)
		.attr("width", 400)
		.attr("id", "detailImage");

	// Render detailed stats into table
	addElement("detailTitle", d.album.toString());
	addElement("detailDate", d3.timeFormat("%Y")(d.year));
	addElement("detailTrack",d.song.toString());
	addElement("detailGrammys", d.grammys);
	addElement("detailStreams", d.streams);

}


// Load in table elements by tag
function addElement(tagname, tagvalue) {
	let tempTag = document.getElementById(tagname);
	tempTag.innerText = tagvalue;
}
