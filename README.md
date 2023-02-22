Karl's Backus-Naur Form
=======================

Syntactic metalanguages have made mainly haphazard gains over the past 60 years, and still only describe text-based formats. KBNF aims to be a modernized metalanguage with better expressivity and binary support.



Design Objectives
-----------------

### Human readability

The primary use case for KBNF is to describe text and binary grammars in a formalized way in documentation. Such a format must therefore be human-accessible, while also being concise and unambiguous.

### Better expressivity

Binary formats tend to be structured in much more complicated ways than text formats in order to optimize for speed, throughput, or ease-of-processing. A metalanguage for describing such data will require much more expressivity than current metalanguages allow. Better expressivity reduces boilerplate and improves readability even in text format descriptions.

* **Repetition**: Any expression can have repetition applied to it, for a specific number of occurrences or a range of occurrences.
* **Bindings**: Some constructs (such as here documents or length delimited fields) require access to previously decoded values. KBNF supports assigning decoded values to variables.
* **Exclusion**: Sometimes it's easier to express something as "everything except for ...".
* **Grouping**: Grouping expressions together is an obvious convenince that most other BNF offshoots have already adopted.
* **Prose**: In many cases, the actual encoding of something is already well-known and specified elsewhere, or is too complex for KBNF to describe adequately. Prose offers a free-form way to describe part of a grammar.
* **Whitespace not significant**: Many BNF notations (including the original BNF) assign meaning to whitespace (for example: whitespace as concatenation, or linefeeds to mark the end of a rule). This is bad from a UX perspective because it makes things harder for a human to parse in many circumstances, and reduces the ways in which a rule can be expressed over multiple lines.

### Character set support

Metalanguages tend to support only ASCII, with Unicode (encoded as UTF-8) generally added as an afterthought. This restricts the usefulness of the metalanguage, as any other character sets (many of which are still in use) have no support at all.

KBNF can be used with any character set, and requires the character set to be specified as part of the grammar document header.

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

KBNF documents are versioned to a particular KBNF specification so that changes can be made to the specification without breaking existing tooling.



Specification
-------------

[The KBNF Specification v1](kbnf_v1.md)



Examples
--------

Ethernet IEEE 802.3 frame, layer 2 (image from [Wikipedia](https://en.wikipedia.org/wiki/IEEE_802.1Q)):

![IEEE 802.3 frame](Wikipedia-TCPIP_802.1ad_DoubleTag.svg)

```kbnf
kbnf_v1 utf-8
- identifier  = 802.3_layer2
- description = IEEE 802.3 Ethernet frame, layer 2
- note        = Words are sent big endian, but octets are sent LSB first.

frame             = preamble
                  & frame_start
                  & dst_address
                  & src_address
                  & bind(etype, ether_type)
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
ether_type        = uint(16, bind(type, ~));
frame_check       = uint(32, ~);
dot1q_frame       = tag_control_info
                  & bind(etype, ether_type)
                  & payload_by_type(etype.type, 42)
                  ;
double_tag_frame  = service_tag
                  & uint(16, 0x8100)
                  & customer_tag
                  & bind(etype, ether_type)
                  & payload_by_type(etype.type, 38)
                  ;
tag_control_info  = priority & drop_eligible & vlan_id;
service_tag       = tag_control_info;
customer_tag      = tag_control_info;
priority          = uint(3, ~);
drop_eligible     = uint(1, ~);
vlan_id           = uint(12, ~);

payload_by_type(type, min_size) = [type >= min_size & type <= 1500: payload(type);
                                   type = 0x0800                  : ipv4;
                                   type = 0x86dd                  : ipv6;
                                   # Other types omitted for brevity
                                  ];
payload(length)                 = uint(8,~){length};
ipv4: expression                = """https://somewhere/ipv4.kbnf""";
ipv6: expression                = """https://somewhere/ipv6.kbnf""";
```

### Other Examples

* Internet Prodocol, version 4: [ipv4.kbnf](ipv4.kbnf)
* Concise Text Encoding: [cte.kbnf](https://github.com/kstenerud/concise-encoding/blob/master/cte.kbnf)
* Concise Binary Encoding: [cbe.kbnf](https://github.com/kstenerud/concise-encoding/blob/master/cbe.kbnf)
