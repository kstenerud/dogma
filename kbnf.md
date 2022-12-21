Karl's Bachus-Naur Form
=======================

Version 0


## WORK IN PROGRESS!

The descriptions are all a mess atm. Only the [grammar](#the-kbnf-grammar-in-kbnf) is in decent shape right now.

Builtin functions and encodings are (roughly, WIP) listed [here](#builtins)

For an example of using it in a binary format, see [ipv4.kbnf](ipv4.kbnf)



Introduction
------------

Syntactic metalanguages have made only small gains over the past 80 years (with the last major advancement in 1996), and still only describe text-based formats. KBNF is an attempt to modernize the metalanguage and give it better expressivity (and binary support).



Contents
--------

- [Karl's Bachus-Naur Form](#karls-bachus-naur-form)
  - [WORK IN PROGRESS!](#work-in-progress)
  - [Introduction](#introduction)
  - [Contents](#contents)
  - [Design Objectives](#design-objectives)
    - [Human readability](#human-readability)
    - [Support for binary grammars](#support-for-binary-grammars)
    - [Better expressivity](#better-expressivity)
    - [Character set support](#character-set-support)
    - [Codepoints as first-class citizens](#codepoints-as-first-class-citizens)
    - [Future proof](#future-proof)
  - [Concepts](#concepts)
    - [Document](#document)
    - [Variables](#variables)
    - [Types](#types)
  - [Syntactic Elements](#syntactic-elements)
    - [Document Header](#document-header)
    - [Productions](#productions)
    - [Symbol](#symbol)
    - [Functions](#functions)
    - [Expressions](#expressions)
    - [Literals](#literals)
    - [Grouping](#grouping)
    - [Ranges](#ranges)
    - [Calculations](#calculations)
    - [Conditions](#conditions)
    - [Builtin functions and encodings](#builtin-functions-and-encodings)
    - [Comments](#comments)
    - [Precedence](#precedence)
  - [Something](#something)
      - [Concatenation](#concatenation)
      - [Alternative](#alternative)
      - [Exclusion](#exclusion)
    - [Builtins](#builtins)
      - [bind](#bind)
      - [_bits](#_bits)
      - [_transform](#_transform)
      - [_category](#_category)
      - [_if](#_if)
    - [Prose](#prose)
  - [Codepoints](#codepoints)
    - [Escape Sequence](#escape-sequence)
  - [Examples](#examples)
    - [Complex Example](#complex-example)
  - [Design Notes](#design-notes)
    - [Letter Case](#letter-case)
    - [Single vs Double Quotes](#single-vs-double-quotes)
    - [No predefined symbols](#no-predefined-symbols)
  - [The KBNF Grammar in KBNF](#the-kbnf-grammar-in-kbnf)



Design Objectives
-----------------

### Human readability

The main purpose of KBNF is to describe text and binary grammars in a concise, unambiguous, human readable way. The use case is describing formats in documentation.

### Support for binary grammars

Binary grammars generally behave quite differently from textual grammars, and require special support:

* **Bit arrays**: Binary grammars tend to work at bit-level granularity, and thus require support for arbitrarily sized bit arrays.
* **Variables & Functions**: Binary formats often represent data in complex ways that can't be parsed without passing some context around.
* **Conditionals & Logic**: Binary formats often include or exclude portions based on encoded values elsewhere. Evaluating these requires the use of conditionals and logic operators.
* **Calculations**: Many binary field sizes are determined by data stored elsewhere in the document, and often they require calculations of some sort to determine the final field size.
* **Transformations**: Binary data often undergoes transformations that are too complex for normal BNF-style rules to express (for example [LEB128](https://en.wikipedia.org/wiki/LEB128)).

### Better expressivity

Not everything can be accurately described by a real-world grammar, but we can get pretty close. The following features bring KBNF to the point where it can describe most of what's out there unambiguously:

* **Repetition**: Any expression can have repetition applied to it, for a specific number of occurrences, or a range of occurrences.
* **Bindings**: Some constructs (such as here documents or length delimited fields) require access to previously decoded values. KBNF supports assigning decoded values to symbols.
* **Exclusion**: Sometimes it's easier to express something as "everything except for ...".
* **Prose**: In many cases, the actual encoding of something is already well-known and specified elsewhere, or is too complex for KBNF to describe adequately. Prose offers a free-form way to describe part of a grammar.
* **Grouping**: Grouping expressions together is an obvious convenince that most other BNF offshoots have already adopted.
* **Explicit Terminator**: Having an explicit terminator character (not linefeed) makes it easier for a human to find the end of a rule, and makes it easier to format the document in an aesthetically pleasing manner.

### Character set support

Metalanguages tend to support only ASCII, with Unicode (encoded as UTF-8) generally added as an afterthought. This restricts the usefulness of the metalanguage, as any other character sets (many of which are still in use) have no support at all.

KBNF can be used with any character set, and requires the character set to be specified as part of the document header.

### Codepoints as first-class citizens

Codepoints beyond the ASCII range must be directly inputtable into a grammar document. Difficult codepoints must be supported as well (via escape sequences). Unicode categories must be supported.

### Future proof

No specification is perfect, nor can it stand the test of time. Eventually an incompatible change will become necessary in order to stay relevant.

KBNF documents are versioned to a particular KBNF specification so that changes can be made to the specification without breaking existing tooling.



Concepts
--------

### Document

This specification will refer to any complete sequence of input (message, packet, document, file, archive, protocol etc) as a "document". Lexing begins at the start of the document and continues to the end of the data unless otherwise specified.

### Variables

In some situations, data that has already been realized may be bound to a variable for use elsewhere. Variables are bound either manually using the `_bind` function, or automatically when passing parameters to a function.

If a bound expression has itself bound an expression, that subexpression can be accessed using dot notation (`bound_value.subexp_bound_value`).

**For example**:

```kbnf
record        = _bind(length_field, length_header) _bits(8, 0~){length_field.length};
length_header = _bind(length, _bits(16,1~))
```

* The `record` rule binds the result of the `length_header` rule to a new local (to `record`) variable called `length_field`.
* The `length_header` rule binds a 16-bit integer value (that must be >= 1) as a new local (to `length_header`) variable called `length`.
* Since `record` binds the result of `length_header` to `length_field`, `length` is now accessible from `record` as `length_field.length`.

### Types

There are three main types in KBNF. Some types can be converted to other types in certain circumstances.

* **Expressions** express something that must be matched.
* **Integers** are used for calculations, and can be used in certain argument positions in some functions. Integers can be introduced as literals, or if an expression is used in a context where only operands are allowed, it gets converted to an integer (all matched bits are interpreted, big endian, as an unsized integer). `_bits` can be used to convert an integer into an expression.
* **Conditions** resolve to either true or false, and are used as arguments to _if functions. Integers and expressions cannot be converted to boolean or vice versa; only conditionals can produce boolean values.

Calculations produce integers
conditions produce booleans
Expression matches can be converted to integers



Syntactic Elements
------------------


### Document Header

The document header identifies the file format as KBNF, and contains the following mandatory information:

* The version of the KBNF specification that the document adheres to.
* The character encoding of the document itself, and also for all codepoint related expressions.

Optionally, it may also include headers.

An empty line terminates the document header.

```kbnf
document_header    = "kbnf_v" version SOME_WS character_encoding LINE_END header_line* LINE_END;
character_encoding = ('!' ~ '~')+;
header_line        = '-' SOME_WS header_name MAYBE_WS '=' SOME_WS header_value LINE_END;
header_name        = printable+;
header_value       = printable_ws+;
```

The following headers are officially recognized (all others are allowed, but are not standardized):

* **identifier**: An identifier for the grammar being described. It's customary to append a version number to the identifier.
* **description**: A brief, one-line description of the grammar.

**Example**:

```kbnf
kbnf_v1 utf-8
- identifier  = mygrammar_v1
- description = My first grammar, version 1

# grammar rules begin here
```


### Productions

Productions follow the same `symbol = expression` style of other BNF grammars, except that they are terminated by a semicolon rather than by an end-of-line. This makes it visually more clear where a rule ends, and also allows more freedom for visually laying out the elements of a rule.

```kbnf
rule = MAYBE_WSLC symbol MAYBE_WSLC '=' MAYBE_WSLC expression MAYBE_WSLC ';';
```

`symbol` is a nonterminal, and `expression` may be a terminal or a nonterminal, or a combination.

By convention, the start symbol's rule is generally listed first.

**Example**:

```kbnf
document = preamble_line* END_PREAMBLE record*;
record = '>' WS+ record_name ('/' count)* END_RECORD;
# ...
```


### Symbol

A placeholder for an expression. Symbol names are not limited to ASCII.

```kbnf
symbol           = identifier;
identifier       = (identifier_first identifier_next*) ! (pint_literal | builtin_function_names);
identifier_first = cp(L,M);
identifier_next  = identifier_first | cp(N) | '_';
```

**Example**:

```kbnf
record = 会社名 "：：" 従業員数;
会社名 = (cp(L,M) cp(L,M,N,P,S,Zs)*) ! "：：";
従業員数 = ('１'~'９') ('０'~'９')* '万'?;
```

### Functions

Functions behave a lot like symbols (they are defined using rules), except that you must pass parameters into them, which then are bound to local variables in their rule definitions.

Functions do, unfortunately, complete the unholy incantation of Turing completeness, but without them many binary grammars would be cumbersome or impossible to describe. Functions should be used sparingly, in ways that improve human readability (which is the primary purpose of this language).

### Expressions

An expression is the set of all input that will match at a particular point, describing what must be matched. Once a match is established, the result can be:

* used as a token
* used for an exact match later in the document
* incorporated into calculations
* used to test for conditions

### Literals

### Grouping

Expressions, calculations and conditions can be grouped.

### Ranges

repetition
codepoint
int

### Calculations

add, subtract, multiply, divide, modulus, parentheses, asl, asr

Calculations produce integers, which can then be used in other calculations, ranges, or conditions

### Conditions

comparators, logic operators, parentheses, _if

Conditions are used in _if expressions.

### Builtin functions and encodings

Builtins are built-in functions that extend the capabilities of KBNF.

### Comments

A comment begins with a hash char (`#`) and continues to the end of the current line. Comments can be placed after pretty much any token.

```kbnf
comment = '#' (printable_ws ! LINE_END)* LINE_END;
```

**Example**:

```kbnf
kbnf_v1 utf-8
- identifier = mygrammar_v1
- description = My first grammar

# This is the first place a comment may be placed.
myrule # comment
 = # comment
 myexpression # comment
 ; # comment
# comment
```


### Precedence

Calculations

* Grouping
* Multiplication, Division, Modulus
* Addition, Subtraction

Conditions

* Grouping
* Comparisons
* Logical And
* Logical Or

Logical not can only be applied to a group

Expressions

* Grouping
* Codepoint range
* Repetition
* Concatenation
* Exclusion
* Alternation



Something
---------

#### Concatenation

Concatenation matches all expressions in order.

#### Alternative

Alternative matches one of a set of expressions

#### Exclusion

Exclusion removes an expression from the set of matching expressions.

### Builtins

WIP

Types:

Range types:

- bits
- sint
- uint
- real

Discrete types:

- bool
- discrete_uint

Discrete types can either be single-value literal (uint), or a variable from decoded data... How to differentiate this?
- realized value?
- some params are non-matching... non-variable? constant?
- ranges are only valid in productions, when matching against the document...
- so maybe there aren't 2 kinds of uint?
- can't match a uint of variable size because it would be ambiguous, but can use previously bound length value
  - same for liit, pad, etc. would become ambiguous.
  - so technically, range is allowed everywhere but a rule must not be ambiguous.

Once a variable is bound, it is a discrete value.
- so we have "matching" ranges, and realized values.
- does limit bit count work as a range?
- Only the first arg of encoding funcs can be ranges. Everything else is a literal or a variable.
- pad has two bits params that can be ranges.
- basically the bit count param is always discrete...? what about text?
- what about `limit(u1(1)*, 5~10) limit(u1(0)*, 5~10)`.. technically this is `u1(1){5~10} u1(0){5~10}`
- - `limit(cp(N)*, 8*5-8*10)`

Also `limit_byte(v, count) = limit(v, count*8)`?
- does this work for `limit_byte(cp(N)*, 5~10)`?

Basically `limit` says that a process, which will generate an unknown number of bits, must be limited to x.
- or maybe just by policy disallow ranges in limit bit counts?

Only encoding funcs can accept int ranges since they map directly to a deterministic bit pattern.
- also, encoding funcs cannot accept calculations? Or can they?
- `signed_integer(v1*4, 32)`

Ranges not allowed in calculations, but realized values from ranges are allowed

A variable's range is fixed by the time it is bound.

Builtins:

- limit(v: bits, bit_count: discrete_uint): bits
- pad_to(v: bits, bit_count: discrete_uint, padding: bits): bits
- pad_edge(v: bits, bit_count: discrete_uint, padding: bits): bits
- if(condition: bool, on_true: bits): bits
- bind(name: identifier, value: any): any
- cp_category(names: category_name): bits

Builtin encodings:

- unsigned_integer(value: uint, bit_count: uint): bits
- signed_integer(value: sint, bit_count: uint): bits
- ieee754_binary(value: real, bit_count: uint): bits
- little_endian(value: bits): bits

Other common encodings:

- bfloat: https://en.wikipedia.org/wiki/Bfloat16_floating-point_format
- ieee754_decimal: https://en.wikipedia.org/wiki/IEEE_754#Decimal
- leb128: https://en.wikipedia.org/wiki/LEB128
- vlq: https://en.wikipedia.org/wiki/Variable-length_quantity
- zigzag: https://en.wikipedia.org/wiki/Variable-length_quantity#Zigzag_encoding


#### bind

`bind` binds the result of an expression to a new variable that is local to the current rule (and to any rules that in turn bind this rule).

**Examples**:

```kbnf
# Matches "abcd|abcd", "fred|fred" etc
sequence = bind(repeating_value,('a'~'z')+) '|' repeating_value;

# Matches a 16-bit length field (that must be at least 1) followed by that many bytes of anything
record = bind(length,_bits(16,1~)) unsigned_integer(8,0~){length};
```

#### _bits

`_bits` specifies a match over a specific number of bits.

Bits are signed only if the allowed value range includes negative numbers.

_bits(16, 0~) means 0 to 0xffff
_bits(1, 0) _bits(15, 0~) means 0 to 0x7fff

_bits(16, -100~) means -100 to 0x7fff
_bits(16, ~) means -0x8000 to 0x7fff
_bits(16, ~100) means -0x8000 to 100
_bits(16, 0~100) means 0 to 100

**Examples**:

```kbnf
# Match a sequence of 11 bits containing the value 500
x = _bits(11,500);

# Match a sequence of 17 bits containing a value from 500 to 100000
y = _bits(17,500~100000);
```

#### _transform

`_transform` is a catch-all for data transformations done according to well-known methods.

**Examples**:

```kbnf
# longitude, latitude and temperature are stored as 16-bit signed integers, little endian.
record      = longitude latitude temperature;
longitude   = sint16_le;
latitude    = sint16_le;
temperature = sint16_le;
sint16_le   = _transform(little_endian,_bits(16:~));

# A chunk contains a length field followed by that many bytes.
# Length is a positive integer, encoded as Unsigned Little Endian Base 128
chunk   = _bind(length,length) _bits(8,0~){length};
length  = _transform(uleb128,0~);
uleb128 = """https://en.wikipedia.org/wiki/LEB128#Unsigned_LEB128"""
```

#### _category

`_category` selects a set of codepoints based on their Unicode categories.

#### _if

`_if` chooses an expression based on a condition


### Prose

Prose is meant as a last resort in attempting to describe an expression. If an expression's contents have already been described elsewhere, you could put a URL in here. Otherise you could put in a natural language description.

```kbnf
prose = "'''" (((printable_wsl ! '\\') | escape)+ ! "'''") "'''"
      | '"""' (((printable_wsl ! '\\') | escape)+ ! '"""') '"""'
      ;
```

**Example**:

```kbnf
record              = date ':' temperature LF flowery_description LF '=====' LF;
date                = """https://en.wikipedia.org/wiki/ISO_8601""";
temperature         = digit+ ('.' digit+)?;
digit               = '0'~'9';
flowery_description = """
A poetic description of the weather, written in iambic pentameter. For example:

While barred clouds bloom the soft-dying day,
And touch the stubble-plains with rosy hue;
Then in a wailful choir the small gnats mourn
Among the river sallows, borne aloft
Or sinking as the light wind lives or dies.
"""
```


## Codepoints

Codepoints can be represented as literals, ranges, and category sets.

### Escape Sequence

Escape sequences are allowed in string literals, codepoint literals, and prose. Codepoint escape sequences allow you to represent troublesome codepoints.



Examples
--------

### Complex Example

* A `document` contains one or more `sections`, and terminates on EOF.
* A `section` begins with a `sentinel` (a record type of 0x80 or higher, with a length of 0), followed by an arbitrary number of `records`, followed by the same `sentinel` value again to terminate the list of `records` in this `section`.
* A `record` is comprised of an 8-bit `record_type`, a `payload`, and a possible `suffix` depending on the `record_type`.
* The `payload` is comprised of a little endian 24-bit `length` field representing the number of bytes in the payload, followed by the payload bytes, followed by possible 0xff padding to bring it to a multiple of 32 bits.
* Depending on the `record_type`, there may be a `suffix`.

```kbnf
document                = section+
section                 = _bind(sentinel,_bits(8,x80~) length_field(0)) record* sentinel
record                  = _bind(record_type,type_field) payload suffix(record_type.type);
type_field              = _bind(type,_bits(8,0~2))
length_field(contents)  = _transform(little_endian, _bits(24,contents))
payload                 = _bind(byte_count,length_field(0~)) _bits(8,0~){byte_count} pad_32_high(byte_count);
pad_32_high(byte_count) = _bits(8,xff){(4-byte_count%4)%4};
suffix(type)            = if(type = 2, type2)
                        | if(type = 1, type1)
                        # type 0 means no suffix
                        ;
type1                   = ...
type2                   = ...
```

`section` captures a 32-bit `sentinel`, and then re-uses that `sentinel` to match the section terminator.

`record_type` captures the result of the expression from `type_field`. Since `type_field` captured `type`, it can be accessed from `record` using the dot notation `record_type.type`.

`pad_32_high` uses calculations to decide how many 0xff bytes to match.

`suffix` uses conditions to decide based on `type` which suffix (if any) should be present.



Design Notes
------------

This section describes some of the design decisions, and the reasoning behind them.

### Letter Case

KBNF documents are case-sensitive, and all symbol, codepoint and string comparisons are done in a case sensitive manner. There is no significance to the letter case of a symbol, only an aesthetic convention: If the symbol has no semantic significance (such as whitespace or other aesthetic tokens that are thrown out by the parser), its name is usually all uppercase to give visual differentiation between important symbols and those that merely serve as scaffolding.


### Single vs Double Quotes

Both are allowed in order to avoid excessive escaping, but the general convention is to use single-quotes for single codepoints, and double-quotes for strings - unless the contents would be easier to express the other way (e.g. a string containing double-quotes).


### No predefined symbols

Such as whitespace (which would have different meaning, depending on the character set).



The KBNF Grammar in KBNF
------------------------

KBNF can describe itself:

```kbnf
kbnf_v1 utf-8
- identifier  = kbnf_v1
- description = KBNF grammar, version 1

document               = document_header grammar;

kbnf_version           = '1';

document_header        = "kbnf_v" kbnf_version SOME_WS character_encoding LINE_END header_line* LINE_END;
character_encoding     = ('!' ~ '~')+;
header_line            = '-' SOME_WS header_name MAYBE_WS '=' SOME_WS header_value LINE_END;
header_name            = printable+;
header_value           = printable_ws+;

grammar                = production*;
production             = MAYBE_WSLC (symbol | macro_declaration) MAYBE_WSLC '=' MAYBE_WSLC expression MAYBE_WSLC ';';
expression             = symbol
                       | macro_call
                       | string_literal
                       | ranged(codepoint_literal)
                       | codepoint_category
                       | concat
                       | alternate
                       | exclude
                       | encodings
                       | builtins
                       | variable
                       | repetition
                       | prose
                       | grouped(expression)
                       ;

symbol                 = identifier_custom;
macro_declaration      = identifier_custom '(' MAYBE_WSLC macro_param_name (ARG_SEP macro_param_name)* MAYBE_WSLC ')';
macro_param_name       = identifier_general;
macro_call             = identifier_general '(' MAYBE_WSLC macro_param (ARG_SEP macro_param)* MAYBE_WSLC ')';
macro_param            = expression | calculation | condition;

concat                 = expression (SOME_WSLC expression)+;
alternate              = expression (MAYBE_WSLC '|' MAYBE_WSLC expression)+;
exclude                = expression MAYBE_WSLC '!' MAYBE_WSLC expression;

codepoint_literal      = ('"' char_or_escape{1} '"') | ("'" char_or_escape{1} "'");
string_literal         = ('"' char_or_escape{2~} '"') | ("'" char_or_escape{2~} "'");
char_or_escape         = (printable_ws ! ('"' | '\\')) | escape;
escape                 = (escape_init (printable ! '{')) | escape_codepoint;
escape_init            = '\\';
escape_codepoint       = '{' digit_hex+ '}';
codepoint_category     = "cp_category(" MAYBE_WSLC cp_category_name (ARG_SEP cp_category_name)* MAYBE_WSLC ')';
cp_category_name       = ('A'~'Z') ('a'~'z')?;

prose                  = "'''" (((printable_wsl ! '\\') | escape)+ ! "'''") "'''"
                       | '"""' (((printable_wsl ! '\\') | escape)+ ! '"""') '"""'
                       ;

repetition             = repeat_range | repeat_zero_or_one | repeat_zero_or_more | repeat_one_or_more;
repeat_range           = expression '{' MAYBE_WSLC ranged(numeric) MAYBE_WSLC '}';
repeat_zero_or_one     = expression '?';
repeat_zero_or_more    = expression '*';
repeat_one_or_more     = expression '+';

encodings              = enc_unsigned_integer | enc_signed_integer | enc_ieee754_binary | enc_little_endian;
enc_unsigned_integer   = "unsigned_integer(" MAYBE_WSLC ranged(numeric) ARG_SEP bit_count MAYBE_WSLC ')';
enc_signed_integer     = "signed_integer(" MAYBE_WSLC ranged(numeric) ARG_SEP bit_count MAYBE_WSLC ')';
enc_ieee754_binary     = "ieee754_binary(" MAYBE_WSLC ranged(numeric) ARG_SEP bit_count MAYBE_WSLC ')';
enc_little_endian      = "little_endian(" MAYBE_WSLC expression MAYBE_WSLC ')';

builtins               = builtin_limit | builtin_pad_to | builtin_pad_edge | builtin_if | builtin_bind;
builtin_limit          = "limit(" MAYBE_WSLC expression ARG_SEP bit_count MAYBE_WSLC ")";
builtin_pad_to         = "pad_to(" MAYBE_WSLC expression ARG_SEP bit_count ARG_SEP expression MAYBE_WSLC ")";
builtin_pad_edge       = "pad_edge(" MAYBE_WSLC expression ARG_SEP bit_count ARG_SEP expression MAYBE_WSLC ")";
builtin_if             = "if(" MAYBE_WSLC condition ARG_SEP expression MAYBE_WSLC ')';
builtin_bind           = "bind(" MAYBE_WSLC bind_id ARG_SEP expression MAYBE_WSLC ')';

bit_count              = numeric;

bind_id                = identifier_local;
variable               = bind_id | subvariable;
subvariable            = variable '.' variable;

numeric                = calculation;

calculation            = calculation_term | addition | subtraction;
calculation_term       = operand | multiplication | division | modulus;
operand                = numeric_literal | variable | grouped(calculation) | calculation;
addition               = calculation MAYBE_WSLC '+' MAYBE_WSLC calculation_term;
subtraction            = calculation MAYBE_WSLC '-' MAYBE_WSLC calculation_term;
multiplication         = calculation MAYBE_WSLC '*' MAYBE_WSLC calculation_term;
division               = calculation MAYBE_WSLC '/' MAYBE_WSLC calculation_term;
modulus                = calculation MAYBE_WSLC '%' MAYBE_WSLC calculation_term;

condition              = grouped(condition) | comparison | logical_and | logical_or | logical_not;
comparison             = operand MAYBE_WSLC comparator MAYBE_WSLC operand;
comparator             = comparator_lt | comparator_lte | comparator_gt | comparator_gte | comparator_eq;
comparator_lt          = "<";
comparator_lte         = "<=";
comparator_gt          = ">";
comparator_gte         = ">=";
comparator_eq          = "=";
logical_and            = condition MAYBE_WSLC '&' MAYBE_WSLC condition;
logical_or             = condition MAYBE_WSLC '|' MAYBE_WSLC condition;
logical_not            = '!' MAYBE_WSLC condition_group;

grouped(type)          = '(' MAYBE_WSLC type MAYBE_WSLC ')';
ranged(type)           = type | (type? MAYBE_WSLC '~' MAYBE_WSLC type?);

numeric_literal        = (neg? pint_literal) | real_literal;

real_literal           = real_dec_literal | real_hex_literal;
real_dec_literal       = neg? pint_dec_literal '.' digit_dec+ (('e' | 'E') ('+' | '-')? digit_dec+)?;
real_hex_literal       = neg? pint_hex_literal '.' digit_hex+ (('p' | 'P') ('+' | '-')? digit_dec+)?;

pint_literal           = pint_bin_literal | pint_oct_literal | pint_dec_literal | pint_hex_literal;
pint_bin_literal       = '0' ('b' | 'B') digit_bin+;
pint_oct_literal       = '0' ('o' | 'O') digit_oct+;
pint_dec_literal       = digit_dec+;
pint_hex_literal       = '0' ('x' | 'X') digit_hex+;
neg                    = '-';

reserved_identifiers   = ( "limit"
                         | "pad_to"
                         | "pad_edge"
                         | "if"
                         | "bind"
                         | "unsigned_integer"
                         | "signed_integer"
                         | "ieee754_binary"
                         | "little_endian"
                         );

identifier_general     = identifier_first identifier_next*;
identifier_custom      = identifier_local ! reserved_identifiers;
identifier_first       = cp_category(L,M);
identifier_next        = identifier_first | cp_category(N) | '_';
printable              = cp_category(L,M,N,P,S);
printable_ws           = printable | WS;
printable_wsl          = printable | WSL;
digit_bin              = '0'~'1';
digit_oct              = '0'~'7';
digit_dec              = '0'~'9';
digit_bin              = ('0'~'9') | ('a'~'f') | ('A'~'F');

comment                = '#' (printable_ws ! LINE_END)* LINE_END;

ARG_SEP                = MAYBE_WSLC ',' MAYBE_WSLC;

# Whitespace
MAYBE_WS               = WS*;
SOME_WS                = WS MAYBE_WS;
MAYBE_WSLC             = (WSL | comment)*;
SOME_WSLC              = WSL MAYBE_WSLC;
WSL                    = WS | LINE_END;
WS                     = HT | SP;
LINE_END               = CR? LF;
HT                     = '\{9}';
LF                     = '\{a}';
CR                     = '\{d}';
SP                     = '\{20}';
```
