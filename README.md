Karl's Backus-Naur Form
=======================

Syntactic metalanguages have made mainly haphazard gains over the past 60 years, and still only describe text-based formats. KBNF is an attempt at a modernized metalanguage with better expressivity and binary support.



Design Objectives
-----------------

### Human readability

The main purpose of KBNF is to describe text and binary grammars in a concise, unambiguous, human readable way. The use case is describing data formats in documentation.

### Binary grammar support

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



Specification
-------------

[The KBNF Specification](kbnf.md)



Examples
--------

* Internet Prodocol, version 4: [ipv4.kbnf](ipv4.kbnf)
* Concise Text Encoding: [cte.kbnf](https://github.com/kstenerud/concise-encoding/blob/master/cte.kbnf)
* Concise Binary Encoding: [cbe.kbnf](https://github.com/kstenerud/concise-encoding/blob/master/cbe.kbnf)
