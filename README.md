The Dogma Metalanguage
======================

Dogma is a human-friendly metalanguage for describing data formats (text or binary) in documentation.

Dogma follows the familiar patterns of [Backus-Naur Form](https://en.wikipedia.org/wiki/Backus%E2%80%93Naur_form), with a number of innovations that make it also suitable for describing binary data.



Specification
-------------

[The Dogma Specification v1](dogma_v1.md)



Syntax Highlighter (VS Code)
----------------------------

* [From the marketplace](https://marketplace.visualstudio.com/items?itemName=kstenerud.dogma-v1)
* [From source](https://github.com/kstenerud/dogma-tmlanguage)



Example
-------

To demonstrate the power of Dogma, here is an Ethernet IEEE 802.3 frame, layer 2 (image from [Wikipedia](https://en.wikipedia.org/wiki/IEEE_802.1Q)):

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

### Other Examples

* [Examples in this repo](examples)
* Concise Text Encoding: [cte.dogma](https://github.com/kstenerud/concise-encoding/blob/master/cte.dogma)
* Concise Binary Encoding: [cbe.dogma](https://github.com/kstenerud/concise-encoding/blob/master/cbe.dogma)



Design Objectives
-----------------

Dogma is designed primarily for documentation purposes (although it is parser friendly). It's design objectives are:

### Human readability

First and foremost it must be human friendly since documentation is for explaining and describing. It must therefore be human-accessible, while also being concise and unambiguous. Comments are also important for guiding readers through the more complex portions of a format.

### Improved expressiveness

Binary formats tend to be structured in much more complicated ways than text formats in order to optimize for speed, throughput, and ease-of-processing. A metalanguage requires much more expressiveness in order to describe such data.

* **Repetition**: Any sequence of bits can have repetition applied to it, for a specific number of occurrences or a range of occurrences.
* **Variables**: Some constructs (such as ["here" documents](https://en.wikipedia.org/wiki/Here_document) or length delimited fields) require access to values decoded elsewhere. Dogma supports assigning decoded values to variables.
* **Exclusion**: Sometimes it's easier to express something as "this set, except for ...".
* **Grouping**: For overriding the default operator precedence, or to make things more clear for a reader.
* **Prose**: In many cases, the actual encoding of something is already well-known and specified elsewhere, or is too complex for Dogma to describe adequately. Prose offers a free-form way to describe part of a grammar.
* **Whitespace not significant**: Whitespace _never_ has any implied meaning (e.g. many BNF-style grammars use whitespace to imply concatenation). Whitespace is only used to separate tokens, and for visual alignment.

### Binary grammar support

Binary grammars have different needs from textual grammars, and require special support:

* **Bit Arrays**: Binary formats tend to work at bit-level granularity, and thus require support for arbitrarily sized bit arrays.
* **Variables, Macros & Functions**: Binary formats often represent data in complex ways that can't be parsed without passing some context around.
* **Conditionals & Logic**: Binary formats often include or exclude portions based on encoded values elsewhere. Evaluating these requires the use of conditionals and logic operators.
* **Calculations**: Many binary field sizes are determined by data stored elsewhere in the document, and often they require calculations of some sort to determine the final field size.
* **Functions**: Binary data often undergoes transformations that are too complex for normal BNF-style rules to express (for example [LEB128](https://en.wikipedia.org/wiki/LEB128)). Functions offer a way to escape from the metalanguage syntax.

### Character set support

Metalanguages tend to support only ASCII, with Unicode (encoded as UTF-8) generally added as an afterthought. This restricts the usefulness of the metalanguage, as any other character sets (many of which are still in use) have no support at all.

Dogma can be used with any [character set](https://www.iana.org/assignments/character-sets/character-sets.xhtml), and requires the character set to be specified as part of the grammar document header.

### Codepoints as first-class citizens

* Codepoints beyond the ASCII range must be directly inputtable into a grammar document.
* Difficult codepoints must also be supported (via escape sequences).
* [Unicode categories](https://unicode.org/glossary/#general_category) must be supported.

### Future proof

No specification is perfect, nor can it stand the test of time. Eventually an incompatible change will become necessary in order to stay relevant.

Every Dogma document records the Dogma specification version it was built against so that changes can be made to the specification without breaking existing tooling.
