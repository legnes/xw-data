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
      case 'hidden':
        return encodeURI(this.value);
      case 'number':
        return this.value;
      default:
        return '';
    }
  }

  // preUpdate() {
  //   // TODO: consider running this on input change
  //   // TODO: support arbitrary parent structure
  //   const parentForm = this.parentNode.parentNode;
  //   if (!(parentForm instanceof QueryParamForm)) return;
  //   parentForm.preUpdate();
  // }
}

customElements.define('query-param-input', QueryParamInput, { extends: 'input' });