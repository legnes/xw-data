class QueryParamForm extends HTMLFormElement {
  constructor() {
    super();

    this.action = 'javascript:void(0);';

    const submit = document.createElement('input');
    submit.type = 'submit';
    submit.value = 'reload';
    this.appendChild(submit);
    this.submit = submit;

    this.addEventListener('submit', async () => {
      this.setDisabled(true);
      try {
        const figure = await this.loadFigure();
        this.parentNode.renderData(figure);
      } catch (e) {
        // console.log(e);
      } finally {
        // TODO: loading spinner?
        this.setDisabled(false);
      }
    });
  }

  forEachInput(callback) {
    // TODO: support arbitrary child structure
    for (const child of this.childNodes) {
      if (child.tagName !== 'LABEL') continue;
      for (const grandchild of child.childNodes) {
        if (!(grandchild instanceof QueryParamInput)) continue;
        callback(grandchild);
      }
    }
  }

  setDisabled(disabled) {
    this.submit.disabled = !!disabled;
    this.forEachInput(input => { input.disabled = !!disabled; });
  }

  get queryString() {
    const queryTerms = [];
    this.forEachInput(input => {
      const queryParam = input.getAttribute('data-query-param');
      const queryValue = input.queryValue;
      if (queryValue !== null) {
        queryTerms.push(`${queryParam}=${queryValue}`);
      }
    });
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
      // Disable until initial load
      // TODO: propagte changes before initial data load?
      if (typeof figureLoadEvent !== 'undefined') this.setDisabled(true);
      this.parentNode.addEventListener('figureload', () => {
        this.setDisabled(false);
      });
    }
  }
}

const figureLoadEvent = new Event('figureload');
customElements.define('query-param-form', QueryParamForm, { extends: 'form' });
