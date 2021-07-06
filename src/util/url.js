const url = {};

url.cleanSearchText = (query) => {
  const MAX_SEARCH_TERMS = 6;
  // TODO: add extra protections to this?
  return decodeURI(query)
          .split(',')
          .map(str => str.replace(/\s/g, ''))
          .filter(str => (/^[\w\*]+$/.test(str)))
          .slice(0, MAX_SEARCH_TERMS)
          .map(str => str.toUpperCase().replace(/\*/g, '_'));
};

url.cleanOptionText = (query, options, defaultVal) => {
  const text = decodeURI(query);
  for (let i = 0, len = options.length; i < len; i++) {
    const option = options[i];
    if (text === option) return option;
  }
  return defaultVal;
};

url.cleanNumber = (query, defaultVal) => {
  let val = parseInt(query, 10);
  return isNaN(val) ? defaultVal : val;
};

url.cleanBoolean = (query) => {
  return query === 'true';
}

module.exports = url;