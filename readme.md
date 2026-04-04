# Markdown Editor

Real-time markdown editor built with vanilla JavaScript. No frameworks, no dependencies.

## Features

- **Live Preview** — Split-pane editor with draggable resizer
- **Web Worker** — Markdown parsing runs off the main thread
- **XSS Sanitization** — DOM-based allowlist strips dangerous tags, event handlers, and `javascript:` URLs
- **Debounced Rendering** — Custom debounce limits re-renders during fast typing
- **Performance Monitoring** — Render time measured with `performance.now()`
- **Keyboard Shortcuts** — Ctrl+B for bold, more to come

## Tech

Vanilla HTML, CSS, JavaScript. Web Workers API. No build tools.

## Run

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

## Supported Markdown

Headings (`#`, `##`, `###`), **bold**, *italic*, `inline code`, code blocks, [links], images, blockquotes, horizontal rules, lists.