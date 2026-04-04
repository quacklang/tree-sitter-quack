# tree-sitter-quack

Tree-sitter grammar for the [Quack](https://github.com/quacklang/quack) programming language.

This grammar provides syntax highlighting, code navigation, and structural queries for any editor that supports Tree-sitter, including Zed, Neovim, Helix, and Emacs.

## Installation

### Zed

The Quack Zed extension ([zed-quack](https://github.com/quacklang/zed-quack)) bundles this grammar automatically. Install the extension from Zed's extension registry.

### Neovim (nvim-treesitter)

Add to your `nvim-treesitter` config:

```lua
local parser_config = require("nvim-treesitter.parsers").get_parser_configs()
parser_config.quack = {
  install_info = {
    url = "https://github.com/quacklang/tree-sitter-quack",
    files = { "src/parser.c" },
    branch = "main",
  },
  filetype = "quack",
}
```

Then run `:TSInstall quack`.

### Helix

Add to `languages.toml`:

```toml
[[language]]
name = "quack"
scope = "source.quack"
file-types = ["q"]
comment-token = "//"
indent = { tab-width = 4, unit = "    " }

[[grammar]]
name = "quack"
source = { git = "https://github.com/quacklang/tree-sitter-quack", rev = "main" }
```

Then run `hx --grammar fetch` and `hx --grammar build`.

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (for `tree-sitter-cli`)
- Or: `cargo install tree-sitter-cli`

### Generate and test

```sh
# Generate the parser from grammar.js
tree-sitter generate

# Run the test corpus
tree-sitter test

# Parse a file
tree-sitter parse path/to/file.q

# Highlight a file (uses queries/highlights.scm)
tree-sitter highlight path/to/file.q
```

### Test corpus

Tests live in `test/corpus/*.txt`. Each test has a name, source code, and expected S-expression tree:

```
==================
Test name
==================

source code here

---

(expected_tree ...)
```

Run `tree-sitter test -u` to auto-update expected output after grammar changes.

## Testing with Zed (WSL + Windows)

If you develop on WSL but run Zed on Windows, the "Install Dev Extension" feature can't read WSL paths directly. Use this workflow:

1. **Develop** in the WSL monorepo as normal.

2. **Copy to a Windows-native path** accessible from both sides:

   ```sh
   # From WSL — adjust the Windows username
   rsync -av --delete \
     extensions/tree-sitter-quack/ \
     /mnt/c/Users/<you>/Code/tree-sitter-quack/
   rsync -av --delete \
     extensions/zed/ \
     /mnt/c/Users/<you>/Code/quack-zed/
   ```

3. **Update the Zed extension's `extension.toml`** on the Windows copy to point at the local grammar:

   ```toml
   [grammars.quack]
   repository = "file:///C:/Users/<you>/Code/tree-sitter-quack"
   rev = "HEAD"
   ```

4. **In Zed:** Command palette > "zed: install dev extension" > select `C:\Users\<you>\Code\quack-zed`.

5. **After changes:** re-copy (step 2) and re-run "Install Dev Extension" (step 4). There is no hot-reload.

## License

Apache-2.0
