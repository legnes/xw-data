// Based on:
// https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/define
// https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#using_the_lifecycle_callbacks
// https://www.html5rocks.com/en/tutorials/webcomponents/customelements/
// Loading spinner:
// https://loading.io/css/
//
class TableLoader extends HTMLElement {
  constructor() {
    super();

    // Attributes
    // const dataSrc = this.getAttribute('data-src');

    // Content
    const shadowContainer = document.createElement('div');
    this.prepend(shadowContainer);
    const shadow = shadowContainer.attachShadow({mode: 'open'});

    // style
    const style = document.createElement('style');
    style.textContent = TableLoader.style;
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

    // table container
    const tableContainer = document.createElement('div');
    tableContainer.className = 'table-container';

    // table
    const table = document.createElement('table');
    tableContainer.appendChild(table);
    this.table = table;

    this.figure = null;
    this.sortConfig = {
      columnIdx: -1,
      isAscending: false
    };

    // button click
    const handleButton = async () => {
      button.removeEventListener('click', handleButton);
      loaderContainer.removeChild(button);
      loaderContainer.appendChild(spinner);
      const figure = await this.loadTable();
      shadow.removeChild(loaderContainer);
      this.renderData(figure);
      shadow.appendChild(tableContainer);
    }
    button.addEventListener('click', handleButton);
  }

  renderData(figure) {
    this.figure = figure;
    // Will be skipped if sort config isn't initialized
    this.sortData();

    this.table.innerHTML = '';
    const headerRow = document.createElement('tr');
    for (let i = 0, len = figure.columns.length; i < len; i++) {
      const column = figure.columns[i];
      const headerCell = document.createElement('th');
      headerCell.textContent = column.label;
      headerCell.addEventListener('click', () => { this.setSortConfigAndRerender(i); });
      if (i === this.sortConfig.columnIdx) {
        // TODO: use classList.add?
        headerCell.className = `sort-column-${this.sortConfig.isAscending ? 'asc' : 'desc'}`;
      }
      headerRow.appendChild(headerCell);
    }
    this.table.appendChild(headerRow);

    for (const row of figure.rows) {
      const dataRow = document.createElement('tr');
      for (const column of figure.columns) {
        const dataCell = document.createElement('td');
        dataCell.textContent = row[column.key];
        dataRow.appendChild(dataCell);
      }
      this.table.appendChild(dataRow);
    }
  }

  sortData() {
    if (!this.figure ||
        this.sortConfig.columnIdx < 0 ||
        this.sortConfig.columnIdx >= this.figure.columns.length) return;
    const sortColumn = this.figure.columns[this.sortConfig.columnIdx];
    const directionMultiplier = this.sortConfig.isAscending ? 1 : -1;
    this.figure.rows.sort((rowA, rowB) => {
      let valA = rowA[sortColumn.key];
      let valB = rowB[sortColumn.key];
      valA = !isNaN(+valA) ? +valA : valA;
      valB = !isNaN(+valB) ? +valB : valB;
      const comparisonValue = valA < valB ? -1 : valA > valB ? 1 : 0;
      return directionMultiplier * comparisonValue;
    });
  }

  setSortConfigAndRerender(columnIdx) {
    if (typeof columnIdx !== 'undefined') {
      if (this.sortConfig.columnIdx !== columnIdx) {
        this.sortConfig.columnIdx = columnIdx;
        this.sortConfig.isAscending = false;
      } else {
        this.sortConfig.isAscending = !this.sortConfig.isAscending;
      }
    }

    this.renderData(this.figure);
  }

  async loadTable() {
    const dataSrc = this.getAttribute('data-src');
    const response = await fetch(dataSrc);
    const data = await response.json();
    // console.log(data);
    return data;
  }

  static get width() { return 800; }
  static get height() { return 400; }

  static get style() { return `
.loader-container {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  width: ${TableLoader.width}px;
  height: ${TableLoader.height}px;
  border: 1px solid black;
}

.table-container {
  width: ${TableLoader.width}px;
  max-height: ${TableLoader.height}px;
  overflow: scroll;
}

table {
  width: 100%;
}

th {
  cursor: pointer;
}

.sort-column-asc::after {
  content: " ↑";
}

.sort-column-desc::after {
  content: " ↓";
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

customElements.define('table-loader', TableLoader);