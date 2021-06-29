import cheerio from "cheerio";
import parse from "cheerio/lib/parse";
import render from "./index";

const defaultOpts = cheerio.prototype.options;

interface CheerioOptions {
  _useHtmlParser2?: boolean;
  normalizeWhitespace?: boolean;
  decodeEntities?: boolean;
  emptyAttrs?: boolean;
  selfClosingTags?: boolean;
}

function html(
  preset: CheerioOptions,
  str: string,
  options: CheerioOptions = {}
) {
  const opts = { ...defaultOpts, ...preset, ...options };
  const dom = parse(str, opts, true);
  return render(dom, opts);
}

function xml(str: string, options: CheerioOptions = {}) {
  const opts = { ...defaultOpts, ...options, xmlMode: true };
  const dom = parse(str, opts, true);
  return render(dom, opts);
}

describe("render DOM parsed with htmlparser2", () => {
  // Only test applicable to the default setup
  describe("(html)", () => {
    const htmlFunc = html.bind(null, { _useHtmlParser2: true });
    /*
     * It doesn't really make sense for {decodeEntities: false}
     * since currently it will convert <hr class='blah'> into <hr class="blah"> anyway.
     */
    it("should handle double quotes within single quoted attributes properly", () => {
      const str = "<hr class='an \"edge\" case' />";
      expect(htmlFunc(str)).toStrictEqual(
        '<hr class="an &quot;edge&quot; case">'
      );
    });
  });

  // Run html with default options
  describe(
    "(html, {})",
    testBody.bind(null, html.bind(null, { _useHtmlParser2: true }))
  );

  // Run html with turned off decodeEntities
  describe(
    "(html, {decodeEntities: false})",
    testBody.bind(
      null,
      html.bind(null, { _useHtmlParser2: true, decodeEntities: false })
    )
  );

  describe("(xml)", () => {
    it("should render CDATA correctly", () => {
      const str =
        "<a> <b> <![CDATA[ asdf&asdf ]]> <c/> <![CDATA[ asdf&asdf ]]> </b> </a>";
      expect(xml(str)).toStrictEqual(str);
    });

    it('should append ="" to attributes with no value', () => {
      const str = "<div dropdown-toggle>";
      expect(xml(str)).toStrictEqual('<div dropdown-toggle=""/>');
    });

    it('should append ="" to boolean attributes with no value', () => {
      const str = "<input disabled>";
      expect(xml(str)).toStrictEqual('<input disabled=""/>');
    });

    it("should preserve XML prefixes on attributes", () => {
      const str =
        '<div xmlns:ex="http://example.com/ns"><p ex:ample="attribute">text</p></div>';
      expect(xml(str)).toStrictEqual(str);
    });

    it("should preserve mixed-case XML elements and attributes", () => {
      const str = '<svg viewBox="0 0 8 8"><radialGradient/></svg>';
      expect(xml(str)).toStrictEqual(str);
    });

    it("should encode entities in otherwise special tags", () => {
      expect(xml('<script>"<br/>"</script>')).toStrictEqual(
        "<script>&quot;<br/>&quot;</script>"
      );
    });

    it("should not encode entities if disabled", () => {
      const str = '<script>"<br/>"</script>';
      expect(xml(str, { decodeEntities: false })).toStrictEqual(str);
    });
  });
});

describe("(xml, {selfClosingTags: false})", () => {
  it("should render childless nodes with an explicit closing tag", () => {
    const str = "<foo /><bar></bar>";
    expect(xml(str, { selfClosingTags: false })).toStrictEqual(
      "<foo></foo><bar></bar>"
    );
  });
});

describe("(html, {selfClosingTags: true})", () => {
  it("should render <br /> tags correctly", () => {
    const str = "<br />";
    expect(
      html(
        {
          _useHtmlParser2: true,
          decodeEntities: false,
          selfClosingTags: true,
        },
        str
      )
    ).toStrictEqual(str);
  });
});

describe("(html, {selfClosingTags: false})", () => {
  it("should render childless SVG nodes with an explicit closing tag", () => {
    const str =
      '<svg><circle x="12" y="12"></circle><path d="123M"></path><polygon points="60,20 100,40 100,80 60,100 20,80 20,40"></polygon></svg>';
    expect(
      html(
        {
          _useHtmlParser2: true,
          decodeEntities: false,
          selfClosingTags: false,
        },
        str
      )
    ).toStrictEqual(str);
  });
});

function testBody(html: (input: string, opts?: CheerioOptions) => string) {
  it("should render <br /> tags without a slash", () => {
    const str = "<br />";
    expect(html(str)).toStrictEqual("<br>");
  });

  it("should retain encoded HTML content within attributes", () => {
    const str = '<hr class="cheerio &amp; node = happy parsing" />';
    expect(html(str)).toStrictEqual(
      '<hr class="cheerio &amp; node = happy parsing">'
    );
  });

  it('should shorten the "checked" attribute when it contains the value "checked"', () => {
    const str = "<input checked/>";
    expect(html(str)).toStrictEqual("<input checked>");
  });

  it("should render empty attributes if asked for", () => {
    const str = "<input checked/>";
    expect(html(str, { emptyAttrs: true })).toStrictEqual('<input checked="">');
  });

  it('should not shorten the "name" attribute when it contains the value "name"', () => {
    const str = '<input name="name"/>';
    expect(html(str)).toStrictEqual('<input name="name">');
  });

  it('should not append ="" to attributes with no value', () => {
    const str = "<div dropdown-toggle>";
    expect(html(str)).toStrictEqual("<div dropdown-toggle></div>");
  });

  it("should render comments correctly", () => {
    const str = "<!-- comment -->";
    expect(html(str)).toStrictEqual("<!-- comment -->");
  });

  it("should render whitespace by default", () => {
    const str = '<a href="./haha.html">hi</a> <a href="./blah.html">blah</a>';
    expect(html(str)).toStrictEqual(str);
  });

  it("should normalize whitespace if specified", () => {
    const str = '<a href="./haha.html">hi</a> <a href="./blah.html">blah  </a>';
    expect(html(str, { normalizeWhitespace: true })).toStrictEqual(
      '<a href="./haha.html">hi</a> <a href="./blah.html">blah </a>'
    );
  });

  it("should preserve multiple hyphens in data attributes", () => {
    const str = '<div data-foo-bar-baz="value"></div>';
    expect(html(str)).toStrictEqual('<div data-foo-bar-baz="value"></div>');
  });

  it("should not encode characters in script tag", () => {
    const str = '<script>alert("hello world")</script>';
    expect(html(str)).toStrictEqual(str);
  });

  it("should not encode tags in script tag", () => {
    const str = '<script>"<br>"</script>';
    expect(html(str)).toStrictEqual(str);
  });

  it("should not encode json data", () => {
    const str =
      '<script>var json = {"simple_value": "value", "value_with_tokens": "&quot;here & \'there\'&quot;"};</script>';
    expect(html(str)).toStrictEqual(str);
  });

  it("should render childless SVG nodes with a closing slash in HTML mode", () => {
    const str =
      '<svg><circle x="12" y="12"/><path d="123M"/><polygon points="60,20 100,40 100,80 60,100 20,80 20,40"/></svg>';
    expect(html(str)).toStrictEqual(str);
  });

  it("should render childless MathML nodes with a closing slash in HTML mode", () => {
    const str = "<math><infinity/></math>";
    expect(html(str)).toStrictEqual(str);
  });

  it("should allow SVG elements to have children", () => {
    const str = '<svg><circle cx="12" r="12"><title>dot</title></circle></svg>';
    expect(html(str)).toStrictEqual(str);
  });

  it("should not include extra whitespace in SVG self-closed elements", () => {
    const str = '<svg><image href="x.png"/>     </svg>';
    expect(html(str)).toStrictEqual(str);
  });

  it("should fix-up bad nesting in SVG in HTML mode", () => {
    const str = '<svg><g><image href="x.png"></svg>';
    expect(html(str)).toStrictEqual('<svg><g><image href="x.png"/></g></svg>');
  });

  it("should preserve XML prefixed attributes on inline SVG nodes in HTML mode", () => {
    const str =
      '<svg><text id="t" xml:lang="fr">Bonjour</text><use xlink:href="#t"/></svg>';
    expect(html(str)).toStrictEqual(str);
  });

  it("should handle mixed-case SVG content in HTML mode", () => {
    const str = '<svg viewBox="0 0 8 8"><radialGradient/></svg>';
    expect(html(str)).toStrictEqual(str);
  });

  it("should render HTML content in SVG foreignObject in HTML mode", () => {
    const str =
      '<svg><foreignObject requiredFeatures=""><img src="test.png" viewbox>text<svg viewBox="0 0 8 8"><circle r="3"/></svg></foreignObject></svg>';
    expect(html(str)).toStrictEqual(str);
  });

  it("should render iframe nodes with a closing tag in HTML mode", () => {
    const str = '<iframe src="test"></iframe>';
    expect(html(str)).toStrictEqual(str);
  });

  it("should encode double quotes in attribute", () => {
    const str = `<img src="/" alt='title" onerror="alert(1)" label="x'>`;
    expect(html(str)).toStrictEqual('<img src="/" alt="title&quot; onerror=&quot;alert(1)&quot; label=&quot;x">');
  });
}
