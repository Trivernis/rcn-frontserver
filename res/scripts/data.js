$.getJSON('cpu.json', data =>{
    let c = document.querySelector('.graph');
    drawGraph(c, data['100temp'], {yMax: 50, yMin: "0"});
});