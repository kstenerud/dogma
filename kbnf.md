Karl's Bachus-Naur Form
=======================

Version 1-prerelease


## WORK IN PROGRESS

Current status: Settling-in phase (Dec 29, 2022).

I'm letting the specification sit for two 2-week periods, after each of which I'll do a full document review to look for issues.

If no major issues are found, I'll release version 1.



Introduction
------------

Syntactic metalanguages have made mainly haphazard gains over the past 60 years, and still only describe text-based formats. KBNF is an attempt at a modernized metalanguage with better expressivity and binary support.



Contents
--------

- [Karl's Bachus-Naur Form](#karls-bachus-naur-form)
  - [WORK IN PROGRESS](#work-in-progress)
  - [Introduction](#introduction)
  - [Contents](#contents)
  - [Design Objectives](#design-objectives)
    - [Human readability](#human-readability)
    - [Support for binary grammars](#support-for-binary-grammars)
    - [Better expressivity](#better-expressivity)
    - [Character set support](#character-set-support)
    - [Codepoints as first-class citizens](#codepoints-as-first-class-citizens)
    - [Future proof](#future-proof)
  - [About the Descriptions and Examples](#about-the-descriptions-and-examples)
  - [Bit Ordering](#bit-ordering)
  - [Grammar Document](#grammar-document)
    - [Document Header](#document-header)
  - [Production Rules](#production-rules)
    - [Symbols](#symbols)
    - [Macros](#macros)
    - [Functions](#functions)
  - [Variables](#variables)
  - [Types](#types)
    - [Identifier](#identifier)
    - [Expressions](#expressions)
    - [Numbers](#numbers)
  - [Literals](#literals)
    - [Codepoints](#codepoints)
    - [Strings](#strings)
    - [Escape Sequence](#escape-sequence)
      - [Codepoint Escape](#codepoint-escape)
    - [Prose](#prose)
  - [Combinations](#combinations)
    - [Concatenation](#concatenation)
    - [Alternative](#alternative)
    - [Exclusion](#exclusion)
    - [Repetition](#repetition)
  - [Grouping](#grouping)
  - [Calculations](#calculations)
  - [Conditions](#conditions)
  - [Ranges](#ranges)
  - [Comments](#comments)
  - [Builtin Functions](#builtin-functions)
    - [`sized` Function](#sized-function)
    - [`aligned` Function](#aligned-function)
    - [`swapped` Function](#swapped-function)
    - [`when` Function](#when-function)
    - [`bind` Function](#bind-function)
    - [`unicode` Function](#unicode-function)
    - [`uint` Function](#uint-function)
    - [`sint` Function](#sint-function)
    - [`float` Function](#float-function)
  - [Examples](#examples)
    - [A Complex Example](#a-complex-example)
    - [Example: Internet Protocol version 4](#example-internet-protocol-version-4)
  - [The KBNF Grammar in KBNF](#the-kbnf-grammar-in-kbnf)



Design Objectives
-----------------

### Human readability

The main purpose of KBNF is to describe text and binary grammars in a concise, unambiguous, human readable way. The use case is describing data formats in documentation.

### Support for binary grammars

Binary grammars have different needs from textual grammars, and require special support:

* **Bit arrays**: Binary formats tend to work at bit-level granularity, and thus require support for arbitrarily sized bit arrays.
* **Variables & Functions**: Binary formats often represent data in complex ways that can't be parsed without passing some context around.
* **Conditionals & Logic**: Binary formats often include or exclude portions based on encoded values elsewhere. Evaluating these requires the use of conditionals and logic operators.
* **Calculations**: Many binary field sizes are determined by data stored elsewhere in the document, and often they require calculations of some sort to determine the final field size.
* **Transformations**: Binary data often undergoes transformations that are too complex for normal BNF-style rules to express (for example [LEB128](https://en.wikipedia.org/wiki/LEB128)).

### Better expressivity

Not everything can be accurately described by a real-world grammar, but we can get pretty close. The following features bring KBNF to the point where it can describe most of what's out there unambiguously:

* **Repetition**: Any expression can have repetition applied to it, for a specific number of occurrences or a range of occurrences.
* **Bindings**: Some constructs (such as here documents or length delimited fields) require access to previously decoded values. KBNF supports assigning decoded values to variables.
* **Exclusion**: Sometimes it's easier to express something as "everything except for ...".
* **Prose**: In many cases, the actual encoding of something is already well-known and specified elsewhere, or is too complex for KBNF to describe adequately. Prose offers a free-form way to describe part of a grammar.
* **Grouping**: Grouping expressions together is an obvious convenince that most other BNF offshoots have already adopted.
* **Whitespace not significant**: Many BNF notations (including the original BNF) assign meaning to whitespace (for example: whitespace as concatenation, or linefeeds to mark the end of a rule). This is bad from a UX perspective because it makes things harder for a human to parse in many circumstances, and reduces the ways in which a rule can be expressed over multiple lines.

### Character set support

Metalanguages tend to support only ASCII, with Unicode (encoded as UTF-8) generally added as an afterthought. This restricts the usefulness of the metalanguage, as any other character sets (many of which are still in use) have no support at all.

KBNF can be used with any character set, and requires the character set to be specified as part of the document header.

### Codepoints as first-class citizens

* Codepoints beyond the ASCII range can be directly input into a grammar document.
* Difficult codepoints are supported via [escape sequences](#escape-sequence).
* [Unicode categories](https://unicode.org/glossary/#general_category) are supported.

### Future proof

No specification is perfect, nor can it stand the test of time. Eventually an incompatible change will become necessary in order to stay relevant.

KBNF documents are versioned to a particular KBNF specification so that changes can be made to the specification without breaking existing tooling.



About the Descriptions and Examples
-----------------------------------

Descriptions and examples will usually include some KBNF notation. When in doubt, please see the [full KBNF grammar at the end of this document](#the-kbnf-grammar-in-kbnf).



Bit Ordering
------------

All sequences of bits (i.e. all [expressions](#expressions)) are assumed to be in big endian bit order (higher bits come first), and if necessary can be swapped at any granularity using the [`swapped` function](#swapped-function).

**For example**:

* `uint(16,0xc01f)` matches big endian 0xc01f (bit sequence 1,1,0,0,0,0,0,0,0,0,0,1,1,1,1,1).
* `swapped(8, uint(16,0xc01f))` matches little endian 0xc01f (bit sequence 0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0).
* `swapped(1, uint(16,0xc01f))` matches bit-swapped 0xc01f (bit sequence 1,1,1,1,1,0,0,0,0,0,0,0,0,0,1,1).



Grammar Document
----------------

A KBNF grammar document begins with a [header section](#document-header), followed by a series of [production rules](#production-rules).

```kbnf
document = document_header (MAYBE_WSLC rule)+;
```


### Document Header

The document header identifies the file format as KBNF, and contains the following mandatory information:

* The version of the KBNF specification that the document adheres to.
* The character encoding used for all codepoint related expressions (use the case-insensitive [IANA preferred MIME name](https://www.iana.org/assignments/character-sets/character-sets.xhtml) whenever possible).

Optionally, it may also include header lines. An empty line terminates the document header section.

```kbnf
document_header    = "kbnf_v" & kbnf_version & SOME_WS
                   & character_encoding & LINE_END
                   & header_line* & LINE_END
                   ;
character_encoding = ('a'~'z' | 'A'~'Z' | '0'~'9' | '_' | '-' | '.' | ':' | '+' | '(' | ')'){1~40};
header_line        = '-' & SOME_WS
                   & header_name & MAYBE_WS
                   & '=' & MAYBE_WS
                   & header_value & LINE_END
                   ;
header_name        = printable+;
header_value       = printable_ws+;
```

The following headers are officially recognized (all others are allowed, but are not standardized):

* `identifier`: A unique identifier for the grammar being described. It's customary to append a version number to the identifier.
* `description`: A brief, one-line description of the grammar.
* `kbnf_specification`: A pointer to the KBNF specification as a courtesy to anyone reading the document.

**Example**: A UTF-8 KBNF grammar called "mygrammar_v1".

```kbnf
kbnf_v1 utf-8
- identifier  = mygrammar_v1
- description = My first grammar, version 1
- kbnf_specification = https://github.com/kstenerud/kbnf/blob/v1/kbnf.md

document = "a"; # Yeah, this grammar doesn't do much...
```



Production Rules
----------------

Production rules are written in the form `nonterminal = expression;`, with optional whitespace (including newlines) between rule elements. The terminating semicolon makes it more clear where a rule ends, and also allows more freedom for visually laying out the elements of a rule.

```kbnf
rule = (symbol | macro) & TOKEN_SEP & '=' & TOKEN_SEP & expression & TOKEN_SEP & ';'
     | function & TOKEN_SEP & '=' & TOKEN_SEP & prose & TOKEN_SEP & ';'
     ;
```

The left part of a rule can define a [symbol](#symbols), a [macro](#macros), or a [function](#functions). Their names share the global namespace, and must be unique (they are case sensitive).

The first rule listed in the document is assumed to be the start rule, and therefore must define a [symbol](#symbols).

**Note**: Whitespace in a KBNF rule is only used to separate tokens and for visual layout purposes. It does not imply any semantic meaning.


### Symbols

A symbol acts as a placeholder for something to be substituted in another rule. Symbol names are not limited to ASCII.

```kbnf
symbol = identifier_restricted;
```

**Example**: A record consists of a company name (which must not contain two full-width colons in a row), followed by two full-width colons, followed by an employee count in full-width characters (possibly approximated to the nearest 10,000), and is terminated by a linefeed.

```kbnf
記録		= 会社名 & "：：" & 従業員数 & LF;
会社名		= unicode(L,M) & unicode(L,M,N,P,S,Zs)* ! "：：";
従業員数		= '１'~'９' & '０'~'９'* & '万'?;
LF		= '\{a}';
```

Or if you prefer, the same thing with English symbol names:

```kbnf
record         = company_name & "：：" & employee_count & LF;
company_name   = unicode(L,M) & unicode(L,M,N,P,S,Zs)* ! "：：";
employee_count = '１'~'９' & '０'~'９'* & '万'?;
LF             = '\{a}';
```

### Macros

A macro is essentially a symbol that accepts parameters, which are bound to local [variables](#variables) for use within the macro. The macro's contents are written like regular rules, but also have access to the injected local variables.

```kbnf
macro = identifier_restricted & PARENTHESIZED(param_name & (ARG_SEP & param_name)*);
```

When called, a macro substitutes the passed-in parameters and proceeds like a normal rule would (the grammar is malformed if a macro is called with incompatible types).

```kbnf
call       = identifier_any & PARENTHESIZED(call_param & (ARG_SEP & call_param)*);
call_param = any_type;
```

**Example**: The main section consists of three records: A type 1 record and two type 2 records. A record begins with a type byte, followed by a length byte, followed by that many bytes of data.

```kbnf
main_section = record(1) & record(2){2};
record(type) = byte(type) byte(bind(length, ~)) & byte(~){length};
byte(v)      = uint(8,v);
```

In this example, `record` must only be called with an unsigned integer, because the `type` field is passed to the `byte` macro, which calls the [`uint` function](#uint-function), which expects an unsigned parameter.

**Example**: An [IPV4](ipv4.kbnf) packet contains "header length" and "total length" fields, which together determine how big the "options" and "payload" sections are. "protocol" determines the protocol of the payload.

```kbnf
ip_packet                    = ...
                             & u4(bind(header_length, 5~)) # length is in 32-bit words
                               ...
                             & u16(bind(total_length, 20~)) # length is in bytes
                               ...
                             & u8(bind(protocol, registered_protocol))
                               ...
                             & options((header_length-5) * 32)
                             & payload(protocol, (total_length-(header_length*4)) * 8)
                             ;

options(bit_count)           = sized(bit_count, option*);
option                       = option_eool
                             | option_nop
                             | ...
                             ;

payload(protocol, bit_count) = sized(bit_count, payload_contents(protocol) & u1(0)*);
payload_contents(protocol)   = when(protocol = 0, protocol_hopopt)
                             | when(protocol = 1, protocol_icmp)
                             | ...
                             ;
```

### Functions

Functions behave similarly to macros, except that they are opaque: whereas a macro is defined within the bounds of the grammatical notation, a function's procedure is either one of the [built-in functions](#builtin-functions), or is user-defined in [prose](#prose) (either as a description, or as a URL pointing to a description).

Functions must specify the [types](#types) of all parameters and its return value (since the function is opaque, its types cannot be inferred like for macros, and therefore must be specified). If a function is called with the wrong types, the grammar is malformed.

Functions that take no parameters are defined and called without the trailing parentheses (as if defining or calling a [symbol](#symbols)).

```kbnf
function        = function_noargs | function_args;
function_noargs = identifier_restricted & type_specifier;
function_args   = identifier_restricted
                & PARENTHESIZED(function_param & (ARG_SEP & function_param)*)
                & type_specifier
                ;
function_param  = param_name & type_specifier;
type_specifier  = TOKEN_SEP & ':' & TOKEN_SEP & type;
type            = "expression"
                | "condition"
                | "unsigned"
                | "signed"
                | "real"
                | "any"
                ;
```

**Example**: A function to convert an unsigned int to its unsigned little endian base 128 representation.

```kbnf
uleb128(v: unsigned): expression = """https://en.wikipedia.org/wiki/LEB128#Unsigned_LEB128""";
```

**Example**: A record contains a date followed by a colon, followed by a temperature reading.

```kbnf
record              = iso8601 & ':' & temperature;
iso8601: expression = """https://en.wikipedia.org/wiki/ISO_8601""";
temperature         = digit+ & ('.' & digit+)?;
digit               = '0'~'9';
```



Variables
---------

In some contexts, resolved data (data that has already been matched) or literal values can be bound to a variable for use elsewhere. Variables are bound either manually using the [`bind`](#bind-function) builtin function, or automatically when passing parameters to a [macro](#macros). The variable's [type](#types) is inferred from its provenance and where it is ultimately used (a type mismatch indicates a malformed grammar).

**Note**: Variables cannot be re-bound.

When [binding](#bind-function) an [expression](#expressions) that itself binds a variable, that expression's bound variables can be accessed from the outer scope using dot notation (`this_exp_bound_value.sub_exp_bound_value`).

**Example**: A document consists of a type 1 record, followed by any number of type 5, 6, and 7 records, and is terminated with a type 0 record of length 0. A record begins with a header consisting of an 8-bit type and a 16-bit big endian unsigned integer indicating how many bytes of record data follow.

```kbnf
document            = record(1) & (record(5) | record(6) | record(7))* & terminator_record;
record(type)        = bind(header, record_header(type)) & record_data(header.length);
record_header(type) = u8(type) & u16(bind(length, ~));
record_data(length) = u8(~){length};
terminator_record   = u8(0) u16(0);
u8(v)               = uint(8, v);
u16(v)              = uint(16, v);
```

* The `record` rule (a [macro](#macros) because it takes parameters) binds the result of the `record_header` rule to a variable called `header`. This gives it access to the `record_header` `length` variable as `header.length`.
* The `record_header` rule specifies an 8-bit type value (a variable passed in to the macro as a parameter), and binds a 16-bit integer value to a variable called `length`.
* The `record_data` rule takes a length parameter and matches that many bytes using [repetition](#repetition).


Types
-----

These are the main types in KBNF:

* [`identifier`](#identifier)
* [`expression`](#expressions)
* [`condition`](#conditions)
* [`number`](#numbers), of which there are three subtypes:
  * `unsigned`: limited to positive integers and 0
  * `signed`: limited to positive and negative integers, and 0
  * `real`: any value from the set of reals

Types become relevant when calling [functions](#functions), which must specify what types they accept and return. Also, [repetition](#repetition) amounts are restricted to unsigned integers.

**Note**: Number "subtypes" (signed, unsigned, real) aren't actual types per se, but rather restrictions on what values are allowed in a particular context. [calculations](#calculations), for example, are done as if all operands were reals (subtracting two unsigned numbers can give a signed result, dividing integers can result in a real, etc).


### Identifier

A unique identifier for [symbols](#symbols), [macros](#macros), and [functions](#functions) (which are all scoped globally), or [variables](#variables) (which are scoped locally).

Identifiers are case sensitive.

Identifiers start with a letter, and can contain letters, numbers and the underscore character. The [builtin function names](#builtin-functions) are reserved.

The general convention is to use all uppercase identifiers for "background-y" things like whitespace and separators to make them easier to gloss over (see [the KBNF grammar document](#the-kbnf-grammar-in-kbnf) as an example).

```kbnf
identifier           = (identifier_firstchar & identifier_nextchar*) ! reserved_identifiers;
identifier_firstchar = unicode(L,M);
identifier_nextchar  = identifier_firstchar | unicode(N) | '_';
reserved_identifiers = "sized"
                     | "aligned"
                     | "swapped"
                     | "when"
                     | "bind"
                     | "uint"
                     | "sint"
                     | "float"
                     ;
```


### Expressions

An expression represents the set of possible bit sequences that can be produced. Expressions are non-greedy (the shortest possible interpretation of an expression will be matched first).

```kbnf
expression = symbol
           | call
           | string_literal
           | maybe_ranged(codepoint_literal)
           | combination
           | builtin_functions
           | variable
           | grouped(expression)
           ;
```

### Numbers

Numbers are used in [calculations](#calculations), numeric ranges, and as parameters to functions.

Certain functions take number parameters but restrict the allowed values (e.g. integers only, min/max value, etc).

Numbers can be expressed as number literals (in binary, octal, decimal, hexadecimal notation for integers, and in decimal or hexadecimal notation for reals), or derived from [functions](#functions), [macros](#macros), and [calculations](#calculations).

```kbnf
number_literal   = int_literal_bin | int_literal_oct | real_literal_dec | real_literal_hex;
real_literal_dec = neg? digit_dec+
                 & ('.' & digit_dec+ & (('e' | 'E') ('+' | '-')? & digit_dec+)?)?
                 ;
real_literal_hex = neg? & '0' & ('x' | 'X') & digit_hex+
                 & ('.' & digit_hex+ & (('p' | 'P') & ('+' | '-')? & digit_dec+)?)?
                 ;
int_literal_bin  = neg? & '0' & ('b' | 'B') & digit_bin+;
int_literal_oct  = neg? & '0' & ('o' | 'O') & digit_oct+;
neg              = '-';
```



Literals
--------

### Codepoints

Codepoints can be represented as literals, [ranges](#ranges), and [category sets](#unicode-function). Codepoint literals are placed between single or double quotes.

Codepoint literals can also be expressed as [ranges](#ranges), which causes every codepoint in the range to be added as an [alternative](#alternative).

```kbnf
codepoint_literal = '"' & maybe_escaped(printable_ws ! '"'){1} & '"'
                  | "'" & maybe_escaped(printable_ws ! "'"){1} & "'"
                  ;
```

**Examples**:

```kbnf
letter_a     = 'a';     # or "a"
a_to_z       = 'a'~'z'; # or "a"~"z"
alphanumeric = unicode(L,N);
```

### Strings

A string is syntactic sugar for a series of specific codepoints [concatenated](#concatenation) together. String literals are placed between single or double quotes.

```kbnf
string_literal = '"' & maybe_escaped(printable_ws ! '"'){2~} & '"'
               | "'" & maybe_escaped(printable_ws ! "'"){2~} & "'"
               ;
```

**Example**:

```kbnf
str_abc = "abc"; # or 'abc', or "a" & "b" & "c", or 'a' & 'b' & 'c'
```


### Escape Sequence

[Codepoint literals](#codepoints), [string literals](#strings), and [prose](#prose) may contain codepoint escape sequences to represent troublesome codepoints.

Escape sequences are initiated with the backslash (`\`) character. If the next character following is an open curly brace (`{`), it begins a [codepoint escape](#codepoint-escape). Otherwise the sequence represents that literal character.

```kbnf
escape_sequence = '\\' & (printable ! '{') | codepoint_escape);
```

**Example**: A string containing double quotes.

```kbnf
mystr = "This is a \"string\""; # or you could use single quotes: 'This is a "string"'
```

#### Codepoint Escape

A codepoint escape interprets the hex digits between the sequence `\{` and `}` as the hexadecimal numeric value of the codepoint being referred to.

```kbnf
codepoint_escape = '{' & digit_hex+ & '}';
```

**Example**: Emoji

```kbnf
mystr = "This is a \{1f415}"; # "This is a 🐕"
```

### Prose

Prose is meant as a last resort in attempting to describe something. If it has already been described elsewhere, you could put a URL in here. Otherise you could put in a natural language description.

```kbnf
prose = '"""' & (maybe_escaped(printable_wsl)+ ! '"""') & '"""'
      | "'''" & (maybe_escaped(printable_wsl)+ ! "'''") & "'''"
      ;
```

**Note**: Prose can only be used to define a [function](#functions) because it is by nature opaque; the function definition will assign types.

**Example**: A record contains a date and temperature separated by `:`, followed by a newline, followed by a flowery description of any length in iambic pentameter (newlines allowed), terminated by `=====` on its own line.

```kbnf
record              = date & ':' & temperature & LF & flowery_description & LF & '=====' & LF;
date                = """https://en.wikipedia.org/wiki/ISO_8601""";
temperature         = digit+ & ('.' & digit+)?;
digit               = '0'~'9';
flowery_description: expression = """
A poetic description of the weather, written in iambic pentameter. For example:

While barred clouds bloom the soft-dying day,
And touch the stubble-plains with rosy hue;
Then in a wailful choir the small gnats mourn
Among the river sallows, borne aloft
Or sinking as the light wind lives or dies.
""";
```



Combinations
------------

There are many ways to combine expressions into more powerful expressions.

Combination precedence (low to high):

* [Alternative](#alternative)
* [Exclusion](#exclusion)
* [Concatenation](#concatenation)
* [Repetition](#repetition)


### Concatenation

The concatenation operation evaluates the left expression, and then the right. The operator symbol is `&` (think of it as meaning "x and then y").

```kbnf
concatenate = expression & TOKEN_SEP & '&' & TOKEN_SEP & expression;
```

**Example**: Assignment consists of an identifier, at least one space, an equals sign, at least one space, and then an integer value, followed by a linefeed.

```kbnf
assignment = "a"~"z"+ 
           & " "+
           & "="
           & " "+
           & "0"~"9"+
           & "\{a}"
           ;
```


### Alternative

Alternatives are separated by a pipe (`|`) character. Only one of the alternatives is taken in a production.

```kbnf
alternate = expression & TOKEN_SEP & '|' & TOKEN_SEP & expression;
```

**Example**: Addition or subtraction consists of an identifier, at least one space, a plus or minus sign, at least one space, and then another identifier, followed by a linefeed.

```kbnf
caculation = "a"~"z"+
           & " "+
           & ("+" | "-")
           & " "+
           & "a"~"z"+
           & "\{a}"
           ;
```


### Exclusion

Exclusion removes an expression from the set of matchable expression alternatives.

```kbnf
exclude = expression & TOKEN_SEP & '!' & TOKEN_SEP & expression;
```

**Example**: An identifier can be any lowercase ASCII string except "fred".

```kbnf
identifier = "a"~"z"+ ! "fred";
```


### Repetition

"Repetition" is a bit of a misnomer, because it actually defines how many times an expression occurs, not how many times it repeats. Repetition amounts can be defined as a [range](#ranges) or as a discrete amount. Think of repetition as "this [expression](#expressions), [concatenated](#concatenation) together for this range of occurrences".

The repetition amount is an unsigned integer, appended to an expression as a discrete amount or [range](#ranges) between curly braces (e.g. `{10}` or `{1~5}`). There are also shorthand notations for common cases:

* `?`: Zero or one (equivalent to `{0~1}`)
* `*`: Zero or more (equivalent to `{0~}`)
* `+`: One or more (equivalent to `{1~}`)

```kbnf
repetition          = repeat_range | repeat_zero_or_one | repeat_zero_or_more | repeat_one_or_more;
repeat_range        = expression & '{' & TOKEN_SEP & maybe_ranged(number) & TOKEN_SEP & '}';
repeat_zero_or_one  = expression & '?';
repeat_zero_or_more = expression & '*';
repeat_one_or_more  = expression & '+';
```

**Example**: An identifier is between 5 and 8 characters long, made of characters from 'a' to 'z'.

```kbnf
identifier = 'a'~'z'{5~8};
```

**Example**: An identifier must start with at least one uppercase ASCII letter, optionally followed by any number of lowercase ASCII letters, and optionally suffixed with an underscore.

```kbnf
identifier = 'A'~'Z'+ & 'a'~'z'* & '_'?;
```



Grouping
--------

[Expressions](#expressions), [calculations](#calculations) and [conditions](#conditions) can be grouped in order to override the default precedence, or as a visual aid to make things more readable. To group, place the items between parentheses.

```kbnf
grouped(item) = PARENTHESIZED(item);
```

**Exmples**:

```kbnf
my_rule         = ('a' | 'b') & ('x' | 'y');
my_macro1(a)    = uint(8, (a + 5) * 2);
my_macro2(a, b) = when( (a < 10 | a > 20) & (b < 10 | b > 20), "abc" )
                | "def"
                ;
```



Calculations
------------

Calculations perform arithmetic operations on [numbers](#numbers), producing a new number. All operands are treated as [reals](#types) for the purpose of the calculation.

The following operations can be used:

* Add (`+`)
* Subtract (`-`)
* Multiply (`*`)
* Divide (`/`)
* Modulus (`%`)

Operator precedence (low to high):

* add, subtract
* multiply, divide, modulus

```kbnf
number       = calc_add | calc_sub | calc_mul_div;
calc_mul_div = calc_mul | calc_div | calc_mod | calc_val;
calc_val     = number_literal | variable | maybe_grouped(number);
calc_add     = number & TOKEN_SEP & '+' & TOKEN_SEP & calc_mul_div;
calc_sub     = number & TOKEN_SEP & '-' & TOKEN_SEP & calc_mul_div;
calc_mul     = calc_mul_div & TOKEN_SEP & '*' & TOKEN_SEP & calc_val;
calc_div     = calc_mul_div & TOKEN_SEP & '/' & TOKEN_SEP & calc_val;
calc_mod     = calc_mul_div & TOKEN_SEP & '%' & TOKEN_SEP & calc_val;
```

**Example**: A record begins with a 4-bit length field (length is in 32-bit increments) and 4-bit flags field containing (...), followed by the contents of the record.

```kbnf
record = uint(4, bind(length, ~)) & flags & uint(8, ~){length*4};
flags  = ...
```



Conditions
----------

Conditions are set by comparing realized [numbers](#numbers), and by performing logical operations on those comparisons, resulting in either true or false. Conditions are used in [`when`](#when-function) calls. Conditions can also be [grouped](#grouping).

Comparisons:

* Less than (`<`)
* Less than or equal to (`<=`)
* Equal to (`=`)
* Greater than or equal to (`>=`)
* Greater than (`>`)

Logical operations:

* And (`&`)
* Or (`|`)
* Not (`!`), which is a unary operator

Condition precedence (low to high):

* comparisons
* logical or
* logical and
* logical not

```kbnf
condition          = comparison | logical_op;
logical_op         = logical_or | logical_op_and_not;
logical_op_and_not = logical_and | logical_op_not;
logical_op_not     = logical_not | maybe_grouped(condition);
comparison         = number & TOKEN_SEP & comparator & TOKEN_SEP & number;
comparator         = "<" | "<=" | "=" | ">= | ">";
logical_or         = condition & TOKEN_SEP & '|' & TOKEN_SEP & condition;
logical_and        = condition & TOKEN_SEP & '&' & TOKEN_SEP & condition;
logical_not        = '!' & TOKEN_SEP & condition;
```

**Example**:

```kbnf
record       = uint(8, bind(type, 1~))
             & ( when(type = 1, type_1)
               | when(type = 2, type_2)
               | when(type > 2, type_default)
               )
             ;
type_1       = ...
type_2       = ...
type_default = ...
```



Ranges
------

A range consists of one of the following:

* A low value and a high value separated by a tilde (low ~ high), indicating a low and high bound.
* A low value and a tilde (low ~), indicating a low bound only.
* A tilde and a high value (~ high), indicating a high bound only.
* A tilde (~), indicating no bound.
* A value, restricting the "range" to only that value.

A [codepoint](#codepoints) range represents the set of each codepoint in the range as [alternatves](#alternative).

A [repetition](#repetition) range represents a range in the number of occurrences that will match the rule.

A [number](#numbers) range will ultimately be passed to a numeric encoding function ([uint](#uint-function), [sint](#sint-function), [float](#float-function)), and will thus represent each value in the range (as far as it is representable by the [type](#types)) as [alternatves](#alternative).


```kbnf
expression         = ...
                   | maybe_ranged(codepoint_literal)
                   | ...
                   ;
repeat_range       = expression & '{' & TOKEN_SEP & maybe_ranged(number) & TOKEN_SEP & '}';
function_uint      = fname_uint & PARENTHESIZED(bit_count & ARG_SEP & maybe_ranged(number));
function_sint      = fname_sint & PARENTHESIZED(bit_count & ARG_SEP & maybe_ranged(number));
function_float     = fname_float & PARENTHESIZED(bit_count & ARG_SEP & maybe_ranged(number));
ranged(item)       = (item & TOKEN_SEP)? & '~' & (TOKEN_SEP & item)?;
maybe_ranged(item) = item | ranged(item);
```

**Example**: Codepoint range.

```kbnf
hex_digit = ('0'~'9' | 'a'~'f');
```

**Example**: Repetition range: A name field contains between 1 and 100 characters.

```kbnf
name_field = unicode(L,M,N,P,S){1~100};
```

**Example**: Number range: The RPM value is an unsigned 16 bit big endian integer from 0 to 1000.

```kbnf
rpm = uint(16, ~1000); # It's a uint, so already limited to 0~
```



Comments
--------

A comment begins with a hash char (`#`) and continues to the end of the current line. Comments can be placed after pretty much any token.

```kbnf
comment = '#' & (printable_ws ! LINE_END)* & LINE_END;
```

**Example**:

```kbnf
kbnf_v1 utf-8
- identifier = mygrammar_v1
- description = My first grammar

# This is the first place where a comment can exist.
myrule # comment
 = # comment
 myexpression # comment
 ; # comment
# comment
```



Builtin Functions
-----------------

KBNF comes with some fundamental functions built-in:

### `sized` Function

The `sized` function requires `expr` to produce exactly `bit_count` bits. Expressions containing [repetition](#repetition) that would have matched on their own are no longer sufficient until the production fills exactly `bit_count` bits.

```kbnf
sized(bit_count: unsigned, expr: expression): expression
```

**Example**: A name field must contain exactly 200 bytes worth of character data, padded with spaces as needed.

```kbnf
name_field = sized(200*8, unicode(L,M,N,P,Zs)* & ' '*);
```

Technically, the `& ' '*` part is superfluous since Unicode category `Zs` already includes space, but it helps readability to highlight how to pad the field. One could even be more explicit:

```kbnf
name_field = sized(200*8,
                      unicode(L,M,N,P,Zs)*
                      # padded with spaces
                      & ' '*
                  );
```

**Example**: The "records" section can contain any number of length-delimited records, but must be exactly 1024 bytes long. This section can be padded with 0 length records (which is a record with a length field of 0 and no payload - essentially a zero byte).

```kbnf
record_section     = sized(1024*8, record* & zero_length_record*);
record             = byte(bind(length,~)) & byte(~){length};
zero_length_record = byte(0);
byte(v)            = uint(8,v);
```

### `aligned` Function

The `aligned` function requires a production that is a multiple of `bit_count`. If `expr` doesn't produce this, the `padding` expression is used in the same manner as the [`sized` function](#sized-function) to ensure a production of the appropriate size.

```kbnf
aligned(bit_count: unsigned, expr: expression, padding: expression): expression
```

**Example**: The "records" section can contain any number of length-delimited records, but must end on a 32-bit boundary. This section can be padded with 0 length records (which is a record with a length field of 0 and no payload - essentially a zero byte).

```kbnf
record_section     = aligned(32, record*, zero_length_record*);
record             = byte(bind(length,~)) & byte(~){length};
zero_length_record = byte(0);
byte(v)            = uint(8, v);
```


### `swapped` Function

The `swapped` function swaps the order of `expr`'s bits with a granularity of `bit_granularity`. This is useful for matching little endian values, for example.

`expr` must resolve to a multiple of `bit_granularity` bits, otherwise the grammar is malformed.

```kbnf
swapped(bit_granularity: unsigned, expr: expression): expression
```

**Example**: A document begins with a 32-bit little endian unsigned int version field, followed by the contents. Only version 5 documents are supported.

```kbnf
document  = version_5 & contents;
version_5 = swapped(8, uint(32, 5));
contents  = ...
```

**Example**: A header begins with a 16-bit unsigned int identifier that is actually bit-swapped, followed by contents based on the identifier.

```kbnf
header               = bitswapped_uint16(bind(identifier, ~)) & contents(identifier);
bitswapped_uint16(v) = swapped(1, uint(16, v));
contents(identifier) = when(identifier = 1, type_1)
                     | when(identifier = 2, type_2)
                     ;
type_1               = ...
type_2               = ...
```


### `when` Function

The `when` function allows `expr` only when the given [condition](#conditions) is true.

```kbnf
when(cond: condition, expr: expression): expression
```

**Example**: The extensions section contains 32 extension slots. Each extension starts with a 1-byte type field, followed by a 24-bit big endian field containing the length of the payload. Valid payload types are 1, 2, or 3 (payload type 0 is a dummy type meaning "no extension", so the length field is ignored and there is no payload data). The same extension type can be used multiple times.

```kbnf
extensions          = extension{32};
extension           = uint(8,bind(type,0~3)) & uint(24,bind(length,~))
                    & ( when(type = 1, extension_1(length))
                      | when(type = 2, extension_2(length))
                      | when(type = 3, extension_3(length))
                      # When type is 0, no extension and length is ignored
                      )
                    ;
extension_1(length) = ...
extension_2(length) = ...
extension_3(length) = ...
```

### `bind` Function

The `bind` function binds the resolved value (the actual value once this part of the expression has been matched) of whatever it surrounds to a local variable for subsequent re-use in the current rule. `bind` transparently passes through whatever it captures, meaning that the context around the `bind` call behaves as though only what the `bind` function surrounded is present. This allows a sequence to be produced as normal, while also allowing the resolved value to be used again later in the rule.

`bind` can capture [expression](#expressions) and [number](#numbers) types.

```kbnf
bind(variable_name: identifier, value: expression | number): expression | number
```

**Example**: Match "abc/abc", "fred/fred" etc.

```kbnf
sequence = bind(repeating_value,('a'~'z')+) & '/' & repeating_value;
```

**Example**: BASH "here" document: Bind the variable "terminator" to whatever follows the "<<" until the next linefeed. The here-document contents continue until the terminator value is encountered again.

```kbnf
here_document             = "<<" & bind(terminator, NOT_LF+) & LF & here_contents(terminator) & terminator;
here_contents(terminator) = ANY_CHAR* ! terminator;
ANY_CHAR                  = ~;
LF                        = '\{a}';
NOT_LF                    = ANY_CHAR ! LF;
```

**Example**: Interpret the next 16 bits as a big endian unsigned int and bind the resolved number to "length". That many following bytes make up the record contents.

```kbnf
length_delimited_record = uint16(bind(length, ~)) & record_contents(length);
record_contents(length) = byte(~){length};
uint16(v)               = uint(16, v);
byte(v)                 = uint(8, v);
```

### `unicode` Function

The `unicode` function creates an expression containing the [alternatives](#alternative) set of all Unicode codepoints that have any of the given [Unicode categories](https://unicode.org/glossary/#general_category).

```kbnf
unicode(c: category (ARG_SEP c: category)*): expression
category = """https://unicode.org/glossary/#general_category""";
```

**Example**: Allow letter, numeral, and space characters.

```kbnf
letter_digit_space = unicode(N,L,Zs);
```

### `uint` Function

The `uint` function creates an expression that matches the given [range](#ranges) of big endian unsigned integers with the given number of bits.

A `bit_count` of 0 causes the function to create an expression for the minimum number of bits required to represent the value. This is useful for passing to encoding functions for arbitrarily large numbers such as [ULEB](https://en.wikipedia.org/wiki/LEB128).

```kbnf
uint(bit_count: unsigned, value: unsigned): expression
```

**Example**: The length field is a 16-bit unsigned integer value.

```kbnf
length = uint(16, ~);
```


### `sint` Function

The `sint` function creates an expression that matches the given [range](#ranges) of big endian two's complement signed integers with the given number of bits.

A `bit_count` of 0 causes the function to create an expression for the minimum number of bits required to represent the value. This is useful for passing to encoding functions for arbitrarily large numbers such as [ULEB](https://en.wikipedia.org/wiki/LEB128).

```kbnf
sint(bit_count: unsigned, value: signed): expression
```

**Example**: The points field is a 16-bit signed integer value from -10000 to 10000.

```kbnf
points = sint(32, -10000~10000);
```


### `float` Function

The `float` function creates an expression that matches the given [range](#ranges) of big endian [ieee754 binary floating point](https://en.wikipedia.org/wiki/IEEE_754) values with the given number of bits (which must be a valid number of bits for [ieee754 binary](https://en.wikipedia.org/wiki/IEEE_754)).

```kbnf
float(bit_count: unsigned, value: real): expression
```

**Example**: The temperature field is a 32-bit float value from -1000 to 1000.

```kbnf
rpm = float(32, -1000~1000);
```



Examples
--------

### A Complex Example

* A `document` contains one or more `sections`, and terminates on EOF.
* A `section` begins with a `sentinel` (a record with type between 0x80 and 0xfe, and a length of 0), followed by an arbitrary number of `records`, followed by the same `sentinel` value again to terminate the list of `records` in this `section`.
* A `record` is comprised of an 8-bit `record_type`, a `payload`, and a possible `suffix` depending on the `record_type`.
* The `payload` is comprised of a little endian 24-bit `length` field representing the number of bytes in the payload, followed by the payload bytes, followed by possible 0xff padding to bring it to a multiple of 32 bits.
* Depending on the `record_type`, there may be a `suffix`.

```kbnf
document                = section+;
section                 = bind(sentinel,uint(8,0x80~0xfe)) & length_field(0) & record* & sentinel;
record                  = bind(record_type,type_field) & padded_payload & suffix(record_type.type);
type_field              = uint(8,bind(type,0~2));
padded_payload          = aligned(32, payload, uint(8,0xff)*);
payload                 = length_field(bind(byte_count,~)) & uint(8,~){byte_count};
length_field(contents)  = swapped(8, uint(24,contents));
suffix(type)            = when(type = 2, type2)
                        | when(type = 1, type1)
                        # type 0 means no suffix
                        ;
type1                   = ...
type2                   = ...
```


### Example: Internet Protocol version 4

See accompanying document: [ipv4.kbnf](ipv4.kbnf)



The KBNF Grammar in KBNF
------------------------

```kbnf
kbnf_v1 utf-8
- identifier  = kbnf_v1
- description = Karl's Bachus-Naur Form, version 1

document               = document_header & (MAYBE_WSLC & rule)+;

kbnf_version           = '1';

document_header        = "kbnf_v" & kbnf_version & SOME_WS
                       & character_encoding & LINE_END
                       & header_line* & LINE_END
                       ;
character_encoding     = ('a'~'z' | 'A'~'Z' | '0'~'9' | '_' | '-' | '.' | ':' | '+' | '(' | ')'){1~40};
header_line            = '-' & SOME_WS
                       & header_name & MAYBE_WS
                       & '=' & MAYBE_WS
                       & header_value & LINE_END
                       ;
header_name            = printable+;
header_value           = printable_ws+;

rule                   = (symbol | macro) & TOKEN_SEP & '=' & TOKEN_SEP & expression & TOKEN_SEP & ';'
                       | function & TOKEN_SEP & '=' & TOKEN_SEP & prose & TOKEN_SEP & ';'
                       ;
expression             = symbol
                       | call
                       | string_literal
                       | maybe_ranged(codepoint_literal)
                       | combination
                       | builtin_functions
                       | variable
                       | grouped(expression)
                       ;

symbol                 = identifier_restricted;
macro                  = identifier_restricted & PARENTHESIZED(param_name & (ARG_SEP & param_name)*);
param_name             = identifier_any;
function               = function_noargs | function_args;
function_noargs        = identifier_restricted & type_specifier;
function_args          = identifier_restricted
                       & PARENTHESIZED(function_param & (ARG_SEP & function_param)*)
                       & type_specifier
                       ;
function_param         = param_name & type_specifier;
type_specifier         = TOKEN_SEP & ':' & TOKEN_SEP & type;
type                   = "expression"
                       | "condition"
                       | "unsigned"
                       | "signed"
                       | "real"
                       | "any"
                       ;
call                   = identifier_any & PARENTHESIZED(call_param & (ARG_SEP & call_param)*);
call_param             = any_type;

combination            = alternate | combination_w_exclude;
combination_w_exclude  = exclude | combination_w_concat;
combination_w_concat   = concatenate | combination_w_repeat;
combination_w_repeat   = repetition | combination;
alternate              = expression & TOKEN_SEP & '|' & TOKEN_SEP & expression;
concatenate            = expression & TOKEN_SEP & '&' & TOKEN_SEP & expression;
exclude                = expression & TOKEN_SEP & '!' & TOKEN_SEP & expression;
repetition             = repeat_range | repeat_zero_or_one | repeat_zero_or_more | repeat_one_or_more;
repeat_range           = expression & '{' & TOKEN_SEP & maybe_ranged(number) & TOKEN_SEP & '}';
repeat_zero_or_one     = expression & '?';
repeat_zero_or_more    = expression & '*';
repeat_one_or_more     = expression & '+';

prose                  = '"""' & (maybe_escaped(printable_wsl)+ ! '"""') & '"""'
                       | "'''" & (maybe_escaped(printable_wsl)+ ! "'''") & "'''"
                       ;
codepoint_literal      = '"' & maybe_escaped(printable_ws ! '"'){1} & '"'
                       | "'" & maybe_escaped(printable_ws ! "'"){1} & "'"
                       ;
string_literal         = '"' & maybe_escaped(printable_ws ! '"'){2~} & '"'
                       | "'" & maybe_escaped(printable_ws ! "'"){2~} & "'"
                       ;
maybe_escaped(charset) = (charset ! '\\') | escape_sequence;
escape_sequence        = '\\' & (printable ! '{') | codepoint_escape);
codepoint_escape       = '{' & digit_hex+ & '}';

builtin_functions      = function_sized
                       | function_aligned
                       | function_swapped
                       | function_when
                       | function_bind
                       | function_unicode
                       | function_uint
                       | function_sint
                       | function_float
                       ;
function_sized         = fname_sized   & PARENTHESIZED(bit_count & ARG_SEP & expression);
function_aligned       = fname_aligned & PARENTHESIZED(bit_count & ARG_SEP & expression & ARG_SEP & padding);
function_swapped       = fname_swapped & PARENTHESIZED(bit_granularity & ARG_SEP & expression);
function_when          = fname_when    & PARENTHESIZED(condition & ARG_SEP & any_type);
function_bind          = fname_bind    & PARENTHESIZED(local_id & ARG_SEP & any_type);
function_unicode       = fname_unicode & PARENTHESIZED(category_name & (ARG_SEP & category_name)*);
function_uint          = fname_uint    & PARENTHESIZED(bit_count & ARG_SEP & maybe_ranged(number));
function_sint          = fname_sint    & PARENTHESIZED(bit_count & ARG_SEP & maybe_ranged(number));
function_float         = fname_float   & PARENTHESIZED(bit_count & ARG_SEP & maybe_ranged(number));

padding                = expression;
local_id               = identifier_restricted;
any_type               = condition | number | expression;
variable               = local_id | variable & '.' & local_id;
bit_count              = number;
bit_granularity        = number;
category_name          = ('A'~'Z') & ('a'~'z')?;

condition              = comparison | logical_op;
logical_op             = logical_or | logical_op_and_not;
logical_op_and_not     = logical_and | logical_op_not;
logical_op_not         = logical_not | maybe_grouped(condition);
comparison             = number & TOKEN_SEP & comparator & TOKEN_SEP & number;
comparator             = "<" | "<=" | "=" | ">= | ">";
logical_or             = condition & TOKEN_SEP & '|' & TOKEN_SEP & condition;
logical_and            = condition & TOKEN_SEP & '&' & TOKEN_SEP & condition;
logical_not            = '!' & TOKEN_SEP & condition;

number                 = calc_add | calc_sub | calc_mul_div;
calc_mul_div           = calc_mul | calc_div | calc_mod | calc_val;
calc_val               = number_literal | variable | maybe_grouped(number);
calc_add               = number & TOKEN_SEP & '+' & TOKEN_SEP & calc_mul_div;
calc_sub               = number & TOKEN_SEP & '-' & TOKEN_SEP & calc_mul_div;
calc_mul               = calc_mul_div & TOKEN_SEP & '*' & TOKEN_SEP & calc_val;
calc_div               = calc_mul_div & TOKEN_SEP & '/' & TOKEN_SEP & calc_val;
calc_mod               = calc_mul_div & TOKEN_SEP & '%' & TOKEN_SEP & calc_val;

grouped(item)          = PARENTHESIZED(item);
ranged(item)           = (item & TOKEN_SEP)? & '~' & (TOKEN_SEP & item)?;
maybe_grouped(item)    = item | grouped(item);
maybe_ranged(item)     = item | ranged(item);

number_literal         = int_literal_bin | int_literal_oct | real_literal_dec | real_literal_hex;
real_literal_dec       = neg? digit_dec+
                       & ('.' & digit_dec+ & (('e' | 'E') ('+' | '-')? & digit_dec+)?)?
                       ;
real_literal_hex       = neg? & '0' & ('x' | 'X') & digit_hex+
                       & ('.' & digit_hex+ & (('p' | 'P') & ('+' | '-')? & digit_dec+)?)?
                       ;
int_literal_bin        = neg? & '0' & ('b' | 'B') & digit_bin+;
int_literal_oct        = neg? & '0' & ('o' | 'O') & digit_oct+;
neg                    = '-';

identifier_any         = identifier_firstchar & identifier_nextchar*;
identifier_restricted  = identifier_any ! reserved_identifiers;
identifier_firstchar   = unicode(L,M);
identifier_nextchar    = identifier_firstchar | unicode(N) | '_';
reserved_identifiers   = fname_sized
                       | fname_aligned
                       | fname_swapped
                       | fname_when
                       | fname_bind
                       | fname_uint
                       | fname_sint
                       | fname_float
                       ;

fname_sized            = "sized";
fname_aligned          = "aligned";
fname_swapped          = "swapped";
fname_when             = "when";
fname_bind             = "bind";
fname_uint             = "uint";
fname_sint             = "sint";
fname_float            = "float";

printable              = unicode(L,M,N,P,S);
printable_ws           = printable | WS;
printable_wsl          = printable | WSL;
digit_bin              = '0'~'1';
digit_oct              = '0'~'7';
digit_dec              = '0'~'9';
digit_bin              = ('0'~'9') | ('a'~'f') | ('A'~'F');

comment                = '#' & (printable_ws ! LINE_END)* & LINE_END;

PARENTHESIZED(expr)    = '(' & TOKEN_SEP expr TOKEN_SEP & ')';
ARG_SEP                = TOKEN_SEP & ',' & TOKEN_SEP;
TOKEN_SEP              = MAYBE_WSLC;

# Whitespace
MAYBE_WS               = WS*;
SOME_WS                = WS & MAYBE_WS;
MAYBE_WSLC             = (WSL | comment)*;
SOME_WSLC              = WSL & MAYBE_WSLC;
WSL                    = WS | LINE_END;
WS                     = HT | SP;
LINE_END               = CR? & LF;
HT                     = '\{9}';
LF                     = '\{a}';
CR                     = '\{d}';
SP                     = '\{20}';
```
