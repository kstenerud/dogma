<p align="center"><img width="400" alt="Dogma Logo" src="img/dogma-logo.svg"/><h3 align="center">


The Dogma Metalanguage
======================

Dogma is a human-friendly metalanguage for describing data formats (text or binary) in documentation.

Dogma follows the familiar patterns of [Backus-Naur Form](https://en.wikipedia.org/wiki/Backus%E2%80%93Naur_form), with a number of innovations that make it also suitable for describing binary data.



Specification
-------------

[The Dogma Specification v1](v1/dogma_v1.md)



Syntax Highlighter (VS Code)
----------------------------

* [From the marketplace](https://marketplace.visualstudio.com/items?itemName=kstenerud.dogma-v1)
* [From source](https://github.com/kstenerud/dogma-tmlanguage)



Example
-------

To demonstrate the power of Dogma, here is an Ethernet IEEE 802.3 frame, layer 2 (image from [Wikipedia](https://en.wikipedia.org/wiki/IEEE_802.1Q)):

![IEEE 802.3 frame](v1/img/Wikipedia-TCPIP_802.1ad_DoubleTag.svg)

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
                  & [
                      etype.type = 0x8100: dot1q_frame;
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

payload_by_type(type, min_size) = [
                                    type >= min_size & type <= 1500: generic_payload(type);
                                    type = 0x0800                  : ipv4;
                                    type = 0x86dd                  : ipv6;
                                    # Other types omitted for brevity
                                  ];
generic_payload(length)         = uint(8,~){length};
ipv4: bits                      = """https://somewhere/ipv4.dogma""";
ipv6: bits                      = """https://somewhere/ipv6.dogma""";
```

### Other Examples

* [Examples in this repo](v1/examples)
* Concise Text Encoding: [cte.dogma](https://github.com/kstenerud/concise-encoding/blob/master/cte.dogma)
* Concise Binary Encoding: [cbe.dogma](https://github.com/kstenerud/concise-encoding/blob/master/cbe.dogma)



Design Objectives
-----------------

### Human readability

Although Dogma is parser-friendly, its primary purpose is for documentation. It must therefore be easy for a human to read and write, and must favor recognizable patterns over special case notation (which is harder to remember).

Whitespace _never_ has any semantic meaning in Dogma. It serves purely for token separation and for grammar aesthetics.

### Expressiveness

Binary formats tend to be structured in much more complex ways than text formats in order to optimize for speed, throughput, and ease-of-processing.

Dogma can describe data down to the bit level, and includes a number of built-in functions to help with complex data matching tasks.

Calculations aid with length and offset fields, and optional/variable-sized structures can be conditionally parsed. Parsing can also "branch" temporarily to another part of the document (useful for directory-payload style formats).

Variables and macros offer a limited but balanced way for passing (immutable) context around.

### Character set support

Dogma can be used with any character set. Most codepoints can be directly input, and troublesome codepoints can be represented through escape sequences.

Unicode characters can be selected by their [Unicode category](https://unicode.org/glossary/#general_category).

### Future proof

No specification is perfect, nor can it stand the test of time. Eventually an incompatible change will become necessary in order to stay relevant.

Every Dogma document records the Dogma specification version it was built against so that changes can be made to the specification without breaking existing grammars and tooling.
