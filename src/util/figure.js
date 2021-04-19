const figure = {};

figure.DEFAULT_HISTOGRAM_2D = {
  type: 'histogram2d',
  histfunc: 'count',
  colorscale: [
    ['0', 'rgba(255,255,255, 0)'],
    ['0.00000001', 'rgb(0, 0, 0, 1)'],
    ['0.0001', 'rgb(10,136,186)'],
    ['0.001', 'rgb(12,51,131)'],
    ['0.01', 'rgb(242,211,56)'],
    ['0.1', 'rgb(242,143,56)'],
    ['1', 'rgb(217,30,30)']
  ]
};

module.exports = figure;