# BriefEditor ✍️

**Work in progress**

A minimal, zero-Dependency WYSIWYG text editor for modern web applications. BriefEditor is a lightweight, performant,
and secure rich text editor built entirely with vanilla TypeScript. No frameworks, no dependencies, just pure, fast
JavaScript that works anywhere.

## ✨ Features

### 🎨 Core Formatting

* Bold, Italic, Underline text styling
* Multiple heading levels
* Blockquotes
* Ordered and unordered lists

### 🔗 Rich Content

* Links
* Images

### 🛠️ ToDo List

* Delete, enter, backspace key events
* Copy and paste
* Undo and redo history
* Wide range of plugins for tables, code, tabs etc

## 🏆 Why Vanilla TypeScript?

### 🚀 Performance

* **Zero Framework Overhead:** No virtual DOM, no reactivity system, no unnecessary abstractions
* **Direct DOM Manipulation:** 2-3x faster than framework-based editors
* **Optimized Operations:*8 Custom implementations of only what's needed

### 🔒 Security

* **No Eval:** No dynamic code evaluation
* **Type Safety:** Compile-time error detection
* **Auditable Code:** 100% transparent, no hidden dependencies

### 📦 Bundle Size

|Editor|Minified Size|Gzipped|
|---|---|---|
|BriefEditor|39 KB|10 KB|
|TinyMCE|450 KB|150 KB|
|Quill|250 KB|75 KB|
|Draft.js + React|180 KB|55 KB|

## 🚀 Quick Start

### Installation

```bash
npm install briefeditor
```

### Basic Usage

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        #be-editor {
            visibility: hidden;
        }
    </style>
</head>
<body>
<div id="be-editor">
    <p>Write here</p>
</div>

<script type="module">
    import BriefEditor from "/src/app/brief-editor";

    new BriefEditor();
</script>
</body>
</html>
```

### Methods

You can use BriefEditor without toolbar. It provides an API for managing content and styles.

|Method|Description|
|---|----|
|`toggleTag(tagName: string, attributes?: {})`|Adds or removes a node. Attributes is an object with **class**, **href** and **image** keys|
|`changeAttribute(tagName: string, attributes?: {})`|Adds or removes an attribute|
|`plusIndent()`|Plus indent list item|
|`minusIndent()`|Minus indent list item|