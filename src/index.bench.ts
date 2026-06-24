import { load } from "cheerio";
import { bench, describe } from "vitest";
import type { DomSerializerOptions } from "./index.js";
import render from "./index.js";

function buildDom(markup: string, isXmlMode?: boolean) {
  const $ = load(
    markup,
    { _useHtmlParser2: true, xmlMode: isXmlMode } as never,
    true,
  );
  return $._root;
}

// Simple tag
const simpleHtml = buildDom("<div><p>Hello world</p></div>");

// Many siblings — a flat list of 500 elements
const manySiblingsMarkup = Array.from(
  { length: 500 },
  (_, index) => `<p class="item" data-idx="${index}">Paragraph ${index}</p>`,
).join("");
const manySiblings = buildDom(`<div>${manySiblingsMarkup}</div>`);

// Deeply nested tree (depth=200)
function nestMarkup(depth: number): string {
  if (depth === 0) return "leaf";
  return `<div class="level-${depth}">${nestMarkup(depth - 1)}</div>`;
}
const deeplyNested = buildDom(nestMarkup(200));

// Attribute-heavy element — 30 attributes each on 50 elements
const attributeHeavyMarkup = Array.from({ length: 50 }, (_, index) => {
  const attributes = Array.from(
    { length: 30 },
    (_, index_) => `data-attr-${index_}="value ${index_} &amp; more"`,
  ).join(" ");
  return `<div ${attributes}>item ${index}</div>`;
}).join("");
const attributeHeavy = buildDom(attributeHeavyMarkup);

// SVG content (foreign mode)
const svgMarkup = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="grad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:rgb(255,255,0);stop-opacity:1"/>
      <stop offset="100%" style="stop-color:rgb(255,0,0);stop-opacity:1"/>
    </radialGradient>
    <linearGradient id="lg1"><stop offset="0%"/><stop offset="100%"/></linearGradient>
    <clipPath id="clip"><circle cx="50" cy="50" r="40"/></clipPath>
    <filter id="f1">
      <feGaussianBlur stdDeviation="3"/>
      <feColorMatrix type="saturate" values="0.5"/>
      <feComposite operator="in"/>
    </filter>
  </defs>
  ${Array.from({ length: 50 }, (_, index) => `<circle cx="${index * 2}" cy="${index * 2}" r="5" fill="url(#grad)" clip-path="url(#clip)" filter="url(#f1)"/>`).join("\n  ")}
  <foreignObject x="10" y="10" width="80" height="80"><div xmlns="http://www.w3.org/1999/xhtml"><p>HTML inside SVG</p></div></foreignObject>
  <text textLength="100" lengthAdjust="spacing">Hello SVG</text>
  <g><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="5s"/></g>
</svg>`;
const svgDom = buildDom(svgMarkup);

// Text-heavy content — lots of text nodes with entities
const textHeavyMarkup = Array.from(
  { length: 200 },
  (_, index) =>
    // eslint-disable-next-line unicorn/no-incorrect-template-string-interpolation -- \u{E9}\u{E8}\u{EA} are valid Unicode escapes, not template interpolations (false positive)
    `<p>Text with special chars: &amp; &lt; &gt; &quot; and unicode: \u{E9}\u{E8}\u{EA} item ${index}</p>`,
).join("");
const textHeavy = buildDom(textHeavyMarkup);

// Mixed realistic page
const realisticPage = buildDom(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Test Page</title>
  <link rel="stylesheet" href="/style.css">
  <script>var x = {"a":"b","c":1};</script>
  <style>body { margin: 0; } .cls > .inner { color: red; }</style>
</head>
<body>
  <header class="top-bar" id="main-header" data-sticky="true">
    <nav><ul>${Array.from({ length: 20 }, (_, index) => `<li><a href="/page-${index}" title="Page ${index} &amp; more">Link ${index}</a></li>`).join("")}</ul></nav>
  </header>
  <main>
    ${Array.from({ length: 30 }, (_, index) => `<article class="post" id="post-${index}" data-tags="a,b,c"><h2>Title ${index}</h2><p>Lorem ipsum dolor sit amet, consectetur adipiscing Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p><div class="meta"><span class="date">2024-01-${String(index + 1).padStart(2, "0")}</span><span class="author">Author ${index}</span></div></article>`).join("\n    ")}
  </main>
  <footer><p>&copy; 2024 Test</p></footer>
  <!-- end of page -->
</body>
</html>`);

// XML mode
const xmlMarkup = `<?xml version="1.0" encoding="UTF-8"?>
<root xmlns:ns="http://example.com">
  ${Array.from({ length: 100 }, (_, index) => `<ns:item id="${index}" ns:value="test &amp; data"><ns:name>Item ${index}</ns:name><ns:desc>Description for item ${index} with &lt;special&gt; chars</ns:desc></ns:item>`).join("\n  ")}
</root>`;
const xmlDom = buildDom(xmlMarkup, true);

// Comments and CDATA
const commentsMarkup = Array.from(
  { length: 100 },
  (_, index) => `<!-- comment ${index} --><div>content ${index}</div>`,
).join("");
const commentsDom = buildDom(commentsMarkup);

// Empty/self-closing tags
const selfClosingMarkup = Array.from(
  { length: 200 },
  () =>
    '<br><hr><img src="x.png" alt="test"><input type="text" name="field" value="val"><meta name="k" content="v"><link rel="stylesheet" href="s.css">',
).join("");
const selfClosingDom = buildDom(selfClosingMarkup);

const defaultOptions: DomSerializerOptions = {};
const xmlOptions: DomSerializerOptions = { xmlMode: true };
const foreignOptions: DomSerializerOptions = { xmlMode: "foreign" };
const utf8Options: DomSerializerOptions = { encodeEntities: "utf8" };
const selfClosingOptions: DomSerializerOptions = { selfClosingTags: true };

describe("Simple HTML", () => {
  bench("render simple tag", () => {
    render(simpleHtml, defaultOptions);
  });
});

describe("Many siblings (500 elements)", () => {
  bench("render many siblings", () => {
    render(manySiblings, defaultOptions);
  });
});

describe("Deeply nested (200 levels)", () => {
  bench("render deeply nested", () => {
    render(deeplyNested, defaultOptions);
  });
});

describe("Attribute-heavy (50 elems × 30 attrs)", () => {
  bench("render attribute-heavy", () => {
    render(attributeHeavy, defaultOptions);
  });
});

describe("SVG foreign mode", () => {
  bench("render SVG (default)", () => {
    render(svgDom, defaultOptions);
  });

  bench("render SVG (foreign)", () => {
    render(svgDom, foreignOptions);
  });
});

describe("Text-heavy with entities (200 paragraphs)", () => {
  bench("render text-heavy (default)", () => {
    render(textHeavy, defaultOptions);
  });

  bench("render text-heavy (utf8)", () => {
    render(textHeavy, utf8Options);
  });
});

describe("Realistic page", () => {
  bench("render realistic page (default)", () => {
    render(realisticPage, defaultOptions);
  });

  bench("render realistic page (utf8)", () => {
    render(realisticPage, utf8Options);
  });

  bench("render realistic page (self-closing)", () => {
    render(realisticPage, selfClosingOptions);
  });
});

describe("XML mode (100 elements)", () => {
  bench("render XML", () => {
    render(xmlDom, xmlOptions);
  });
});

describe("Comments (100 comments + elements)", () => {
  bench("render comments", () => {
    render(commentsDom, defaultOptions);
  });
});

describe("Self-closing tags (1200 void elements)", () => {
  bench("render self-closing tags", () => {
    render(selfClosingDom, defaultOptions);
  });

  bench("render self-closing (with slash)", () => {
    render(selfClosingDom, selfClosingOptions);
  });
});
