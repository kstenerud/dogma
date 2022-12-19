Karl's Bachus-Naur Form
=======================

Version 0

Each rule in the grammar defines one symbol, in the form:

    symbol ::= expression

Features
--------

Operations

* Concatenation
* Alternative
* Subtraction
* Group
* Capturing group

* Codepoint range
* Comments
* Escape sequences
* Unicode as a first-class citizen
* Codepoint categories
* Fine-grained repetition
* String literal
* Codepoint literal
* Prose

Precedence, from highest (binding tightest - at the top), to lowest (binding loosest - at the bottom):

* Strings, Symbols
* Comment
* Value range
* Repetition
* Grouping
* Concatenation
* Alternative

Notes:

* Symbols are case sensitive.
* Letter case has no special meaning, although terminals are sometimes written in all uppercase when it helps visual clarity.
* Ranges are closed
* Repeats are closed

Ultimately, sbnf views everything as sequences of bytes. Transformations change the ordering and encoding of what is ultimately a stream of bytes.

If values < 0 are allowed, assume two's complement

Overflow not allowed? e.g. media type bigger than container
- unsized values (numeric literals, ranges etc) resize to fill their containers
- top-level objects assume a container size 8



calculation used in:
- bit array length
- condition

operand can be:
- literal
- captured variable (which gets fully rendered into an integer)
  - converting to unsized integer would be a problem for verbatim:
       escape_verbatim ::= '.' c(terminator: char_sentinel+) ((CR LF) | LF | SP) char_cte* terminator
  - or: when used in a condition or calculation, gets converted to unsized integer.

if(calculation condition calculation: expression)
b(calculation: expression)

calculation: operand operator operand ==> unsized integer
operand: expression converted to unsized integer
- calculation cannot be used in an expression. Only in if() and b()
  - calculation group not the same as expression group because expression group cannot contain calculations.
  - how to model this, because calculation can contain expressions?
Technically calculation being unsized could in theory be used in an expression, but would that even work?
Calculation and expression are different types. unsized as well?
- expression can be converted to calculation (effectively becoming unsized)
- calculation can be used in if and b, where it is effectively converted to unsized
- calculation operands are unsized
- expression can be converted to unsized, where it fills its containing object
- calculation can reason about the contents, but doesn't describe what's there, so it's not an expression. Better word for expression?

Calculation and conditional are pretty close to the same thing

at least one part of a calculation or condition must be a variable? Or maybe just allow all literals b(8*16: xxxxxx)

expression converted to unsized only in functions (left or right side?) as part of the evaluation process
- so group notation is contextual...
- Add contexts to bnf?

Contexts:

Contexts are nested scopes.
Main context is "main" and doesn't have to be named.
use something like context_name:expression or the like.
inside a context, can call parent:some_exp? What naming to use for parent?
- requires changing function separator to comma.

```
context arithmetic:

calculation            ::= operand MAYBE_WSL operator MAYBE_WSL operand // truncates, must yield a positive int? no...
// If this allows expressions, we'd have problems with grouping...
operand                ::= uinteger | symbol | calculation_group | calculation // symbol is a previously realized symbol resolving to an operand
calculation_group      ::= "(" MAYBE_WSL calculation MAYBE_WSL ")"
operator               ::= operator_add | operator_subtract | operator_multiply | operator_divide
operator_add           ::= "+"
operator_subtract      ::= "-"
operator_multiply      ::= "*"
operator_divide        ::= "/"

```

Can we just allow expressions and operators, comparators instead?
- Would not make sense outside of `if` and `b` functions...

Types:
- expressions
- calculations: Work on operands
- operands: expressions are converted to unsized int
- conditions: Work on operands
- functions: Accept anything and produce anything

integer literals are operands
codepoint and string literals are expressions
b(x: y) converts anything to a expression


sign extend, unsigned extend...
- maybe we do need signed and unsigned type? Function to convert/cast?

Calculation with concat would:
- promote to the highest number of bits
- combine the two bit patterns
- what about signed?
- what about floats? Should these be accommodated in length calcs?
- How far should symbol back references go? What about ambiguity?

Precedence:
- group
- range (~)
- repetition
- exclude (!)
- alternative (|)
- concat

Length calculation precedence:
- group
- range (~)
- exclude (!)
- alternative (|)
- multiply, divide (*/)
- addition, subtraction (+-)


encodings: be, le, uleb128, zigzag
Unsized values expand to their parent's size
bit-length must be fully resolved by the time it is reached
Document is logically "big endian"
Slices and ranges are closed

```
time               ::= time_0_utc | time_0_tz | time_999_utc | time_999_tz | time_999999_utc | time_999999_tz | time_999999999_utc | time_999999999_tz | time_zero

time_zero          ::= b(24: 0)

time_0_utc         ::= t(le: b(24: b(4: xf)  hour minute second                  b(2: 0) tz_is_utc ) )
time_0_tz          ::= t(le: b(24: b(4: xf)  hour minute second                  b(2: 0) tz_follows) ) timezone
time_999_utc       ::= t(le: b(32: b(2: x3)  hour minute second subsec_999       b(2: 1) tz_is_utc ) )
time_999_tz        ::= t(le: b(32: b(2: x3)  hour minute second subsec_999       b(2: 1) tz_follows) ) timezone
time_999999_utc    ::= t(le: b(40:           hour minute second subsec_999999    b(2: 2) tz_is_utc ) )
time_999999_tz     ::= t(le: b(40:           hour minute second subsec_999999    b(2: 2) tz_follows) ) timezone
time_999999999_utc ::= t(le: b(56: b(6: x3f) hour minute second subsec_999999999 b(2: 3) tz_is_utc ) )
time_999999999_tz  ::= t(le: b(56: b(6: x3f) hour minute second subsec_999999999 b(2: 3) tz_follows) ) timezone
tz_is_utc          ::= b(1: 0)
tz_follows         ::= b(1: 1)

hour               ::= b(5: 0 ~ 23)
minute             ::= b(6: 0 ~ 59)
second             ::= b(6: 0 ~ 60)
subsec_999         ::= b(10: 0 ~ 999)
subsec_999999      ::= b(20: 0 ~ 999999)
subsec_999999999   ::= b(30: 0 ~ 999999999)

timezone           ::= tz_area_loc | tz_lat_long
tz_area_loc        ::= b(8: area_loc_length tz_form_area_loc) b(area_loc_length*8: area_loc)
tz_lat_long        ::= bl(32: longitude latitude tz_form_lat_long)
longitude          ::= b(16: 0 ~ 18000)
latitude           ::= b(15: 0 ~ 9000)
area_loc_length    ::= b(7: 1 ~ 127)
tz_form_area_loc   ::= b(1: 0)
tz_form_lat_long   ::= b(1: 1)
area_loc           ::= ("A"~"Z") (("a"~"z") | ("A"~"Z") | "-" | "_")*
tz_utc_offset      ::= b(24: b(6: x3f) minutes_offset b(8: 0) )
minutes_offset     ::= b(12: -1439 ~ 1439)

date               ::= b(16: year_low_bits month day) year_high_bits
year_low_bits      ::= year[0:7]
year_high_bits     ::= year[8:]
year               ::= t(zigzag: . ! 0)
month              ::= b(4: 1 ~ 12)
day                ::= b(5: 1 ~ 31)

```


/////////////////////////

_function(param1, param2, param3 ...) ::= production
x ::= bl(bitcount: production)
rhs function must specify number of bits

Bit group: b(bitcount: expression)
- little endian: bl(bitcount: expression)
- big endian: bb(bitcount: expression)
For bitcounts > 8, must specify endianness: bl(16: #xxx) bb(16: #xxx)
raw #xxx notation is shorthand for b(8: #xxx)

OR

- bl64(expression)
- bb64(expression)

What about variable sized fields?
- b(2,4: expression) // Does this even happen? Probably not.

special namespacing for custom functions: _tz()
- Or don't bother?

What does endianness mean at the bit level? Which one gets sent first?
- What about bits in one endianness, bytes in the other?
- Maybe only allow specifying byte endianness?

For strings, how to specify charset?
- must specify at the file level: `cbnf version 1 iso-8859-1`


time-1           ::= bl(40: reserved-1 hour minute second subsecond-1 magnitude-1 tz-present)
time-1           ::= bl40(reserved-1 hour minute second subsecond-1 magnitude-1 tz-present)
time-1           ::= bl:40(reserved-1 hour minute second subsecond-1 magnitude-1 tz-present)

/////////////////////////

time             ::= (time-0 | time-1 | time-2 | time-3) tz(tz-present)
tz(#0)           ::= b(0)
tz(#1)           ::= tz-area-loc | tz-lat-long | tz-utc-offset

time-0           ::= bl(32: reserved-0 hour minute second subsecond-0 magnitude-0 tz-present)
time-1           ::= bl(40: reserved-1 hour minute second subsecond-1 magnitude-1 tz-present)
time-2           ::= bl(56: reserved-2 hour minute second subsecond-2 magnitude-2 tz-present)
time-3           ::= bl(64: reserved-3 hour minute second subsecond-3 magnitude-3 tz-present)

reserved-0       ::= b(4: #0)
reserved-1       ::= b(2: #0)
reserved-2       ::= b(0: #0)
reserved-3       ::= b(6: #0)
hour             ::= b(5: [#0-#23])
minute           ::= b(6: [#0-#59])
second           ::= b(6: [#0-#60])
subsecond-0      ::= b(0)
subsecond-1      ::= b(10: [#0-#999])
subsecond-2      ::= b(20: [#0-#999999])
subsecond-3      ::= b(30: [#0-#999999999])
magnitude-0      ::= b(2: #0)
magnitude-1      ::= b(2: #1)
magnitude-2      ::= b(2: #2)
magnitude-3      ::= b(2: #3)
tz-present       ::= b(1)

tz-area-loc      ::= b(8: length tz-form-area-loc) b(length*8: area-loc)
tz-lat-long      ::= bl(32: longitude latitude tz-form-lat-long)
longitude        ::= b(16: [#0-#18000])
latitude         ::= b(15: [#0-#9000])
length           ::= b(7: [#1-#127])
tz-form-area-loc ::= b(1: #0)
tz-form-lat-long ::= b(1: #1)
area-loc         ::= [A-Z] (a-zA-Z-_)*
tz-utc-offset    ::= b(24: b(6:#x3f) minutes-offset b(8:#0) )

Problem of subobjects with byte order in superobjects with byte order:
- x ::= bl:32(bl:16 bl:15 b:1) // How is 15-bit part encoded?
- x ::= bl:64(bl:15 bl:15 bl:15 bl:15 b:4) // How are 15-bit portions encoded? 8-bit low portion followed by 7-bit high?
- x ::= bl:64(bl:32 bl:32) // Would cause double-endianness swap: Once for 32-bit value, once for 64-bit container

Maybe need to leave endianness unspecified in inner objects when superobject is multibyte?
- x ::= bl:32(b:16 b:15 b:1)
- x ::= bl:64(b:15 b:15 b:15 b:15 b:4)
- x ::= bl:64(b:32 b:32)

So, only outermost bit specification can have endianness.
- bb:x() // Big endian. Can only contain b:x()
- bl:x() // Little endian.  Can only contain b:x()
- b:x() // Part of parent object (logically big endian).  Can only contain b:x()
- b:x can only occur at top level for bit count <= 8

Or allow bit objects to contain endian bit objects for weird situations? Maybe not...

Maybe disallow b:x at top level on principle?

    bl(((l1+l2)*8): [a-z]*)
    bl:8+(l1+l2)([a-z]*)
    bl:8+(l1+l2)<[a-z]*>

`#xxx` alone implies `b(8: #xxx)`?
- What about `bl(32: #4090)`
- What about `bl(32: #x3f [a-z]{3})`
- What about `bl(length: #x3f [a-z]+)` ... maybe need to specify here?
- `#xxx` at top level alone maybe?
- assume inner values are sized to fill their containers?
  - `#xxx` fills its container
  - at top level, container is assumed to be 8 bits
  - if multiple `#xxx`, must qualify all but one
  - same kind of thing with `b(length: [#x20-#x40]+)` maybe?
  - length field cannot be range

Or maybe use types?
- `i32-x7fffffff`
- `u8xff`


---------------------

Need to know:
- number of bits: can be a calculation with parens and basic integer arithmetic +-*/
- endianness
- contents: A group like any other?

    l(8: [a-z]*)
    l:8([a-z]*)

    l((l1+l2)*8: [a-z]*)
    l:8+(l1+l2)([a-z]*)

Values are untyped & unsized, take on the size of their container:

    l(16: #4f) // 16 bits 0x4f
    l(7: #4f) // 7 bits 0x4f

Bare values with no size specifying container are 8 bits:

    #x4f // b(8: #x4f)

Top level endianness is effectively big endian... Is this useful to say?

l inside l will get double swapped.

    l(32: l(16:[#0-4fff]) [a-z]{2} )

Numerics start with # and are decimal unless prefixed with b, o, x (after optional sign).

Special encodings like zigzag or leb128 use prose to link to spec...

b or l with no specification implies no range restriction:

    b(0)  // Equivalent to b(0: #0) i.e. nothing
    l(15) // Equivalent to l(15: #0-#7fff)

Contents that don't fill the bits of the parent are padded with 0 bits at the top end
Contents must not overfill the parent?

unsized values can be bound to a symbol and remain unsized:

    mysize ::= #24
    b(mysize: ...)
    b(8: mysize)
    b(64: mysize)


Two types:
- constant number
- variable
- This doesn't work for b(mylength: ...)
- must fully resolve to a value? Even with concatenation it could work...
- must be within the same production?
- must be unambiguous?













### Sets



#### Byte Set

Byte sets are used for defining binary grammars. Byte sets and character sets must not both be present in the same grammar.

Byte sets are placed between square brackets. Bytes are represented in the same 2-digit hexadecimal notation as in most programming languages (`0x` followed by two hexadecimal digits). Character values are not allowed in byte sets (only special function characters such as `^` and `-`). If the set contains only one byte value, the square brackets may be omitted.

Examples:

    [^0x00]     // Matches any non-null byte
    [0x00-0x7f] // Matches bytes with the upper bit cleared
    0x91        // Matches the byte value 0x91


#### Character Set

Character sets are used for defining textual grammars. Byte sets and character sets must not both be present in the same grammar.

Character sets define a set of characters that would satisfy the current expression. Non-whitespace characters placed between square brackets represent the characters in a set (whitespace characters are ignored), with the following exceptions:

* A carat (`^`) character placed at the beginning of the set inverts the set, matching everythng _except_ the characters specified.
* A dash (`-`) character means the (inclusive) range between the codepoint on the right and the codepoint on the left of the dash. The codepoint on the right must be numerically higher than the codepoint on the left.
* A backslash (`\`) character initiates an escape sequence.

Examples:

    [0-9ax:]              // Matches any of 0 1 2 3 4 5 6 7 8 9 a x :
    [0-9\{2190}-\{2199}]` // Matches any digit from 0 to 9 or arrow from ← to ↙
    [^ \\ / | -]          // Matches any character except for \ / | -


### String Literals

String literals must be matched in their entirety, and are contained within either double-quote or single-quote delimiters. String literals in a binary grammar are assumed to be encoded in UTF-8.

Examples:

    "double-quoted-string"
    'single-quoted-string'


### Escape Sequences

Escape sequences can be used in character sets and in string literals.

`\` initiates an escape sequence. The next character following the escape initator represents its literal value instead of whatever function it would normally invoke (for example inversion `^` or range `-` in character sets). The only exception is `{`, which initiates a unicode codepoint literal.

    "\{2190} arrows \{2192}" // Matches ← arrows →
    [\^\-\\\{a}]             // Matches "^", "-", "\", or newline (u+000a)
    "Hello \"world\""        // Matches Hello "world"


### Repetition

* Specific number of times: `expression{4}` (matches 4 instances of expression)
* Range of times (inclusive, non-greedy): `expression{2,4}` (matches 2, 3, or 4 instances of expression)
* Lower bound (inclusive, non-greedy): `expression{2,}` (matches 2 or more instances of expression)
* Upper bound (inclusive, non-greedy): `expression{,4}` (matches 0, 1, 2, 3, or 4 instances of expression)
* Zero or one time: `expression?` (equivalent to `expression{0,1}`)
* Zero or more times: `expression*` (equivalent to `expression{0,}`)
* One or more times: `expression+` (equivalent to `expression{1,}`)


### Combination

* Match expression A followed by expression B: `A B`
* Match expression A or expression B: `A | B`.
* Group one or more expressions into a single expression by enclosing in parentheses: `A | (B C)` (match either A, or B followed by C)
* Capture a group to match the resolved contents later by prefixing with `\`: `\(expression)`. Groups are assigned a monotonically increasing ID number in order of definition in the current rule (starting at 1), and are referred to using `\N`, where N is the ID number. For example `\([0-9]+) \([a-z]+) "," \2 \1` would match `123abc,abc123`.



Comments
--------

A comment begins with "//" and continues to the end of the line.

    // A comment


------------------------------

Types are:
- expression
- operand
- condition

captured expression is bit-converted to an integer (unsigned?) when used as an operand

/////////////////////////////////////////////////////

bit array can be converted to an int
- bit array sign decided by allowed range

bit array or transformation
- or maybe make a new builtin _int

transforms convert from custom encoding to bits or integer

_enc_bits: encoded bits via named process whose decoded bits value matches expression (value and size). Can be bound as bit array
_enc_int: encoded int via named process whose decoded int value matches int range. Can be bound as int

_enc_bits(little_endian, _bits(...))
_enc_int(uleb128, 0~)

_bits: encoded int in specific number of big endian bits, 2's complement if int range includes negatives else unsigned. can be bound as bit array

integer type is actually int range, which collapses to specific int on match
int literal is specific int

so int_range and integer...

bits resolve into value and size
int resolves into unsized

so _bind(length, _bits(8, 0~)) is bits
- _bind(length, _enc_int(uleb128, 0~)) is integer

Passing a bits to something accepting int takes its value as unsized

---------------------------
in ipv4, what if later we need to know which option is first?
- would need to store the option contents and compare to option_eool
- comparison would concatenate bits, strip size, present as integer. But what would signed-unsigned be?


int literal is type int
calculation is type int
condition is type bool
codepoint is type bits
string is type bits
_bits is type bits
expression is type bits?
_enc_bits is type bits
_enc_int takes int but is actually bits in the document...
- has no size so must be int?
- therefore not an expression?

bits is an array of bits that can be zero length
int is a signed integer of indeterminate size
bool is just true or false

on binding bits...
- was just auto converting when bits variable is being used in an integer context, but maybe needs explicit conversion?
  - _sint() implies bits are in 2s complement
  - _uint()
  - Or just on use of bits var, auto convert to int. BUT this requires knowing what the possible range was before realizing...
  - Use _signed() and default to unsigned?

Probably better to require explicit convert bits to sint or uint...
- Not a very common operation, so fine to have a bit of boilerplate

Names of functions can appear on RHS

    production = blah | _bits | ...

    operand = blah | _sint | _uint | int_literal

Bind can capture all 3 types, which can then be used wherever those types are valid.
No automatic type conversion

Can say that _sint(x) is basically _enc_int(twos_complement, x)? Or not?
- sint takes bits, produces int
- enc_int takes int, produces int
  - but is bits match on document so is expression?
    - if I wanted to bind and then match the same bits later...

accept operand in ranges. int accepting contexts accept int range as well?

_enc_int takes int as param, represents bits on disk.
- on bind, can represent either:
  - bits when repeated as an expression
  - int when passed to an int context

Int range is similar. Int ranges become single int on realization through a production, just like bits alternatives become single bits.
- int range in a _enc_int production is basically like a huge bits alternative.

The problem is how we determine whether to treat _enc_int as an int or as bits when passing it around...
- as bits it would be useless except when wanting a repeat later.
- maybe put the bind inside:
  - _enc_int(blah, _bind(name, 0~100)) -> name is int
  - _bind(name, _enc_int(blah, 0~100)) -> name is bits

So:
- _enc_int and _enc_bits have type bits
- bind inside of them for the non-encoded values
- _sint(x) = _enc_int(twos_complement, x), where x is range
- _sint(_bind(name, x)) = _enc_int(twos_complement, _bind(name, x)), where x is range
  - Actually how does sint know what size to encode since it must be bits?

_enc_int will encode into bits of indeterminate size, but for 2s-complement or little-endian, we need bits of determinate size.
- little-endian needs to be _enc_bits
- 2s complement just an automatic operation in _bits when input is negative?
- allow _enc_int to specify resulting bits size?
  - some encodings might support this...

-------------------

### Types

- bits
- sint
- uint
- real
- bool
- type

- production: A production is more of a constraint on the bits that result in a successful parse

bits are always the result of a production?
- So any production can be used in a bits context
- bits are essentially productions?

### Conversions

- as(t: sint | uint | real, val: sint | uint | real)

sint(val) = as(sint, val)
uint(val) = as(uint, val)
real(val) = as(real, val)

### Encoding

Encodings are specified like functions, but must specify their parameter types. param names should give a hint about their purpose.
- maybe require all functions to specify param types and result types?

First param must be the value to encode.

unsigned_integer(value: uint, bit_count: uint): bits = """http://blah"""
signed_integer(value: sint, bit_count: uint): bits = """http://blah"""
ieee754_binary(value: real, bit_count: uint): bits = """http://blah"""
little_endian(value: bits): bits = """aaa"""


encoding that doesn't specify params means the actual values encoded are outside of the scope of the grammar.

### Other

- if(condition: bool, on_true: production): production
- bind(name: identifier, value: bits | sint | uint | bool | production)
- cp_category(name: ?)


Add << and >> to calculation, same precedence as mult/div

sint and uint are unsized
bits is sized representing untyped value

productions can take parameters or not. If no params, no parentheses

Mixing types in calculations promotes to the widest operand's type: uint -> sint -> real

reals round down on conversion to int


chars are basically bits encoded according to a scheme.
- quoted chars and strings are convenience forms for these encodings.

"a"~"z" = utf8(x61~x7a)

"abc" = utf8(x61) utf8(x62) utf8(x63)

Is there a way to limit a production size?

media                 = u16(x7ff3) uleb128(bind(mt_length, 1~)) limit(mt_length*8, media_type) array_chunk_uint8+;
media_type            = media_type_word '/' media_type_word;

- limit(v: production, bit_count: uint)
- pad(v: production, bit_count: uint, padding: production)

note: must disallow x, o, b int values as identifier names

Are these needed:
- as_sint(sint | uint | real): sint
- as_uint(sint | uint | real): uint
- as_real(sint | uint | real): real
