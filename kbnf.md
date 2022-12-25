Karl's Bachus-Naur Form
=======================

Version 0


## WORK IN PROGRESS!

The descriptions are all a mess atm. Only the [grammar](#the-kbnf-grammar-in-kbnf) is in decent shape right now.

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
  - [Grammar Document](#grammar-document)
    - [Document Header](#document-header)
  - [Production Rules](#production-rules)
    - [Symbols](#symbols)
    - [Macros](#macros)
    - [Functions](#functions)
  - [Builtin Functions](#builtin-functions)
    - [`sized` Function](#sized-function)
    - [`aligned` Function](#aligned-function)
    - [`when` Function](#when-function)
    - [`bind` Function](#bind-function)
    - [`cp_category` Function](#cp_category-function)
    - [`unsigned_integer` Function](#unsigned_integer-function)
    - [`signed_integer` Function](#signed_integer-function)
    - [`ieee754_binary` Function](#ieee754_binary-function)
    - [`little_endian` Function](#little_endian-function)
  - [Variables](#variables)
  - [Types](#types)
    - [Expressions](#expressions)
    - [Conditions](#conditions)
    - [Numbers](#numbers)
  - [Literals](#literals)
    - [Codepoints](#codepoints)
    - [Strings](#strings)
    - [Escape Sequence](#escape-sequence)
    - [Prose](#prose)
  - [Combinations](#combinations)
    - [Concatenation](#concatenation)
    - [Alternative](#alternative)
    - [Exclusion](#exclusion)
  - [Repetition](#repetition)
  - [Grouping](#grouping)
  - [Comments](#comments)
  - [Calculations](#calculations)
  - [Conditions](#conditions-1)
    - [Ranges](#ranges)
    - [Precedence](#precedence)
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

The main purpose of KBNF is to describe text and binary grammars in a concise, unambiguous, human readable way. The use case is describing data formats in documentation.

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



Grammar Document
----------------

A KBNF grammar document begins with a [header section](#document-header), and then contains a series of [production rules](#production-rules). The first rule listed is assumed to be the start rule, and therefore must define a [symbol](#symbols).


### Document Header

The document header identifies the file format as KBNF, and contains the following mandatory information:

* The version of the KBNF specification that the document adheres to.
* The character encoding used in the document itself, and also for all codepoint related expressions.

Optionally, it may also include headers. An empty line terminates the document header section.

```kbnf
document_header    = "kbnf_v" kbnf_version SOME_WS character_encoding LINE_END header_line* LINE_END;
character_encoding = ('!' ~ '~')+;
header_line        = '-' SOME_WS header_name MAYBE_WS '=' SOME_WS header_value LINE_END;
header_name        = printable+;
header_value       = printable_ws+;
```

The following headers are officially recognized (all others are allowed, but are not standardized):

* `identifier`: An identifier for the grammar being described. It's customary to append a version number to the identifier.
* `description`: A brief, one-line description of the grammar.

**Example**: A UTF-8 KBNF grammar called "mygrammar_v1".

```kbnf
kbnf_v1 utf-8
- identifier  = mygrammar_v1
- description = My first grammar, version 1

# grammar rules begin here, after the empty line terminating the header
```



Production Rules
----------------

Production rules are written in the form `nonterminal = expression;`, with optional whitespace (including newlines) between rule elements. The terminating semicolon makes it more clear where a rule ends, and also allows more freedom for visually laying out the elements of a rule.

```kbnf
rule = (symbol | macro) TOKEN_SEP '=' TOKEN_SEP production TOKEN_SEP ';'
     | function TOKEN_SEP '=' TOKEN_SEP prose TOKEN_SEP ';'
     ;
```

The nonterminal (left) part of a rule can define a [symbol](#symbols), a [macro](#macros), or a [function](#functions). Their names share the global namespace, and must be unique (they are case sensitive).

TODO: Should they share namespace?

### Symbols

A symbol acts as a placeholder for an [expression](#expressions). Symbol names are not limited to ASCII.

```kbnf
symbol = identifier_restricted;
```

**Example**: A record consists of a company name (which must not contain two full-width colons in a row), followed by two full-width colons, followed by an employee count in full-width characters (possibly approximated to the nearest 10,000), and is terminated by a linefeed.

```kbnf
記録		= 会社名 "：：" 従業員数 LF;
会社名		= cp_category(L,M) cp_category(L,M,N,P,S,Zs)* ! "：：";
従業員数		= '１'~'９' '０'~'９'* '万'?;
LF		= '\{a}';
```

Or if you prefer, the same thing with English symbol names:

```kbnf
record         = company_name "：：" employee_count LF;
company_name   = cp_category(L,M) cp_category(L,M,N,P,S,Zs)* ! "：：";
employee_count = '１'~'９' '０'~'９'* '万'?;
LF             = '\{a}';
```

### Macros

A macro is essentially a symbol that accepts parameters, which are bound to local [variables](#variables) for use within the macro. The macro's contents are written like regular rules, but also have access to the injected local variables.

```kbnf
macro = identifier_restricted '(' TOKEN_SEP param_name (ARG_SEP param_name)* TOKEN_SEP ')';
```

When called, a macro substitutes the passed in parameters and proceeds like a normal rule would (the grammar is malformed if a macro is called with the wrong types).

```kbnf
call       = identifier_any '(' TOKEN_SEP call_param (ARG_SEP call_param)* TOKEN_SEP ')';
call_param = expression | calculation(uint | sint | real) | condition;
```

**Example**: A fixed section is always 256 bytes long, split into three standard 8-bit length prefixed records. The first two records always have a length of 100 bytes, and the third has a length of 53 bytes.

```kbnf
fixed_section  = record(100)
                 record(100)
                 record(53);
record(length) = byte(length) byte(0~){length};
byte(v)        = unsigned_integer(8, v)
```

**Example**: An [IPV4](ipv4.kbnf) packet contains "header length" and "total length" fields, which together determine how big the "options" and "payload" sections are. "protocol" determines the protocol of the payload.

```kbnf
ip_packet                    = ...
                               u4(bind(header_length, 5~)) # length is in 32-bit words
                               ...
                               u16(bind(total_length, 20~)) # length is in bytes
                               ...
                               u8(bind(protocol, registered_protocol))
                               ...
                               options((header_length-5) * 32)
                               payload(protocol, (total_length-(header_length*4)) * 8)
                             ;

options(bit_count)           = limit(option*, bit_count);
option                       = option_eool
                             | option_nop
                             | ...
                             ;

payload(protocol, bit_count) = pad_to(bit_count, payload_contents(protocol), u1(0));
payload_contents(protocol)   = when(protocol = 0, protocol_hopopt)
                             | when(protocol = 1, protocol_icmp)
                             | ...
                             ;
```

### Functions

Functions behave similarly to macros, except that they are opaque: Whereas a macro is defined within the bounds of the grammatical notation, a function's procedure is either one of the [built-in functions](#builtin-functions), or is user-defined in [prose](#prose) (either as a description, or as a URL pointing to a description).

Since the function is opaque, its types cannot be inferred like for macros, and therefore must be specified.

Functions must specify the [types](#types) of all parameters and its return value. A function cannot produce anything if its input types are mismatched.

```kbnf
function       = identifier_restricted '(' TOKEN_SEP function_param (ARG_SEP function_param)* TOKEN_SEP ')' TOKEN_SEP ':' TOKEN_SEP type;
function_param = param_name TOKEN_SEP ':' TOKEN_SEP type;
type           = "expression"
               | "condition"
               | "uint"
               | "sint"
               | "real"
               | "any"
               ;
```

**Example**: A function to convert an unsigned int to its unsigned little endian base 128 representation.

```kbnf
uleb128(v: uint): expression = """https://en.wikipedia.org/wiki/LEB128#Unsigned_LEB128""";
```



Builtin Functions
-----------------

KBNF comes with some fundamental functions built-in:

### `sized` Function

The `sized` function requires an expression to produce exactly `bit_count` bits.

```kbnf
sized(bit_count: uint, expr: expression): expression
```

**Example**: A name field must contain exactly 200 bytes worth of character data, padded with space as needed.

```kbnf
name_field = sized(200*8, cp_category(L,M,N,P,Zs)* ' '*)
```

**Example**: The "records" section can contain any number of length-delimited records, but must be exactly 1024 bytes long. This section can be padded with 0 length records (which is a record with a length field of 0 and no payload).

```kbnf
record_section     = sized(1024*8, record* zero_length_record*);
record             = byte(bind(length, 0~)) byte(0~){length};
zero_length_record = byte(0);
byte(v)            = unsigned_integer(8, v);
```

### `aligned` Function

The `aligned` function requires an expression to produce a number of bits that is a multiple of `bit_count`.

```kbnf
aligned_to(bit_count: uint, expr: expression, padding: expression): expression
```

**Example**: The "records" section can contain any number of length-delimited records, but must end on a 32-bit boundary. This section can be padded with 0 length records (which is a record with a length field of 0 and no payload).

```kbnf
record_section     = aligned(32, record* zero_length_record*);
record             = byte(bind(length, 0~)) byte(0~){length};
zero_length_record = byte(0);
byte(v)            = unsigned_integer(8, v);
```


### `when` Function

The `when` function allows an expression only when a given [condition](#conditions) holds.

```kbnf
when(cond: condition, expr: expression): expression
```

**Example**:

```kbnf
extension(type) = when(type = 1, extension_a)
                | when(type = 2, extension_b)
                | when(type = 3, extension_c)
                ;
```

### `bind` Function

The `bind` function transparently binds whatever it surrounds to a local variable for subsequent re-use in the current rule. The surrounding context behaves as though only what the `bind` function surrounded were present. This allows a sequence to be produced as normal, and also to be used again later in the rule.

```kbnf
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

### `cp_category` Function

The `cp_category` function produces the alternates set of all Unicode codepoints that have any of the given set of Unicode [categories](https://unicode.org/glossary/#general_category).

```kbnf
cp_category(category: category_name (ARG_SEP category: category_name)*): set of codepoint alternates
```

**Example**:

```kbnf
letter_digit_space = cp_caregory(N,L,Zs);
```

### `unsigned_integer` Function

The `unsigned_integer` function creates an expression that accepts an unsigned integer encoded to the specified number of bits, with the specified value range.

TODO: Value ranges...

```kbnf
unsigned_integer(value: uint, bit_count: uint): expression
```

### `signed_integer` Function

The `signed_integer` function creates an expression that accepts a two's complement signed integer encoded to the specified number of bits, with the specified value range.

```kbnf
signed_integer(value: sint, bit_count: uint): expression
```

### `ieee754_binary` Function

The `signed_integer` function creates an expression that accepts an ieee754 binary floating point value encoded to the specified number of bits, with the specified value range.

```kbnf
ieee754_binary(value: real, bit_count: uint): expression
```

### `little_endian` Function

The `little_endian` function expresses the given expression in little endian byte order (effectively swapping the byte order accepted by the rule).

```kbnf
little_endian(expr: expression): expression
```



Variables
---------

In some contexts, data may be bound to a variable for use elsewhere. Variables are bound either manually using the [`bind`](#bind-function) builtin function, or automatically when passing to a [macro](#macros). The variable's [type](#types) is inferred from what is allowed in the context where it is bound.

When [binding](#bind-function) an [expression](#expressions) that itself binds a variable, that expression's bound variables can be accessed from the outer scope using dot notation (`this_exp_bound_value.sub_exp_bound_value`).

**Example**: A document consists of a type 1 record, followed by any number of type 5, 6, and 7 records, and is terminated with a type 0 record of length 0. A record begins with a header consisting of an 8-bit type and a 16-bit big endian unsigned integer indicating how many bytes of record data follow.

```kbnf
document            = record(1) (record(5) | record(6) | record(7))* terminator_record;
record(type)        = bind(header, record_header(type)) record_data(header.length);
record_header(type) = u8(type) u16(bind(length, 0~));
record_data(length) = u8(0~){length};
terminator_record   = u8(0) u16(0);
u8(v)               = unsigned_integer(8, v);
u16(v)              = unsigned_integer(16, v);
```

* The `record` rule (a [macro](#macros) because it takes parameters) binds the result of the `record_header` rule to a variable called `header`. This gives it access to the `record_header` `length` variable as `header.length`.
* The `record_header` rule specifies an 8-bit type value (a variable passed in to the macro as a parameter), and binds a number (that must be usable as a 16-bit unsigned integer) to a variable called `length`.
* The `record_data` rule is a [macro](#macros) that takes a length parameter and matches that many bytes using [repetition](#repetition).


Types
-----

There are three main types in KBNF:

* [`expression`](#expressions)
* [`condition`](#conditions)
* [`number`](#numbers), of which there are three subtypes:
  * `uint`: limited to positive integers and 0
  * `int`: limited to positive and negative integers, and 0
  * `real`: any value from the set of reals

Types become relevant when calling [functions](#functions), which must specify what types they accept and return. There are also type restrictions for what can be used in [repetition](#repetition) and [calculations](#calculations).


### Expressions

An expression represents the set of possible bit sequences that it can produce. When captured via [`bind`](#bind-function), the captured [variable](#variables) is an expression representing the bits that were produced according to the bound expression.


### Conditions

The `condition` type is the result of comparing numeric types or performing logical operations on conditions, resulting in either true or false. Conditions are used in [`when`](#when-function) calls.


### Numbers

Numbers are used in [calculations](#calculations), numeric ranges, and as parameters to functions.

Certain functions take numeric parameters but restrict the allowed values (e.g. integers only, min/max value, etc). Only parameters containing compatible values can produce a result in such cases.


Literals
--------

### Codepoints

Codepoints can be represented as literals, ranges, and category sets.

### Strings

### Escape Sequence

Escape sequences are allowed in string literals, codepoint literals, and prose. Codepoint escape sequences allow you to represent troublesome codepoints.

### Prose

Prose is meant as a last resort in attempting to describe an expression. If an expression's contents have already been described elsewhere, you could put a URL in here. Otherise you could put in a natural language description.

```kbnf
prose = '"""' (escapable_char(printable_wsl, '"')+ ! '"""') '"""'
      | "'''" (escapable_char(printable_wsl, "'")+ ! "'''") "'''"
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



Combinations
------------

### Concatenation

Concatenation matches all expressions in order.

### Alternative

Alternative matches one of a set of expressions

### Exclusion

Exclusion removes an expression from the set of matching expressions.


Repetition
----------

Grouping
--------

Expressions, calculations and conditions can be grouped.


Comments
--------

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



Calculations
------------

Calculations perform arithmetic operations on [numbers](#numbers), producing a new number.

add, subtract, multiply, divide, modulus, parentheses, asl, asr


Conditions
----------

comparators, logic operators, parentheses, when




///////////////////////////////////////////////////

### Ranges

repetition
codepoint
int

### Precedence

Calculations

* Multiplication, Division, Modulus
* Addition, Subtraction

Conditions

* Comparisons
* Logical And
* Logical Or

Logical not can only be applied to a group

Expressions

* Codepoint range
* Repetition
* Concatenation
* Exclusion
* Alternation

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

grammar                = (MAYBE_WSLC rule)*;
rule                   = (symbol | macro) TOKEN_SEP '=' TOKEN_SEP production TOKEN_SEP ';'
                       | function TOKEN_SEP '=' TOKEN_SEP prose TOKEN_SEP ';'
                       ;
production             = expression;
expression             = symbol
                       | call
                       | string_literal
                       | maybe_ranged(codepoint_literal)
                       | combination
                       | builtin_encodings
                       | builtin_functions
                       | variable
                       | repetition
                       | prose
                       | grouped(expression)
                       ;

symbol                 = identifier_restricted;
macro                  = identifier_restricted '(' TOKEN_SEP param_name (ARG_SEP param_name)* TOKEN_SEP ')';
param_name             = identifier_any;
function               = identifier_restricted '(' TOKEN_SEP function_param (ARG_SEP function_param)* TOKEN_SEP ')' TOKEN_SEP ':' TOKEN_SEP type;
function_param         = param_name TOKEN_SEP ':' TOKEN_SEP type;
type                   = "expression"
                       | "condition"
                       | "uint"
                       | "sint"
                       | "real"
                       | "any"
                       ;
call                   = identifier_any '(' TOKEN_SEP call_param (ARG_SEP call_param)* TOKEN_SEP ')';
call_param             = expression | uint | sint | real | condition;

combination            = alternate | combination_w_exclude;
combination_w_exclude  = exclude | combination_w_concat
combination_w_concat   = concatenate | combination;
alternate              = expression (TOKEN_SEP '|' TOKEN_SEP expression)+;
exclude                = expression TOKEN_SEP '!' TOKEN_SEP expression;
concatenate            = expression (SOME_WSLC expression)+;

prose                  = '"""' (escapable_char(printable_wsl, '"')+ ! '"""') '"""'
                       | "'''" (escapable_char(printable_wsl, "'")+ ! "'''") "'''"
                       ;
codepoint_literal      = ('"' escapable_char(printable_ws, '"'){1} '"') | ("'" escapable_char(printable_ws, "'"){1} "'");
string_literal         = ('"' escapable_char(printable_ws, '"'){2~} '"') | ("'" escapable_char(printable_ws, "'"){2~} "'");
escapable_char(char_set, quote_char) = (char_set ! ('\\' | quote_char)) | escape;
escape                 = '\\' (printable ! '{') | escape_codepoint);
escape_codepoint       = '{' digit_hex+ '}';

repetition             = repeat_range | repeat_zero_or_one | repeat_zero_or_more | repeat_one_or_more;
repeat_range           = expression '{' TOKEN_SEP maybe_ranged(uint) TOKEN_SEP '}';
repeat_zero_or_one     = expression '?';
repeat_zero_or_more    = expression '*';
repeat_one_or_more     = expression '+';

builtin_encodings      = enc_unsigned_integer | enc_signed_integer | enc_ieee754_binary | enc_little_endian;
enc_unsigned_integer   = fname_unsigned_integer "(" TOKEN_SEP bit_count ARG_SEP maybe_ranged(uint) TOKEN_SEP ')';
enc_signed_integer     = fname_signed_integer "(" TOKEN_SEP bit_count ARG_SEP maybe_ranged(sint) TOKEN_SEP ')';
enc_ieee754_binary     = fname_ieee754_binary "(" TOKEN_SEP bit_count ARG_SEP maybe_ranged(real) TOKEN_SEP ')';
enc_little_endian      = fname_little_endian "(" TOKEN_SEP expression TOKEN_SEP ')';

builtin_functions      = function_sized | function_aligned | function_if | function_bind | function_cp_category;
function_sized         = fname_sized "(" TOKEN_SEP bit_count ARG_SEP expression TOKEN_SEP ")";
function_aligned       = fname_aligned "(" TOKEN_SEP bit_count ARG_SEP expression TOKEN_SEP ")";
function_when          = fname_when "(" TOKEN_SEP condition ARG_SEP any TOKEN_SEP ')';
function_bind          = fname_bind "(" TOKEN_SEP local_id ARG_SEP any TOKEN_SEP ')';
function_cp_category   = fname_cp_category "(" TOKEN_SEP cp_category_name (ARG_SEP cp_category_name)* TOKEN_SEP ')';

padding                = expression;
local_id               = identifier_restricted;
any                    = condition | number | expression;
variable               = local_id | variable '.' local_id;
bit_count              = number;
cp_category_name       = ('A'~'Z') ('a'~'z')?;

condition              = comparison | logical_op;
logical_op             = logical_or | logical_op_and_not;
logical_op_and_not     = logical_and | logical_op_not;
logical_op_not         = logical_not | condition | grouped(condition);
comparison             = number TOKEN_SEP comparator TOKEN_SEP number;
comparator             = "<" | "<=" | "=" | ">= | ">";
logical_or             = condition TOKEN_SEP '|' TOKEN_SEP condition;
logical_and            = condition TOKEN_SEP '&' TOKEN_SEP condition;
logical_not            = '!' TOKEN_SEP condition;

number                 = calc_add | calc_sub | calc_mul_div;
calc_mul_div           = calc_mul | calc_div | calc_mod | calc_val;
calc_val               = number_literal | variable | number | grouped(number);
calc_add               = number TOKEN_SEP '+' TOKEN_SEP calc_mul_div;
calc_sub               = number TOKEN_SEP '-' TOKEN_SEP calc_mul_div;
calc_mul               = calc_mul_div TOKEN_SEP '*' TOKEN_SEP calc_val;
calc_div               = calc_mul_div TOKEN_SEP '/' TOKEN_SEP calc_val;
calc_mod               = calc_mul_div TOKEN_SEP '%' TOKEN_SEP calc_val;

grouped(type)          = '(' TOKEN_SEP type TOKEN_SEP ')';
maybe_ranged(type)     = type | (type? TOKEN_SEP '~' TOKEN_SEP type?);

number_literal         = int_literal_bin | int_literal_oct | real_literal_dec | real_literal_hex;
real_literal_dec       = neg? digit_dec+; ('.' digit_dec+ (('e' | 'E') ('+' | '-')? digit_dec+)?)?;
real_literal_hex       = neg? '0' ('x' | 'X') digit_hex+ ('.' digit_hex+ (('p' | 'P') ('+' | '-')? digit_dec+)?)?;
int_literal_bin        = neg? '0' ('b' | 'B') digit_bin+;
int_literal_oct        = neg? '0' ('o' | 'O') digit_oct+;
neg                    = '-';

identifier_any         = identifier_firstchar identifier_nextchar*;
identifier_restricted  = identifier_any ! reserved_identifiers;
identifier_firstchar   = cp_category(L,M);
identifier_nextchar    = identifier_firstchar | cp_category(N) | '_';
reserved_identifiers   = fname_sized
                       | fname_aligned
                       | fname_if
                       | fname_bind
                       | fname_unsigned_integer
                       | fname_signed_integer
                       | fname_ieee754_binary
                       | fname_little_endian
                       ;

fname_sized            = "sized";
fname_aligned          = "aligned";
fname_if               = "if";
fname_bind             = "bind";
fname_unsigned_integer = "unsigned_integer";
fname_signed_integer   = "signed_integer";
fname_ieee754_binary   = "ieee754_binary";
fname_little_endian    = "little_endian";

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
