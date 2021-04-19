class GraphQueryParamInput extends HTMLElement {
  constructor() {
    super();

    this._target = null;

    const shadow = this.attachShadow({mode: 'open'});

    const form = document.createElement('form');
    form.action = "javascript:void(0);";
    shadow.appendChild(form);

    const label = document.createElement('label');
    label.textContent = this.getAttribute('data-label');
    form.appendChild(label);

    const text = document.createElement('input');
    text.type = 'text';
    label.appendChild(text);

    const submit = document.createElement('input');
    submit.type = 'submit';
    submit.value = 'reload';
    form.appendChild(submit);

    form.addEventListener('submit', async () => {
      const figure = await this.loadFigure(text.value);
      Plotly.react(this.target, figure.data, {...GraphLoader.layout, ...(figure.layout || {})}, GraphLoader.config);
    });
  }

  get target() {
    if (!this._target) {
      this._target = document.getElementById(this.parentNode.getAttribute('data-id'));
    }
    return this._target;
  }

  async loadFigure(queryValue) {
    // TODO: combine w/ parent version
    // (possibly thru attribute observers)
    // ALTERNATIVELY: split into (multiple) inputs and button, parse query url -> object and back?
    const dataSrc = this.parentNode.getAttribute('data-src').split('?')[0];
    const queryParam = this.getAttribute('data-query-param');
    const response = await fetch(`${dataSrc}?${queryParam}=${queryValue}`);
    const data = await response.json();
    // console.log(data);
    return data;
  }

  // static get observedAttributes() { return ['checked']; }
  // connectedCallback() { console.log('connected'); }
  // attachedCallback() { console.log('attached'); }
  // attributeChangedCallback(name, oldValue, newValue) { console.log('attribute changed', name, oldValue, newValue); }
}

customElements.define('graph-query-param-input', GraphQueryParamInput);