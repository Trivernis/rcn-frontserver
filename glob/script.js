// -- Functions --

/**
 * binds the data for each element
 */
function bindData(){
  let mods = $('model');
  mods.each(function(){
    let model = $(this);
    if (model.attr('refresh-interval') !== undefined) {
      bindModelData(model);
      setInterval(()=> { bindModelData(model) }, model.attr('refresh-interval'));
    }
    else bindModelData(model);
  });
}

function bindModelData(model) {
  $.get(model.attr('src'), function(data) {
    $('*[model='+model.attr('name')+']').each(function() {
      let elem = $(this);
      let dat = getDataByPath(JSON.parse(data), elem.attr('datapath'));
      this.setAttribute(":data", dat);
      //elem.html();
    })
  });
}

/**
 * Returns the data of an array by accessing the given path-string
 * @param  {Object} array Contains the data.
 * @param  {String} path  The path to the wanted data.
 * @return {Object}       Returns anything that the path points to.
 */
function getDataByPath(array, path) {
  let data = array;
  path.split('.').forEach(function(p){
    data = data[p];
  });
  return data;
}

/**
 * Shows/Hides the sidebar action-menu
 */
function toggleActionMenu() {
  let state = $('.mainview').attr("state"); // get the current state of the mainview element(s)
  if (state === "retracted") { // set the sate to fullsize or retracted depending on the previous value
    $('.mainview').attr("state", "fullsize");
  } else {
    $('.mainview').attr("state", "retracted");
  }
}

/**
 * Navigates inside the app
 * @param view the targeted view
 * @param title the title of the targtet that is displayed
 */
function navigate(view, title) {
    if (view !== 'index.htm') window.location.hash = view; // set the hash if the url is not the index.htm
    else window.location.hash = ""; // reset the hash if the hash url is the index.htm
    $('.content').load(view); // load the view into the content class elements
    let sideTitle = title || view.replace(/\.htm/, ''); // get the side title as the given title or the filename without extension
    setTitle(sideTitle); // set the sides title
}

/**
 * Sets the title that is displayed for the view
 * @param title
 */
function setTitle(title) {
    $('.navigationBar .title').html("<span>" + title + "</span>");
}

/**
 * Draws a graph in a canvas element
 * @param element
 * @param data
 * @param options
 * TODO: Seperated Background canvas and graph canvas. Div with span elements for x and y values.
 */
function drawGraph(element, data, options) {
    element.innerHTML = ""; // reset the element
    let cv1 = document.createElement('canvas'); // create a canvas for the background
    let cv2 = document.createElement('canvas'); // create a canvas for the graph
    let spanDiv = document.createElement('div'); // create a div for labels
    spanDiv.setAttribute('class', 'labels'); // set the class for the div
    let ctx1 = cv1.getContext('2d'); // get the 2d-context for canvas 1
    let ctx2 = cv2.getContext('2d'); // get the 2d-context for canvas 2
    element.appendChild(cv1); // append canvas 1 to the element
    element.appendChild(spanDiv); // append the labels div to the element
    element.appendChild(cv2); // append canvas 2 to the element
    let canvWidth = cv2.width = cv1.width = cv1.clientWidth; // set the width of the canvas elements to the clients width
    let canvHeight = cv2.height = cv1.height = cv1.clientHeight; // set the height of the canvas elements to the clients height
    let xData = []; // set xData to an empty array
    let yData = []; // set yData to an empty array
    if (!options) options = {};
    ctx1.beginPath();
    ctx1.strokeStyle = $(element).css('color'); // set the stroke style to the parent elements color

    for (let dt of data) { // seperate x values and y values to two arrays
        xData.push(dt[0]);
        yData.push(dt[1]);
    }
    let xMax = options.xMax || Math.max.apply(Math, xData); // set the max x value
    let xMin = options.xMin || Math.min.apply(Math, xData); // set the min x value
    let yMax = options.yMax || Math.max.apply(Math, yData); // set the max y value
    let yMin = options.yMin || Math.min.apply(Math, yData); // set the min y value
    let xUnit = options.xUnit || ""; // set the unit of the x values
    let yUnit = options.yUnit || ""; // set the unit of the y values
    let xStep = canvWidth / (xMax - xMin); // set the equivalent pixel step size for an x step
    let yStep = canvHeight / (yMax - yMin); // set the equivalent pixel step size for an y step
    let gridCount = canvHeight/yStep; // define the count of grids on the y axis

    while (gridCount > 7) {
        gridCount /= 1.5;
    }
    let gridH = (canvHeight/gridCount); // define the height of the grid
    for (let i = gridH; i < (canvHeight - gridH/10); i+= gridH) { // create a vertical grid
        let span = document.createElement('span'); // create a span element
        span.style = `position: absolute; top: calc(${((i)/canvHeight)*100}% - 1.2em); left: 0`; // set the style of the span element
        span.innerText = Math.round((canvHeight - i)/yStep)+Number(yMin)+" "+yUnit; // set the text of the span element
        spanDiv.appendChild(span); // append the span  element to the div
        ctx1.moveTo(0, i);
        ctx1.lineTo(canvWidth, i); // draw a grid line
        ctx1.stroke();
    }

    gridCount = canvWidth/xStep;
    while (gridCount > 10) { // do the same as above for the x-axis
        gridCount /= 2;
    }
    let gridW = (canvWidth/gridCount);
    for (let i = gridW; i < (canvWidth-gridW/10); i+= gridW) {
        let span = document.createElement('span');
        span.style = `position: absolute; left: ${(i/canvWidth)*100}%; bottom: 0`;
        span.innerText = Math.round(i/xStep)+Number(xMin)+" "+xUnit;
        spanDiv.appendChild(span);
        ctx1.moveTo(i, 0);
        ctx1.lineTo(i, canvHeight);
        ctx1.stroke();
    }
    let x = 0;
    let y = canvHeight;

    if (data.length > 0) { // get the first coordinate as point a
        x = data[0][0] * xStep;
        y= canvHeight - ((data[0][1] - yMin) * yStep)
    }
    ctx2.beginPath();
    ctx2.strokeStyle = $(element).css('outline-color'); // set the stroke style to the css value 'outline-color' of the parent

    for (let dt of data) {
        ctx2.moveTo(x, y); // move to point a (point b of last turn)
        x = dt[0] * xStep; // get the x value of point b
        y = canvHeight - ((dt[1] - yMin) * yStep); // get the y value of point b
        ctx2.lineTo(x, y); // draw a line from point a to point b
        ctx2.stroke();
    }

    cv2.addEventListener('mousemove', evt => { // add a mousedown listener that displays a tooltip with the x and y values
        let mousePos = getMousePos(cv2, evt);
        showTooltip(`x: ${Math.round(mousePos.x/xStep*10)/10+' '+xUnit},y: ${Math.round((cv1.clientHeight-mousePos.y)/yStep*10)/10+' '+yUnit}`, {x: evt.clientX, y: evt.clientY}, true);
    });
}

/**
 * returns the position of the mouse over a canvas
 * @param canvas
 * @param evt
 * @returns {{x: number, y: number}}
 */
function getMousePos(canvas, evt) {
    let rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

/**
 * shows a tooltip with the id #tooltip
 * @param text
 * @param position
 * @param keep if false or not set the tooltip will be deleted after 2 seconds
 */
function showTooltip(text, position, keep) {
    let el = document.querySelector('#tooltip') || document.createElement('span'); // set the span to the element with the id or create one if it doesn't exist
    el.innerText = text; // set the text of the span to the text
    el.setAttribute('id', 'tooltip'); // set the id to 'tooltip'
    el.style = `position: absolute; top: ${position.y+10}; left: ${position.x+10}; background: white; color: black;`; // set the style that way that the
    // absolute x and y of the mouse represent the spans coordinates
    document.body.appendChild(el); // append the span to the documents body
    if (!keep) setTimeout(() => el.remove(), 2000); // if keep is false or undefined set a timeout of 2 seconds for deletion of the span
}

/**
 * deletes the tooltip with the id #tooltip
 */
function hideTooltip() {
    let tooltip = document.querySelector('#tooltip'); // select the element with the id tooltip
    if (tooltip) tooltip.remove(); // delete the element if it does exist
}

// -- Events --
// Define what happens onLoad
$(document).ready(function(){
  bindData();
});
