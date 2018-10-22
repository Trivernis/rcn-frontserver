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
 * @param dimensions
 * TODO: Draw background grid and x-values and control it via dimensions (rename it to options)
 */
function drawGraph(element, data, dimensions) {
    let ctx = element.getContext('2d');
    let canvWidth = element.width;
    let canvHeight = element.height;
    let xData = [];
    let yData = [];
    if (!dimensions) dimensions = {};

    ctx.strokeStyle = $(element).css('color');

    for (let dt of data) {
        xData.push(dt[0]);
        yData.push(dt[1]);
    }
    let xMax = dimensions.xMax || Math.max.apply(Math, xData);
    let xMin = dimensions.xMin || Math.min.apply(Math, xData);
    let yMax = dimensions.yMax || Math.max.apply(Math, yData);
    let yMin = dimensions.yMin || Math.min.apply(Math, yData);

    let xStep = canvWidth / (xMax - xMin);
    let yStep = canvHeight / (yMax - yMin);

    console.log(`yMax: ${yMax}; yMin: ${yMin}; ${JSON.stringify(dimensions)}`);

    let x = 0;
    let y = canvHeight;
    if (data.length > 0) {
        x = data[0][0];
        y = data[0][1];
    }
    for (let dt of data) {
        ctx.moveTo(x, y);
        x = dt[0] * xStep;
        y = canvHeight - ((dt[1] - yMin) * yStep);
        ctx.lineTo(x, y);
        ctx.stroke();
        console.log(x, y);
    }
}

// -- Events --
// Define what happens onLoad
$(document).ready(function(){
  bindData();
});
