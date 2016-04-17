var expect = require('expect.js'),
    defaultOpts = require('cheerio').prototype.options,
    _ = require('lodash'),
    parse = require('cheerio/lib/parse'),
    render = require('./index.js');

var html = function(preset, str, options) {
  options = _.defaults(options || {}, _.defaults(preset, defaultOpts));
  var dom = parse(str, options);
  return render(dom, options);
};

var xml = function(str, options) {
  options = _.defaults(options || {}, defaultOpts);
  options.xmlMode = true;
  var dom = parse(str, options);
  return render(dom, options);
};

describe('render', function() {

  // only test applicable to the default setup
  describe('(html)', function() {
    var htmlFunc = _.partial(html, {});
    // it doesn't really make sense for {decodeEntities: false}
    // since currently it will convert <hr class='blah'> into <hr class="blah"> anyway.
    it('should handle double quotes within single quoted attributes properly', function() {
      var str = '<hr class=\'an "edge" case\' />';
      expect(htmlFunc(str)).to.equal('<hr class="an &quot;edge&quot; case">');
    });
  });

  // run html with default options
  describe('(html, {})', _.partial( testBody, _.partial(html, {}) ));

  // run html with turned off decodeEntities
  describe('(html, {decodeEntities: false})', _.partial( testBody, _.partial(html, {decodeEntities: false}) ));

  describe('(xml)', function() {

    it('should render CDATA correctly', function() {
      var str = '<a> <b> <![CDATA[ asdf&asdf ]]> <c/> <![CDATA[ asdf&asdf ]]> </b> </a>';
      expect(xml(str)).to.equal(str);
    });

    it('should append ="" to attributes with no value', function() {
      var str = '<div dropdown-toggle>';
      expect(xml(str)).to.equal('<div dropdown-toggle=""/>');
    });

    it('should append ="" to boolean attributes with no value', function() {
      var str = '<input disabled>';
      expect(xml(str)).to.equal('<input disabled=""/>');
    });

  });

});


function testBody(html) {

  it('should render <br /> tags correctly', function() {
    var str = '<br />';
    expect(html(str)).to.equal('<br>');
  });

  it('should retain encoded HTML content within attributes', function() {
    var str = '<hr class="cheerio &amp; node = happy parsing" />';
    expect(html(str)).to.equal('<hr class="cheerio &amp; node = happy parsing">');
  });

  it('should shorten the "checked" attribute when it contains the value "checked"', function() {
    var str = '<input checked/>';
    expect(html(str)).to.equal('<input checked>');
  });

  it('should not shorten the "name" attribute when it contains the value "name"', function() {
    var str = '<input name="name"/>';
    expect(html(str)).to.equal('<input name="name">');
  });

  it('should not append ="" to attributes with no value', function() {
    var str = '<div dropdown-toggle>';
    expect(html(str)).to.equal('<div dropdown-toggle></div>');
  });

  it('should render comments correctly', function() {
    var str = '<!-- comment -->';
    expect(html(str)).to.equal('<!-- comment -->');
  });

  it('should render whitespace by default', function() {
    var str = '<a href="./haha.html">hi</a> <a href="./blah.html">blah</a>';
    expect(html(str)).to.equal(str);
  });

  it('should normalize whitespace if specified', function() {
    var str = '<a href="./haha.html">hi</a> <a href="./blah.html">blah  </a>';
    expect(html(str, { normalizeWhitespace: true })).to.equal('<a href="./haha.html">hi</a> <a href="./blah.html">blah </a>');
  });

  it('should preserve multiple hyphens in data attributes', function() {
    var str = '<div data-foo-bar-baz="value"></div>';
    expect(html(str)).to.equal('<div data-foo-bar-baz="value"></div>');
  });

  it('should not encode characters in script tag', function() {
    var str = '<script>alert("hello world")</script>';
    expect(html(str)).to.equal(str);
  });

  it('should not encode json data', function() {
    var str = '<script>var json = {"simple_value": "value", "value_with_tokens": "&quot;here & \'there\'&quot;"};</script>';
    expect(html(str)).to.equal(str);
  });

  it('should render SVG nodes with a closing slash in HTML mode', function() {
    var str = '<svg><circle x="12" y="12"/><path d="123M"/><polygon points="60,20 100,40 100,80 60,100 20,80 20,40"/></svg>';
    expect(html(str)).to.equal(str);
  });

  it('should render iframe nodes with a closing slash in HTML mode', function() {
    var str = '<iframe src="test"></iframe>';
    expect(html(str)).to.equal(str);
  });
}
