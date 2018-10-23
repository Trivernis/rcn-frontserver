function draw() {
    $.getJSON('sys.json', data =>{
        let c = document.querySelector('.graph');
        drawGraph(c, data['100perc'], {yMax: 100, yMin: "0", xUnit: "s", yUnit: "%"});
    });
}

draw();
let refreshInterval = setInterval(draw, 1000);