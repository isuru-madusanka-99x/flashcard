# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Flashcard Pro Cloud is a single-file HTML/CSS/JS flashcard application (`flahs_cards.html`). There is no build system, no package manager, no test framework, and no linting tooling. The entire app lives in one self-contained HTML file.

### Running the app

Serve the workspace directory with any static HTTP server. The simplest approach:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000/flahs_cards.html` in Chrome.

A local HTTP server is needed (rather than `file://`) because the app calls external APIs (JSONBin.io for cloud sync, Free Dictionary API for definitions) which require HTTP origin for fetch requests.

### External dependencies

- **JSONBin.io** (`api.jsonbin.io`): persistence backend; API key is hardcoded in the HTML. Requires internet access.
- **Free Dictionary API** (`api.dictionaryapi.dev`): optional; used only for the "Fetch Meaning" feature.

### Gotchas

- The filename is `flahs_cards.html` (note the typo — not `flash_cards.html`).
- There are no automated tests, no linter, and no build step. Manual browser testing is the only verification method.
- Card data syncs to JSONBin every 30 seconds automatically; newly added cards are saved immediately via the Add Card button.
