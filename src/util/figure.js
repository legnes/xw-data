const figure = {};

figure.DEFAULT_HISTOGRAM_2D = {
  type: 'histogram2d',
  histfunc: 'count',
  // inferno
  // https://cran.r-project.org/web/packages/viridis/vignettes/intro-to-viridis.html
  // https://github.com/d3/d3-scale-chromatic
  colorscale: [
    [0, '#ffffff00'],
    [0.00001, "#000004"],
    [0.0001, "#420a68"],
    [0.001, "#932667"],
    [0.01, "#dd513a"],
    [0.1, "#fca50a"],
    [1, "#fcffa4"],
  ],
  showscale: false
};

figure.DEFAULT_HEATMAP = {
  type: 'heatmap',
  // inferno (truncated)
  // https://cran.r-project.org/web/packages/viridis/vignettes/intro-to-viridis.html
  // https://github.com/d3/d3-scale-chromatic
  colorscale: [
    [0, "#000004"],
    [0.1, "#0c0826"],
    [0.2, "#260c51"],
    [0.3, "#450a69"],
    [0.4, "#62146e"],
    [0.5, "#7f1e6c"],
    [0.6, "#9b2964"],
    [0.7, "#b73557"],
    [0.8, "#d04545"],
    [0.9, "#e55c30"],
    [1, "#f37819"],
  ],
  showscale: false
};

figure.DEFAULT_HEATMAP_LAYOUT = {
  xaxis: { showticklabels: false, ticks: '', fixedrange: true },
  yaxis: { showticklabels: false, ticks: '', fixedrange: true },
};

figure.axisLabels = (xLabel, yLabel) => ({
  xaxis: { title: { text: xLabel }},
  yaxis: { title: { text: yLabel }}
})

module.exports = figure;