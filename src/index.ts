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
   * Print self-closing tags for tags without contents. If `xmlMode` is set,
   * this will apply to all tags. Otherwise, only tags that are defined as
   * self-closing in the HTML specification will be printed as such.
   * @default xmlMode
   * @example With <code>selfClosingTags: false</code>: <code>&lt;foo&gt;&lt;/foo&gt;&lt;br&gt;&lt;/br&gt;</code>
   * @example With <code>xmlMode: true</code> and <code>selfClosingTags: true</code>: <code>&lt;foo/&gt;&lt;br/&gt;</code>
   * @example With <code>xmlMode: false</code> and <code>selfClosingTags: true</code>: <code>&lt;foo&gt;&lt;/foo&gt;&lt;br /&gt;</code>
   */
  selfClosingTags?: boolean;
  /**
   * Treat the input as an XML document; enables the `emptyAttrs` and
   * `selfClosingTags` options.
   *
   * If the value is `"foreign"`, it will try to correct mixed-case attribute
   * names.
   * @default false
   */
  xmlMode?: boolean | "foreign";
  /**
   * Encode characters reserved in HTML or XML in text and attribute values.
   *
   * If `xmlMode` is set or the value is not `'utf8'`, characters outside the
   * ASCII range will also be encoded as numeric entities.
   *
   * **Security:** Setting this to `false` disables encoding of `<`, `>`, `&`,
   * and (in attribute values) `'` — only `"` in attribute values is escaped.
   * This is safe for the round-trip case (DOM was parsed with
   * `decodeEntities: false`, so any markup characters in text or attribute
   * values exist only as entity references), and unsafe otherwise. If text
   * or attribute values in the DOM contain raw `<`, `>`, or `&`, those
   * characters will appear literally in the output.
   * @default `decodeEntities`
   */
  encodeEntities?: boolean | "utf8";
  /**
   * Default for `encodeEntities`. Named to match the parser option of the
   * same name so a single options object can be threaded through parse and
   * serialize for a faithful round-trip — for example, cheerio parses with
   * `decodeEntities: false` to preserve entity references and passes the
   * same option here so they are not re-encoded.
   *
   * Despite the name, on the serializer this option controls *encoding*.
   * Setting it to `false` carries the same caveat as `encodeEntities: false`
   * — see that option.
   * @default true
   */
  decodeEntities?: boolean;
}

// ── Constants ────────────────────────────────────────────────────────

/** Elements whose text content is never entity-encoded. */
const unencodedElements = new Set(
  "style script xmp iframe noembed noframes plaintext noscript".split(" "),
);

/** HTML void elements — they cannot have children. */
const voidElements = new Set(
  "area base basefont br col command embed frame hr img input isindex keygen link meta param source track wbr".split(
    " ",
  ),
);

/** Elements that switch the parser into foreign (XML-like) mode. */
const foreignElements = new Set(["svg", "math"]);

/**
 * Foreign-mode integration points: children of these elements are parsed
 * as HTML again, not as foreign content.
 */
const foreignModeIntegrationPoints = new Set(
  "mi mo mn ms mtext annotation-xml foreignObject desc title".split(" "),
);

// ── Public API ───────────────────────────────────────────────────────

/**
 * Renders a DOM node or an array of DOM nodes to a string.
 *
 * Can be thought of as the equivalent of the `outerHTML` of the passed
 * node(s).
 * @param node Node to be rendered.
 * @param options Changes serialization behavior
 */
export function render(
  node: AnyNode | ArrayLike<AnyNode>,
  options: DomSerializerOptions = {},
): string {
  const nodes = "length" in node ? node : [node];

  /*
   * `xmlMode` is threaded as a separate argument through the internal
   * functions so that foreign-mode transitions (svg/mathml ↔ html) can
   * adjust it without copying the options object on every element.
   */
  const xmlMode = options.xmlMode ?? false;

  let output = "";
  // eslint-disable-next-line unicorn/no-for-loop
  for (let index = 0; index < nodes.length; index++) {
    output += renderNode(nodes[index], options, xmlMode);
  }

  return output;
}

export default render;

// ── Internal rendering ───────────────────────────────────────────────

/**
 * Render an array of child nodes (skips the single-node wrapping in `render`).
 * @param children The child nodes to render.
 * @param options The serialization options.
 * @param xmlMode The XML mode to use.
 */
function renderChildren(
  children: ArrayLike<AnyNode>,
  options: DomSerializerOptions,
  xmlMode: boolean | "foreign",
): string {
  let output = "";
  // eslint-disable-next-line unicorn/no-for-loop
  for (let index = 0; index < children.length; index++) {
    output += renderNode(children[index], options, xmlMode);
  }
  return output;
}

function renderNode(
  node: AnyNode,
  options: DomSerializerOptions,
  xmlMode: boolean | "foreign",
): string {
  switch (node.type) {
    case ElementType.Root: {
      return renderChildren(node.children, options, xmlMode);
    }

    case ElementType.Directive: {
      return `<${(node as ProcessingInstruction).data}>`;
    }

    case ElementType.Comment: {
      return `<!--${(node as Comment).data}-->`;
    }

    case ElementType.CDATA: {
      return `<![CDATA[${((node as CDATA).children[0] as Text).data}]]>`;
    }

    case ElementType.Script:
    case ElementType.Style:
    case ElementType.Tag: {
      return renderTag(node as Element, options, xmlMode);
    }

    case ElementType.Text: {
      const element = node as Text;
      const data = element.data || "";

      /*
       * Skip encoding when entities weren't decoded on input, or when
       * inside a raw-text element (script, style, etc.) in HTML mode.
       */
      if (
        (options.encodeEntities ?? options.decodeEntities) !== false &&
        !(
          !xmlMode &&
          element.parent &&
          unencodedElements.has((element.parent as Element).name)
        )
      ) {
        // `xmlMode: "foreign"` is truthy
        return xmlMode || options.encodeEntities !== "utf8"
          ? encodeXML(data)
          : escapeText(data);
      }

      return data;
    }
  }
}

function renderTag(
  element: Element,
  options: DomSerializerOptions,
  xmlMode: boolean | "foreign",
) {
  if (xmlMode === "foreign") {
    // Correct lowercase element names back to their canonical mixed-case form
    element.name = elementNames.get(element.name) ?? element.name;

    // Integration points exit foreign mode: their children are HTML
    if (
      element.parent &&
      foreignModeIntegrationPoints.has((element.parent as Element).name)
    ) {
      xmlMode = false;
    }
  }

  if (!xmlMode && foreignElements.has(element.name)) {
    xmlMode = "foreign";
  }

  const { name, children } = element;

  // Cache the void-element check — used for both self-closing and closing-tag logic
  const isVoid = !xmlMode && voidElements.has(name);

  let tag = `<${name}${formatAttributes(element.attribs, options, xmlMode)}`;

  if (
    children.length === 0 &&
    (xmlMode
      ? options.selfClosingTags !== false
      : options.selfClosingTags && isVoid)
  ) {
    // XML: `<br/>`, HTML: `<br />`
    tag += xmlMode ? "/>" : " />";
  } else {
    tag += ">";

    if (children.length > 0) {
      tag += renderChildren(children, options, xmlMode);
    }

    if (!isVoid) {
      tag += `</${name}>`;
    }
  }

  return tag;
}

// ── Attribute formatting ─────────────────────────────────────────────

function replaceQuotes(value: string): string {
  return value.replaceAll('"', "&quot;");
}

/**
 * Serialize an element's attribute map to a string.
 *
 * Returns a string with a leading space before each attribute, or an
 * empty string if there are no attributes. This convention lets the
 * caller unconditionally concatenate the result onto the tag name.
 * @param attributes
 * @param options
 * @param xmlMode
 */
function formatAttributes(
  attributes: Record<string, unknown> | undefined,
  options: DomSerializerOptions,
  xmlMode: boolean | "foreign",
) {
  if (!attributes) return "";

  /*
   * Pick the right encoder:
   *  - Encoding disabled → only escape double-quotes (for valid attributes)
   *  - XML / non-utf8    → full numeric entity encoding (encodeXML)
   *  - HTML + utf8       → minimal escaping (escapeAttribute)
   */
  const encode =
    (options.encodeEntities ?? options.decodeEntities) === false
      ? replaceQuotes
      : xmlMode || options.encodeEntities !== "utf8"
        ? encodeXML
        : escapeAttribute;

  const isForeign = xmlMode === "foreign";
  const showEmpty = !!(options.emptyAttrs ?? xmlMode);

  let result = "";

  for (const key in attributes) {
    if (!Object.hasOwn(attributes, key)) continue;

    const value = attributes[key];
    const k = isForeign ? (attributeNames.get(key) ?? key) : key;

    result +=
      !showEmpty && (value == null || value === "")
        ? ` ${k}`
        : ` ${k}="${encode(value == null ? "" : String(value))}"`;
  }

  return result;
}
