/*
  Module dependencies
*/
var ElementType = require('domelementtype');
var entities = require('entities');

/*
  Boolean Attributes
*/
var booleanAttributes = {
  __proto__: null,
  autofocus: true,
  autoplay: true,
  async: true,
  checked: true,
  controls: true,
  defer: true,
  disabled: true,
  hidden: true,
  loop: true,
  multiple: true,
  open: true,
  readonly: true,
  required: true,
  scoped: true,
  selected: true
};

/*
  Format attributes
*/
var formatAttrs = function(attributes) {
  if (!attributes) return;

  var output = '',
      value;

  // Loop through the attributes
  for (var key in attributes) {
    value = attributes[key];
    if (output) {
      output += ' ';
    }

    if (!value && booleanAttributes[key]) {
      output += key;
    } else {
      output += key + '="' + entities.escape(value || '') + '"';
    }
  }

  return output;
};

/*
  Self-enclosing tags (stolen from node-htmlparser)
*/
var singleTag = {
  __proto__: null,
  area: true,
  base: true,
  basefont: true,
  br: true,
  col: true,
  command: true,
  embed: true,
  frame: true,
  hr: true,
  img: true,
  input: true,
  isindex: true,
  keygen: true,
  link: true,
  meta: true,
  param: true,
  source: true,
  track: true,
  wbr: true,

  //common self closing svg elements
  path: true,
  circle: true,
  ellipse: true,
  line: true,
  rect: true,
  use: true
};

var render = module.exports = function(dom, opts) {
  if (!Array.isArray(dom) && !dom.cheerio) dom = [dom];
  opts = opts || {};

  var output = '',
      xmlMode = opts.xmlMode;

  for(var i = 0; i < dom.length; i++){
    var elem = dom[i];
    var isTag = ElementType.isTag(elem);

    var pushVal;
    if (isTag)
      pushVal = renderTag(elem, xmlMode);
    else if (elem.type === ElementType.Directive)
      pushVal = renderDirective(elem);
    else if (elem.type === ElementType.Comment)
      pushVal = renderComment(elem);
    else if (elem.type === ElementType.CDATA)
      pushVal = renderCdata(elem);
    else
      pushVal = renderText(elem);

    if (elem.children && elem.type !== ElementType.CDATA)
      pushVal += render(elem.children, opts);

    if (isTag && (!singleTag[elem.name] || xmlMode)) {
      if (!isClosedTag(elem, xmlMode)) {
        pushVal += '</' + elem.name + '>';
      }
    }

    // Push rendered DOM node
    output += pushVal;
  }

  return output;
};

function isClosedTag(elem, xmlMode){
  return (xmlMode && (!elem.children || elem.children.length === 0));
}

function renderTag(elem, xmlMode) {
  var tag = '<' + elem.name,
      attribs = formatAttrs(elem.attribs);

  if (attribs) {
    tag += ' ' + attribs;
  }

  if (isClosedTag(elem, xmlMode)) {
    tag += '/';
  }

  return tag + '>';
}

function renderDirective(elem) {
  return '<' + elem.data + '>';
}

function renderText(elem) {
  return entities.encodeXML(elem.data || '');
}

function renderCdata(elem) {
  return '<![CDATA[' + elem.children[0].data + ']]>';
}

function renderComment(elem) {
  return '<!--' + elem.data + '-->';
}
