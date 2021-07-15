const base = {};

// based on https://stackoverflow.com/questions/54651201/how-do-i-covert-kebab-case-into-pascalcase
base.dashCaseToWords = (text) => {
  return text.replace(/(^\w|-\w)/g, (match) => match.replace(/-/, ' ').toUpperCase());
};

// https://stackoverflow.com/questions/7225407/convert-camelcasetext-to-sentence-case-text
base.camelCaseToWords = (text) => {
  return text.replace(/([A-Z])/g, " $1").split(' ').map(word => (`${word.charAt(0).toLowerCase()}${word.slice(1)}`)).join(' ');
};

base.addInto = (outObj, key, val) => {
  outObj[key] = (outObj[key] || 0) + val;
  return outObj;
};

base.pushInto = (outObj, key, val) => {
  outObj[key] = outObj[key] || [];
  outObj[key].push(val);
  return outObj;
};

base.sortBy = (key, desc) => (a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0);

base.numSort = (desc) => (a, b) => ((+a - +b) * (desc ? -1 : 1));

base.numSortBy = (key, desc) => (a, b) => ((desc ? -1 : 1) * (+a[key] - +b[key]));

module.exports = base;