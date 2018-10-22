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

// -- Events --
// Define what happens onLoad
$(document).ready(function(){
  bindData();
});
