function init() {
    // Set up dimensions and padding for the map
    var w = 900;
    var h = 570;
    var padding = 50;

    // Initialize the selected year and set up the slider and display elements
    var selectedYear = 2021;
    const yearSlider = document.getElementById('year-slider');
    const yearDisplay = document.getElementById('year-display');

    // Update the year display and call drawMap() when the slider value changes
    yearDisplay.textContent = selectedYear;
    yearSlider.addEventListener('input', function (event) {
        selectedYear = event.target.value;
        yearDisplay.textContent = selectedYear;
        drawMap(selectedYear, colorHue);
    });

    //Update the color hue (normal/color-blind)
    var selectedHue = "normal"
    var colorHue = document.getElementById("color-hue-select");
    colorHue.addEventListener('change', function (event) {
        colorHue = event.target.value;
        drawMap(selectedYear, colorHue);
    });
    // Create the map projection and the path generator
    var projection = d3.geoMercator().scale(250);
    var path = d3.geoPath().projection(projection);

    // Create the SVG element that will contain the map
    var svg = d3.select("#heatmap-container")
        .append("svg")
        .attr("width", w)
        .attr("height", h)

    // Create tooltip
    var tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "white")
        .style("border", "solid")
        .style("border-width", "1px")
        .style("border-radius", "5px")
        .style("padding", "10px");
    var demographicData; // store the demographic data
    let data, json; //pass data into the function 

    // Load the CSV data and JSON data
    d3.csv("heatmap19802021.csv").then(function (csvData) {
        data = csvData;
        d3.csv("demographic.csv").then(function (csvDemographicData) {
            demographicData = csvDemographicData; 
            d3.json("heatmap.json").then(function (jsonData) {
                json = jsonData;
                // Fit the map projection to the size of the SVG element
                projection.fitExtent([[padding, padding], [w - padding, h - padding]], json);

                // Draw the initial map for the selected year
                drawMap(selectedYear, colorHue);
            });
        });
    });
    var pieChartWidth = 400;
    var pieChartHeight = 250;
    var pieChartSvg = d3.select("#pie-chart-container")
        .append("svg")
        .attr("width", pieChartWidth)
        .attr("height", pieChartHeight)
        .style("display", "block")
        .style("opacity", 0);

    var areaChartWidth = 400;
    var areaChartHeight = 400;
    var areaChartSvg = d3.select("#area-chart-container")
        .append("svg")
        .attr("width", areaChartWidth)
        .attr("height", areaChartHeight)
        .style("display", "block")
        .style("opacity", 0)

    var areaLegendGroup = areaChartSvg.append("g")
        .attr("class", "legend-group")
        .style("opacity", 0); // Initially hide the legend

    function drawColorHueLegend(color) {
        // Define the size and margins for the legend
        var legendWidth = 800;
        var legendHeight = 40;
        var legendMargin = { top: 10, right: 10, bottom: 10, left: 50 };
        var legendSvg = d3.select("#heatmap-container").select(".legend");

        if (legendSvg.empty()) {
            // Create the legend SVG if it doesn't exist
            legendSvg = d3.select("#heatmap-container")
                .append("svg")
                .attr("class", "legend")
                .attr("width", legendWidth + legendMargin.left + legendMargin.right)
                .attr("height", legendHeight + legendMargin.top + legendMargin.bottom)
                .append("g")
                .attr("transform", "translate(" + legendMargin.left + "," + legendMargin.top + ")");
        } else {
            // Clear the existing legend
            legendSvg.selectAll("*").remove();
            legendSvg.attr("transform", "translate(" + legendMargin.left + "," + legendMargin.top + ")");
        }
        // Compute the width of each legend item
        var itemWidth = legendWidth / color.range().length;

        // Create a group for each color
        var legendItems = legendSvg.selectAll(".legend-item")
            .data(color.range())
            .enter().append("g")
            .attr("class", "legend-item");
        // Add a rectangle of the appropriate color to each group

        legendItems.append("rect")
            .attr("x", function (d, i) { return i * itemWidth; })
            .attr("y", 0)
            .attr("width", itemWidth)
            .attr("height", legendHeight - legendMargin.bottom)
            .style("fill", function (d) { return d; });

        // Add a label to each group
        legendItems.append("text")
            .attr("x", function (d, i) { return i * itemWidth; })
            .attr("y", legendHeight - legendMargin.bottom + 15) // Adjust as needed
            .text(function (d, i) {
                // Use the quantiles of the color scale to set the labels
                var extent = color.invertExtent(d);
                // format the extent values appropriately for display
                return d3.format(".2s")(extent[0]) + " - " + d3.format(".2s")(extent[1]);
            });
    }

    function drawMap(year, colorHue) { //drawMap function
        var xScale = d3.scaleLinear()
            .domain([1980, 2021])
            .range([padding, areaChartWidth - padding]);

        var yScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => +d.Refugees)])
            .range([areaChartHeight - padding, padding]);

        var xAxis = d3.axisBottom(xScale).ticks(10).tickFormat(d3.format("d"));
        var yAxis = d3.axisLeft(yScale);

        // Add the area chart's axes to the SVG
        areaChartSvg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + (areaChartHeight - padding) + ")")
            .call(xAxis);

        areaChartSvg.append("g")
            .attr("class", "y axis")
            .attr("transform", "translate(" + padding + ",0)")

        //.call(yAxis);
        // Define the area generator and the line generator
        var areaGenerator = d3.area()
            .x(d => xScale(d.Year))
            .y0(areaChartHeight - padding)
            .y1(d => yScale(d.Refugees));

        var lineGenerator = d3.line()
            .x(d => xScale(d.Year))
            .y(d => yScale(d.Refugees));
        const yearData = []; //Take the year data 
        for (let i = 0; i < data.length; i++) {
            if (data[i].Year == year) {
                yearData.push(data[i]);
            }
        }
        // Create a lookup table to map country names to refugee counts
        const refugeeLookup = {};
        yearData.forEach(function (d) {
            refugeeLookup[d.Country] = +d.Refugees;
        });

        // Update the JSON data with the refugee counts for the selected year
        for (var i = 0; i < json.features.length; i++) {
            var jsonCountry = json.features[i].properties.name;
            var value = refugeeLookup[jsonCountry] || 0;
            // if (!value) {value = 0;}
            json.features[i].properties.value = value;
        }
        // Select color Hue based on dropdown value (normal/color-blind) 
        var color;
        if (colorHue === "normal") {
            color = d3.scaleQuantile()
                .domain(yearData.map(function (d) { return d.Refugees; }))
                .range(["#f7fcf0", "#e0f3db", "#ccebc5", "#a8ddb5", "#7bccc4", "#4eb3d3", "#2b8cbe", "#0868ac", "#084081", "#042029"]); //normal scale
        } else if (colorHue === "color-blind") {
            color = d3.scaleQuantile()
                .domain(yearData.map(function (d) { return d.Refugees; }))
                .range(["#ffffff", "#f2f0f7", "#dadaeb", "#bcbddc", "#9e9ac8", "#807dba", "#6a51a3", "#54278f", "#3f007d", "#2d004b"]); //colorblind range scale
        } else {
            color = d3.scaleQuantile()
                .domain(yearData.map(function (d) { return d.Refugees; }))
                .range(["#f7fcf0", "#e0f3db", "#ccebc5", "#a8ddb5", "#7bccc4", "#4eb3d3", "#2b8cbe", "#0868ac", "#084081", "#042029"]);
        } //default

        var paths = svg.selectAll("path")
            .data(json.features);
        paths.enter()
            .append("path")
            .attr("d", path)
            .attr("class", "country")
            .merge(paths)
            .style("fill", function (d) {
                // Get data value
                var value = d.properties.value;
                if (value) {
                    // If value exists…
                    return color(value);
                } else {
                    // If value is undefined => Return grey color
                    return "#CCC";
                }
            })
           
            .style("stroke", "#333") 
            .on("mouseover", function (event, d) {
                d3.selectAll(".country")
                    .transition()
                    .duration(100)
                    .style("opacity", 0.2)
                    .style("stroke", "#333");
                d3.select(this)
                    .transition()
                    .duration(100)
                    .style("opacity", 1)
                    .style("stroke", "#333")
                //.append("")‹
                //.text("Country: " + d.properties.name +"\nRefugees: " + d.properties.value +"\nYear: " +selectedYear)
                tooltip.style("opacity", .9);
                tooltip.html("Country: " + d.properties.name + "<br>Refugees: " + d.properties.value + "<br>Year: " + selectedYear)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px")// Show the area chart for the hovered country
                var jsonCountry2 = d.properties.name;
                var countryData = data.filter(d => d.Country === jsonCountry2).sort((a, b) => a.Year - b.Year);
                const displayData = countryData.map(d => ({ Year: +d.Year, Refugees: +d.Refugees }));
                yScale.domain([0, d3.max(displayData, d => d.Refugees)]);
                // Update the y-axis
                areaChartSvg.select(".y.axis").call(yAxis);
                // Clear the previous area chart
                areaChartSvg.selectAll(".area").remove();
                areaChartSvg.selectAll(".line").remove();

                // Update the area chart's path and line
                areaChartSvg.append("path")
                    .datum(displayData)
                    .attr("class", "area")
                    .attr("d", areaGenerator)
                    .attr("fill", "steelblue")
                    .attr("opacity", 0.3);

                areaChartSvg.append("path")
                    .datum(displayData)
                    .attr("class", "line")
                    .attr("d", lineGenerator)
                    .attr("fill", "none")
                    .attr("stroke", "steelblue")
                    .attr("stroke-width", 2);
                // Update the legend with the hovered country's name
                updateLegend(d.properties.name);
                // Show the area chart's SVG
                areaChartSvg.style("opacity", 1);
                areaLegendGroup.style("opacity", 1);
                function formatPieChartLabel(d, total) {
                    return d.data.label + ": " + ((d.data.value / total) * 100).toFixed(1) + "%";
                }
                // Pie chart for demographic data (male and female)
                var demographicCountryData = demographicData.filter(d => d.Country === jsonCountry2 && d.Year == selectedYear);
                if (demographicCountryData.length > 0) {
                    var maleTotal = +demographicCountryData[0].MaleTotal;
                    var femaleTotal = +demographicCountryData[0].FemaleTotal;
                    var totalRefugees = maleTotal + femaleTotal;
                    var pieChartData = [
                        { label: "Male", value: maleTotal },
                        { label: "Female", value: femaleTotal }
                    ];
                   
                    var pie = d3.pie()
                        .value(d => d.value)
                        (pieChartData);

                    var arc = d3.arc()
                        .innerRadius(0)
                        .outerRadius(Math.min(pieChartWidth, pieChartHeight) / 2);

                    var color = d3.scaleOrdinal()
                        .domain(pieChartData.map(d => d.label))
                        .range(["#ffffcc", "#2c7fb8"]);

                    pieChartSvg.selectAll(".arc").remove();
                    var arcGroup = pieChartSvg.selectAll(".arc")
                        .data(pie)
                        .enter()
                        .append("g")
                        .attr("class", "arc")
                        .attr("transform", `translate(${pieChartWidth / 2}, ${pieChartHeight / 2})`);

                    arcGroup.append("path")
                        .attr("d", arc)
                        .style("fill", d => color(d.data.label));

                        arcGroup.append("text")
                        .attr("transform", d => `translate(${arc.centroid(d)})`)
                        .attr("text-anchor", "middle")
                        .attr("font-size", "12px")
                        .text(d => formatPieChartLabel(d, totalRefugees))
                    // Show the pie chart's SVG
                    pieChartSvg.style("opacity", 1);
                } else {
                    // Hide the pie chart's SVG if no demographic data is available
                    pieChartSvg.style("opacity", 0);
                }

                var result = document.getElementById('area-chart-container')
                result.classList.add('border-dashed')
                result.classList.add('border-2')
                result.classList.add('border-slate-700')
                result.classList.add('mt-5')
                result.classList.add('mr-6')
                result.classList.add('transition')
                result.classList.add('ease-in-out')
                result.classList.add('duration-300')
                var result_1 = document.getElementById('pie-chart-container')
                result_1.classList.add('border-dashed')
                result_1.classList.add('border-2')
                result_1.classList.add('border-slate-700')
                result_1.classList.add('mt-5')
                result_1.classList.add('mr-6')
                result_1.classList.add('transition')
                result_1.classList.add('ease-in-out')
                result_1.classList.add('duration-300')
                
        
            })
            .on("mouseout", function (event, d) {
                // reset country highlight
                d3.selectAll(".country")
                    .transition()
                    .duration(100)
                    .style("opacity", 1)
                    .style("stroke", "#333");
                // Hide tooltip
                tooltip.style("opacity", 0)
                // Hide the area chart's SVG
                areaChartSvg.style("opacity", 1);
                areaLegendGroup.style("opacity", 1);
                pieChartSvg.style("opacity", 1);
            });

        

        //run the draw color hue legend 
        drawColorHueLegend(color);

        //Update legend for area chart 
        function updateLegend(country) {
            // Remove any previous legend elements
            areaLegendGroup.selectAll("*").remove();

            // Add legend title
            areaLegendGroup.append("text")
                .attr("x", (areaChartWidth / 2) - (country.length * 3)) // Calculate the middle x position and adjust based on the country's name length
                .attr("y", padding)
                .attr("font-size", "14px")
                .attr("font-weight", "bold")
                .text("Refugees in " + country);

            // Add "Year" label near the x-axis
            areaLegendGroup.append("text")
                .attr("x", (areaChartWidth - padding) / 2)
                .attr("y", areaChartHeight - padding / 2 + 5)
                .attr("font-size", "12px")
                .text("Year");

            // Add "Refugees" label near the y-axis
            areaLegendGroup.append("text")
                .attr("x", padding / 2 )
                .attr("y", padding - 10)
                .attr("font-size", "12px")
                .text("Refugees");
        }
    }
}
window.onload = init;




