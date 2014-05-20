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

var unencodedElements = {
  __proto__: null,
  style: true,
  script: true,
  xmp: true,
  iframe: true,
  noembed: true,
  noframes: true,
  plaintext: true,
  noscript: true
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

  var output = '';

  for(var i = 0; i < dom.length; i++){
    var elem = dom[i];

    if (ElementType.isTag(elem))
      output += renderTag(elem, opts);
    else if (elem.type === ElementType.Directive)
      output += renderDirective(elem);
    else if (elem.type === ElementType.Comment)
      output += renderComment(elem);
    else if (elem.type === ElementType.CDATA)
      output += renderCdata(elem);
    else
      output += renderText(elem);
  }

  return output;
};

function renderTag(elem, opts) {
  var tag = '<' + elem.name,
      attribs = formatAttrs(elem.attribs);

  if (attribs) {
    tag += ' ' + attribs;
  }

  if (
    opts.xmlMode &&
    (!elem.children || elem.children.length === 0)
  ) {
    tag += '/>';
  } else {
    tag += '>';
    tag += render(elem.children, opts);
  
    if (!singleTag[elem.name] || opts.xmlMode) {
      tag += '</' + elem.name + '>';
    }
  }

  
  
  return tag;
}

function renderDirective(elem) {
  return '<' + elem.data + '>';
}

var renderText = function(elem) {
  var name, isMatch,
      data      = elem.data || '',
      name      = elem.parent && elem.parent.name
      isEncoded = !(name in unencodedElements);
      
  if (isEncoded) {
    data = entities.encodeXML(data);
  }
  
  return data;
};

function renderCdata(elem) {
  return '<![CDATA[' + elem.children[0].data + ']]>';
}

function renderComment(elem) {
  return '<!--' + elem.data + '-->';
}
