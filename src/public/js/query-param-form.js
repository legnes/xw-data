class QueryParamForm extends HTMLFormElement {
  constructor() {
    super();

    this.action = 'javascript:void(0);';

    const submit = document.createElement('input');
    submit.type = 'submit';
    submit.value = 'reload';
    this.appendChild(submit);

    this.addEventListener('submit', async () => {
      const figure = await this.loadFigure();
      this.parentNode.renderData(figure);
    });
  }

  get queryString() {
    const queryTerms = [];
    for (const child of this.childNodes) {
      if (child.tagName !== 'LABEL') continue;
      for (const grandchild of child.childNodes) {
        if (!(grandchild instanceof QueryParamInput)) continue;
        const queryParam = grandchild.getAttribute('data-query-param');
        const queryValue = grandchild.queryValue;
        queryTerms.push(`${queryParam}=${queryValue}`);
      }
    }
    return queryTerms.join('&');
  }

  get dataUrl() {
    const dataSrc = this.parentNode.getAttribute('data-src').split('?')[0];
    return `${dataSrc}?${this.queryString}`;
  }

  async loadFigure() {
    const response = await fetch(this.dataUrl);
    const data = await response.json();
    return data;
  }

  connectedCallback() {
    if (this.isConnected) {
      this.parentNode.setAttribute('data-src', this.dataUrl);
    }
  }
}

customElements.define('query-param-form', QueryParamForm, { extends: 'form' });