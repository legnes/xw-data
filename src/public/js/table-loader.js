class TableLoader extends HTMLElement {
  constructor() {
    super();

    // Attributes
    // const dataSrc = this.getAttribute('data-src');

    // Content
    const shadowContainer = document.createElement('div');
    shadowContainer.id = this.getAttribute('data-id');
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
    spinner.className = 'ld-sq-grid';
    for (let i = 1; i <= 4; i++) {
      const subspinner = document.createElement('div');
      subspinner.className = `ld-sq ld-sq${i}`;
      spinner.appendChild(subspinner);
    }

    // table container
    const tableContainer = document.createElement('div');
    tableContainer.className = 'table-container';

    // table
    const table = document.createElement('table');
    table.setAttribute('tabindex', 0);
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

      // handle sorting
      // TODO: use tabindex 0 for the currently selected header,
      //       and tabindex -1 combined with arrow key nav for the others
      //       as per example 2 here https://www.w3.org/TR/wai-aria-practices/examples/grid/dataGrids.html
      // TODO: because we recreate the table on rerender, focus is lost
      headerCell.setAttribute('tabindex', 0);
      headerCell.addEventListener('click', () => {
        this.setSortColumnAndRerender(i);
      });
      headerCell.addEventListener('keydown', (evt) => {
        if (evt.key === 'Enter' || evt.key === ' ') {
          evt.stopPropagation();
          evt.preventDefault();
          this.setSortColumnAndRerender(i);
        }
      });
      if (i === this.sortConfig.columnIdx) {
        headerCell.className = `sort-column-${this.sortConfig.isAscending ? 'asc' : 'desc'}`;
        headerCell.setAttribute('aria-sort', this.sortConfig.isAscending ? 'ascending' : 'descending');
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

  setSortColumnAndRerender(columnIdx) {
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

  // Loader css from https://tobiasahlin.com/spinkit/
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

.ld-sq-grid {
  width: 40px;
  height: 40px;
  margin: 100px auto;
}

.ld-sq-grid .ld-sq {
  width: 18px;
  height: 18px;
  border: 1px solid #EF0096;
  float: left;
  animation: ld-sqGridScaleDelay 1.5s infinite ease-in-out;
}

.ld-sq-grid .ld-sq1 { animation-delay: 0.1s; background-color: #000; }
.ld-sq-grid .ld-sq2 { animation-delay: 0.3s; background-color: #000; }
.ld-sq-grid .ld-sq3 { animation-delay: 0.0s; }
.ld-sq-grid .ld-sq4 { animation-delay: 0.2s; }

@keyframes ld-sqGridScaleDelay {
  0%, 5%, 65%, 100% {
    transform: scale3D(1, 1, 1);
  } 15%, 55% {
    transform: scale3D(.8, .8, 1);
  }
}
`;
  }
}

customElements.define('table-loader', TableLoader);