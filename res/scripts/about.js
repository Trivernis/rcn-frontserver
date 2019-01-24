function draw() {
    $.getJSON('sys.json', data =>{
        let graphs = document.querySelectorAll('.graph');
        graphs.forEach(c => drawGraph(c, data['100perc'], {yMax: 100, yMin: "0", xUnit: "s", yUnit: "%"}));
    });
}

draw();
registerInterval(draw, 1000);