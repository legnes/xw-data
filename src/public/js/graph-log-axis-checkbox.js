class GraphLogAxisCheckbox extends HTMLElement {
  constructor() {
    super();

    const shadow = this.attachShadow({mode: 'open'});

    const label = document.createElement('label');
    label.textContent = 'logarithmic axes'
    shadow.appendChild(label);

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    label.appendChild(checkbox);

    checkbox.addEventListener('change', () => {
      this.parentNode.renderLayout(this.layout);
    });

    this.checkbox = checkbox;
  }

  get layout() {
    const axisType = this.checkbox.checked ? 'log' : 'linear';
    const axes = (this.getAttribute('data-axes') || 'x+y').split('+');
    const layout = axes.reduce((obj, axis) => {
      if (axis === 'x' || axis === 'y' || axis === 'x2' || axis === 'y2') {
        obj[`${axis[0]}axis${axis[1] || ''}`] = { type: axisType };
      }
      return obj;
    }, {});
    return layout;
  }

  connectedCallback() {
    if (this.isConnected && this.checkbox) {
      this.checkbox.checked = this.getAttribute('data-checked') === 'true';
      this.parentNode.setLayout(this.layout)
    }
  }
}

customElements.define('graph-log-axis-checkbox', GraphLogAxisCheckbox);