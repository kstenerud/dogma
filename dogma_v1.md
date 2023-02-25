The Dogma Metalanguage
======================

_Describing how things should be_

**Version**: 1.0-beta2


## WORK IN PROGRESS

Current status: 1.0-beta2 (Feb 18, 2023).

Public comments uncovered a number of issues that have mostly been addressed. Beta3 will be released soon after some more cleanup.



Introduction
------------

Syntactic metalanguages have made mainly haphazard gains over the past 60 years, and still only describe text-based formats. Dogma aims to be a modernized metalanguage with better expressiveness and binary support.

Dogma follows the familiar patterns of [Backus-Naur Form](https://en.wikipedia.org/wiki/Backus%E2%80%93Naur_form), and includes a number of innovations that make it also suitable for describing binary data.


### Introductory Example

To demonstrate how powerful Dogma can be, here is an Ethernet IEEE 802.3 frame, layer 2 (image from [Wikipedia](https://en.wikipedia.org/wiki/IEEE_802.1Q)):

![IEEE 802.3 frame](Wikipedia-TCPIP_802.1ad_DoubleTag.svg)

```dogma
dogma_v1 utf-8
- identifier  = 802.3_layer2
- description = IEEE 802.3 Ethernet frame, layer 2
- note        = Words are byte-ordered big endian, but every octet is sent LSB first.

frame             = preamble
                  & frame_start
                  & dst_address
                  & src_address
                  & var(etype, ether_type)
                  & [etype.type = 0x8100: dot1q_frame;
                     etype.type = 0x88a8: double_tag_frame;
                                        : payload_by_type(etype.type, 46);
                    ]
                  & frame_check
                  ;
preamble          = uint(8, 0b01010101){7};
frame_start       = uint(8, 0b11010101);
dst_address       = uint(48, ~);
src_address       = uint(48, ~);
ether_type        = uint(16, var(type, ~));
frame_check       = uint(32, ~);

dot1q_frame       = tag_control_info
                  & var(etype, ether_type)
                  & payload_by_type(etype.type, 42)
                  ;
double_tag_frame  = service_tag
                  & uint(16, 0x8100)
                  & customer_tag
                  & var(etype, ether_type)
                  & payload_by_type(etype.type, 38)
                  ;

tag_control_info  = priority & drop_eligible & vlan_id;
priority          = uint(3, ~);
drop_eligible     = uint(1, ~);
vlan_id           = uint(12, ~);
service_tag       = tag_control_info;
customer_tag      = tag_control_info;

payload_by_type(type, min_size) = [type >= min_size & type <= 1500: generic_payload(type);
                                   type = 0x0800                  : ipv4;
                                   type = 0x86dd                  : ipv6;
                                   # Other types omitted for brevity
                                  ];
generic_payload(length)         = uint(8,~){length};
ipv4: bits                      = """https://somewhere/ipv4.dogma""";
ipv6: bits                      = """https://somewhere/ipv6.dogma""";
```

See also: [IPv4 described in Dogma](ipv4.dogma)



Contents
--------

- [The Dogma Metalanguage](#the-dogma-metalanguage)
  - [WORK IN PROGRESS](#work-in-progress)
  - [Introduction](#introduction)
    - [Introductory Example](#introductory-example)
  - [Contents](#contents)
  - [Design Objectives](#design-objectives)
    - [Human readability](#human-readability)
    - [Better expressiveness](#better-expressiveness)
    - [Character set support](#character-set-support)
    - [Codepoints as first-class citizens](#codepoints-as-first-class-citizens)
    - [Binary grammar support](#binary-grammar-support)
    - [Future proof](#future-proof)
  - [Forward Notes](#forward-notes)
    - [Versioning](#versioning)
    - [Informal Dogma in Descriptions](#informal-dogma-in-descriptions)
    - [Bit Ordering](#bit-ordering)
    - [Non-Greedy Matching](#non-greedy-matching)
    - [Unicode Equivalence and Normalization](#unicode-equivalence-and-normalization)
  - [Grammar Document](#grammar-document)
    - [Document Header](#document-header)
  - [Rules](#rules)
    - [Start Rule](#start-rule)
    - [Symbols](#symbols)
    - [Macros](#macros)
    - [Functions](#functions)
      - [Function Parameter and Return Types](#function-parameter-and-return-types)
      - [Parameter and Return Type Alternatives](#parameter-and-return-type-alternatives)
      - [Variadic Functions](#variadic-functions)
    - [Expressions](#expressions)
    - [Identifier](#identifier)
  - [Types](#types)
    - [Bits](#bits)
    - [Number](#number)
      - [Numbers](#numbers)
    - [Condition](#condition)
  - [Variables](#variables)
  - [Literals](#literals)
    - [Numeric Literals](#numeric-literals)
    - [Codepoints](#codepoints)
    - [Strings](#strings)
    - [Escape Sequence](#escape-sequence)
      - [Codepoint Escape](#codepoint-escape)
    - [Prose](#prose)
  - [Switch](#switch)
  - [Combinations](#combinations)
    - [Concatenation](#concatenation)
    - [Alternative](#alternative)
    - [Exclusion](#exclusion)
    - [Repetition](#repetition)
  - [Grouping](#grouping)
  - [Calculations](#calculations)
  - [Ranges](#ranges)
  - [Comments](#comments)
  - [Builtin Functions](#builtin-functions)
    - [`sized` Function](#sized-function)
    - [`aligned` Function](#aligned-function)
    - [`limited` Function](#limited-function)
    - [`swapped` Function](#swapped-function)
    - [`var` Function](#var-function)
    - [`eod` Function](#eod-function)
    - [`unicode` Function](#unicode-function)
    - [`uint` Function](#uint-function)
    - [`sint` Function](#sint-function)
    - [`float` Function](#float-function)
    - [`inf` Function](#inf-function)
    - [`nan` Function](#nan-function)
    - [`nzero` Function](#nzero-function)
  - [Dogma described as Dogma](#dogma-described-as-dogma)



Design Objectives
-----------------

### Human readability

The primary use case for Dogma is to describe text and binary grammars in a formalized way in documentation. Such a format must therefore be human-accessible, while also being concise and unambiguous.

### Better expressiveness

Binary formats tend to be structured in much more complicated ways than text formats in order to optimize for speed, throughput, or ease-of-processing. A metalanguage for describing such data will require much more expressiveness than current metalanguages allow. Better expressiveness reduces boilerplate and improves readability even in text format descriptions.

* **Repetition**: Any sequence of bits can have repetition applied to it, for a specific number of occurrences or a range of occurrences.
* **Variables**: Some constructs (such as here documents or length delimited fields) require access to previously decoded values. Dogma supports assigning decoded values to variables.
* **Exclusion**: Sometimes it's easier to express something as "everything except for ...".
* **Grouping**: Grouping expressions together is an obvious convenience that most other BNF offshoots have already adopted.
* **Prose**: In many cases, the actual encoding of something is already well-known and specified elsewhere, or is too complex for Dogma to describe adequately. Prose offers a free-form way to describe part of a grammar.
* **Whitespace not significant**: Many BNF notations (including the original BNF) assign meaning to whitespace (for example: whitespace as concatenation, or linefeeds to mark the end of a rule). This is bad from a UX perspective because it makes things harder for a human to parse in many circumstances, and reduces the ways in which a rule can be expressed over multiple lines.

### Character set support

Metalanguages tend to support only ASCII, with Unicode (encoded as UTF-8) generally added as an afterthought. This restricts the usefulness of the metalanguage, as any other character sets (many of which are still in use) have no support at all.

Dogma can be used with any [character set](https://www.iana.org/assignments/character-sets/character-sets.xhtml), and requires the character set to be specified as part of the grammar document header.

### Codepoints as first-class citizens

* Codepoints beyond the ASCII range must be directly inputtable into a grammar document.
* Difficult codepoints must also be supported (for example via escape sequences).
* [Unicode categories](https://unicode.org/glossary/#general_category) must be supported.

### Binary grammar support

Binary grammars have different needs from textual grammars, and require special support:

* **Bit arrays**: Binary formats tend to work at bit-level granularity, and thus require support for arbitrarily sized bit arrays.
* **Variables, Macros & Functions**: Binary formats often represent data in complex ways that can't be parsed without passing some context around.
* **Conditionals & Logic**: Binary formats often include or exclude portions based on encoded values elsewhere. Evaluating these requires the use of conditionals and logic operators.
* **Calculations**: Many binary field sizes are determined by data stored elsewhere in the document, and often they require calculations of some sort to determine the final field size.
* **Transformations**: Binary data often undergoes transformations that are too complex for normal BNF-style rules to express (for example [LEB128](https://en.wikipedia.org/wiki/LEB128)).

### Future proof

No specification is perfect, nor can it stand the test of time. Eventually an incompatible change will become necessary in order to stay relevant.

Dogma documents are versioned to a particular Dogma specification so that changes can be made to the specification without breaking existing tooling.



Forward Notes
-------------

### Versioning

Versioning for the Dogma specification is done in the form `major`.`minor`:

* Incrementing the major version signals a change in functionality (adding, removing, changing behavior).
* Incrementing the minor version signals non-functional changes like clarifications or rewording or bug fixes.

**Example**:

* Version 1.0: First public release
* Version 1.1: Clarification: z-ray is just as good as x-ray. In fact it's better; it's two more than x!
* Version 1.2: Changed the wording of section 2.2 to make its intended use and limitations more clear.
* Version 2.0: Added new type "y-ray" for the undecided.

**In this repository**:

* Each `dogma_vX.md` file is the evolving document for this major release, with any unreleased changes.
* Each `dogma_vX.Y.md` file is the immutable document for this particular major.minor release.


### Informal Dogma in Descriptions

Section descriptions will usually include some informal Dogma notation with structural parts such as whitespace omitted for clarity. When in doubt, please refer to the [formal Dogma grammar at the end of this document](#dogma-described-as-dogma).


### Bit Ordering

All sequences of [bits](#bits) are assumed to be in big endian bit order (higher bits come first), and if necessary can be swapped at any granularity using the [`swapped` function](#swapped-function).

**For example**:

* `uint(16,0x5bbc)` matches big endian 0x5bbc (bit sequence 0,1,0,1,1,0,1,1,1,0,1,1,1,1,0,0).
* `swapped(8, uint(16,0x5bbc))` matches little endian 0xbc5b (bit sequence 1,0,1,1,1,1,0,0,0,1,0,1,1,0,1,1).
* `swapped(2, uint(16,0x5bbc))` matches 2-bit-swapped 0x3ee5 (bit sequence 0,0,1,1,1,1,1,0,1,1,1,0,0,1,0,1).
* `swapped(1, uint(16,0x5bbc))` matches bit-swapped 0x3dda (bit sequence 0,0,1,1,1,1,0,1,1,1,0,1,1,0,1,0).

[Codepoints](#codepoints) follow the byte ordering of the character encoding scheme specified in the [document header](#document-header) (although per-byte bit ordering remains nominally big endian). Character sets with ambiguous byte ordering (such as `utf-16`) should generally be avoided in favor of those with explicit byte ordering (`utf-16be`, `utf-16le`).


### Non-Greedy Matching

All [bits](#bits) matching is assumed to be non-greedy.

For example, given the following grammar:

```dogma
document  = record+ & '.';
record    = letter+ & terminator;
letter    = 'a'~'z';
terminaor = "zzz";
```

The document `azzzbzzzczzz.` contains 3 records (`a`, `b`, and `c`), not one record (`azzzbzzzc`).


### Unicode Equivalence and Normalization

By default only the exact, non-processed (i.e. not normalized) codepoints present in a Unicode expression will be matched. For more advanced matching, define [functions](#functions) that apply normalization preprocessing or produce equivalence [alternatives](#alternative) to a string expression.



Grammar Document
----------------

A Dogma grammar document begins with a [header section](#document-header), followed by a [start rule](#start-rule) and possibly more [rules](#rules).

```dogma
document = document_header & start_rule & rule*;
```


### Document Header

The document header identifies the file format as Dogma, and contains the following mandatory information:

* The major version of the Dogma specification that the document adheres to.
* The case-insensitive name of the character encoding used for all codepoint related expressions (use the [IANA preferred MIME name](https://www.iana.org/assignments/character-sets/character-sets.xhtml) whenever possible).

Optionally, it may also include header lines. An empty line terminates the document header section.

```dogma
document_header    = "dogma_v" & dogma_major_version & SOME_WS
                   & character_encoding & LINE_END
                   & header_line* & LINE_END
                   ;
character_encoding = ('a'~'z' | 'A'~'Z' | '0'~'9' | '_' | '-' | '.' | ':' | '+' | '(' | ')')+;
header_line        = '-' & SOME_WS & header_name & '=' & header_value & LINE_END;
header_name        = printable+;
header_value       = printable_ws+;
```

The following headers are officially recognized (all others are allowed, but are not standardized):

* `identifier`: A unique identifier for the grammar being described. It's customary to append a version number to the identifier.
* `description`: A brief, one-line description of the grammar.
* `dogma_specification`: A pointer to the Dogma specification as a courtesy to anyone reading the document.

**Example**: A UTF-8 Dogma grammar called "mygrammar_v1".

```dogma
dogma_v1 utf-8
- identifier  = mygrammar_v1
- description = My first grammar, version 1
- dogma_specification = https://github.com/kstenerud/dogma/blob/master/dogma_v1.0.md

document = "a"; # Yeah, this grammar doesn't do much...
```



Rules
-----

Rules determine the restrictions on how terminals can be combined into a valid sequence. A rule can define a [symbol](#symbols), a [macro](#macros), or a [function](#functions), and can work with or produce any of the standard [types](#types).

Rules are written in the form `nonterminal = expression;`, with optional whitespace (including newlines) between rule elements.

```dogma
rule          = symbol_rule | macro_rule | function_rule;
start_rule    = symbol_rule;
symbol_rule   = symbol & '=' & expression & ';';
macro_rule    = macro & '=' & expression & ';';
function_rule = function & '=' & prose & ';';
```

The left part of a rule can define a [symbol](#symbols), a [macro](#macros), or a [function](#functions). Their case-sensitive names share the same global namespace (i.e. they must be globally unique).

**Note**: Whitespace in a Dogma rule is only used to separate tokens and for visual layout purposes; it does not imply any semantic meaning.


### Start Rule

The first rule listed in a Dogma document is the start rule. Only a [symbol](#symbols) that produces [bits](#bits) can be a start rule.


### Symbols

A symbol acts as a placeholder for something to be substituted in another rule.

```dogma
symbol_rule           = symbol & '=' & expression & ';';
symbol                = identifier_restricted;
identifier_restricted = identifier_any ! reserved_identifiers;
identifier_any        = name;
name                  = name_firstchar & name_nextchar*;
name_firstchar        = unicode(L,M);
name_nextchar         = name_firstchar | unicode(N) | '_';
```

**Note**: Symbol names are not limited to ASCII.

**Example**: A record consists of a company name (which must not contain two full-width colons in a row), followed by two full-width colons, followed by an employee count in full-width characters (possibly approximated to the nearest 10,000), and is terminated by a linefeed.

```dogma
記録		= 会社名 & "：：" & 従業員数 & LF;
会社名		= unicode(L,M) & unicode(L,M,N,P,S,Zs)* ! "：：";
従業員数		= '１'~'９' & '０'~'９'* & '万'?;
LF		= '\[a]';
```

Or if you prefer, the same thing with English symbol names:

```dogma
record         = company_name & "：：" & employee_count & LF;
company_name   = unicode(L,M) & unicode(L,M,N,P,S,Zs)* ! "：：";
employee_count = '１'~'９' & '０'~'９'* & '万'?;
LF             = '\[a]';
```

### Macros

A macro is essentially a symbol that accepts parameters, which are bound to local [variables](#variables) for use within the macro. The macro's contents are written like regular rules, but also have access to the injected local variables.

```dogma
macro_rule = macro & '=' & expression & ';';
macro      = identifier_restricted & PARENTHESIZED(param_name & (ARG_SEP & param_name)*);
```

When called, a macro substitutes the passed-in parameters and proceeds like a normal rule would. Parameter and return [types](#types) are inferred based on how the parameters are used within the macro, and the type resulting from the macro's expression. The grammar is malformed if a macro is called with incompatible types, or is used in a context that is incompatible with its return type.

```dogma
call       = identifier_any & PARENTHESIZED(call_param & (ARG_SEP & call_param)*);
call_param = any_type;
```

**Example**: The main section consists of three records: A type 1 record and two type 2 records. A record begins with a type byte, followed by a length byte, followed by that many bytes of data.

```dogma
main_section = record(1) & record(2){2};
record(type) = byte(type) & byte(var(length, ~)) & byte(~){length};
byte(v)      = uint(8,v);
```

In the above example, `record` can only be called with unsigned integer values, because the `type` field is passed to the `byte` macro, which calls the [`uint` function](#uint-function), which expects a [`uintegers`](#numbers) parameter.

**Example**: An [IPV4](ipv4.dogma) packet contains "header length" and "total length" fields, which together determine how big the "options" and "payload" sections are. "protocol" determines the protocol of the payload.

```dogma
ip_packet                    = ...
                             & u4(var(header_length, 5~)) # length is in 32-bit words
                               ...
                             & u16(var(total_length, 20~)) # length is in bytes
                               ...
                             & u8(var(protocol, registered_protocol))
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
payload_contents(protocol)   = [protocol = 0: protocol_hopopt;
                                protocol = 1: protocol_icmp;
                                ...
                               ];
```

### Functions

Functions behave similarly to macros, except that they are opaque: whereas a macro is defined within the bounds of the grammatical notation, a function's procedure is user-defined in [prose](#prose) (as a description, or as a URL pointing to a description).

Functions that take no parameters are defined and called without the trailing parentheses (similar to defining or calling a [symbol](#symbols)).

**Note**: Dogma pre-defines a number of essential [built-in functions](#builtin-functions).

#### Function Parameter and Return Types

Since functions are opaque, their parameter and return [types](#types) cannot be automatically deduced like they can for [macros](#macros). Functions therefore declare all parameter and return [types](#types). If a function is called with the wrong types or its return value is used in an incompatible context, the grammar is malformed.

#### Parameter and Return Type Alternatives

If a function can accept multiple types in a particular parameter, or can return multiple types, those types will be listed separated by the pipe (`|`) character. See the [`var` function](#var-function) as an example.

#### Variadic Functions

The last parameter in a function can be made [variadic](https://en.wikipedia.org/wiki/Variadic_function) by appending `...` (such as in the [unicode function](#unicode-function)).

```dogma
function_rule      = function & '=' & prose & ';';
function           = function_no_args | function_with_args;
function_no_args   = identifier_restricted & type_specifier;
function_with_args = identifier_restricted
                   & PARENTHESIZED(function_param & (ARG_SEP & function_param)*)
                   & type_specifier
                   ;
function_param     = param_name & type_specifier;
type_specifier     = ':' & type_alternatives & vararg?;
type_alternatives  = type_name & ('|' & type_name)*;
vararg             = "...";
type_name          = basic_type_name | custom_type_name;
basic_type_name    = "expression"
                   | "bits"
                   | "condition"
                   | "number"
                   | "numbers"
                   | "uinteger"
                   | "uintegers"
                   | "sinteger"
                   | "sintegers"
                   ;
custom_type_name   = name;
```

**Example**: A function to convert an unsigned int to its unsigned little endian base 128 representation.

```dogma
uleb128(v: uinteger): bits = """https://en.wikipedia.org/wiki/LEB128#Unsigned_LEB128""";
```

**Example**: A record contains an ISO 8601 encoded date, then a colon, followed by a temperature reading.

```dogma
record         = iso8601 & ':' & temperature;
iso8601: bits  = """https://en.wikipedia.org/wiki/ISO_8601#Combined_date_and_time_representations""";
temperature    = digit+ & ('.' & digit+)?;
digit          = '0'~'9';
```



### Expressions

Expressions form the body of a rule, and can produce [bits](#bits), [numbers](#number), or [conditions](#condition).

```dogma
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


### Identifier

A unique identifier for [symbols](#symbols), [macros](#macros), and [functions](#functions) (which are all scoped globally), or [variables](#variables) (which are scoped locally).

Identifiers are case sensitive, and must be unique to their scope. Locally scoped identifiers (i.e. variable names) must be unique to _both_ the local and global scope (name shadowing is not allowed).

Identifiers start with a letter, and can contain letters, numbers and the underscore character. The [builtin function names](#builtin-functions) are reserved at the global scope.

The general convention is to use all uppercase identifiers for "background-y" things like whitespace and separators and other structural components, which makes them easier for a human to gloss over (see [the Dogma grammar document](#dogma-described-as-dogma) as an example).

```dogma
identifier           = (identifier_firstchar & identifier_nextchar*) ! reserved_identifiers;
identifier_firstchar = unicode(L,M);
identifier_nextchar  = identifier_firstchar | unicode(N) | '_';
```



Types
-----

Dogma has the following types:

* [`bits`](#bits): A set of possible bit sequences of arbitrary length.
* [`conditions`](#condition): True or false assertions about the current state.
* Numeric types that may be used in calculations or converted to a representations in bits. There are two primary forms:
  - Singular value type [`number` and its invariants `sinteger` and `uinteger`](#number).
  - Number set type [`numbers` and its invariants `sintegers` and `uintegers`](#numbers).
* `expression`: Used for special situations like the [`eod` function](#eod-function).

Types become relevant when calling [functions](#functions), which have restrictions on what types they accept and return. Also, [repetition](#repetition) amounts are restricted to the [`uintegers`](#numbers) type.

Custom types may be invented (or further invariants defined) when the standard types are insufficient (such as in the [unicode function](#unicode-function)), provided their textual representation doesn't cause parsing ambiguities with the Dogma document encoding.

### Bits

The bits type represents the set of possible bit sequences that can be matched at a particular point.

Bits are produced by [codepoints](#codepoints), [strings](#strings), and [some functions](#builtin-functions). They can be of arbitrary length (i.e. not just a multiple of 8 bits).

The bits type is a set of bit patterns, and can therefore be composed using [alternatives](#alternative), [concatenation](#concatenation), [repetition](#repetition), and [exclusion](#exclusion).

**Example**: Each UTC timestamp field is stored in its own bitfield, with the final constructed 64 bit value stored in little endian byte order:

Bit fields (high to low):

| Field       | Min | Max    | Bits |
| ----------- | --- | ------ | ---- |
| Year        | 0   | 262143 | 18   |
| Month       | 1   | 12     | 4    |
| Day         | 1   | 31     | 5    |
| Hour        | 0   | 23     | 5    |
| Minute      | 0   | 59     | 6    |
| Second      | 0   | 60     | 6    |
| Microsecond | 0   | 999999 | 20   |

```dogma
timestamp   = swapped(8, year & month & day & hour & minute & second & microsecond);
year        = uint(18, ~);
month       = uint(4, 1~12);
day         = uint(5, 1~31);
hour        = uint(5, 0~23);
minute      = uint(6, 0~59);
second      = uint(6, 0~60); # Mustn't forget leap seconds!
microsecond = uint(20, 0~999999);
```

### Number

The `number` type represents mathematical reals (not computer floating point values, which are an implementation detail). Numbers can be used in [calculations](#calculations), numeric [ranges](#ranges), [repetition](#repetition), and as parameters to or return types from [functions](#functions). They can also be converted to [bits](#bits) using [functions](#functions) such as [float](#float-function), [sint](#sint-function), and [uint](#uint-function).

Numbers can be expressed as [numeric literals](#numeric-literals), or derived from [functions](#functions), [variables](#variables), and [calculations](#calculations).

The two most common numeric invariants are supported natively as pseudo-types:

* The `sinteger` (signed integer) pseudo-type restricts values to positive and negative integers, and 0.
* The `uinteger` (unsigned integer) pseudo-type restricts values to positive integers and 0.

These pseudo-types only place restrictions on the final realized value; they are still `number` types and behave like mathematical reals for all operations, with the destination invariant type (such as a [function](#functions) parameter's type) restricting what resulting values are allowed.

**Note**: A value that breaks an invariant on a `number` (the singular `number` type, not the set `numbers` type) represents an erroneous condition. A value that breaks its `number` invariant (e.g. 0.5 passed to a `sinteger` or `uinteger` parameter) results in no match for anything that depends on it, and ideally should raise a diagnostic in any tool.

#### Numbers

The `numbers` type (and associated pseudo-type invariants `sintegers` and `uintegers`) represents sets of [numbers](#number). Number sets are commonly used in [repetition](#repetition), or passed as arguments to certain [functions](#builtin-functions) (such as [sint](#sint-function), [uint](#uint-function), [float](#float-function)) to produce sets of [bits](#bits).

Number sets are produced using [ranges](#ranges), [alternatives](#alternative), and [exclusion](#exclusion).

**Note**: Any value in a `numbers` set that breaks its invariant is silently removed from the set. For example `0~1.5` passed to a `sintegers` invariant will be reduced to the set of integer values 0 and 1. `0.5~0.6` passed to a `sintegers` invariant will be reduced to the empty set. `-5` passed to a `uintegers` invariant will be reduced to the empty set.

**Examples**:

* `1 | 5 | 30`: The set of numbers 1, 5, and 30.
* `1~3`: All numbers from 1 to 3. If passed to an integer context, this would be equivalent to `1 | 2 | 3`.
* `1~300 ! 15`: All numbers from 1 to 300, except for 15.
* `(1~low | high~900) ! 200~600`: All numbers from 1 to the `low` variable or from the `high` variable to 900, except for anything from 200 to 600.

### Condition

Conditions are produced by comparing [numbers](#number) or comparing [bits](#bits), and by performing logical operations on those comparisons, resulting in either true or false. Conditions are used in [switches](#switch), and can be [grouped](#grouping).

Comparisons:

* Less than (`<`)
* Less than or equal to (`<=`)
* Equal to (`=`)
* Not equal to (`!=`)
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

**Notes**:

* Comparisons cannot be done between [numbers](#number) and [bits](#bits); only bits compared to bits, or numbers compared to numbers.
* [Bits](#bits) can only be compared using `=` and `!=`.
* [Bits](#bits) can only be equal when both operands contain the same number of bits and every individual bit is equal.

```dogma
condition          = comparison | logical_op;
logical_op         = logical_or | logical_op_and_not;
logical_op_and_not = logical_and | logical_op_not;
logical_op_not     = logical_not | maybe_grouped(condition);
comparison         = number & comparator & number;
comparator         = comp_lt | comp_le | comp_eq | comp_ne | comp_ge | comp_gt;
comp_lt            = "<";
comp_le            = "<=";
comp_eq            = "=";
comp_ne            = "!=";
comp_ge            = ">=";
comp_gt            = ">";
logical_or         = condition & '|' & condition;
logical_and        = condition & '&' & condition;
logical_not        = '!' & condition;
```

**Examples**:

* `type = 2`
* `(value >= 3 & value < 10) | value = 0`
* `(x > 3 & y > 5) | x * y > 15`
* `nextchar != 'a'`



Variables
---------

In some contexts, resolved data (data that has already been matched) or literal values can be bound to a variable for use elsewhere. Variables are bound either manually using the [`var`](#var-function) builtin function, or automatically when passing parameters to a [macro](#macros). The variable's [type](#types) is inferred from its provenance and where it is ultimately used (a type mismatch indicates a malformed grammar).

**Note**: Variables cannot be re-bound.

When [making a variable](#var-function) of an [expression](#expressions) that itself is a variable, that expression's bound variables are accessible from the outer scope using dot notation (`this_exp_bound_value.sub_exp_bound_value`).

**Example**: An [RTP (version 2) packet](https://en.wikipedia.org/wiki/Real-time_Transport_Protocol) contains flags to determine if padding or an extension are present. It also contains a 4-bit count of the number of contributing sources that are present. If the padding flag is 1, then the last CSRC is actually 3 bytes of padding followed by a one-byte length field defining how many bytes of the trailing entries in the CSRC list are actually padding (including the last entry containing the byte count).  Padding bytes must contain all zero bits, except for the very last byte which is the padding length field.

We make use of variables such as `has_padding`, `has_extension`, and `csrc_count` to decide how the rest of the packet is structured. We also pass some variables to [macros](#macros) to keep things cleaner.

The padding portion is [switched](#switch) on `has_padding`, and the extension portion is switched on `has_extension`.

Since the padding count is in bytes, we must convert between counts of 32-bit words and counts of bytes to determine how many CSRC entries are real entries, and how many bytes worth of CSRC data at the end are actually padding.

```dogma
rtp_packet   = version
             & uint(1,var(has_padding,~))
             & uint(1,var(has_extension,~))
             & uint(4,var(csrc_count,~))
             & marker
             & payload_type
             & sequence_no
             & timestamp
             & ssrc
             & csrc_list(has_padding, csrc_count)
             & [has_extension = 1: extension;]
             ;
version      = uint(2,2);
marker       = uint(1,~);
payload_type = uint(7,~);
sequence_no  = uint(16,~);
timestamp    = uint(32,~);
ssrc         = uint(32,~);
csrc         = uint(32,~);

csrc_list(has_padding, count) = [has_padding = 1: csrc{count - last.length/4}
                                                & padding{last.length - 4}
                                                & var(last,padding_last)
                                                ;
                                                : csrc{count};
                                ];

padding             = uint(8,0);
padding_last        = padding{3} & uint(8,var(length,4~));

extension           = custom_data
                    & uint(16,var(length,~))
                    & extension_payload(length)
                    ;
custom_data         = uint(16,~);
ext_payload(length) = uint(32,~){length};
```



Literals
--------

### Numeric Literals

Numeric literals can be expressed in binary, octal, decimal, or hexadecimal notation for integers, and in decimal or hexadecimal notation for reals.

**Note**: Decimal real notation translates more cleanly to decimal float encodings such as [ieee754 decimal](https://en.wikipedia.org/wiki/Decimal64_floating-point_format), and hexadecimal real notation translates more cleanly to binary float encodings such as [ieee754 binary](https://en.wikipedia.org/wiki/Double-precision_floating-point_format).

Conversions from literal reals to floating point encodings that differ in base are assumed to follow the generally accepted algorithms for such conversions (e.g. `Grisu`, `std::strtod`).

```dogma
number_literal       = int_literal_bin | int_literal_oct | int_real_literal_dec | int_real_literal_hex;
int_real_literal_dec = neg? digit_dec+
                     & ('.' & digit_dec+ & (('e' | 'E') ('+' | '-')? & digit_dec+)?)?
                     ;
int_real_literal_hex = neg? & '0' & ('x' | 'X') & digit_hex+
                     & ('.' & digit_hex+ & (('p' | 'P') & ('+' | '-')? & digit_dec+)?)?
                     ;
int_literal_bin      = neg? & '0' & ('b' | 'B') & digit_bin+;
int_literal_oct      = neg? & '0' & ('o' | 'O') & digit_oct+;
neg                  = '-';
```

**Examples**:

```dogma
header_signature = uint(5, 0b10111);
ascii_char_8bit  = uint(8, 0x00~0x7f);
tolerance        = float(32, -1.5~1.5);
```


### Codepoints

A codepoint is the [bits](#bits) representation of a character in a particular [encoding](https://en.wikipedia.org/wiki/Character_encoding). Codepoints can be represented as literals, [ranges](#ranges), and [category sets](#unicode-function). Codepoint literals are placed between single or double quotes.

Expressing codepoint literals as a [range](#ranges) causes every codepoint in the range to be added as an [alternative](#alternative).

```dogma
codepoint_literal = '"' & maybe_escaped(printable_ws ! '"'){1} & '"'
                  | "'" & maybe_escaped(printable_ws ! "'"){1} & "'"
                  ;
```

**Examples**:

```dogma
letter_a     = 'a';     # or "a"
a_to_c       = 'a'~'c'; # or "a"~"c", or 'a' | 'b' | 'c', or "a" | "b" | "c"
alphanumeric = unicode(L,N);
```

### Strings

A string is syntactic sugar for a series of specific [codepoints](#codepoints) [concatenated](#concatenation) together. String literals are placed between single or double quotes.

```dogma
string_literal = '"' & maybe_escaped(printable_ws ! '"'){2~} & '"'
               | "'" & maybe_escaped(printable_ws ! "'"){2~} & "'"
               ;
```

**Example**: The following are all equivalent:

```dogma
str_abc_1 = "abc";
str_abc_2 = 'abc';
str_abc_3 = "a" & "b" & "c";
str_abc_4 = 'a' & 'b' & 'c';
```


### Escape Sequence

[Codepoint literals](#codepoints), [string literals](#strings), and [prose](#prose) may contain codepoint escape sequences to represent troublesome codepoints.

Escape sequences are initiated with the backslash (`\`) character. If the next character following is an open square brace (`[`), it begins a [codepoint escape](#codepoint-escape). Otherwise the escape sequence represents that literal character.

```dogma
escape_sequence = '\\' & (printable ! '[') | codepoint_escape);
```

**Example**: A string containing double quotes.

```dogma
mystr = "This is a \"string\""; # or using single quotes: 'This is a "string"'
```

#### Codepoint Escape

A codepoint escape interprets the hex digits between the sequence `\[` and `]` as the hexadecimal numeric value of the codepoint being referred to. What actual [bits](#bits) result from the codepoint escape depends on the [character set]((https://www.iana.org/assignments/character-sets/character-sets.xhtml))

```dogma
codepoint_escape = '[' & digit_hex+ & ']';
```

**Example**: Emoji

```dogma
mystr = "This is all just a bunch of \[1f415]ma!"; # "This is all just a bunch of 🐕ma!"
```

### Prose

Prose describes a [function's](#functions) invariants and implementation in natural language, or in the case of a URL, points to another document.

```dogma
prose = '"""' & (maybe_escaped(printable_wsl)+ ! '"""') & '"""'
      | "'''" & (maybe_escaped(printable_wsl)+ ! "'''") & "'''"
      ;
```

**Example**: A record contains a date and temperature separated by `:`, followed by a newline, followed by a flowery description of any length in iambic pentameter (newlines allowed), terminated by `=====` on its own line.

```dogma
record              = date & ':' & temperature & LF & flowery_description & LF & '=====' & LF;
date                = """YYYY-MM-DD, per https://en.wikipedia.org/wiki/ISO_8601#Calendar_dates""";
temperature         = digit+ & ('.' & digit+)?;
digit               = '0'~'9';
flowery_description: bits = """
A poetic description of the weather, written in iambic pentameter. For example:

While barred clouds bloom the soft-dying day,
And touch the stubble-plains with rosy hue;
Then in a wailful choir the small gnats mourn
Among the river sallows, borne aloft
Or sinking as the light wind lives or dies.
""";
```



Switch
------

A switch statement chooses one expression from a set of possibilities based on condition matching.

* When no conditions match, the default expression (if any) is used.
* If more than one condition can match at the same time, the grammar is ambiguous.

```dogma
switch         = '[' & switch_entry+ & switch_default? & ']';
switch_entry   = condition & ':' & expression & ';';
switch_default = ':' & expression & ';';
```

**Example**: [TR-DOS](https://en.wikipedia.org/wiki/TR-DOS) file descriptors contain different payload formats based on the extension.

```dogma
file_descriptor  = filename
                 & var(ext, extension)
                 & [ ext.type = 'B': format_basic;
                     ext.type = 'C': format_code;
                     ext.type = 'D': format_data;
                     ext.type = '#': format_print;
                                   : format_generic;
                   ]
                 & file_sectors
                 & start_sector
                 & start_track
                 ;

filename         = sized(8*8, uint(8,~)+ & uint(8,' ')*);
extension        = var(type, uint(8, ~));
file_sectors     = uint(8, ~);
start_sector     = uint(8, ~);
start_track      = uint(8, ~);

format_basic     = program_length & variables_offset;
program_length   = uint(16,~);
variables_offset = uint(16,~);

format_code      = load_addres & code_length;
load_address     = uint(16,~);
code_length      = uint(16,~);

format_data      = data_type & array_length;
data_type        = uint(16,~);
array_length     = uint(16,~);

format_print     = extent_no & uint(8, 0x20) & print_length;
extent_no        = uint(8, ~);
print_length     = uint(16, 0~4096);

format_generic   = uint(16,~) & generic_length;
generic_length   = uint(16,~);
```


Combinations
------------

Combinations combine expressions together into more powerful expressions.

Combination precedence (low to high):

* [Alternative](#alternative)
* [Exclusion](#exclusion)
* [Concatenation](#concatenation)
* [Repetition](#repetition)


### Concatenation

Concatenation produces an expression consisting of the expression on the left, followed by the expression on the right (both must match in their proper order for the combined expression to match). The operator symbol is `&` (think of it as meaning "x and then y").

Only [bits](#bits) can be concatenated.

```dogma
concatenate = expression & '&' & expression;
```

**Example**: Assignment consists of an identifier, at least one space, an equals sign, at least one space, and then an integer value, followed by a linefeed.

```dogma
assignment = "a"~"z"+ 
           & " "+
           & "="
           & " "+
           & "0"~"9"+
           & "\[a]"
           ;
```


### Alternative

Alternative produces an expression that can match either the expression on the left or the expression on the right (essentially a set of two possibilities).

Alternatives are separated by a pipe (`|`) character. Only one of the alternative branches will be taken.

[Bits](#bits) and [numbers](#numbers) sets can be built using alternatives.

```dogma
alternate = expression & '|' & expression;
```

**Example**: Addition or subtraction consists of an identifier, at least one space, a plus or minus sign, at least one space, and then another identifier, followed by a linefeed.

```dogma
caculation = "a"~"z"+
           & " "+
           & ("+" | "-")
           & " "+
           & "a"~"z"+
           & "\[a]"
           ;
```


### Exclusion

Exclusion removes an expression from the set of expression alternatives.

[Bits](#bits) and [numbers](#numbers) sets can be modified using exclusion.

```dogma
exclude = expression & '!' & expression;
```

**Example**: An identifier can be any lowercase ASCII string except "fred".

```dogma
identifier = "a"~"z"+ ! "fred";
```


### Repetition

"Repetition" is a bit of a misnomer, because it actually defines how many times an expression occurs, not how many times it repeats. Think of repetition as "this [bits](#bits) expression, [concatenated](#concatenation) together for a total of X occurrences".

Repetition amounts are [unsigned integer sets](#numbers) placed between curly braces (e.g. `{10}`, `{1~5}`, `{1 | 3| 6~12}`). Each value in the set produces an [alternative](#alternative) expression with that repetition amount applied, contributing to a final bits expression set (for example, `"a"{1~3}` is equivalent to `"a" | "aa" | "aaa"`).

There are also shorthand notations for common cases:

* `?`: Zero or one (equivalent to `{0~1}`)
* `*`: Zero or more (equivalent to `{0~}`)
* `+`: One or more (equivalent to `{1~}`)

Only [bits](#bits) can have repetition applied.

```dogma
repetition          = repeat_range | repeat_zero_or_one | repeat_zero_or_more | repeat_one_or_more;
repeat_range        = expression & '{' & maybe_ranged(number) & '}';
repeat_zero_or_one  = expression & '?';
repeat_zero_or_more = expression & '*';
repeat_one_or_more  = expression & '+';
```

**Example**: An identifier is 5, 6, 7, or 8 characters long, and is made up of characters from 'a' to 'z'.

```dogma
identifier = 'a'~'z'{5~8};
```

**Example**: An identifier must start with at least one uppercase ASCII letter, optionally followed by any number of lowercase ASCII letters, and optionally suffixed with an underscore.

```dogma
identifier = 'A'~'Z'+ & 'a'~'z'* & '_'?;
```



Grouping
--------

[Bits](#bits), [calculations](#calculations) and [conditions](#condition) can be grouped together in order to override the default precedence, or as a visual aid to make things more readable. To group, place the items between parentheses `(`, `)`.

```dogma
grouped(item)       = PARENTHESIZED(item);
PARENTHESIZED(item) = '(' & item & ')';
```

**Exmples**:

```dogma
my_rule         = ('a' | 'b') & ('x' | 'y');
my_macro1(a)    = uint(8, (a + 5) * 2);
my_macro2(a, b) = [(a < 10 | a > 20) & (b < 10 | b > 20): "abc";
                                                        : "def";
                  ];
```



Calculations
------------

Calculations perform arithmetic operations on [numbers](#numbers), producing a new number. All operands are treated as mathematical reals for the purpose of the calculation.

The following operations can be used:

* Add (`+`)
* Subtract (`-`)
* Multiply (`*`)
* Divide (`/`)
* Modulo (`%`)
* Power (`^`, where `x^y` means x to the power of y)
* Negation ('-')

**Notes**:

* Division by zero is undefined behavior. Any grammar that allows division by zero to occur is ambiguous.
* Depending on the operands, the modulo operation can produce two different values depending on how the remainder is derived. Modulo in Dogma follows the approach of C, ADA, PL/1, and Common Lisp: The remainder with the same sign as the divisor is chosen.

Operator precedence (low to high):

* add, subtract
* multiply, divide, modulus
* power
* negation

```dogma
number       = calc_add | calc_sub | calc_mul_div;
calc_mul_div = calc_mul | calc_div | calc_mod | calc_pow_neg;
calc_pow_neg = calc_pow | calc_neg_val;
calc_neg_val = calc_neg | calc_val;
calc_val     = number_literal | variable | maybe_grouped(number);
calc_add     = number & '+' & calc_mul_div;
calc_sub     = number & '-' & calc_mul_div;
calc_mul     = calc_mul_div & '*' & calc_pow_val;
calc_div     = calc_mul_div & '/' & calc_pow_val;
calc_mod     = calc_mul_div & '%' & calc_pow_val;
calc_pow     = calc_pow_val & '^' & calc_neg_val;
calc_neg     = '-' & calc_val;
```

**Example**: A [UDP packet](https://en.wikipedia.org/wiki/User_Datagram_Protocol) consists of a source port, a destination port, a length, a checksum, and a body. The length field refers to the size of the entire packet, not just the body.

The variable `length` is captured and passed to the `body` [macro](#macros), which then uses that variable in a [repetition](#repetition) expression.

Since the length field refers to the entire packet including headers, we must subtract 8 bytes (the size of the four headers) to get the body length. This also means that the minimum length allowed for a UDP packet is 8 (for an empty packet).

```dogma
udp_packet   = src_port
             & dst_port
             & uint(16,var(length,8~))
             & checksum
             & body(length - 8)
             ;
src_port     = uint(16,~);
dst_port     = uint(16,~);
checksum     = uint(16,~);
body(length) = uint(8,~){length};
```



Ranges
------

A range builds a [set of numbers](#numbers) consisting of all reals in the range as a closed interval. Ranges can be defined in a number of ways:

* A low value and a high value separated by a tilde (low ~ high), indicating a (closed interval) low and high bound.
* A low value followed by a tilde (low ~), indicating a low bound only.
* A tilde followed by a high value (~ high), indicating a high bound only.
* A tilde by itself (~), indicating no bound (i.e. the range consists of the set of all reals).
* A value with no tilde, restricting the "range" to only that one value.

A [codepoint](#codepoints) range represents a set where each [`uinteger`](#number) contained in the range represents a codepoint [alternatives](#alternative).

A [repetition](#repetition) range represents a set where each [`uinteger`](#number) contained in the range represents a number of occurrences that will be applied to a [bits](#bits) expression as an [alternative](#alternative).

```dogma
expression         = ...
                   | maybe_ranged(codepoint_literal)
                   | ...
                   ;
repeat_range       = expression & '{' & maybe_ranged(number) & '}';
function_uint      = fname_uint & PARENTHESIZED(bit_count & ARG_SEP & maybe_ranged(number));
function_sint      = fname_sint & PARENTHESIZED(bit_count & ARG_SEP & maybe_ranged(number));
function_float     = fname_float & PARENTHESIZED(bit_count & ARG_SEP & maybe_ranged(number));
ranged(item)       = item? & '~' & item?;
maybe_ranged(item) = item | ranged(item);
```

**Example**: Codepoint range.

```dogma
hex_digit = ('0'~'9' | 'a'~'f');
```

**Example**: Repetition range: A name field contains between 1 and 100 characters.

```dogma
name_field = unicode(L,M,N,P,S){1~100};
```

**Example**: Number range: The RPM value is an unsigned 16 bit big endian integer from 0 to 1000.

```dogma
rpm = uint(16, ~1000); # It's a uint, so already limited to 0~
```



Comments
--------

A comment begins with a hash char (`#`) and continues to the end of the current line. Comments are not valid in the [document header](#document-header).

```dogma
comment = '#' & (printable_ws ! LINE_END)* & LINE_END;
```

**Example**:

```dogma
dogma_v1 utf-8
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

Dogma comes with some fundamental functions built-in:

### `sized` Function

```dogma
sized(bit_count: uinteger, expr: bits): bits =
    """
    Requires that `expr` produce exactly `bit_count` bits.
    Expressions containing repetition that would have matched on their own are
    no longer sufficient until the production fills exactly `bit_count` bits.

    if `bit_count` is 0, `expr` has no size requirements.
    """;
```

**Example**: A name field must contain exactly 200 bytes worth of character data, padded with spaces as needed.

```dogma
name_field = sized(200*8, unicode(L,M,N,P,Zs)* & ' '*);
```

Technically, the `& ' '*` part is superfluous since Unicode category `Zs` already includes space, but it helps readability to highlight how to pad the field. One could even be more explicit:

```dogma
name_field    = sized(200*8, unicode(L,M,N,P,Zs)* & space_padding);
space_padding = ' '*;
```

**Example**: The "records" section can contain any number of length-delimited records, but must be exactly 1024 bytes long. This section can be padded with 0 length records (which is a record with a length field of 0 and no payload - essentially a zero byte).

```dogma
record_section     = sized(1024*8, record* & zero_length_record*);
record             = byte(var(length,~)) & byte(~){length};
zero_length_record = byte(0);
byte(v)            = uint(8,v);
```

### `aligned` Function

```dogma
aligned(bit_count: uinteger, expr: bits, padding: bits): bits =
    """
    Requires that `expr` and `padding` together produce a multiple of `bit_count` bits.
    If `expr` doesn't produce a multiple of `bit_count` bits, the `padding` expression
    is used in the same manner as the `sized` function to produce the remaining bits.

    if `bit_count` is 0, `expr` has no alignment requirements and `padding` is ignored.
    """;
```

**Example**: The "records" section can contain any number of length-delimited records, but must end on a 32-bit boundary. This section can be padded with 0 length records (which is a record with a length field of 0 and no payload - essentially a zero byte).

```dogma
record_section     = aligned(32, record*, zero_length_record*);
record             = byte(var(length,~)) & byte(~){length};
zero_length_record = byte(0);
byte(v)            = uint(8, v);
```

### `limited` Function

```dogma
limited(bit_counts: uintegers, expr: bits): bits =
    """
    Limits `expr` to any of the bit counts contained in `bit_counts`.
    """;
```

**Exammple**: A section contains at least 1 length delimited record (which can contain 1-100 bytes of payload each), and must be between 2 and 1024 bytes in total.

```dogma
section = limited(2*8~1024*8, record+);
record = uint(8,var(length, 1~100)) uint(8,~){length};
```

### `swapped` Function

```dogma
swapped(bit_granularity: uinteger, expr: bits): bits =
    """
    Swaps all bits of `expr` in chunks of `bit_granularity` size.

    For example, given some nominal bits = ABCDEFGHIJKLMNOP:
        swapped(8, bits) -> IJKLMNOPABCDEFGH
        swapped(4, bits) -> MNOPIJKLEFGHABCD
        swapped(2, bits) -> OPMNKLIJGHEFCDAB
        swapped(1, bits) -> PONMLKJIHGFEDCBA

    If `expr` doesn't resolve to a multiple of `bit_granularity` bits, the
    resulting expression matches nothing.


    if `bit_granularity` is 0, `expr` is passed through unchanged.
    """;
```

**Example**: A document begins with a 32-bit little endian unsigned int version field, followed by the contents. Only version 5 documents are supported.

```dogma
document  = version_5 & contents;
version_5 = swapped(8, uint(32, 5));
contents  = ...
```

**Example**: A header begins with a 16-bit unsigned int identifier that is actually bit-swapped, followed by contents based on the identifier.

```dogma
header               = bitswapped_uint16(var(identifier, ~)) & contents(identifier);
bitswapped_uint16(v) = swapped(1, uint(16, v));
contents(identifier) = [identifier = 1: type_1;
                        identifier = 2: type_2;
                       ];
type_1               = ...
type_2               = ...
```

### `var` Function

```dogma
var(variable_name: identifier, value: expression): expression =
    """
    Binds `value` to a local variable for subsequent re-use in the current rule.
    `var` transparently passes through the type and value of `value`, meaning that
    the context around the `var` call behaves as though only what the `var`
    function surrounded is present. This allows a match as normal, while also
    allowing the resolved value to be used again later in the rule.
    """;
```

**Example**: Match "abc/abc", "fred/fred" etc.

```dogma
sequence = var(repeating_value,('a'~'z')+) & '/' & repeating_value;
```

**Example**: BASH "here" document: Bind the variable "terminator" to whatever follows the "<<" until the next linefeed. The here-document contents continue until the terminator value is encountered again.

```dogma
here_document             = "<<" & var(terminator, NOT_LF+) & LF & here_contents(terminator) & terminator;
here_contents(terminator) = ANY_CHAR* ! terminator;
ANY_CHAR                  = ~;
LF                        = '\[a]';
NOT_LF                    = ANY_CHAR ! LF;
```

**Example**: Interpret the next 16 bits as a big endian unsigned int and bind the resolved number to the variable "length". That many following bytes make up the record contents.

```dogma
length_delimited_record = uint16(var(length, ~)) & record_contents(length);
record_contents(length) = byte(~){length};
uint16(v)               = uint(16, v);
byte(v)                 = uint(8, v);
```

### `eod` Function

```dogma
eod: expression =
   """
   A special expression that matches the end of the data stream.
   """
```

**Exammple**: A document contains any number of length delimited records (1-100 bytes), continuing until the end of the file.

```dogma
document = record* eod;
record = uint(8,var(length, 1~100)) uint(8,~){length};
```

### `unicode` Function

```dogma
unicode(categories: unicode_category ...): bits =
    """
    Creates an expression containing the alternatives set of all Unicode
    codepoints that have any of the given Unicode categories.

    `categories` is a comma separated list of 1 letter major category or 2-letter minor
    category names, as listed in https://www.unicode.org/versions/Unicode15.0.0/ch04.pdf#G134153

    Example: all letters and space separators: unicode(L,Zs)
    """;
```

**Example**: Allow letter, numeral, and space characters.

```dogma
letter_digit_space = unicode(N,L,Zs);
```

### `uint` Function

```dogma
uint(bit_count: uinteger, values: uintegers): bits =
    """
    Creates an expression that matches every discrete bit pattern that can be
    represented in the given values set as big endian unsigned integers of
    size `bit_count`.
    """;
```

**Example**: The length field is a 16-bit unsigned integer value.

```dogma
length = uint(16, ~);
```


### `sint` Function

```dogma
sint(bit_count: uinteger, values: sintegers): bits =
    """
    Creates an expression that matches every discrete bit pattern that can be
    represented in the given values set as big endian 2's complement signed
    integers of size `bit_count`.
    """;
```

**Example**: The points field is a 16-bit signed integer value from -10000 to 10000.

```dogma
points = sint(32, -10000~10000);
```


### `float` Function

```dogma
float(bit_count: uinteger, values: numbers): bits =
    """
    Creates an expression that matches every discrete bit pattern that can be
    represented in the given values set as big endian ieee754 binary floating
    point values of size `bit_count`.
    Note that expressions produced by this function will never include the
    special infinity values, NaN values, or negative 0, for which there are
    specialized functions.
    `bit_count` must be a valid size according to ieee754 binary.
    """;
```

**Example**: The temperature field is a 32-bit float value from -1000 to 1000.

```dogma
rpm = float(32, -1000~1000);
```

**Example**: Accept any 64-bit binary ieee754 float.

```dogma
any_float64 = float(64,~) | inf(64,~) | nan(64,~) | nzero(64);
```


### `inf` Function

```dogma
inf(bit_count: uinteger, sign: numbers): bits =
    """
    Creates an expression that matches big endian ieee754 binary infinity values
    of size `bit_count` whose sign matches the `sign` values set. One or two
    matches will be made (positive infinity, negative infinity) depending on
    whether the `sign` values include both positive and negative values or not.
    `bit_count` must be a valid size according to ieee754 binary.
    """;
```

**Example**: Negative infinity used as a record terminator.

```dogma
record     = reading* terminator;
reading    = float(32, ~) ! terminator;
terminator = inf(32, -1);
```


### `nan` Function

```dogma
nan(bit_count: uinteger, payload: sintegers): bits =
    """
    Creates an expression that matches every big endian ieee754 binary NaN value
    size `bit_count` with the given payload values set. NaN payloads can be
    positive or negative, up to the min/max value allowed for a NaN payload in a
    float of the given size (10 bits for float-16, 23 bits for float32, etc).
    `bit_count` must be a valid size according to ieee754 binary.

    Notes:
    - The absolute value of `payload` is encoded, with the sign going into the
      sign bit (i.e. the value is not encoded as 2's complement).
    - The payload value 0 is automatically removed from the possible matches
      because such an encoding would be interpreted as infinity.
    """;
```

**Example**: Quiet NaN used to mark invalid readings.

```dogma
record  = reading{32};
reading = float(32, ~) | invalid;
invalid = nan(32, 0x400001);
```


### `nzero` Function

```dogma
nzero(bit_count: uinteger): bits =
    """
    Creates an expression that matches a big endian ieee754 binary negative 0 value
    of size `bit_count`.
    `bit_count` must be a valid size according to ieee754 binary.
    """;
```

**Example**: Negative zero used to mark invalid readings.

```dogma
record  = reading{32};
reading = float(32, ~) | invalid;
invalid = nzero(32);
```



Dogma described as Dogma
------------------------

```dogma
dogma_v1 utf-8
- identifier  = dogma_v1
- description = Dogma metalanguage, version 1

document               = document_header & MAYBE_WSLC & start_rule & (MAYBE_WSLC & rule)*;

dogma_major_version    = '1';

document_header        = "dogma_v" & dogma_major_version & SOME_WS
                       & character_encoding & LINE_END
                       & header_line* & LINE_END
                       ;
character_encoding     = ('a'~'z' | 'A'~'Z' | '0'~'9' | '_' | '-' | '.' | ':' | '+' | '(' | ')')+;
header_line            = '-' & SOME_WS
                       & header_name & MAYBE_WS
                       & '=' & MAYBE_WS
                       & header_value & LINE_END
                       ;
header_name            = printable+;
header_value           = printable_ws+;

rule                   = symbol_rule | macro_rule | function_rule;
start_rule             = symbol_rule;
symbol_rule            = symbol & TOKEN_SEP & '=' & TOKEN_SEP & expression & TOKEN_SEP & ';';
macro_rule             = macro & TOKEN_SEP & '=' & TOKEN_SEP & expression & TOKEN_SEP & ';';
function_rule          = function & TOKEN_SEP & '=' & TOKEN_SEP & prose & TOKEN_SEP & ';';

expression             = symbol
                       | call
                       | switch
                       | string_literal
                       | maybe_ranged(codepoint_literal)
                       | combination
                       | builtin_functions
                       | variable
                       | grouped(expression)
                       ;

symbol                 = identifier_restricted;
macro                  = identifier_restricted & PARENTHESIZED(param_name & (ARG_SEP & param_name)*);
param_name             = identifier_restricted;
function               = function_no_args | function_with_args;
function_no_args       = identifier_restricted & TOKEN_SEP & type_specifier;
function_with_args     = identifier_restricted
                       & PARENTHESIZED(function_param & (ARG_SEP & function_param)*)
                       & TOKEN_SEP & type_specifier
                       ;
function_param         = param_name & TOKEN_SEP & type_specifier;
type_specifier         = ':' & TOKEN_SEP & type_alternatives & (TOKEN_SEP & vararg)?;
type_alternatives      = type_name & (TOKEN_SEP & '|' & TOKEN_SEP & type_name)*;
vararg                 = "...";
type_name              = basic_type_name | custom_type_name;
basic_type_name        = "expression"
                       | "bits"
                       | "condition"
                       | "number"
                       | "numbers"
                       | "uinteger"
                       | "uintegers"
                       | "sinteger"
                       | "sintegers"
                       ;
custom_type_name       = name;

call                   = identifier_any & PARENTHESIZED(call_param & (ARG_SEP & call_param)*);
call_param             = any_type;

switch                 = '[' & TOKEN_SEP & switch_entry+ & (TOKEN_SEP & switch_default)? & TOKEN_SEP & ']';
switch_entry           = condition & TOKEN_SEP & ':' & TOKEN_SEP & expression & TOKEN_SEP & ';';
switch_default         = ':' & TOKEN_SEP & expression & TOKEN_SEP & ';';

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

prose                  = '"""' & maybe_escaped(printable_wsl)+ & '"""'
                       | "'''" & maybe_escaped(printable_wsl)+ & "'''"
                       ;
codepoint_literal      = '"' & maybe_escaped(printable_ws ! '"'){1} & '"'
                       | "'" & maybe_escaped(printable_ws ! "'"){1} & "'"
                       ;
string_literal         = '"' & maybe_escaped(printable_ws ! '"'){2~} & '"'
                       | "'" & maybe_escaped(printable_ws ! "'"){2~} & "'"
                       ;
maybe_escaped(charset) = (charset ! '\\') | escape_sequence;
escape_sequence        = '\\' & (printable ! '[') | codepoint_escape);
codepoint_escape       = '[' & digit_hex+ & ']';

builtin_functions      = sized
                       | aligned
                       | limited
                       | swapped
                       | var
                       | eod
                       | unicode
                       | uint
                       | sint
                       | float
                       | inf
                       | nan
                       | nzero
                       ;

sized(bit_count: uinteger, expr: bits): bits =
    """
    Requires that `expr` produce exactly `bit_count` bits.
    Expressions containing repetition that would have matched on their own are
    no longer sufficient until the production fills exactly `bit_count` bits.

    if `bit_count` is 0, `expr` has no size requirements.
    """;

aligned(bit_count: uinteger, expr: bits, padding: bits): bits =
    """
    Requires that `expr` and `padding` together produce a multiple of `bit_count` bits.
    If `expr` doesn't produce a multiple of `bit_count` bits, the `padding` expression
    is used in the same manner as the `sized` function to produce the remaining bits.

    if `bit_count` is 0, `expr` has no alignment requirements and `padding` is ignored.
    """;

limited(bit_counts: uintegers, expr: bits): bits =
    """
    Limits `expr` to any of the bit counts contained in `bit_counts`.
    """;

swapped(bit_granularity: uinteger, expr: bits): bits =
    """
    Swaps all bits of `expr` in chunks of `bit_granularity` size.

    For example, given some nominal bits = ABCDEFGHIJKLMNOP:
        swapped(8, bits) -> IJKLMNOPABCDEFGH
        swapped(4, bits) -> MNOPIJKLEFGHABCD
        swapped(2, bits) -> OPMNKLIJGHEFCDAB
        swapped(1, bits) -> PONMLKJIHGFEDCBA

    If `expr` doesn't resolve to a multiple of `bit_granularity` bits, the
    resulting expression matches nothing.

    if `bit_granularity` is 0, `expr` is passed through unchanged.
    """;

var(variable_name: identifier, value: bits | numbers): bits | numbers =
    """
    Binds `value` to a local variable for subsequent re-use in the current rule.
    `var` transparently passes through the type and value of `value`, meaning that
    the context around the `var` call behaves as though only what the `var`
    function surrounded is present. This allows a match as normal, while also
    allowing the resolved value to be used again later in the rule.
    """;

eod: expression =
   """
   A special expression that matches the end of the data stream.
   """

unicode(categories: unicode_category ...): bits =
    """
    Creates an expression containing the alternatives set of all Unicode
    codepoints that have any of the given Unicode categories.

    `categories` is a comma separated list of 1 letter major category or 2-letter minor
    category names, as listed in https://www.unicode.org/versions/Unicode15.0.0/ch04.pdf#G134153

    Example: all letters and space separators: unicode(L,Zs)
    """;

uint(bit_count: uinteger, values: uintegers): bits =
    """
    Creates an expression that matches every discrete bit pattern that can be
    represented in the given values set as big endian unsigned integers of
    size `bit_count`.
    """;

sint(bit_count: uinteger, values: sintegers): bits =
    """
    Creates an expression that matches every discrete bit pattern that can be
    represented in the given values set as big endian 2's complement signed
    integers of size `bit_count`.
    """;

float(bit_count: uinteger, values: numbers): bits =
    """
    Creates an expression that matches every discrete bit pattern that can be
    represented in the given values set as big endian ieee754 binary floating
    point values of size `bit_count`.
    Note that expressions produced by this function will never include the
    special infinity values, NaN values, or negative 0, for which there are
    specialized functions.
    `bit_count` must be a valid size according to ieee754 binary.
    """;

inf(bit_count: uinteger, sign: numbers): bits =
    """
    Creates an expression that matches big endian ieee754 binary infinity values
    of size `bit_count` whose sign matches the `sign` values set. One or two
    matches will be made (positive infinity, negative infinity) depending on
    whether the `sign` values include both positive and negative values or not.
    `bit_count` must be a valid size according to ieee754 binary.
    """;

nan(bit_count: uinteger, payload: sintegers): bits =
    """
    Creates an expression that matches every big endian ieee754 binary NaN value
    size `bit_count` with the given payload values set. NaN payloads can be
    positive or negative, up to the min/max value allowed for a NaN payload in a
    float of the given size (10 bits for float-16, 23 bits for float32, etc).
    `bit_count` must be a valid size according to ieee754 binary.

    Notes:
    - The absolute value of `payload` is encoded, with the sign going into the
      sign bit (i.e. the value is not encoded as 2's complement).
    - The payload value 0 is automatically removed from the possible matches
      because such an encoding would be interpreted as infinity.
    """;

nzero(bit_count: uinteger): bits =
    """
    Creates an expression that matches a big endian ieee754 binary negative 0 value
    of size `bit_count`.
    `bit_count` must be a valid size according to ieee754 binary.
    """;

padding                = expression;
bit_count              = number;
bit_granularity        = number;
unicode_category       = ('A'~'Z') & ('a'~'z')?;
any_type               = condition | number | expression;

variable               = local_id | variable & '.' & local_id;
local_id               = identifier_restricted;

condition              = comparison | logical_ops;
logical_ops            = logical_or | logical_ops_and_not;
logical_ops_and_not    = logical_and | logical_op_not;
logical_op_not         = logical_not | maybe_grouped(condition);
comparison             = number & TOKEN_SEP & comparator & TOKEN_SEP & number;
comparator             = comp_lt | comp_le | comp_eq | comp_ne | comp_ge | comp_gt;
comp_lt                = "<";
comp_le                = "<=";
comp_eq                = "=";
comp_ne                = "!=";
comp_ge                = ">=";
comp_gt                = ">";
logical_or             = condition & TOKEN_SEP & '|' & TOKEN_SEP & condition;
logical_and            = condition & TOKEN_SEP & '&' & TOKEN_SEP & condition;
logical_not            = '!' & TOKEN_SEP & condition;

number                 = calc_add | calc_sub | calc_mul_div;
calc_mul_div           = calc_mul | calc_div | calc_mod | calc_pow_neg;
calc_pow_neg           = calc_pow | calc_neg_val;
calc_neg_val           = calc_neg | calc_val;
calc_val               = number_literal | variable | maybe_grouped(number);
calc_add               = number & TOKEN_SEP & '+' & TOKEN_SEP & calc_mul_div;
calc_sub               = number & TOKEN_SEP & '-' & TOKEN_SEP & calc_mul_div;
calc_mul               = calc_mul_div & TOKEN_SEP & '*' & TOKEN_SEP & calc_pow_val;
calc_div               = calc_mul_div & TOKEN_SEP & '/' & TOKEN_SEP & calc_pow_val;
calc_mod               = calc_mul_div & TOKEN_SEP & '%' & TOKEN_SEP & calc_pow_val;
calc_pow               = calc_pow_val & TOKEN_SEP & '^' & TOKEN_SEP & calc_neg_val;
calc_neg               = '-' & calc_val;

grouped(item)          = PARENTHESIZED(item);
ranged(item)           = (item & TOKEN_SEP)? & '~' & (TOKEN_SEP & item)?;
maybe_grouped(item)    = item | grouped(item);
maybe_ranged(item)     = item | ranged(item);

number_literal         = int_literal_bin | int_literal_oct | int_real_literal_dec | int_real_literal_hex;
int_real_literal_dec   = neg? digit_dec+
                       & ('.' & digit_dec+ & (('e' | 'E') ('+' | '-')? & digit_dec+)?)?
                       ;
int_real_literal_hex   = neg? & '0' & ('x' | 'X') & digit_hex+
                       & ('.' & digit_hex+ & (('p' | 'P') & ('+' | '-')? & digit_dec+)?)?
                       ;
int_literal_bin        = neg? & '0' & ('b' | 'B') & digit_bin+;
int_literal_oct        = neg? & '0' & ('o' | 'O') & digit_oct+;
neg                    = '-';

identifier_any         = name;
identifier_restricted  = identifier_any ! reserved_identifiers;
reserved_identifiers   = "sized"
                       | "aligned"
                       | "limited"
                       | "swapped"
                       | "var"
                       | "eod"
                       | "unicode"
                       | "uint"
                       | "sint"
                       | "float"
                       | "inf"
                       | "nan"
                       | "nzero"
                       ;

name                   = name_firstchar & name_nextchar*;
name_firstchar         = unicode(L,M);
name_nextchar          = name_firstchar | unicode(N) | '_';

printable              = unicode(L,M,N,P,S);
printable_ws           = printable | WS;
printable_wsl          = printable | WSL;
digit_bin              = '0'~'1';
digit_oct              = '0'~'7';
digit_dec              = '0'~'9';
digit_hex              = ('0'~'9') | ('a'~'f') | ('A'~'F');

comment                = '#' & printable_ws* & LINE_END;

PARENTHESIZED(item)    = '(' & TOKEN_SEP & item & TOKEN_SEP & ')';
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
HT                     = '\[9]';
LF                     = '\[a]';
CR                     = '\[d]';
SP                     = '\[20]';
```
