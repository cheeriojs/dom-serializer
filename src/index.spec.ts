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
  markup: string,
  options: LoadingOptions = {},
) {
  const options_ = { ...preset, ...options };
  const $ = load(markup, options_, true);
  return render($._root, options_);
}

function xml(markup: string, options: LoadingOptions = {}) {
  const options_ = { ...options, xmlMode: true };
  const $ = load(markup, options_, true);
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
      const markup = "<hr class='an \"edge\" case' />";
      expect(htmlFunction(markup)).toStrictEqual(
        '<hr class="an &quot;edge&quot; case">',
      );
    });

    it("should escape entities to utf8 if requested", () => {
      const markup = '<a href="a < b &quot; & c">& " &lt; &gt;</a>';
      expect(
        html({ _useHtmlParser2: true, encodeEntities: "utf8" }, markup),
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
      const markup =
        "<a> <b> <![CDATA[ asdf&asdf ]]> <c/> <![CDATA[ asdf&asdf ]]> </b> </a>";
      expect(xml(markup)).toStrictEqual(markup);
    });

    it('should append ="" to attributes with no value', () => {
      const markup = "<div dropdown-toggle>";
      expect(xml(markup)).toStrictEqual('<div dropdown-toggle=""/>');
    });

    it('should append ="" to boolean attributes with no value', () => {
      const markup = "<input disabled>";
      expect(xml(markup)).toStrictEqual('<input disabled=""/>');
    });

    it("should preserve XML prefixes on attributes", () => {
      const markup =
        '<div xmlns:ex="http://example.com/ns"><p ex:ample="attribute">text</p></div>';
      expect(xml(markup)).toStrictEqual(markup);
    });

    it("should preserve mixed-case XML elements and attributes", () => {
      const markup = '<svg viewBox="0 0 8 8"><radialGradient/></svg>';
      expect(xml(markup)).toStrictEqual(markup);
    });

    it("should encode entities in otherwise special tags", () => {
      expect(xml('<script>"<br/>"</script>')).toStrictEqual(
        "<script>&quot;<br/>&quot;</script>",
      );
    });

    it("should not encode entities if disabled", () => {
      const markup = '<script>"<br/>"</script>';
      expect(xml(markup, { decodeEntities: false })).toStrictEqual(markup);
    });
  });
});

describe("(xml, {selfClosingTags: false})", () => {
  it("should render childless nodes with an explicit closing tag", () => {
    const markup = "<foo /><bar></bar>";
    expect(xml(markup, { selfClosingTags: false })).toStrictEqual(
      "<foo></foo><bar></bar>",
    );
  });
});

describe("(html, {selfClosingTags: true})", () => {
  it("should render <br /> tags correctly", () => {
    const markup = "<br />";
    expect(
      html(
        {
          _useHtmlParser2: true,
          decodeEntities: false,
          selfClosingTags: true,
        },
        markup,
      ),
    ).toStrictEqual(markup);
  });
});

describe("(html, {selfClosingTags: false})", () => {
  it("should render childless SVG nodes with an explicit closing tag", () => {
    const markup =
      '<svg><circle x="12" y="12"></circle><path d="123M"></path><polygon points="60,20 100,40 100,80 60,100 20,80 20,40"></polygon></svg>';
    expect(
      html(
        {
          _useHtmlParser2: true,
          decodeEntities: false,
          selfClosingTags: false,
        },
        markup,
      ),
    ).toStrictEqual(markup);
  });
});

function testBody(html: (input: string, options?: LoadingOptions) => string) {
  it("should render <br /> tags without a slash", () => {
    const markup = "<br />";
    expect(html(markup)).toStrictEqual("<br>");
  });

  it("should retain encoded HTML content within attributes", () => {
    const markup = '<hr class="cheerio &amp; node = happy parsing" />';
    expect(html(markup)).toStrictEqual(
      '<hr class="cheerio &amp; node = happy parsing">',
    );
  });

  it('should shorten the "checked" attribute when it contains the value "checked"', () => {
    const markup = "<input checked/>";
    expect(html(markup)).toStrictEqual("<input checked>");
  });

  it("should render empty attributes if asked for", () => {
    const markup = "<input checked/>";
    expect(html(markup, { emptyAttrs: true })).toStrictEqual(
      '<input checked="">',
    );
  });

  it('should not shorten the "name" attribute when it contains the value "name"', () => {
    const markup = '<input name="name"/>';
    expect(html(markup)).toStrictEqual('<input name="name">');
  });

  it('should not append ="" to attributes with no value', () => {
    const markup = "<div dropdown-toggle>";
    expect(html(markup)).toStrictEqual("<div dropdown-toggle></div>");
  });

  it("should render comments correctly", () => {
    const markup = "<!-- comment -->";
    expect(html(markup)).toStrictEqual("<!-- comment -->");
  });

  it("should render whitespace by default", () => {
    const markup =
      '<a href="./haha.html">hi</a> <a href="./blah.html">blah</a>';
    expect(html(markup)).toStrictEqual(markup);
  });

  it("should preserve multiple hyphens in data attributes", () => {
    const markup = '<div data-foo-bar-baz="value"></div>';
    expect(html(markup)).toStrictEqual('<div data-foo-bar-baz="value"></div>');
  });

  it("should not encode characters in script tag", () => {
    const markup = '<script>alert("hello world")</script>';
    expect(html(markup)).toStrictEqual(markup);
  });

  it("should not encode tags in script tag", () => {
    const markup = '<script>"<br>"</script>';
    expect(html(markup)).toStrictEqual(markup);
  });

  it("should not encode json data", () => {
    const markup =
      '<script>var json = {"simple_value": "value", "value_with_tokens": "&quot;here & \'there\'&quot;"};</script>';
    expect(html(markup)).toStrictEqual(markup);
  });

  it("should render childless SVG nodes with a closing slash in HTML mode", () => {
    const markup =
      '<svg><circle x="12" y="12"/><path d="123M"/><polygon points="60,20 100,40 100,80 60,100 20,80 20,40"/></svg>';
    expect(html(markup)).toStrictEqual(markup);
  });

  it("should render childless MathML nodes with a closing slash in HTML mode", () => {
    const markup = "<math><infinity/></math>";
    expect(html(markup)).toStrictEqual(markup);
  });

  it("should allow SVG elements to have children", () => {
    const markup =
      '<svg><circle cx="12" r="12"><title>dot</title></circle></svg>';
    expect(html(markup)).toStrictEqual(markup);
  });

  it("should not include extra whitespace in SVG self-closed elements", () => {
    const markup = '<svg><image href="x.png"/>     </svg>';
    expect(html(markup)).toStrictEqual(markup);
  });

  it("should fix-up bad nesting in SVG in HTML mode", () => {
    const markup = '<svg><g><image href="x.png"></svg>';
    expect(html(markup)).toStrictEqual(
      '<svg><g><image href="x.png"/></g></svg>',
    );
  });

  it("should preserve XML prefixed attributes on inline SVG nodes in HTML mode", () => {
    const markup =
      '<svg><text id="t" xml:lang="fr">Bonjour</text><use xlink:href="#t"/></svg>';
    expect(html(markup)).toStrictEqual(markup);
  });

  it("should handle mixed-case SVG content in HTML mode", () => {
    const markup = '<svg viewBox="0 0 8 8"><radialGradient/></svg>';
    expect(html(markup)).toStrictEqual(markup);
  });

  it("should render HTML content in SVG foreignObject in HTML mode", () => {
    const markup =
      '<svg><foreignObject requiredFeatures=""><img src="test.png" viewbox>text<svg viewBox="0 0 8 8"><circle r="3"/></svg></foreignObject></svg>';
    expect(html(markup)).toStrictEqual(markup);
  });

  it("should render iframe nodes with a closing tag in HTML mode", () => {
    const markup = '<iframe src="test"></iframe>';
    expect(html(markup)).toStrictEqual(markup);
  });

  it("should encode double quotes in attribute", () => {
    const markup = `<img src="/" alt='title" onerror="alert(1)" label="x'>`;
    expect(html(markup)).toStrictEqual(
      '<img src="/" alt="title&quot; onerror=&quot;alert(1)&quot; label=&quot;x">',
    );
  });
}
