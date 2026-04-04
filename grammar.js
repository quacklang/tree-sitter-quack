/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// Operator precedence table — from spec §Appendix A, lowest to highest
const PREC = {
  ASSIGNMENT: 0,     // = += -= *= /= %=
  OR: 1,             // or xor
  AND: 2,            // and
  BITWISE_OR: 3,     // |
  BITWISE_XOR: 4,    // ^
  BITWISE_AND: 5,    // &
  EQUALITY: 6,       // == !=
  COMPARISON: 7,     // < <= > >=
  SHIFT: 8,          // << >>
  ADDITIVE: 9,       // + -
  MULTIPLICATIVE: 10, // * / %
  UNARY: 11,         // - not ~
  POSTFIX: 12,       // . () [] ? as is
};

function commaSep(rule) {
  return optional(commaSep1(rule));
}

function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)), optional(','));
}

module.exports = grammar({
  name: 'quack',

  word: $ => $.identifier,

  extras: $ => [
    /\s/,
    $.line_comment,
  ],

  supertypes: $ => [
    $._expression,
    $._declaration,
    $._type,
    $._pattern,
  ],

  conflicts: $ => [
    // `func()` — parameter_list (closure) vs function_type
    [$.parameter_list, $.function_type],
    // scoped type `Type.Variant` vs field expression on type identifier
    [$._expression, $.scoped_type],
    // `let name: Type` — identifier could be pattern or start of typed_binding
    [$._pattern, $.typed_binding],
    // `expr.name[` — could be field access + index or method call with type args
    [$.method_call_expression, $.field_expression],
    // `expr[TypeId]` — type_identifier is both an expression and a type
    [$._expression, $._type],
  ],

  rules: {
    source_file: $ => repeat($._top_level_item),

    _top_level_item: $ => choice(
      $._declaration,
      $.expression_statement,
    ),

    // =========================================================================
    // Declarations
    // =========================================================================

    _declaration: $ => choice(
      $.package_declaration,
      $.use_declaration,
      $.function_declaration,
      $.struct_declaration,
      $.enum_declaration,
      $.interface_declaration,
      $.on_declaration,
      $.extern_block,
      $.test_declaration,
      $.top_level_let,
    ),

    package_declaration: $ => seq('package', $.identifier),

    use_declaration: $ => seq(
      'use',
      $.module_path,
      optional(seq('as', field('alias', $.identifier))),
    ),

    module_path: $ => seq(
      $.identifier,
      repeat(seq('.', $.identifier)),
    ),

    function_declaration: $ => seq(
      optional($._visibility),
      'func',
      field('name', $.identifier),
      optional($.generic_params),
      field('parameters', $.parameter_list),
      optional(seq('->', field('return_type', $._type))),
      field('body', $.block),
    ),

    _visibility: $ => choice('public', 'package'),

    generic_params: $ => seq(
      '[',
      commaSep1($.generic_param),
      ']',
    ),

    generic_param: $ => seq(
      field('name', $.type_identifier),
      optional(seq(':', field('bound', $.type_identifier))),
    ),

    // Interface bundle list: `Display and Debug and Serialize`
    interface_list: $ => seq(
      $.type_identifier,
      repeat(seq('and', $.type_identifier)),
    ),

    parameter_list: $ => seq(
      '(',
      commaSep($.parameter),
      ')',
    ),

    parameter: $ => choice(
      // Regular parameter: name: Type [= default]
      seq(
        optional($._capability),
        field('name', $.identifier),
        ':',
        field('type', $._type),
        optional(seq('=', field('default', $._expression))),
      ),
      // Self parameter: [mut|take] self
      seq(
        optional($._capability),
        $.self_parameter,
      ),
    ),

    self_parameter: $ => 'self',

    _capability: $ => choice('read', 'mut', 'take'),

    struct_declaration: $ => seq(
      optional($._visibility),
      'struct',
      field('name', $.type_identifier),
      optional($.generic_params),
      '{',
      repeat(seq($.field_declaration, optional(','))),
      '}',
    ),

    field_declaration: $ => seq(
      optional($._visibility),
      field('name', $.identifier),
      ':',
      field('type', $._type),
    ),

    enum_declaration: $ => seq(
      optional($._visibility),
      'enum',
      field('name', $.type_identifier),
      optional($.generic_params),
      optional(seq(':', field('interfaces', $.interface_list))),
      '{',
      repeat(seq($.enum_variant, optional(','))),
      '}',
    ),

    enum_variant: $ => seq(
      field('name', $.type_identifier),
      optional(choice(
        seq('(', commaSep1($._type), ')'),
        seq('{', commaSep1($.field_declaration), '}'),
      )),
    ),

    interface_declaration: $ => choice(
      // Full interface with methods
      seq(
        optional($._visibility),
        'interface',
        field('name', $.type_identifier),
        optional($.generic_params),
        '{',
        repeat($.interface_method),
        '}',
      ),
      // Interface bundle
      seq(
        optional($._visibility),
        'interface',
        field('name', $.type_identifier),
        '=',
        $.interface_list,
      ),
    ),

    interface_method: $ => seq(
      'func',
      field('name', $.identifier),
      optional($.generic_params),
      field('parameters', $.parameter_list),
      optional(seq('->', field('return_type', $._type))),
    ),

    on_declaration: $ => seq(
      'on',
      optional($.generic_params),
      field('type', $._type),
      optional(seq('implement', field('interface', $.type_identifier))),
      '{',
      repeat($.method_declaration),
      '}',
    ),

    method_declaration: $ => seq(
      optional($._visibility),
      'func',
      field('name', $.identifier),
      optional($.generic_params),
      field('parameters', $.parameter_list),
      optional(seq('->', field('return_type', $._type))),
      field('body', $.block),
    ),

    extern_block: $ => seq(
      'extern',
      field('abi', $.string_literal),
      '{',
      repeat($.extern_function),
      '}',
    ),

    extern_function: $ => seq(
      'func',
      field('name', $.identifier),
      field('parameters', $.parameter_list),
      optional(seq('->', field('return_type', $._type))),
    ),

    test_declaration: $ => seq(
      'test',
      field('name', $.string_literal),
      field('body', $.block),
    ),

    top_level_let: $ => seq(
      'let',
      field('name', choice($.identifier, $.type_identifier)),
      optional(seq(':', field('type', $._type))),
      '=',
      field('value', $._expression),
    ),

    // =========================================================================
    // Statements
    // =========================================================================

    _statement: $ => choice(
      $.let_statement,
      $.var_statement,
      $.expression_statement,
    ),

    let_statement: $ => seq(
      optional('shared'),
      'let',
      field('pattern', $._pattern),
      optional(seq(':', field('type', $._type))),
      '=',
      field('value', $._expression),
    ),

    var_statement: $ => seq(
      optional('shared'),
      'var',
      field('name', $.identifier),
      optional(seq(':', field('type', $._type))),
      '=',
      field('value', $._expression),
    ),

    expression_statement: $ => $._expression,

    // =========================================================================
    // Expressions
    // =========================================================================

    _expression: $ => choice(
      $.identifier,
      $.type_identifier,
      $._literal,
      $.parenthesized_expression,
      $.tuple_literal,
      $.array_literal,
      $.block,
      $.if_expression,
      $.match_expression,
      $.while_expression,
      $.for_expression,
      $.return_expression,
      $.error_expression,
      $.break_expression,
      $.continue_expression,
      $.binary_expression,
      $.unary_expression,
      $.call_expression,
      $.method_call_expression,
      $.field_expression,
      $.index_expression,
      $.error_propagation,
      $.type_cast,
      $.is_expression,
      $.struct_literal,
      $.closure_expression,
      $.fmt_expression,
      $.copy_expression,
      $.defer_expression,
      $.shared_expression,
      $.parallel_expression,
      $.detach_expression,
      $.unsafe_expression,
      $.when_expression,
      $.assignment_expression,
    ),

    parenthesized_expression: $ => seq('(', $._expression, ')'),

    tuple_literal: $ => seq(
      '(',
      $._expression,
      ',',
      commaSep1($._expression),
      ')',
    ),

    array_literal: $ => seq('[', commaSep($._expression), ']'),

    block: $ => seq(
      '{',
      repeat($._statement),
      '}',
    ),

    if_expression: $ => seq(
      'if',
      field('condition', $._expression),
      field('consequence', $.block),
      optional(seq(
        'else',
        field('alternative', choice($.if_expression, $.block)),
      )),
    ),

    match_expression: $ => seq(
      'match',
      field('value', $._expression),
      '{',
      repeat(seq($.match_arm, optional(','))),
      '}',
    ),

    match_arm: $ => seq(
      field('pattern', $._pattern),
      optional(seq('if', field('guard', $._expression))),
      '=>',
      field('value', $._expression),
    ),

    while_expression: $ => seq(
      'while',
      field('condition', $._expression),
      field('body', $.block),
    ),

    for_expression: $ => seq(
      'for',
      optional($._capability),
      field('pattern', $._pattern),
      'in',
      field('iterable', $._expression),
      field('body', $.block),
    ),

    return_expression: $ => prec.left(seq('return', optional($._expression))),

    error_expression: $ => prec.left(seq('error', $._expression)),

    break_expression: $ => prec.left(seq('break', optional($._expression))),

    continue_expression: $ => 'continue',

    binary_expression: $ => {
      const table = [
        [PREC.OR, choice('or', 'xor')],
        [PREC.AND, 'and'],
        [PREC.BITWISE_OR, '|'],
        [PREC.BITWISE_XOR, '^'],
        [PREC.BITWISE_AND, '&'],
        [PREC.EQUALITY, choice('==', '!=')],
        [PREC.COMPARISON, choice('<', '<=', '>', '>=')],
        [PREC.SHIFT, choice('<<', '>>')],
        [PREC.ADDITIVE, choice('+', '-')],
        [PREC.MULTIPLICATIVE, choice('*', '/', '%')],
      ];
      return choice(...table.map(([prec, op]) =>
        prec_left(prec, seq(
          field('left', $._expression),
          field('operator', op),
          field('right', $._expression),
        )),
      ));
    },

    unary_expression: $ => prec(PREC.UNARY, seq(
      field('operator', choice('-', 'not', '~')),
      field('operand', $._expression),
    )),

    call_expression: $ => prec(PREC.POSTFIX, seq(
      field('function', $._expression),
      optional($.type_arguments),
      field('arguments', $.argument_list),
    )),

    method_call_expression: $ => prec(PREC.POSTFIX, seq(
      field('object', $._expression),
      '.',
      field('method', $.identifier),
      optional($.type_arguments),
      field('arguments', $.argument_list),
    )),

    type_arguments: $ => seq('[', commaSep1($._type), ']'),

    argument_list: $ => seq(
      '(',
      commaSep($.argument),
      ')',
    ),

    argument: $ => seq(
      optional($._capability),
      $._expression,
    ),

    field_expression: $ => prec(PREC.POSTFIX, seq(
      field('object', $._expression),
      '.',
      field('field', choice($.identifier, $.type_identifier)),
    )),

    index_expression: $ => prec(PREC.POSTFIX, seq(
      field('object', $._expression),
      '[',
      field('index', $._expression),
      ']',
    )),

    error_propagation: $ => prec(PREC.POSTFIX, seq(
      $._expression,
      '?',
    )),

    type_cast: $ => prec(PREC.POSTFIX, seq(
      field('value', $._expression),
      'as',
      field('type', $._type),
    )),

    is_expression: $ => prec(PREC.POSTFIX, seq(
      field('value', $._expression),
      'is',
      field('pattern', $._pattern),
    )),

    struct_literal: $ => prec(PREC.POSTFIX, seq(
      field('type', choice($.type_identifier, $.scoped_type)),
      '{',
      repeat(seq($.struct_field_init, optional(','))),
      '}',
    )),

    scoped_type: $ => seq(
      $.type_identifier,
      repeat1(seq('.', $.type_identifier)),
    ),

    struct_field_init: $ => choice(
      seq(field('name', $.identifier), ':', field('value', $._expression)),
      field('name', $.identifier), // shorthand
    ),

    closure_expression: $ => seq(
      'func',
      field('parameters', $.parameter_list),
      optional(seq('->', field('return_type', $._type))),
      field('body', $.block),
    ),

    fmt_expression: $ => seq(
      'fmt',
      $.fmt_string,
    ),

    fmt_string: $ => seq(
      '"',
      repeat(choice(
        $.fmt_content,
        $.fmt_interpolation,
        $.escape_sequence,
      )),
      '"',
    ),

    fmt_content: $ => /[^"\\{}\n]+/,

    fmt_interpolation: $ => seq('{', $._expression, '}'),

    copy_expression: $ => prec(PREC.UNARY, seq('copy', $._expression)),

    defer_expression: $ => prec.left(seq('defer', $._expression)),

    shared_expression: $ => prec.left(seq('shared', $._expression)),

    parallel_expression: $ => seq(
      'parallel',
      '(',
      field('handle', $.identifier),
      ')',
      field('body', $.block),
    ),

    detach_expression: $ => seq('detach', field('body', $.block)),

    unsafe_expression: $ => seq('unsafe', field('body', $.block)),

    when_expression: $ => seq(
      'when',
      '{',
      repeat(seq($.when_arm, optional(','))),
      '}',
    ),

    when_arm: $ => choice(
      seq(
        'var',
        field('name', $.identifier),
        'from',
        field('source', $._expression),
        '=>',
        field('body', $._expression),
      ),
      seq(
        'timeout',
        '(',
        field('duration', $._expression),
        ')',
        '=>',
        field('body', $._expression),
      ),
      seq(
        'otherwise',
        '=>',
        field('body', $._expression),
      ),
    ),

    assignment_expression: $ => prec.right(PREC.ASSIGNMENT, seq(
      field('left', $._expression),
      field('operator', choice('=', '+=', '-=', '*=', '/=', '%=')),
      field('right', $._expression),
    )),

    // =========================================================================
    // Types
    // =========================================================================

    _type: $ => choice(
      $.type_identifier,
      $.generic_type,
      $.union_type,
      $.function_type,
      $.unit_type,
      $.pointer_type,
      $.shared_type,
    ),

    type_identifier: $ => choice(
      /[A-Z][a-zA-Z0-9_]*/,
      // Primitive types that start lowercase
      'i8', 'i16', 'i32', 'i64', 'i128', 'isize',
      'u8', 'u16', 'u32', 'u64', 'u128', 'usize',
      'f32', 'f64',
    ),

    generic_type: $ => prec(1, seq(
      field('name', $.type_identifier),
      '[',
      commaSep1($._type),
      ']',
    )),

    union_type: $ => prec.left(PREC.BITWISE_OR, seq(
      $._type,
      '|',
      $._type,
    )),

    function_type: $ => seq(
      'func',
      '(',
      commaSep($._type),
      ')',
      optional(seq('->', $._type)),
    ),

    unit_type: $ => seq('(', ')'),

    pointer_type: $ => seq(
      '*',
      choice('const', 'mut'),
      $._type,
    ),

    shared_type: $ => seq('shared', $._type),

    // =========================================================================
    // Patterns
    // =========================================================================

    _pattern: $ => choice(
      $.wildcard_pattern,
      $.identifier,
      $._literal,
      $.enum_pattern,
      $.struct_pattern,
      $.tuple_pattern,
      $.or_pattern,
      $.typed_binding,
    ),

    wildcard_pattern: $ => '_',

    enum_pattern: $ => choice(
      // Qualified with args: Type.Variant(args)
      prec(PREC.POSTFIX + 1, seq(
        field('type', $.type_identifier),
        '.',
        field('variant', $.type_identifier),
        '(',
        commaSep($._pattern),
        ')',
      )),
      // Qualified without args: Type.Variant
      prec(PREC.POSTFIX, seq(
        field('type', $.type_identifier),
        '.',
        field('variant', $.type_identifier),
      )),
      // Unqualified with args: Variant(args)
      seq(
        field('variant', $.type_identifier),
        '(',
        commaSep($._pattern),
        ')',
      ),
    ),

    struct_pattern: $ => seq(
      $.type_identifier,
      '{',
      commaSep(choice(
        seq($.identifier, ':', $._pattern),
        $.identifier,
      )),
      '}',
    ),

    tuple_pattern: $ => seq(
      '(',
      $._pattern,
      ',',
      commaSep1($._pattern),
      ')',
    ),

    or_pattern: $ => prec.left(1, seq($._pattern, '|', $._pattern)),

    typed_binding: $ => seq(
      field('name', $.identifier),
      ':',
      field('type', $._type),
    ),

    // =========================================================================
    // Literals
    // =========================================================================

    _literal: $ => choice(
      $.integer_literal,
      $.float_literal,
      $.string_literal,
      $.char_literal,
      $.boolean_literal,
      $.none_literal,
    ),

    integer_literal: $ => token(choice(
      // Hex
      /0[xX][0-9a-fA-F][0-9a-fA-F_]*/,
      // Binary
      /0[bB][01][01_]*/,
      // Decimal
      /[0-9][0-9_]*/,
    )),

    float_literal: $ => token(
      /[0-9][0-9_]*\.[0-9][0-9_]*([eE][+-]?[0-9][0-9_]*)?/,
    ),

    string_literal: $ => seq(
      '"',
      repeat(choice(
        $.string_content,
        $.escape_sequence,
      )),
      '"',
    ),

    string_content: $ => /[^"\\\n]+/,

    escape_sequence: $ => token(seq(
      '\\',
      choice(
        'n', 't', 'r', '\\', '"', "'", '0',
        /u\{[0-9a-fA-F]{1,6}\}/,
      ),
    )),

    char_literal: $ => seq(
      "'",
      choice(
        /[^'\\]/,
        $.escape_sequence,
      ),
      "'",
    ),

    boolean_literal: $ => choice('true', 'false'),

    none_literal: $ => 'none',

    // =========================================================================
    // Identifiers and comments
    // =========================================================================

    identifier: $ => /[a-z_][a-zA-Z0-9_]*/,

    line_comment: $ => token(seq('//', /.*/)),
  },
});

// Helper — tree-sitter's prec.left requires the function form
function prec_left(level, rule) {
  return prec.left(level, rule);
}
