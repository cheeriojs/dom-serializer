/*
 * Module dependencies
 */
import * as ElementType from "domelementtype";
import type {
  AnyNode,
  Element,
  ProcessingInstruction,
  Comment,
  Text,
  CDATA,
} from "domhandler";
import { encodeXML, escapeAttribute, escapeText } from "entities";

/**
 * Mixed-case SVG and MathML tags & attributes
 * recognized by the HTML parser.
 *
 * @see https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inforeign
 */
import { elementNames, attributeNames } from "./foreignNames.js";

export interface DomSerializerOptions {
  /**
   * Print an empty attribute's value.
   *
   * @default xmlMode
   * @example With <code>emptyAttrs: false</code>: <code>&lt;input checked&gt;</code>
   * @example With <code>emptyAttrs: true</code>: <code>&lt;input checked=""&gt;</code>
   */
  emptyAttrs?: boolean;
  /**
   * Print self-closing tags for tags without contents. If `xmlMode` is set, this will apply to all tags.
   * Otherwise, only tags that are defined as self-closing in the HTML specification will be printed as such.
   *
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
   *
   * @default false
   */
  xmlMode?: boolean | "foreign";
  /**
   * Encode characters that are either reserved in HTML or XML.
   *
   * If `xmlMode` is `true` or the value not `'utf8'`, characters outside of the utf8 range will be encoded as well.
   *
   * @default `decodeEntities`
   */
  encodeEntities?: boolean | "utf8";
  /**
   * Option inherited from parsing; will be used as the default value for `encodeEntities`.
   *
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

export class DomSerializer {
  protected output: string;
  protected options: DomSerializerOptions;

  /**
   * Creates a serializer instance
   *
   * @param options Changes serialization behavior
   */
  constructor(options: DomSerializerOptions = {}) {
    this.options = options;
    this.output = "";
  }

  /**
   * Renders a DOM node or an array of DOM nodes to a string.
   *
   * Can be thought of as the equivalent of the `outerHTML` of the passed node(s).
   *
   * @param node Node to be rendered.
   */
  render(node: AnyNode | ArrayLike<AnyNode>): string {
    const nodes = "length" in node ? node : [node];

    this.output = "";

    for (let i = 0; i < nodes.length; i++) {
      this.renderNode(nodes[i]);
    }

    return this.output;
  }

  renderNode(node: AnyNode): void {
    switch (node.type) {
      case ElementType.Root:
        this.render(node.children);
        break;
      // @ts-expect-error We don't use `Doctype` yet
      case ElementType.Doctype:
      case ElementType.Directive:
        this.renderDirective(node);
        break;
      case ElementType.Comment:
        this.renderComment(node);
        break;
      case ElementType.CDATA:
        this.renderCdata(node);
        break;
      case ElementType.Script:
      case ElementType.Style:
      case ElementType.Tag:
        this.renderTag(node);
        break;
      case ElementType.Text:
        this.renderText(node);
        break;
    }
  }

  renderTag(elem: Element): void {
    // Handle SVG / MathML in HTML
    let xmlModeSwitchedToForeign = false;
    if (this.options.xmlMode === "foreign") {
      /* Fix up mixed-case element names */
      elem.name = elementNames.get(elem.name) ?? elem.name;
      /* Exit foreign mode at integration points */
      if (
        elem.parent &&
        foreignModeIntegrationPoints.has((elem.parent as Element).name)
      ) {
        this.options = { ...this.options, xmlMode: false };
      }
    }
    if (!this.options.xmlMode && foreignElements.has(elem.name)) {
      this.options = { ...this.options, xmlMode: "foreign" };
      xmlModeSwitchedToForeign = true;
    }

    this.output += `<${elem.name}`;
    const attribs = this.formatAttributes(elem.attribs);

    if (attribs) {
      this.output += ` ${attribs}`;
    }

    if (
      elem.children.length === 0 &&
      (this.options.xmlMode
        ? // In XML mode or foreign mode, and user hasn't explicitly turned off self-closing tags
          this.options.selfClosingTags !== false
        : // User explicitly asked for self-closing tags, even in HTML mode
          this.options.selfClosingTags && singleTag.has(elem.name))
    ) {
      if (!this.options.xmlMode) this.output += " ";
      this.output += "/>";
    } else {
      this.output += ">";
      if (elem.children.length > 0) {
        elem.children.forEach((child) => this.renderNode(child));
      }
      if (this.options.xmlMode || !singleTag.has(elem.name)) {
        this.output += `</${elem.name}>`;
      }
    }
    if (xmlModeSwitchedToForeign) {
      // Disabled Handle SVG / MathML in HTML at the end of the matching tag
      this.options = { ...this.options, xmlMode: false };
    }
  }

  renderDirective(elem: ProcessingInstruction): void {
    this.output += `<${elem.data}>`;
  }

  renderText(elem: Text): void {
    let data = elem.data || "";

    // If entities weren't decoded, no need to encode them back
    if (
      (this.options.encodeEntities ?? this.options.decodeEntities) !== false &&
      !(
        !this.options.xmlMode &&
        elem.parent &&
        unencodedElements.has((elem.parent as Element).name)
      )
    ) {
      data =
        this.options.xmlMode || this.options.encodeEntities !== "utf8"
          ? encodeXML(data)
          : escapeText(data);
    }

    this.output += data;
  }

  renderCdata(elem: CDATA): void {
    this.output += `<![CDATA[${(elem.children[0] as Text).data}]]>`;
  }

  renderComment(elem: Comment): void {
    this.output += `<!--${elem.data}-->`;
  }

  replaceQuotes(value: string): string {
    return value.replace(/"/g, "&quot;");
  }

  /**
   * Format attributes
   */
  formatAttributes(
    attributes: Record<string, string | null> | undefined
  ): string | undefined {
    if (!attributes) return;

    const encode =
      (this.options.encodeEntities ?? this.options.decodeEntities) === false
        ? this.replaceQuotes
        : this.options.xmlMode || this.options.encodeEntities !== "utf8"
        ? encodeXML
        : escapeAttribute;

    return Object.keys(attributes)
      .map((key) => {
        const value = attributes[key] ?? "";

        if (this.options.xmlMode === "foreign") {
          /* Fix up mixed-case attribute names */
          key = attributeNames.get(key) ?? key;
        }

        if (!this.options.emptyAttrs && !this.options.xmlMode && value === "") {
          return key;
        }

        return `${key}="${encode(value)}"`;
      })
      .join(" ");
  }
}

/**
 * Renders a DOM node or an array of DOM nodes to a string.
 *
 * Can be thought of as the equivalent of the `outerHTML` of the passed node(s).
 *
 * @param node Node to be rendered.
 * @param options Changes serialization behavior
 */
export function render(
  node: AnyNode | ArrayLike<AnyNode>,
  options: DomSerializerOptions = {}
): string {
  return new DomSerializer(options).render(node);
}

export default render;
