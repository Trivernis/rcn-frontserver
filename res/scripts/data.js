function getFormattedData(dataArray) {
  let arrData = ["0,100"];
  for (d of dataArray) {
    arrData.push(d[0]+","+(100-d[1]));
  }
  arrData.push("100,100");
  return arrData.join(" ");
}

var vueApp = new Vue({
  el: '#app',
  data: {
    temperatureData: [1,2,3,4],
    percentData: [2,3,4,5],
    labels: ["1", "2", "3", "4", "5"],
    chartOptions: {
      responsive: true,
      maintainAspectRatio: false
    }
  },
  mounted() {
    let self = this;
    $.getJSON('cpu.json', d => {
      self.temperatureData = getFormattedData(d['100temp']),
      self.percentData = getFormattedData(d['100perc'])
    })
  }
})
