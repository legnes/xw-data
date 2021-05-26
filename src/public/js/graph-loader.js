// Based on:
// https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/define
// https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#using_the_lifecycle_callbacks
// https://www.html5rocks.com/en/tutorials/webcomponents/customelements/
// Loading spinner:
// https://loading.io/css/
//
class GraphLoader extends HTMLElement {
  constructor() {
    super();

    // Content
    const shadowContainer = document.createElement('div');
    this.prepend(shadowContainer);
    const shadow = shadowContainer.attachShadow({mode: 'open'});

    // style
    const style = document.createElement('style');
    style.textContent = GraphLoader.style;
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
    spinner.className = 'loading-spinner';

    // graph container
    const graphContainer = document.createElement('div');
    graphContainer.className = 'graph-container';
    graphContainer.id = this.getAttribute('data-id');

    // variables for reloading
    this.target = graphContainer
    this.layout = { ...GraphLoader.layout };
    this.config = { ...GraphLoader.config };

    // button click
    const handleButton = async () => {
      button.removeEventListener('click', handleButton);
      loaderContainer.removeChild(button);
      loaderContainer.appendChild(spinner);
      const figure = await this.loadFigure();
      if (figure.layout) this.setLayout(figure.layout);
      if (figure.config) Object.assign(this.config, figure.config);
      this.renderData(figure);
      this.parentNode.insertBefore(graphContainer, this);
      // this.parentNode.removeChild(this);
      shadow.removeChild(loaderContainer);
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
    // TODO: make more robust
    for (const [key, val] of Object.entries(layout)) {
      this.layout[key] = Object.assign(this.layout[key] || {}, val);
    }
  }

  renderLayout(layout) {
    this.setLayout(layout);
    Plotly.relayout(this.target, this.layout);
  }

  static get width() { return 800; }
  static get height() { return 400; }

  static get layout() {
    return {
      autosize: false,
      width: GraphLoader.width,
      height: GraphLoader.height,
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
    };
  }

  static get config() {
    return {
      // responsive: true
    };
  }

  static get style() { return `
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

.loading-spinner {
  display: inline-block;
  position: relative;
  width: 80px;
  height: 80px;
}
.loading-spinner:after {
  content: " ";
  display: block;
  border-radius: 50%;
  width: 0;
  height: 0;
  margin: 8px;
  box-sizing: border-box;
  border: 32px solid mediumaquamarine;
  border-color: mediumaquamarine transparent mediumaquamarine transparent;
  animation: loading-spinner 1.2s infinite;
}
@keyframes loading-spinner {
  0% {
    transform: rotate(0);
    animation-timing-function: cubic-bezier(0.55, 0.055, 0.675, 0.19);
  }
  50% {
    transform: rotate(900deg);
    animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
  }
  100% {
    transform: rotate(1800deg);
  }
}
`;
  }
}

customElements.define('graph-loader', GraphLoader);