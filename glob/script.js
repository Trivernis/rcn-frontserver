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
  let state = $('.mainview').attr("state");
  if (state === "retracted") {
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
    if (view !== 'index.htm') window.location.hash = view;
    else window.location.hash = "";
    $('.content').load(view);
    let sideTitle = title || view.replace(/\.htm/, '');
    setTitle(sideTitle);
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
    element.innerHTML = "";
    let cv1 = document.createElement('canvas');
    let cv2 = document.createElement('canvas');
    let spanDiv = document.createElement('div');
    spanDiv.setAttribute('class', 'labels');
    let ctx1 = cv1.getContext('2d');
    let ctx2 = cv2.getContext('2d');
    element.appendChild(cv1);
    element.appendChild(cv2);
    let canvWidth = cv1.width;
    let canvHeight = cv2.height;
    ctx1.clearRect(0, 0, canvWidth, canvHeight);
    ctx2.clearRect(0, 0, canvWidth, canvHeight);
    let xData = [];
    let yData = [];
    if (!options) options = {};
    ctx1.beginPath();
    ctx1.strokeStyle = $(element).css('color');
    ctx1.font = "80% Arial";

    for (let dt of data) {
        xData.push(dt[0]);
        yData.push(dt[1]);
    }
    let xMax = options.xMax || Math.max.apply(Math, xData);
    let xMin = options.xMin || Math.min.apply(Math, xData);
    let yMax = options.yMax || Math.max.apply(Math, yData);
    let yMin = options.yMin || Math.min.apply(Math, yData);
    let xUnit = options.xUnit || "";
    let yUnit = options.yUnit || "";

    let xStep = canvWidth / (xMax - xMin);
    let yStep = canvHeight / (yMax - yMin);

    let gridCount = canvHeight/yStep;
    while (gridCount > 10) {
        gridCount /= 10;
    }
    let gridH = (canvHeight/gridCount);
    for (let i = gridH; i < (canvHeight - gridH/10); i+= gridH) {
        let span = document.createElement('span');
        span.style = `position: absolute; top: ${(i/canvHeight)*100}%; left: 0`;
        span.innerText = Math.round((canvHeight - i)/yStep)+Number(yMin)+" "+yUnit;
        spanDiv.appendChild(span);
        ctx1.moveTo(0, i);
        ctx1.lineTo(canvWidth, i);
        ctx1.stroke();
    }

    gridCount = canvWidth/xStep;
    while (gridCount > 10) {
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

    if (data.length > 0) {
        x = data[0][0];
        y = data[0][1];
    }
    ctx2.beginPath();
    ctx2.strokeStyle = $(element).css('outline-color');

    for (let dt of data) {
        ctx2.moveTo(x, y);
        x = dt[0] * xStep;
        y = canvHeight - ((dt[1] - yMin) * yStep);
        ctx2.lineTo(x, y);
        ctx2.stroke();
    }
    element.appendChild(spanDiv);
}

// -- Events --
// Define what happens onLoad
$(document).ready(function(){
  bindData();
});
