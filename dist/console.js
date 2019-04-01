var fp = require('lodash/fp');

// read text blocks from assets
const chapters_url = '/chapters/demo.xml';

const getBodyText = (response) => response.text();

const parseXml = function (xml_string) {
  let parser = new DOMParser();
  let doc = parser.parseFromString(xml_string, "application/xml")
  return doc
};

const getTagElements = function (tag_name, doc) {
  return doc.getElementsByTagName(tag_name)
};

const writeToDom = function (id_name, html_collection) {
  document.getElementById(id_name).innerHTML = html_collection
};

fetch(chapters_url)
    .then(getBodyText)
    .then(parseXml)
    .then(fp.partial(getTagElements, 'p'))
    .then(fp.partial(writeToDom, 'console_out'));

writeToDom('console_out', 'This is only a test');
