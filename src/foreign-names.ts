/**
 * Mixed-case SVG and MathML element names recognized in foreign content.
 * @see https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inforeign
 */
export const elementNames = new Map<string, string>(
  "altGlyph altGlyphDef altGlyphItem animateColor animateMotion animateTransform clipPath feBlend feColorMatrix feComponentTransfer feComposite feConvolveMatrix feDiffuseLighting feDisplacementMap feDistantLight feDropShadow feFlood feFuncA feFuncB feFuncG feFuncR feGaussianBlur feImage feMerge feMergeNode feMorphology feOffset fePointLight feSpecularLighting feSpotLight feTile feTurbulence foreignObject glyphRef linearGradient radialGradient textPath"
    .split(" ")
    .map((name) => [name.toLowerCase(), name]),
);

/**
 * Mixed-case SVG and MathML attribute names recognized in foreign content.
 * @see https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inforeign
 */
export const attributeNames = new Map<string, string>(
  "definitionURL attributeName attributeType baseFrequency baseProfile calcMode clipPathUnits diffuseConstant edgeMode filterUnits glyphRef gradientTransform gradientUnits kernelMatrix kernelUnitLength keyPoints keySplines keyTimes lengthAdjust limitingConeAngle markerHeight markerUnits markerWidth maskContentUnits maskUnits numOctaves pathLength patternContentUnits patternTransform patternUnits pointsAtX pointsAtY pointsAtZ preserveAlpha preserveAspectRatio primitiveUnits refX refY repeatCount repeatDur requiredExtensions requiredFeatures specularConstant specularExponent spreadMethod startOffset stdDeviation stitchTiles surfaceScale systemLanguage tableValues targetX targetY textLength viewBox viewTarget xChannelSelector yChannelSelector zoomAndPan"
    .split(" ")
    .map((name) => [name.toLowerCase(), name]),
);
