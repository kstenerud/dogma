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
      - [Expression](#expression)
      - [Condition](#condition)
      - [Numeric Types](#numeric-types)
  - [Syntactic Elements](#syntactic-elements)
    - [Document Header](#document-header)
    - [Production Rule](#production-rule)
    - [Nonterminal](#nonterminal)
    - [Macro](#macro)
    - [Function](#function)
    - [Builtin Functions](#builtin-functions)
      - [Limit Function](#limit-function)
      - [`pad_to` Function](#pad_to-function)
      - [`pad_align` Function](#pad_align-function)
      - [`if` Function](#if-function)
      - [`bind` Function](#bind-function)
      - [`cp_category` Function](#cp_category-function)
    - [Builtin Encodings](#builtin-encodings)
      - [`unsigned_integer` Encoding](#unsigned_integer-encoding)
      - [`signed_integer` Encoding](#signed_integer-encoding)
      - [`ieee754_binary` Encoding](#ieee754_binary-encoding)
      - [`little_endian` Encoding](#little_endian-encoding)
    - [User Defined Encodings](#user-defined-encodings)
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
* **Bindings**: Some constructs (such as here documents or length delimited fields) require access to previously decoded values. KBNF supports assigning decoded values to variables.
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

In some situations, data that has already been realized may be bound to a variable for use elsewhere. Variables are bound either manually using the [`bind`](#bind-function) builtin function, or automatically when passing to a [macro](#macro).

All variables have a [type](#types) that matches what they were bound to. Variables are scoped locally to the current rule.

If an expression is bound, that expression's bound variables are also accessible locally by using dot notation (`this_exp_bound_value.sub_exp_bound_value`).

**For example**:

A record begins with a header consisting of a 16-bit big endian unsigned integer length of at least 1, indicating how many bytes of record data follow.

```kbnf
record              = bind(header, record_header) record_data(header.length);
record_header       = bind(length, unsigned_integer(16, 1~));
record_data(length) = unsigned_integer(8, 0~){length};
```

* The `record` rule binds the result of the `length_header` rule to a variable called `header`.
* The `record_header` rule binds a 16-bit big endian unsigned integer value (that must be >= 1) to a variable called `length`.
* The `record_data` rule is a [macro](#macro) that takes a length argument and matches that many bytes using [repetition](#repetition).
* The `record` rule gets the length value from the `record_header` rule using dot notation to access the sub-expression's variable: `header.length`.

It's also possible to access sub-variables of passed-in expression variables:

```kbnf
a = c(b);
b = bind(bb, unsigned_integer(5, 1~20));
c(x) = unsigned_integer(6, 0~50) x.bb;
```

`c` expects the passed-in variable `x` to be an expression that captures a variable called `bb` so that it can access it as `x.bb`. This is indeed the case when nonterminal `a` is defined as `b` passed into `c`. Thus, `a` matches a 5-bit unsigned integer from 1 to 20, followed by a 6-bit integer from 0 to 50, followed by the exact same 5-bit value again (for a total of 16 bits).

Of course, this example is a bit contrived, and could be more readably writen as:

```
a = bind(bb, unsigned_integer(5, 1~20))
    unsigned_integer(6, 0~50)
    bb
  ;
```

### Types

KBNF is a typed language. As the number of types is small and the conversion rules simple, types are inferred.

#### Expression

An expression represents the set of possible bit sequences, of which one must be matched in the document. Once matched, the expression's possibilities collapse into a specific array of bits that can be [bound](#bind-function) to a variable and used elsewhere.

#### Condition

A condition is the result of comparing numeric types or performing logical operations on conditions, resulting in either true or false. Conditions are used in [`if`](#if-function) calls.

#### Numeric Types

Numeric types are used in [calculations](#calculations), which themselves result in numeric types.

The numeric types are (narrowest to widest):

* **Unsigned Integer** can represent any positive integer value or 0.
* **Signed Integer** can represent unsigned integer values and negative integer values.
* **Real Number** represents a real number in the mathematical definition of the term.

A narrower type may be used in a context requiring a wider type (whereby it is automatically promoted to the wider type), but a wider type cannot be used in a context requiring a narrower type.



Syntactic Elements
------------------


### Document Header

The document header identifies the file format as KBNF, and contains the following mandatory information:

* The version of the KBNF specification that the document adheres to.
* The character encoding used in the document itself, and also for all codepoint related expressions.

Optionally, it may also include headers. An empty line terminates the document header section.

```kbnf
document_header        = "kbnf_v" kbnf_version SOME_WS character_encoding LINE_END header_line* LINE_END;
character_encoding     = ('!' ~ '~')+;
header_line            = '-' SOME_WS header_name MAYBE_WS '=' SOME_WS header_value LINE_END;
header_name            = printable+;
header_value           = printable_ws+;
```

The following headers are officially recognized (all others are allowed, but are not standardized):

* **identifier**: An identifier for the grammar being described. It's customary to append a version number to the identifier.
* **description**: A brief, one-line description of the grammar.

**Example**:

```kbnf
kbnf_v1 utf-8
- identifier  = mygrammar_v1
- description = My first grammar, version 1

# grammar rules begin here, after the empty line terminating the header
```


### Production Rule

Production rules follow the same `symbol = expression` style of other BNF grammars, except that they are terminated by a semicolon rather than by an end-of-line. This makes it visually more clear where a rule ends, and also allows more freedom for visually laying out the elements of a rule.

```kbnf
production_rule = nonterminal TOKEN_SEP '=' TOKEN_SEP production TOKEN_SEP ';';
```

`nonterminal` is a nonterminal, and `production` may be a terminal or a nonterminal or a combination.

By convention, the start symbol's rule is generally listed first.

**Example**:

```kbnf
document = preamble_line* END_PREAMBLE record*;
record = '>' WS+ record_name ('/' count)* END_RECORD;
# ...
```


### Nonterminal

A placeholder for an expression. Symbol names are not limited to ASCII.


```kbnf
nonterminal            = identifier_restricted;
identifier_any         = identifier_firstchar identifier_nextchar*;
identifier_restricted  = identifier_any ! reserved_identifiers;
identifier_firstchar   = cp_category(L,M);
identifier_nextchar    = identifier_firstchar | cp_category(N) | '_';
```

**Example**:

```kbnf
record = 会社名 "：：" 従業員数;
会社名 = (cp(L,M) cp(L,M,N,P,S,Zs)*) ! "：：";
従業員数 = ('１'~'９') ('０'~'９')* '万'?;
```

### Macro

A macro is a type of nonterminal that accepts parameters, which are bound to [variables](#variables) for use within the macro.

```kbnf
macro                  = identifier_restricted '(' TOKEN_SEP param_name (ARG_SEP param_name)* TOKEN_SEP ')';
identifier_any         = identifier_firstchar identifier_nextchar*;
identifier_restricted  = identifier_any ! reserved_identifiers;
identifier_firstchar   = cp_category(L,M);
identifier_nextchar    = identifier_firstchar | cp_category(N) | '_';
```

**Example**:

A simple, contrived example: A fixed section always contains three records: Two with 100 bytes, followed by one with 50.

```kbnf
fixed_section               = fixed_length_record(100)
                              fixed_length_record(100)
                              fixed_length_record(50);
fixed_length_record(length) = byte{length};
byte                        = unsigned_integer(8, 0~)
```

A more complex, real-world example: [IPV4])(ipv4.kbnf)

```kbnf
ip_packet                    = ...
                               u4(bind(header_length, 5~)) # length is in 32-bit words
                               ...
                               u16(bind(total_length, 20~)) # length is in bytes
                               ...
                               options((header_length-5) * 32)
                               payload(protocol, (total_length-(header_length*4)) * 8)
                             ;

options(bit_count)           = limit(option*, bit_count);
option                       = option_eool
                             | option_nop
                             | option_sec
                             | ...
                             ;

payload(protocol, bit_count) = pad_to(bit_count, payload_contents(protocol), u1(0));
payload_contents(protocol)   = if(protocol = 0, protocol_hopopt)
                             | if(protocol = 1, protocol_icmp)
                             | ...
                             ;
```

### Function

Functions behave similarly to macros, except that they are opaque: Whereas a macro is defined within the bounds of the grammatical notation, a function's procedure is either one of the [built-in functions](#builtin-functions-and-encodings), or is user-defined in [prose](#prose).

Functions have specific types that they accept as parameters, and emit specific types.

### Builtin Functions

KBNF comes with a number of necessary functions baked in:

#### Limit Function

The `limit` function accepts an expression and a bit count, and limits the expression to that many bits. Any production containing more than the limit is not considered a match.

```
limit(bit_count: uint, expr: expression): expression
```

**Example**:

```kbnf
# Accepts any Unicode name, up to 200 bytes.
name_field = limit(200*8, cp_category(L,M,N,P,Zs)+)
```


#### `pad_to` Function

The `pad_to` function requires that any match be exactly the specified number of bits, and adds the padding expression repeatedly to any potential match until the length matches. `pad_to` does not limit the size, so if a potential match is already over-sized or becomes over-sized as a result of the padding, no match occurs.

```
pad_to(bit_count: uint, expr: expression, padding: expression): expression
```


#### `pad_align` Function

The `pad_align` function requires that any match be sized to a multiple of the specified bit count, and adds the padding expression repeatedly to any potential match until the length matches. `pad_align` does not limit the size, so if a potential match is already over-sized or becomes over-sized as a result of the padding, no match occurs.

```
pad_align(bit_count: uint, expr: expression, padding: expression): expression
```

#### `if` Function

The `if` function produces the given expression only if the given [condition](#condition) is true. `if` function calls combined with [alternates](#alternate) effectively produce switch statements.

TODO: else clause? Would allow switch with default...

```
if(cond: condition, expr: expression): expression
```

#### `bind` Function

The `bind` function binds a value to a variable. Returns the value it bound to a variable.

```
bind(variable_name: identifier, value: any): any
```

**Examples**:

Matches "abcd|abcd", "fred|fred" etc.

```kbnf
sequence = bind(repeating_value,('a'~'z')+) '|' repeating_value;
```

Bind the variable "terminator" to whatever follows the "<<" until the next linefeed. The here-document contents continue until the terminator value is encountered again.

```kbnf
here_document             = "<<" bind(terminator, NOT_LF+) LF here_contents(terminator) terminator;
here_contents(terminator) = ANY_CHAR* ! terminator;
ANY_CHAR                  = '\{0}'~;
LF                        = '\{a}';
NOT_LF                    = ANY_CHAR ! LF;
```

Interpret the next 16 bits as a big endian unsigned int and bind the result to "length". That many following bytes make up the record contents.

```kbnf
length_delimited_record = uint16(bind(length, 0~)) record_contents(length);
record_contents(length) = byte(0~){length}
uint16(v)               = unsigned_int(16, v)
byte(v)                 = unsigned_int(8, v)
```

#### `cp_category` Function

The `cp_category` function returns the set of all Unicode codepoints that have one of the given set of Unicode [categories](https://unicode.org/glossary/#general_category).

```
cp_category(categories: category_name...): set of codepoint
```

**Example**:

```kbnf
letter_digit_space = cp_caregory(N,L,Zs);
```

### Builtin Encodings

Encodings are functions that transform data. The following encodings are built-in to KBNF:

#### `unsigned_integer` Encoding

- unsigned_integer(value: uint, bit_count: uint): bits

#### `signed_integer` Encoding

- signed_integer(value: sint, bit_count: uint): bits

#### `ieee754_binary` Encoding

- ieee754_binary(value: real, bit_count: uint): bits

#### `little_endian` Encoding

- little_endian(value: bits): bits

### User Defined Encodings

Other encodings can be added to your grammar by using [prose](#prose) to either describe the process or link to a description.

**Examples**:

```kbnf
bfloat(v)                     = """https://en.wikipedia.org/wiki/Bfloat16_floating-point_format"""
ieee754_decimal(bit_count, v) = """https://en.wikipedia.org/wiki/IEEE_754#Decimal"""
leb128(v)                     = """https://en.wikipedia.org/wiki/LEB128"""
vlq(v)                        = """https://en.wikipedia.org/wiki/Variable-length_quantity"""
zigzag(v)                     = """https://en.wikipedia.org/wiki/Variable-length_quantity#Zigzag_encoding"""
```


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

Calculations perform arithmetic operations on [numeric types](#numeric-types), producing a new numeric type. Types may be mixed in calculations, whereby the produced type is the wider of the input types.

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

grammar                = (MAYBE_WSLC production_rule)*;
production_rule        = nonterminal TOKEN_SEP '=' TOKEN_SEP production TOKEN_SEP ';';
production             = expression;
expression             = nonterminal
                       | macro
                       | call
                       | string_literal
                       | maybe_ranged(codepoint_literal)
                       | concatenate
                       | alternate
                       | exclude
                       | builtin_encodings
                       | builtin_functions
                       | variable(production)
                       | repetition
                       | prose
                       | grouped(expression)
                       ;

nonterminal            = identifier_restricted;
macro                  = identifier_restricted '(' TOKEN_SEP param_name (ARG_SEP param_name)* TOKEN_SEP ')';
param_name             = identifier_any;
call                   = identifier_any '(' TOKEN_SEP call_param (ARG_SEP call_param)* TOKEN_SEP ')';
call_param             = expression | calculation(uint | sint | real) | condition;

concatenate            = expression (SOME_WSLC expression)+;
alternate              = expression (TOKEN_SEP '|' TOKEN_SEP expression)+;
exclude                = expression TOKEN_SEP '!' TOKEN_SEP expression;

prose                  = '"""' (escapable_char(printable_wsl, '"')+ ! '"""') '"""'
                       | "'''" (escapable_char(printable_wsl, "'")+ ! "'''") "'''"
                       ;
codepoint_literal      = ('"' escapable_char(printable_ws, '"'){1} '"') | ("'" escapable_char(printable_ws, "'"){1} "'");
string_literal         = ('"' escapable_char(printable_ws, '"'){2~} '"') | ("'" escapable_char(printable_ws, "'"){2~} "'");
escapable_char(char_set, quote_char) = (char_set ! ('\\' | quote_char)) | escape;
escape                 = '\\' (printable ! '{') | escape_codepoint);
escape_codepoint       = '{' digit_hex+ '}';

repetition             = repeat_range | repeat_zero_or_one | repeat_zero_or_more | repeat_one_or_more;
repeat_range           = expression '{' TOKEN_SEP maybe_ranged(calculation(uint)) TOKEN_SEP '}';
repeat_zero_or_one     = expression '?';
repeat_zero_or_more    = expression '*';
repeat_one_or_more     = expression '+';

builtin_encodings      = enc_unsigned_integer | enc_signed_integer | enc_ieee754_binary | enc_little_endian;
enc_unsigned_integer   = "unsigned_integer(" TOKEN_SEP bit_count ARG_SEP maybe_ranged(calculation(uint)) TOKEN_SEP ')';
enc_signed_integer     = "signed_integer(" TOKEN_SEP bit_count ARG_SEP maybe_ranged(calculation(sint)) TOKEN_SEP ')';
enc_ieee754_binary     = "ieee754_binary(" TOKEN_SEP bit_count ARG_SEP maybe_ranged(calculation(real)) TOKEN_SEP ')';
enc_little_endian      = "little_endian(" TOKEN_SEP expression TOKEN_SEP ')';

builtin_functions      = function_limit | function_pad_to | function_pad_align | function_if | function_bind | function_cp_category;
function_limit         = "limit(" TOKEN_SEP bit_count ARG_SEP expression TOKEN_SEP ")";
function_pad_to        = "pad_to(" TOKEN_SEP bit_count ARG_SEP expression ARG_SEP padding TOKEN_SEP ")";
function_pad_align     = "pad_align(" TOKEN_SEP bit_count ARG_SEP expression ARG_SEP padding TOKEN_SEP ")";
function_if            = "if(" TOKEN_SEP condition ARG_SEP expression TOKEN_SEP ')';
function_bind          = "bind(" TOKEN_SEP local_id ARG_SEP bind_value TOKEN_SEP ')';
function_cp_category   = "cp_category(" TOKEN_SEP cp_category_name (ARG_SEP cp_category_name)* TOKEN_SEP ')';

padding                = expression;
local_id               = identifier_any;
bind_value             = condition | uint | sint | real | expression;
variable(type)         = local_id | subvariable(type);
subvariable(type)      = variable(production) '.' variable(type);
bit_count              = calculation(uint);
cp_category_name       = ('A'~'Z') ('a'~'z')?;

calculation(type)      = calculation_term(type) | addition(type) | subtraction(type);
calculation_term(type) = operand(type) | multiplication(type) | division(type) | modulus(type);
operand(type)          = type | variable(type) | calculation(type) | grouped(calculation(type));
addition(type)         = calculation(type) TOKEN_SEP '+' TOKEN_SEP calculation_term(type);
subtraction(type)      = calculation(type) TOKEN_SEP '-' TOKEN_SEP calculation_term(type);
multiplication(type)   = calculation(type) TOKEN_SEP '*' TOKEN_SEP calculation_term(type);
division(type)         = calculation(type) TOKEN_SEP '/' TOKEN_SEP calculation_term(type);
modulus(type)          = calculation(type) TOKEN_SEP '%' TOKEN_SEP calculation_term(type);

condition              = comparison | logical_and | logical_or | logical_not | grouped(condition);
comparison             = operand(uint | sint | real) TOKEN_SEP comparator TOKEN_SEP operand(uint | sint | real);
comparator             = "<" | "<=" | "=" | ">= | ">";
logical_and            = condition TOKEN_SEP '&' TOKEN_SEP condition;
logical_or             = condition TOKEN_SEP '|' TOKEN_SEP condition;
logical_not            = '!' TOKEN_SEP condition_group;

grouped(type)          = '(' TOKEN_SEP type TOKEN_SEP ')';
maybe_ranged(type)     = type | (type? TOKEN_SEP '~' TOKEN_SEP type?);

real                   = real_dec | real_hex;
real_dec               = neg? uint_dec '.' digit_dec+ (('e' | 'E') ('+' | '-')? digit_dec+)?;
real_hex               = neg? uint_hex '.' digit_hex+ (('p' | 'P') ('+' | '-')? digit_dec+)?;
sint                   = neg? uint
uint                   = uint_bin | uint_oct | uint_dec | uint_hex;
uint_bin               = '0' ('b' | 'B') digit_bin+;
uint_oct               = '0' ('o' | 'O') digit_oct+;
uint_dec               = digit_dec+;
uint_hex               = '0' ('x' | 'X') digit_hex+;
neg                    = '-';

identifier_any         = identifier_firstchar identifier_nextchar*;
identifier_restricted  = identifier_any ! reserved_identifiers;
identifier_firstchar   = cp_category(L,M);
identifier_nextchar    = identifier_firstchar | cp_category(N) | '_';
reserved_identifiers   = ( "limit"
                         | "pad_to"
                         | "pad_align"
                         | "if"
                         | "bind"
                         | "unsigned_integer"
                         | "signed_integer"
                         | "ieee754_binary"
                         | "little_endian"
                         );

printable              = cp_category(L,M,N,P,S);
printable_ws           = printable | WS;
printable_wsl          = printable | WSL;
digit_bin              = '0'~'1';
digit_oct              = '0'~'7';
digit_dec              = '0'~'9';
digit_bin              = ('0'~'9') | ('a'~'f') | ('A'~'F');

comment                = '#' (printable_ws ! LINE_END)* LINE_END;

ARG_SEP                = TOKEN_SEP ',' TOKEN_SEP;
TOKEN_SEP              = MAYBE_WSLC;

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
