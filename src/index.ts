/*
 * Module dependencies
 */
import * as ElementType from "domelementtype";
import type {
  AnyNode,
  CDATA,
  Comment,
  Element,
  ProcessingInstruction,
  Text,
} from "domhandler";
import { encodeXML, escapeAttribute, escapeText } from "entities";

/**
 * Mixed-case SVG and MathML tags & attributes
 * recognized by the HTML parser.
 * @see https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inforeign
 */
import { attributeNames, elementNames } from "./foreign-names.js";

/**
 * Options for DOM serialization.
 */
export interface DomSerializerOptions {
  /**
   * Print an empty attribute's value.
   * @default xmlMode
   * @example With <code>emptyAttrs: false</code>: <code>&lt;input checked&gt;</code>
   * @example With <code>emptyAttrs: true</code>: <code>&lt;input checked=""&gt;</code>
   */
  emptyAttrs?: boolean;
  /**
   * Print self-closing tags for tags without contents. If `xmlMode` is set, this will apply to all tags.
   * Otherwise, only tags that are defined as self-closing in the HTML specification will be printed as such.
   * @default xmlMode
   * @example With <code>selfClosingTags: false</code>: <code>&lt;foo&gt;&lt;/foo&gt;&lt;br&gt;&lt;/br&gt;</code>
   * @example With <code>xmlMode: true</code> and <code>selfClosingTags: true</code>: <code>&lt;foo/&gt;&lt;br/&gt;</code>
   * @example With <code>xmlMode: false</code> and <code>selfClosingTags: true</code>: <code>&lt;foo&gt;&lt;/foo&gt;&lt;br /&gt;</code>
   */
  selfClosingTags?: boolean;
  /**
   * Treat the input as an XML document; enables the `emptyAttrs` and `selfClosingTags` options.
   *
   * If the value is `"foreign"`, it will try to correct mixed-case attribute names.
   * @default false
   */
  xmlMode?: boolean | "foreign";
  /**
   * Encode characters that are either reserved in HTML or XML.
   *
   * If `xmlMode` is `true` or the value not `'utf8'`, characters outside of the utf8 range will be encoded as well.
   * @default `decodeEntities`
   */
  encodeEntities?: boolean | "utf8";
  /**
   * Option inherited from parsing; will be used as the default value for `encodeEntities`.
   * @default true
   */
  decodeEntities?: boolean;
}

const unencodedElements = new Set([
  "style",
  "script",
  "xmp",
  "iframe",
  "noembed",
  "noframes",
  "plaintext",
  "noscript",
]);

function replaceQuotes(value: string): string {
  return value.replace(/"/g, "&quot;");
}

/**
 * Format attributes
 * @param attributes Attribute map to serialize.
 * @param options Options that control this operation.
 */
function formatAttributes(
  attributes: Record<string, string | null> | undefined,
  options: DomSerializerOptions,
) {
  if (!attributes) return;

  const encode =
    (options.encodeEntities ?? options.decodeEntities) === false
      ? replaceQuotes
      : !!options.xmlMode || options.encodeEntities !== "utf8"
        ? encodeXML
        : escapeAttribute;

  return Object.keys(attributes)
    .map((key) => {
      const value = attributes[key] ?? "";

      if (options.xmlMode === "foreign") {
        /* Fix up mixed-case attribute names */
        key = attributeNames.get(key) ?? key;
      }

      if (!options.emptyAttrs && !options.xmlMode && value === "") {
        return key;
      }

      return `${key}="${encode(value)}"`;
    })
    .join(" ");
}

/**
 * Self-enclosing tags
 */
const singleTag = new Set([
  "area",
  "base",
  "basefont",
  "br",
  "col",
  "command",
  "embed",
  "frame",
  "hr",
  "img",
  "input",
  "isindex",
  "keygen",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

/**
 * Renders a DOM node or an array of DOM nodes to a string.
 *
 * Can be thought of as the equivalent of the `outerHTML` of the passed node(s).
 * @param node Node to be rendered.
 * @param options Changes serialization behavior
 */
export function render(
  node: AnyNode | ArrayLike<AnyNode>,
  options: DomSerializerOptions = {},
): string {
  const nodes = "length" in node ? node : [node];

  let output = "";
  let index = 0;
  while (index < nodes.length) {
    output += renderNode(nodes[index], options);
    index++;
  }

  return output;
}

export default render;

function renderNode(node: AnyNode, options: DomSerializerOptions): string {
  switch (node.type) {
    case ElementType.Root: {
      return render(node.children, options);
    }
    // @ts-expect-error We don't use `Doctype` yet
    case ElementType.Doctype:
    case ElementType.Directive: {
      return renderDirective(node);
    }
    case ElementType.Comment: {
      return renderComment(node);
    }
    case ElementType.CDATA: {
      return renderCdata(node);
    }
    case ElementType.Script:
    case ElementType.Style:
    case ElementType.Tag: {
      return renderTag(node, options);
    }
    case ElementType.Text: {
      return renderText(node, options);
    }
  }
}

const foreignModeIntegrationPoints = new Set([
  "mi",
  "mo",
  "mn",
  "ms",
  "mtext",
  "annotation-xml",
  "foreignObject",
  "desc",
  "title",
]);

const foreignElements = new Set(["svg", "math"]);

function renderTag(element: Element, options: DomSerializerOptions) {
  // Handle SVG / MathML in HTML
  if (options.xmlMode === "foreign") {
    /* Fix up mixed-case element names */
    element.name = elementNames.get(element.name) ?? element.name;
    /* Exit foreign mode at integration points */
    if (
      element.parent &&
      foreignModeIntegrationPoints.has((element.parent as Element).name)
    ) {
      options = { ...options, xmlMode: false };
    }
  }
  if (!options.xmlMode && foreignElements.has(element.name)) {
    options = { ...options, xmlMode: "foreign" };
  }

  let tag = `<${element.name}`;
  const attribs = formatAttributes(element.attribs, options);

  if (attribs) {
    tag += ` ${attribs}`;
  }

  if (
    element.children.length === 0 &&
    (options.xmlMode
      ? // In XML mode or foreign mode, and user hasn't explicitly turned off self-closing tags
        options.selfClosingTags !== false
      : // User explicitly asked for self-closing tags, even in HTML mode
        options.selfClosingTags && singleTag.has(element.name))
  ) {
    if (!options.xmlMode) tag += " ";
    tag += "/>";
  } else {
    tag += ">";
    if (element.children.length > 0) {
      tag += render(element.children, options);
    }

    if (!!options.xmlMode || !singleTag.has(element.name)) {
      tag += `</${element.name}>`;
    }
  }

  return tag;
}

function renderDirective(element: ProcessingInstruction) {
  return `<${element.data}>`;
}

function renderText(element: Text, options: DomSerializerOptions) {
  let data = element.data || "";

  // If entities weren't decoded, no need to encode them back
  if (
    (options.encodeEntities ?? options.decodeEntities) !== false &&
    !(
      !options.xmlMode &&
      element.parent &&
      unencodedElements.has((element.parent as Element).name)
    )
  ) {
    data =
      !!options.xmlMode || options.encodeEntities !== "utf8"
        ? encodeXML(data)
        : escapeText(data);
  }

  return data;
}

function renderCdata(element: CDATA) {
  return `<![CDATA[${(element.children[0] as Text).data}]]>`;
}

function renderComment(element: Comment) {
  return `<!--${element.data}-->`;
}
