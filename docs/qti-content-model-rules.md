# QTI 3.0 Content Model Rules & Schema Constraints

This document serves as the definitive source of truth for QTI 3.0 content model rules based on official specifications and schema documentation. Use this as reference when building the QTI compiler to ensure proper schema compliance.

## Overview

QTI 3.0 (Question & Test Interoperability) was designed with a **"transform-free authoring-to-delivery"** philosophy, meaning content should be directly presentable without transformation. This makes strict schema compliance absolutely critical.

**Source**: [IMS Global QTI 3.0 Specification](https://www.imsglobal.org/spec/qti/v3p0/impl)

## Core Content Model Principles

### 1. Element-Only vs Mixed Content Models

QTI distinguishes between two types of content models:

- **Element-Only**: Only child elements allowed, no direct text content
- **Mixed**: Both text and child elements allowed

**Critical Rule**: `qti-item-body` uses **element-only** content model - raw text directly inside it violates the schema.

### 2. Block vs Inline Context Rules

QTI strictly differentiates between block-level and inline contexts:

**Block Elements**: `div`, `p`, `table`, `ul`, `ol`, `blockquote`, `pre`, `h1-h6`
**Inline Elements**: `span`, `em`, `strong`, `code`, `a`, `img`, `br`, `sub`, `sup`

**Critical Rule**: Block elements cannot be nested inside inline contexts.

## Interaction Placement Rules

### 1. Choice Interactions (`qti-choice-interaction`, `qti-order-interaction`)

- **Type**: Block-level elements
- **Cannot be placed inside**: `p`, `span`, or other inline containers
- **Must be in**: Block-level containers like `div` or directly in `qti-item-body`
- **Wrapper Strategy**: Use `<div>` wrapper when placing in content

### 2. Text Entry Interactions (`qti-text-entry-interaction`)

- **Type**: Inline elements (self-closing)
- **Can be placed inside**: `p`, `span`, or other inline containers
- **Cannot be**: Directly in `qti-item-body` without wrapper
- **Wrapper Strategy**: Use `<p>` wrapper for standalone placement

### 3. Inline Choice Interactions (`qti-inline-choice-interaction`)

- **Type**: Inline elements
- **Can be placed inside**: `p`, `span`, or other inline containers
- **Wrapper Strategy**: Use `<span>` wrapper when in text flow

## Content Model Violations & Solutions

### 1. Raw Text in Element-Only Contexts

**Problem**: `qti-item-body` has element-only content model
```xml
<!-- ❌ INVALID -->
<qti-item-body>
    This is raw text that violates the schema.
</qti-item-body>
```

**Solution**: Wrap all raw text in proper elements
```xml
<!-- ✅ VALID -->
<qti-item-body>
    <p>This text is properly wrapped.</p>
</qti-item-body>
```

### 2. Block Elements in Inline Contexts

**Problem**: Block elements inside paragraphs or spans
```xml
<!-- ❌ INVALID -->
<p>Some text <div>block content</div> more text</p>
```

**Solution**: Split content or use inline wrappers
```xml
<!-- ✅ VALID -->
<p>Some text</p>
<div>block content</div>
<p>more text</p>
```

### 3. Nested Paragraphs

**Problem**: Paragraphs cannot contain other paragraphs
```xml
<!-- ❌ INVALID -->
<p>Outer text <p>inner paragraph</p> more text</p>
```

**Solution**: Convert inner paragraphs to spans
```xml
<!-- ✅ VALID -->
<p>Outer text <span>inner content</span> more text</p>
```

### 4. Choice Interactions in Inline Contexts

**Problem**: Block-level interactions inside inline elements
```xml
<!-- ❌ INVALID -->
<p>Choose: <qti-choice-interaction>...</qti-choice-interaction></p>
```

**Solution**: Move interaction outside inline context
```xml
<!-- ✅ VALID -->
<p>Choose:</p>
<div><qti-choice-interaction>...</qti-choice-interaction></div>
```

### 5. Tables in Paragraphs

**Problem**: Tables are block elements and cannot be in paragraphs
```xml
<!-- ❌ INVALID -->
<p>Here is data: <table>...</table> as shown above.</p>
```

**Solution**: Split paragraph around table
```xml
<!-- ✅ VALID -->
<p>Here is data:</p>
<table>...</table>
<p>as shown above.</p>
```

## Interaction Prompt & Feedback Rules

### 1. Prompt Content Model

QTI interaction prompts have **inline content model** - only inline elements allowed:

**Allowed**: `span`, `em`, `strong`, `code`, `a`, `img`, `br`, `sub`, `sup`, `math`
**Forbidden**: `p`, `div`, `table`, `ul`, `ol`, `blockquote`, `pre`, `h1-h6`

### 2. Choice Feedback Rules

Choice feedback content follows same inline model as prompts:

```xml
<!-- ❌ INVALID -->
<qti-feedback-inline>
    <p>This paragraph violates the inline content model.</p>
</qti-feedback-inline>

<!-- ✅ VALID -->
<qti-feedback-inline>
    <span>This content respects the inline model.</span>
</qti-feedback-inline>
```

## SVG and Image Constraints

### 1. SVG Embedding

QTI has specific rules about SVG embedding:
- SVG elements may not be allowed in all contexts
- Convert SVG to `<img>` with data URIs for broader compatibility
- However, `<img>` elements also have placement restrictions

### 2. Image Placement Rules

- Images can only be placed in contexts that allow inline elements
- Images cannot be direct children of `qti-item-body` without wrapper
- Use appropriate block wrapper (`p`, `div`) based on context

## XML Entity and Syntax Rules

### 1. Entity Escaping

All XML entities must be properly escaped:
- `&` → `&amp;`
- `<` → `&lt;`
- `>` → `&gt;`
- `"` → `&quot;`
- `'` → `&apos;`

### 2. Well-Formed XML

- All opening tags must have corresponding closing tags
- Self-closing tags must use proper syntax: `<tag/>`
- Attribute values must be quoted
- No orphaned tags or mismatched hierarchies

## Compiler Implementation Strategy

### 1. Content Analysis Phase

Before transformation, analyze content structure:
1. Identify all interactions and their types
2. Map current element hierarchy
3. Detect content model violations
4. Plan transformation strategy

### 2. Context-Aware Wrapping

Apply wrappers based on interaction type and context:
- **Text Entry**: `<p>` wrapper for standalone, `<span>` for inline flow
- **Choice/Order**: `<div>` wrapper, ensure not in inline contexts
- **Inline Choice**: `<span>` wrapper for text flow

### 3. Content Model Normalization

Apply transformations in order:
1. Fix entity escaping and malformed XML
2. Wrap raw text in appropriate elements
3. Split paragraphs containing block elements
4. Convert block elements to inline in prompt/feedback contexts
5. Apply context-aware interaction wrapping

### 4. Validation Strategy

- Use official QTI XSD schema for validation
- Test against external QTI validation services
- Maintain test suite covering all edge cases
- Validate both successful and error cases

## References

1. [IMS Global QTI 3.0 Implementation Guide](https://www.imsglobal.org/spec/qti/v3p0/impl)
2. [1EdTech QTI Standards Documentation](https://www.1edtech.org/standards/qti/index)
3. [QTI 3.0 Schema Files (XSD)](https://purl.imsglobal.org/spec/qti/v3p0/schema)
4. [QTI Best Practices Guide](https://www.imsglobal.org/spec/qti/v3p0/impl/#best-practices)

---

**Note**: This document should be updated as new edge cases are discovered or QTI specification updates are released.