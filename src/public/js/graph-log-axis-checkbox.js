class GraphLogAxisCheckbox extends HTMLElement {
  constructor() {
    super();

    this._target = null;

    const shadow = this.attachShadow({mode: 'open'});

    const label = document.createElement('label');
    label.textContent = 'logarithmic axes'
    shadow.appendChild(label);

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    label.appendChild(checkbox);

    checkbox.addEventListener('change', () => {
      const axisType = checkbox.checked ? 'log' : 'linear';
      const axes = (this.getAttribute('data-axes') || 'x+y').split('+');
      const layout = axes.reduce((obj, axis) => {
        if (axis === 'x' || axis === 'y' || axis === 'x2' || axis === 'y2') {
          obj[`${axis[0]}axis${axis[1] || ''}.type`] = axisType;
        }
        return obj;
      }, {});
      Plotly.relayout(this.target, layout);
    });
  }

  get target() {
    if (!this._target) {
      this._target = document.getElementById(this.parentNode.getAttribute('data-id'));
    }
    return this._target;
  }

  // static get observedAttributes() { return ['checked']; }
  // connectedCallback() { console.log('connected'); }
  // attachedCallback() { console.log('attached'); }
  // attributeChangedCallback(name, oldValue, newValue) { console.log('attribute changed', name, oldValue, newValue); }
}

customElements.define('graph-log-axis-checkbox', GraphLogAxisCheckbox);