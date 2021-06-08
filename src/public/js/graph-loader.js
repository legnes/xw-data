class GraphLoader extends HTMLElement {
  constructor() {
    super();

    this.isSquare = this.getAttribute('data-square') === 'true';

    // shadow dom
    const shadowContainer = document.createElement('div');
    this.prepend(shadowContainer);
    const shadow = shadowContainer.attachShadow({ mode: 'open' });

    // style
    const style = document.createElement('style');
    style.textContent = this.customStyle + GraphLoader.defaultStyle;
    shadow.appendChild(style);

    // loading container
    const loaderContainer = document.createElement('div');
    loaderContainer.className = 'loader-container';
    shadow.appendChild(loaderContainer);

    // load button
    const button = document.createElement('button');
    button.textContent = 'load data';
    loaderContainer.appendChild(button);

    // loading spinner
    const spinner = document.createElement('div');
    spinner.className = 'ld-sq-grid';
    for (let i = 1; i <= 4; i++) {
      const subspinner = document.createElement('div');
      subspinner.className = `ld-sq ld-sq${i}`;
      spinner.appendChild(subspinner);
    }

    // graph container
    const graphContainer = document.createElement('div');
    graphContainer.className = 'graph-container';
    graphContainer.id = this.getAttribute('data-id');
    this.parentNode.insertBefore(graphContainer, this);

    // variables for reloading
    this.target = graphContainer
    this.layout = { ...this.customLayout, ...GraphLoader.defaultLayout };
    this.config = { ...this.customConfig, ...GraphLoader.defaultConfig };

    // button click
    const handleButton = async () => {
      button.removeEventListener('click', handleButton);
      loaderContainer.removeChild(button);
      loaderContainer.appendChild(spinner);
      const figure = await this.loadFigure();
      if (figure.layout) this.setLayout(figure.layout);
      if (figure.config) Object.assign(this.config, figure.config);
      this.renderData(figure);
      shadow.removeChild(loaderContainer);
      if (typeof figureLoadEvent !== 'undefined') this.dispatchEvent(figureLoadEvent);
    }
    button.addEventListener('click', handleButton);
  }

  async loadFigure() {
    const dataSrc = this.getAttribute('data-src');
    const response = await fetch(dataSrc);
    const data = await response.json();
    return data;
  }

  renderData(figure) {
    Plotly.react(this.target, figure.data, this.layout, this.config);
  }

  setLayout(layout) {
    // TODO: Add real nesting assign?
    for (const [key, val] of Object.entries(layout)) {
      this.layout[key] = Object.assign(this.layout[key] || {}, val);
    }
  }

  renderLayout(layout) {
    this.setLayout(layout);
    Plotly.relayout(this.target, this.layout);
  }

  get width() { return this.isSquare ? 512 : 800; }
  get height() { return this.isSquare ? 512 : 400; }

  get customLayout() {
    return {
      width: this.width,
      height: this.height
    };
  }

  get customStyle() {
    return `
.loader-container {
  width: ${this.width}px;
  height: ${this.height}px;
}
`;
  }

  get customConfig() {
    return {
      displayModeBar: !this.isSquare
    };
  }

  static get defaultLayout() {
    return {
      autosize: false,
      margin: {
        l: 40,
        r: 10,
        b: 40,
        t: 10,
        pad: 4
      },
      // paper_bgcolor: '#7f7f7f',
      // plot_bgcolor: '#c7c7c7',
      // xaxis: {
      //   type: 'log',
      //   autorange: true
      // },
      // yaxis: {
      //   type: 'log',
      //   autorange: true
      // }

      // http://mkweb.bcgsc.ca/colorblind/palettes.mhtml
      colorway : ['#EF0096', '#00DCB5', '#68023F', '#008169', '#FFCFE2', '#003C86', '#9400E6', '#009FFA', '#FF71FD', '#7CFFFA', '#6A0213', '#008607', '#F60239', '#00E307', '#FFDC3D']
    };
  }

  static get defaultConfig() {
    return {
      // responsive: true
      // scrollZoom: true,
      // staticPlot: true,
      showTips: false,
      displaylogo: false,
      modeBarButtonsToRemove: [
        'hoverClosestCartesian', 'hoverCompareCartesian',
        'zoom2d', 'pan2d', 'select2d', 'lasso2d', 'zoomIn2d', 'zoomOut2d', 'resetScale2d', // 'autoScale2d',
        'toggleHover', 'toImage', 'toggleSpikelines'
      ],
    };
  }

  // Inspiration from https://tobiasahlin.com/spinkit/
  static get defaultStyle() { return `
.loader-container {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  width: ${GraphLoader.width}px;
  height: ${GraphLoader.height}px;
  border: 1px solid black;
}

button {
  cursor: pointer;
}

.ld-sq-grid {
  width: 40px;
  height: 40px;
  margin: 100px auto;
}

.ld-sq-grid .ld-sq {
  width: 18px;
  height: 18px;
  border: 1px solid #EF0096;
  float: left;
  animation: squareScale 1.5s infinite ease-in-out;
}

.ld-sq-grid .ld-sq1 { animation-delay: 0.1s; }
.ld-sq-grid .ld-sq2 { animation-delay: 0.3s; background-color: #000; }
.ld-sq-grid .ld-sq3 { animation-delay: 0.0s; background-color: #000; }
.ld-sq-grid .ld-sq4 { animation-delay: 0.2s; }

@keyframes squareScale {
  0%, 5%, 65%, 100% {
    transform: scale3D(1, 1, 1);
  } 15%, 55% {
    transform: scale3D(.8, .8, 1);
  }
}
`;
  }
}

customElements.define('graph-loader', GraphLoader);
