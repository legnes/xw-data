class QueryParamInput extends HTMLInputElement {
  constructor() {
    super();
  }

  get queryValue() {
    switch (this.type) {
      case 'checkbox':
        return this.checked;
      case 'radio':
        return this.checked ? encodeURI(this.value) : null;
      case 'text':
        return encodeURI(this.value);
      case 'number':
        return this.value;
      default:
        return '';
    }
  }
}

customElements.define('query-param-input', QueryParamInput, { extends: 'input' });