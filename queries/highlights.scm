; Keywords
[
  "func"
  "struct"
  "enum"
  "interface"
  "type"
  "then"
  "implement"
  "let"
  "var"
  "if"
  "else"
  "match"
  "for"
  "while"
  "in"
  "return"
  "error"
  "break"
  "defer"
  "test"
  "unsafe"
  "extern"
  "as"
] @keyword

; Keyword operators
[
  "and"
  "or"
  "not"
  "xor"
  "is"
] @keyword.operator

; Capability / modifier keywords
[
  "mut"
  "take"
  "read"
  "copy"
  "shared"
] @keyword.modifier

; Visibility modifiers
[
  "public"
  "internal"
] @keyword.modifier

; Control flow keywords
[
  "otherwise"
  "continue"
] @keyword.control

; Otherwise action keywords
(otherwise_action
  "pass" @keyword.control)
(otherwise_action
  "up" @keyword.control)
(otherwise_action
  "break" @keyword.control)
(otherwise_action
  "continue" @keyword.control)
(otherwise_action
  "return" @keyword.control)
(otherwise_action
  "error" @keyword.control)

; Concurrency keywords
[
  "parallel"
  "detach"
  "when"
  "from"
  "timeout"
] @keyword.control

; continue is the entire node (no anonymous keyword child)
(continue_expression) @keyword

; Format keyword
"fmt" @keyword

; Boolean and absence literals
(boolean_literal) @constant.builtin
(none_literal) @constant.builtin

; Numeric literals
(integer_literal) @number
(float_literal) @number.float

; String literals
(string_literal) @string
(char_literal) @string
(fmt_string) @string
(escape_sequence) @string.escape

; Format string interpolation
(fmt_interpolation
  "{" @punctuation.special
  "}" @punctuation.special)

; Format string brace escapes ({{ and }})
(fmt_brace_escape) @string.escape

; Comments
(line_comment) @comment

; Function declarations
(function_declaration
  name: (identifier) @function)

(method_declaration
  name: (identifier) @function.method)

(extern_function
  name: (identifier) @function)

(interface_method
  name: (identifier) @function)

; Function calls
(call_expression
  function: (identifier) @function.call)

(method_call_expression
  method: (identifier) @function.call)

; Type identifiers
(type_identifier) @type

; Struct declarations
(struct_declaration
  name: (type_identifier) @type.definition)

; Enum declarations
(enum_declaration
  name: (type_identifier) @type.definition)

; Interface declarations
(interface_declaration
  name: (type_identifier) @type.definition)

; Type alias declarations
(type_alias_declaration
  name: (type_identifier) @type.definition)

; Primitive types (i8, i32, f64, etc.)
(primitive_type) @type.builtin

; Self type keyword
(self_type) @type.builtin

; Infer type placeholder
(infer_type) @type.builtin

; Parameters
(parameter
  name: (identifier) @variable.parameter)

; Field declarations
(field_declaration
  name: (identifier) @variable.member)

; Field access
(field_expression
  field: (identifier) @variable.member)

; Struct field initialization
(struct_field_init
  name: (identifier) @variable.member)

; Operators
[
  "+"
  "-"
  "*"
  "/"
  "%"
  "=="
  "!="
  "<"
  "<="
  ">"
  ">="
  "="
  "+="
  "-="
  "*="
  "/="
  "%="
  "&"
  "|"
  "^"
  "~"
  "<<"
  ">>"
] @operator

; Punctuation
[
  "("
  ")"
  "["
  "]"
  "{"
  "}"
] @punctuation.bracket

[
  ","
  ":"
  "."
] @punctuation.delimiter

; Wildcard
(wildcard_pattern) @variable.builtin

; Test name
(test_declaration
  name: (string_literal) @string)

; Module path in use declarations
(use_declaration
  (module_path) @module)
