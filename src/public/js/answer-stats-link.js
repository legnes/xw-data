class AnswerStatsLink extends HTMLElement {
  constructor() {
    super();

    const search = this.textContent;

    const shadow = this.attachShadow({mode: 'open'});

    const anchor = document.createElement('a');
    anchor.textContent = search;
    anchor.href = `/answer-stats?search=${search}`;
    shadow.appendChild(anchor);
  }
}

customElements.define('a-xw', AnswerStatsLink);