# dom-serializer [![Node.js CI](https://github.com/cheeriojs/dom-serializer/actions/workflows/nodejs-test.yml/badge.svg)](https://github.com/cheeriojs/dom-serializer/actions/workflows/nodejs-test.yml)

Renders a [domhandler](https://github.com/fb55/domhandler) DOM node or an array of domhandler DOM nodes to a string.

```js
import render from "dom-serializer";

// OR

const render = require("dom-serializer").default;
```

# API

## `render`

▸ **render**(`node`: Node \| Node[], `options?`: [_Options_](#Options)): _string_

Renders a DOM node or an array of DOM nodes to a string.

Can be thought of as the equivalent of the `outerHTML` of the passed node(s).

#### Parameters:

| Name      | Type                               | Default value | Description                    |
| :-------- | :--------------------------------- | :------------ | :----------------------------- |
| `node`    | Node \| Node[]                     | -             | Node to be rendered.           |
| `options` | [_DomSerializerOptions_](#Options) | {}            | Changes serialization behavior |

**Returns:** _string_

## Options

### `encodeEntities`

• `Optional` **encodeEntities**: _boolean | "utf8"_

Encode characters reserved in HTML or XML in text and attribute values.

If `xmlMode` is `true` or the value is not `'utf8'`, characters outside of the ASCII range will be encoded as well.

> **Security:** Setting this to `false` disables encoding of `<`, `>`, and `&` in text and attribute values. This is intended for the round-trip case where the DOM was parsed with `decodeEntities: false`, so markup characters only exist as entity references. If the DOM contains raw markup characters (e.g., from a default-decoded parse, or from programmatic manipulation), they will be emitted literally — do not use this option with untrusted input unless you have validated the DOM yourself.

**`default`** `decodeEntities`

---

### `decodeEntities`

• `Optional` **decodeEntities**: _boolean_

Default for `encodeEntities`. Named to match the parser option of the same name so a single options object can be threaded through parse and serialize. Despite the name, on the serializer this option controls *encoding* — setting it to `false` carries the same security caveat as `encodeEntities: false`.

**`default`** true

---

### `emptyAttrs`

• `Optional` **emptyAttrs**: _boolean_

Print an empty attribute's value.

**`default`** xmlMode

**`example`** With <code>emptyAttrs: false</code>: <code>&lt;input checked&gt;</code>

**`example`** With <code>emptyAttrs: true</code>: <code>&lt;input checked=""&gt;</code>

---

### `selfClosingTags`

• `Optional` **selfClosingTags**: _boolean_

Print self-closing tags for tags without contents. If `xmlMode` is set, this
will apply to all tags. Otherwise, only tags that are defined as self-closing
in the HTML specification will be printed as such.

**`default`** xmlMode

**`example`** With <code>selfClosingTags: false</code>: <code>&lt;foo&gt;&lt;/foo&gt;&lt;br&gt;&lt;/br&gt;</code>

**`example`** With <code>xmlMode: true</code> and <code>selfClosingTags: true</code>: <code>&lt;foo/&gt;&lt;br/&gt;</code>

**`example`** With <code>xmlMode: false</code> and <code>selfClosingTags: true</code>: <code>&lt;foo&gt;&lt;/foo&gt;&lt;br /&gt;</code>

---

### `xmlMode`

• `Optional` **xmlMode**: _boolean_ \| _"foreign"_

Treat the input as an XML document; enables the `emptyAttrs` and `selfClosingTags` options.

If the value is `"foreign"`, it will try to correct mixed-case attribute names.

**`default`** false

---

## Ecosystem

| Name                                                          | Description                                             |
| ------------------------------------------------------------- | ------------------------------------------------------- |
| [htmlparser2](https://github.com/fb55/htmlparser2)            | Fast & forgiving HTML/XML parser                        |
| [domhandler](https://github.com/fb55/domhandler)              | Handler for htmlparser2 that turns documents into a DOM |
| [domutils](https://github.com/fb55/domutils)                  | Utilities for working with domhandler's DOM             |
| [css-select](https://github.com/fb55/css-select)              | CSS selector engine, compatible with domhandler's DOM   |
| [cheerio](https://github.com/cheeriojs/cheerio)               | The jQuery API for domhandler's DOM                     |
| [dom-serializer](https://github.com/cheeriojs/dom-serializer) | Serializer for domhandler's DOM                         |

---

LICENSE: MIT
