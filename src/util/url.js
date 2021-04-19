const url = {};

url.cleanText = (search) => {
  const MAX_SEARCH_TERMS = 10;
  // TODO: add extra protections to this?
  return decodeURI(search)
          .split(',')
          .map(str => str.replace(/\s/g, ''))
          .filter(str => (/^[\w\*]+$/.test(str)))
          .slice(0, MAX_SEARCH_TERMS)
          .map(str => str.toUpperCase().replace(/\*/g, '_'));
};

url.cleanNumber = (str, defaultVal) => {
  let val = parseInt(str, 10);
  return isNaN(val) ? defaultVal : val;
};

module.exports = url;