# Security Policy

## Supported Versions

Only the last published version is supported.

## Threat Model

`dom-serializer` is a non-validating serializer. It turns a [domhandler](https://github.com/fb55/domhandler) DOM tree into a string and is the inverse of a parser such as [htmlparser2](https://github.com/fb55/htmlparser2). The library's contract is:

> Given a DOM constructed within the syntactic bounds a parser produces, serialization yields HTML/XML that round-trips to an equivalent DOM.

What this means in practice:

- **Text content and attribute values are encoded** by default. These are the channels through which untrusted content typically flows, and the serializer treats them as untrusted.
- **Structural fields are trusted to be syntactically valid** and are emitted verbatim. This includes:
  - element tag names (`Element.name`)
  - attribute names (keys of `Element.attribs`)
  - comment data (`Comment.data`)
  - directive / doctype / processing-instruction data (`ProcessingInstruction.data`)
  - CDATA section contents

  A parser cannot produce values in these fields that would break the surrounding syntax — for example, `htmlparser2` terminates a comment at `-->`, a CDATA section at `]]>`, and an attribute name at whitespace, `=`, `/`, or `>`, so those sequences cannot appear in parser-produced data. The serializer relies on this and does not re-validate.

- **Round-trip safety holds for any input parsed by `htmlparser2`** under default options. The output, when re-parsed, yields a DOM equivalent to the input.

## Out of Scope

The following are not considered vulnerabilities in `dom-serializer`:

1. **Programmatic DOM construction with attacker-controlled structural fields.** If application code assigns untrusted strings to `Element.name`, attribute keys, `Comment.data`, etc., the serializer will faithfully emit them. This is analogous to assigning untrusted strings to `element.innerHTML` in a browser — the unsafety is at the construction boundary, not the serialization boundary. Validation of structural fields is the responsibility of whatever code populates them.

2. **Use of `encodeEntities: false` or `decodeEntities: false` with a DOM containing raw markup characters in text or attribute values.** These options exist for the round-trip case (parsing with `decodeEntities: false` to preserve entity references, then serializing without re-encoding them) and are documented as such. If your DOM contains raw `<`, `>`, or `&` in text or attribute values and you disable encoding, the output will contain those characters literally. See the option documentation for details.

## Reporting a Vulnerability

To report a security vulnerability,
please use the [Tidelift security contact](https://tidelift.com/security).
Tidelift will coordinate the fix and disclosure.
