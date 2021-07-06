class QueryParamForm extends HTMLFormElement {
  constructor() {
    super();

    this.action = 'javascript:void(0);';
    this.parentLoaded = false;

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

  get dataUrl() {
    const dataSrc = this.parentNode.getAttribute('data-src');
    const dataUrl = new URL(dataSrc, window.location.origin);
    const dataParams = dataUrl.searchParams;
    this.forEachInput(input => {
      const queryParam = input.getAttribute('data-query-param');
      const queryValue = input.queryValue;
      if (queryValue !== null) {
        dataParams.set(queryParam, queryValue);
      }
    });
    return dataUrl.pathname + dataUrl.search;
  }

  async loadFigure() {
    const response = await fetch(this.dataUrl);
    const data = await response.json();
    return data;
  }

  preUpdate() {
    if (!this.parentLoaded) {
      this.parentNode.setAttribute('data-src', this.dataUrl);
    }
  }

  connectedCallback() {
    if (this.isConnected) {
      this.preUpdate();
      // Disable until initial load
      // TODO: propagate changes before initial data load?
      if (typeof figureLoadEvent !== 'undefined') this.setDisabled(true);
      this.parentNode.addEventListener('figureload', () => {
        this.parentLoaded = true;
        this.setDisabled(false);
      });
    }
  }
}

const figureLoadEvent = new Event('figureload');
customElements.define('query-param-form', QueryParamForm, { extends: 'form' });
