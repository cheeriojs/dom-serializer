/*
 * Module dependencies
 */
import * as ElementType from "domelementtype";
import type { Node, NodeWithChildren, Element, DataNode } from "domhandler";
import { encodeXML } from "entities";

/*
 * Mixed-case SVG and MathML tags & attributes
 * recognized by the HTML parser, see
 * https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inforeign
 */
import { elementNames, attributeNames } from "./foreignNames";

export interface DomSerializerOptions {
  emptyAttrs?: boolean;
  selfClosingTags?: boolean;
  xmlMode?: boolean | "foreign";
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

/**
 * Format attributes
 */
function formatAttributes(
  attributes: Record<string, string | null> | undefined,
  opts: DomSerializerOptions
) {
  if (!attributes) return;

  return Object.keys(attributes)
    .map((key) => {
      const value = attributes[key] ?? "";

      if (opts.xmlMode === "foreign") {
        /* Fix up mixed-case attribute names */
        key = attributeNames.get(key) ?? key;
      }

      if (!opts.emptyAttrs && !opts.xmlMode && value === "") {
        return key;
      }

      return `${key}="${
        opts.decodeEntities ? encodeXML(value) : value.replace(/"/g, "&quot;")
      }"`;
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
 *
 * @param node Node to be rendered.
 * @param options Changes serialization behavior
 */
export default function render(
  node: Node | Node[],
  options: DomSerializerOptions = {}
): string {
  // TODO: This is a bit hacky.
  const nodes: Node[] =
    Array.isArray(node) || (node as any).cheerio ? (node as Node[]) : [node];

  let output = "";

  for (let i = 0; i < nodes.length; i++) {
    output += renderNode(nodes[i], options);
  }

  return output;
}

function renderNode(node: Node, options: DomSerializerOptions): string {
  switch (node.type) {
    case ElementType.Root:
      return render((node as NodeWithChildren).children, options);
    case ElementType.Directive:
    case ElementType.Doctype:
      return renderDirective(node as DataNode);
    case ElementType.Comment:
      return renderComment(node as DataNode);
    case ElementType.CDATA:
      return renderCdata(node as NodeWithChildren);
    case ElementType.Script:
    case ElementType.Style:
    case ElementType.Tag:
      return renderTag(node as Element, options);
    case ElementType.Text:
      return renderText(node as DataNode, options);
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

function renderTag(elem: Element, opts: DomSerializerOptions) {
  // Handle SVG / MathML in HTML
  if (opts.xmlMode === "foreign") {
    /* Fix up mixed-case element names */
    elem.name = elementNames.get(elem.name) ?? elem.name;
    /* Exit foreign mode at integration points */
    if (
      elem.parent &&
      foreignModeIntegrationPoints.has((elem.parent as Element).name)
    ) {
      opts = { ...opts, xmlMode: false };
    }
  }
  if (!opts.xmlMode && foreignElements.has(elem.name)) {
    opts = { ...opts, xmlMode: "foreign" };
  }

  let tag = `<${elem.name}`;
  const attribs = formatAttributes(elem.attribs, opts);

  if (attribs) {
    tag += ` ${attribs}`;
  }

  if (
    elem.children.length === 0 &&
    (opts.xmlMode
      ? // In XML mode or foreign mode, and user hasn't explicitly turned off self-closing tags
        opts.selfClosingTags !== false
      : // User explicitly asked for self-closing tags, even in HTML mode
        opts.selfClosingTags && singleTag.has(elem.name))
  ) {
    if (!opts.xmlMode) tag += " ";
    tag += "/>";
  } else {
    tag += ">";
    if (elem.children.length > 0) {
      tag += render(elem.children, opts);
    }

    if (opts.xmlMode || !singleTag.has(elem.name)) {
      tag += `</${elem.name}>`;
    }
  }

  return tag;
}

function renderDirective(elem: DataNode) {
  return `<${elem.data}>`;
}

function renderText(elem: DataNode, opts: DomSerializerOptions) {
  let data = elem.data || "";

  // If entities weren't decoded, no need to encode them back
  if (
    opts.decodeEntities &&
    !(elem.parent && unencodedElements.has((elem.parent as Element).name))
  ) {
    data = encodeXML(data);
  }

  return data;
}

function renderCdata(elem: NodeWithChildren) {
  return `<![CDATA[${(elem.children[0] as DataNode).data}]]>`;
}

function renderComment(elem: DataNode) {
  return `<!--${elem.data}-->`;
}
