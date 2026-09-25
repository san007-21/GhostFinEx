---
name: audit
description: "Grade the work on spec, design, correctness, and concision, naming the top gaps"
metadata:
  freebuff-builtin: "audit"
---

# Four-dimension audit

Do not change anything. Grade the current work the way the most demanding principal engineer and product reviewer would, on four dimensions, each 0-10:

1. SPEC — how completely the work does what the request asked, and only that. Judge against the request as written: every requested outcome present and working, nothing added the user did not ask for. When the request asked for something to be built from scratch, also judge the product decisions it left to the agent. When it asked to investigate, fix, or change one behavior, any new feature, new UI, or rewrite of working code counts AGAINST this dimension however well it is built — name each such addition so the next pass can remove it. Only working capability counts.
2. DESIGN — the structure of the code: separated concerns, single ownership of state, a change to one behavior landing in one obvious place. Name the files that violate this.
3. CORRECTNESS — exercise the real surface briefly rather than re-reading claims: run it, click or invoke the main flows, note anything broken, dead-ended, or janky, including in behavior the work itself added.
4. QUALITY — concision: unnecessary lines, branches, abstractions, files, dead scaffolding, duplicated logic; estimate how much smaller the same behavior could be.

Report a score per dimension and, for each, the two or three highest-value concrete gaps — specific capabilities, files, behaviors, not generalities — ordered by how much closing them would raise that dimension. End with the single most valuable next pass overall and why. Be harsh: an inflated grade wastes the budget that could have fixed the gap. Two measured failure modes to avoid: CORRECTNESS may only be graded from behavior you exercised or earlier passes demonstrably proved — anything asserted but unexercised caps it at 6, because audits that skim grade broken work +2 over reviewers who probe. QUALITY is graded against the smallest version of the same behavior — scaffolding, repetition, and machinery you would delete count fully against it; audits run about a point generous here. And DESIGN also runs measurably generous: grade it against structure a maintainer would PRAISE — one owner per piece of state, concerns separable without reading everything — not structure that merely works; a grown app still living in one or two files caps design at 5 no matter how clean those files read.