import { type CheerioOptions, load } from "cheerio";
import render from "./index";

interface LoadingOptions extends CheerioOptions {
  _useHtmlParser2?: boolean;
  decodeEntities?: boolean;
  encodeEntities?: "utf8";
  selfClosingTags?: boolean;
  emptyAttrs?: boolean;
}

function html(
  preset: LoadingOptions,
  string_: string,
  options: LoadingOptions = {},
) {
  const options_ = { ...preset, ...options };
  const $ = load(string_, options_, true);
  return render($._root, options_);
}

function xml(string_: string, options: LoadingOptions = {}) {
  const options_ = { ...options, xmlMode: true };
  const $ = load(string_, options_, true);
  return render($._root, options_);
}

describe("render DOM parsed with htmlparser2", () => {
  // Only test applicable to the default setup
  describe("(html)", () => {
    const htmlFunction = html.bind(null, { _useHtmlParser2: true });
    /*
     * It doesn't really make sense for {decodeEntities: false}
     * since currently it will convert <hr class='blah'> into <hr class="blah"> anyway.
     */
    it("should handle double quotes within single quoted attributes properly", () => {
      const string_ = "<hr class='an \"edge\" case' />";
      expect(htmlFunction(string_)).toStrictEqual(
        '<hr class="an &quot;edge&quot; case">',
      );
    });

    it("should escape entities to utf8 if requested", () => {
      const string_ = '<a href="a < b &quot; & c">& " &lt; &gt;</a>';
      expect(
        html({ _useHtmlParser2: true, encodeEntities: "utf8" }, string_),
      ).toStrictEqual('<a href="a < b &quot; &amp; c">&amp; " &lt; &gt;</a>');
    });
  });

  // Run html with default options
  describe(
    "(html, {})",
    testBody.bind(null, html.bind(null, { _useHtmlParser2: true })),
  );

  // Run html with turned off decodeEntities
  describe(
    "(html, {decodeEntities: false})",
    testBody.bind(
      null,
      html.bind(null, { _useHtmlParser2: true, decodeEntities: false }),
    ),
  );

  describe("(xml)", () => {
    it("should render CDATA correctly", () => {
      const string_ =
        "<a> <b> <![CDATA[ asdf&asdf ]]> <c/> <![CDATA[ asdf&asdf ]]> </b> </a>";
      expect(xml(string_)).toStrictEqual(string_);
    });

    it('should append ="" to attributes with no value', () => {
      const string_ = "<div dropdown-toggle>";
      expect(xml(string_)).toStrictEqual('<div dropdown-toggle=""/>');
    });

    it('should append ="" to boolean attributes with no value', () => {
      const string_ = "<input disabled>";
      expect(xml(string_)).toStrictEqual('<input disabled=""/>');
    });

    it("should preserve XML prefixes on attributes", () => {
      const string_ =
        '<div xmlns:ex="http://example.com/ns"><p ex:ample="attribute">text</p></div>';
      expect(xml(string_)).toStrictEqual(string_);
    });

    it("should preserve mixed-case XML elements and attributes", () => {
      const string_ = '<svg viewBox="0 0 8 8"><radialGradient/></svg>';
      expect(xml(string_)).toStrictEqual(string_);
    });

    it("should encode entities in otherwise special tags", () => {
      expect(xml('<script>"<br/>"</script>')).toStrictEqual(
        "<script>&quot;<br/>&quot;</script>",
      );
    });

    it("should not encode entities if disabled", () => {
      const string_ = '<script>"<br/>"</script>';
      expect(xml(string_, { decodeEntities: false })).toStrictEqual(string_);
    });
  });
});

describe("(xml, {selfClosingTags: false})", () => {
  it("should render childless nodes with an explicit closing tag", () => {
    const string_ = "<foo /><bar></bar>";
    expect(xml(string_, { selfClosingTags: false })).toStrictEqual(
      "<foo></foo><bar></bar>",
    );
  });
});

describe("(html, {selfClosingTags: true})", () => {
  it("should render <br /> tags correctly", () => {
    const string_ = "<br />";
    expect(
      html(
        {
          _useHtmlParser2: true,
          decodeEntities: false,
          selfClosingTags: true,
        },
        string_,
      ),
    ).toStrictEqual(string_);
  });
});

describe("(html, {selfClosingTags: false})", () => {
  it("should render childless SVG nodes with an explicit closing tag", () => {
    const string_ =
      '<svg><circle x="12" y="12"></circle><path d="123M"></path><polygon points="60,20 100,40 100,80 60,100 20,80 20,40"></polygon></svg>';
    expect(
      html(
        {
          _useHtmlParser2: true,
          decodeEntities: false,
          selfClosingTags: false,
        },
        string_,
      ),
    ).toStrictEqual(string_);
  });
});

function testBody(html: (input: string, options?: LoadingOptions) => string) {
  it("should render <br /> tags without a slash", () => {
    const string_ = "<br />";
    expect(html(string_)).toStrictEqual("<br>");
  });

  it("should retain encoded HTML content within attributes", () => {
    const string_ = '<hr class="cheerio &amp; node = happy parsing" />';
    expect(html(string_)).toStrictEqual(
      '<hr class="cheerio &amp; node = happy parsing">',
    );
  });

  it('should shorten the "checked" attribute when it contains the value "checked"', () => {
    const string_ = "<input checked/>";
    expect(html(string_)).toStrictEqual("<input checked>");
  });

  it("should render empty attributes if asked for", () => {
    const string_ = "<input checked/>";
    expect(html(string_, { emptyAttrs: true })).toStrictEqual(
      '<input checked="">',
    );
  });

  it('should not shorten the "name" attribute when it contains the value "name"', () => {
    const string_ = '<input name="name"/>';
    expect(html(string_)).toStrictEqual('<input name="name">');
  });

  it('should not append ="" to attributes with no value', () => {
    const string_ = "<div dropdown-toggle>";
    expect(html(string_)).toStrictEqual("<div dropdown-toggle></div>");
  });

  it("should render comments correctly", () => {
    const string_ = "<!-- comment -->";
    expect(html(string_)).toStrictEqual("<!-- comment -->");
  });

  it("should render whitespace by default", () => {
    const string_ =
      '<a href="./haha.html">hi</a> <a href="./blah.html">blah</a>';
    expect(html(string_)).toStrictEqual(string_);
  });

  it("should preserve multiple hyphens in data attributes", () => {
    const string_ = '<div data-foo-bar-baz="value"></div>';
    expect(html(string_)).toStrictEqual('<div data-foo-bar-baz="value"></div>');
  });

  it("should not encode characters in script tag", () => {
    const string_ = '<script>alert("hello world")</script>';
    expect(html(string_)).toStrictEqual(string_);
  });

  it("should not encode tags in script tag", () => {
    const string_ = '<script>"<br>"</script>';
    expect(html(string_)).toStrictEqual(string_);
  });

  it("should not encode json data", () => {
    const string_ =
      '<script>var json = {"simple_value": "value", "value_with_tokens": "&quot;here & \'there\'&quot;"};</script>';
    expect(html(string_)).toStrictEqual(string_);
  });

  it("should render childless SVG nodes with a closing slash in HTML mode", () => {
    const string_ =
      '<svg><circle x="12" y="12"/><path d="123M"/><polygon points="60,20 100,40 100,80 60,100 20,80 20,40"/></svg>';
    expect(html(string_)).toStrictEqual(string_);
  });

  it("should render childless MathML nodes with a closing slash in HTML mode", () => {
    const string_ = "<math><infinity/></math>";
    expect(html(string_)).toStrictEqual(string_);
  });

  it("should allow SVG elements to have children", () => {
    const string_ =
      '<svg><circle cx="12" r="12"><title>dot</title></circle></svg>';
    expect(html(string_)).toStrictEqual(string_);
  });

  it("should not include extra whitespace in SVG self-closed elements", () => {
    const string_ = '<svg><image href="x.png"/>     </svg>';
    expect(html(string_)).toStrictEqual(string_);
  });

  it("should fix-up bad nesting in SVG in HTML mode", () => {
    const string_ = '<svg><g><image href="x.png"></svg>';
    expect(html(string_)).toStrictEqual(
      '<svg><g><image href="x.png"/></g></svg>',
    );
  });

  it("should preserve XML prefixed attributes on inline SVG nodes in HTML mode", () => {
    const string_ =
      '<svg><text id="t" xml:lang="fr">Bonjour</text><use xlink:href="#t"/></svg>';
    expect(html(string_)).toStrictEqual(string_);
  });

  it("should handle mixed-case SVG content in HTML mode", () => {
    const string_ = '<svg viewBox="0 0 8 8"><radialGradient/></svg>';
    expect(html(string_)).toStrictEqual(string_);
  });

  it("should render HTML content in SVG foreignObject in HTML mode", () => {
    const string_ =
      '<svg><foreignObject requiredFeatures=""><img src="test.png" viewbox>text<svg viewBox="0 0 8 8"><circle r="3"/></svg></foreignObject></svg>';
    expect(html(string_)).toStrictEqual(string_);
  });

  it("should render iframe nodes with a closing tag in HTML mode", () => {
    const string_ = '<iframe src="test"></iframe>';
    expect(html(string_)).toStrictEqual(string_);
  });

  it("should encode double quotes in attribute", () => {
    const string_ = `<img src="/" alt='title" onerror="alert(1)" label="x'>`;
    expect(html(string_)).toStrictEqual(
      '<img src="/" alt="title&quot; onerror=&quot;alert(1)&quot; label=&quot;x">',
    );
  });
}
