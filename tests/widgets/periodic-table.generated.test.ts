// ⚠️ AUTO-GENERATED TEST FILE
// This file was automatically generated from production widget data.
// Do not modify manually - regenerate if needed.

import { describe, expect, it } from "bun:test"
import type { z } from "zod"
import { generatePeriodicTable, PeriodicTableWidgetPropsSchema } from "@/lib/widgets/generators/periodic-table"

type PeriodicTableInput = z.input<typeof PeriodicTableWidgetPropsSchema>

describe("periodicTable widget (generated from production data)", () => {

  it("periodicTable - type-1-matching-element-to-correct-atomic-number-m", () => {
    // Source: Question x47a7a94ccb4a8ded (Type 1: Matching element to correct atomic number & mass)
    const input = {
      "alt": "Periodic table of the elements.",
      "type": "periodicTable",
      "caption": "Use the periodic table to find silver (Ag) and read its atomic number."
} satisfies PeriodicTableInput
    
    const svg = generatePeriodicTable(input)
    expect(svg).toMatchSnapshot()
  })

  it("periodicTable - type-2-differentiating-elements", () => {
    // Source: Question x0e7da8dabf630aad (Type 2: Differentiating elements)
    const input = {
      "alt": "Periodic table of the elements reference chart showing groups and periods.",
      "type": "periodicTable",
      "caption": "Periodic table of the elements."
} satisfies PeriodicTableInput
    
    const svg = generatePeriodicTable(input)
    expect(svg).toMatchSnapshot()
  })

  it("periodicTable - type-1-matching-element-to-correct-atomic-number-m", () => {
    // Source: Question x0ad2b05c8dee270b (Type 1: Matching element to correct atomic number & mass)
    const input = {
      "alt": "Periodic table of the elements",
      "type": "periodicTable",
      "caption": ""
} satisfies PeriodicTableInput
    
    const svg = generatePeriodicTable(input)
    expect(svg).toMatchSnapshot()
  })

  it("periodicTable - type-3-los-grupos-", () => {
    // Source: Question x60654f6ae1409f19 (Type 3: ¡Los grupos! )
    const input = {
      "alt": "Periodic table of the elements arranged by atomic number in the standard layout.",
      "type": "periodicTable",
      "caption": "Periodic table reference."
} satisfies PeriodicTableInput
    
    const svg = generatePeriodicTable(input)
    expect(svg).toMatchSnapshot()
  })

  it("periodicTable - type-3-understanding-elements", () => {
    // Source: Question x98735e57c6037f35 (Type 3: Understanding elements)
    const input = {
      "alt": "Periodic table of the elements with a key showing element categories.",
      "type": "periodicTable",
      "caption": "Periodic table of the elements"
} satisfies PeriodicTableInput
    
    const svg = generatePeriodicTable(input)
    expect(svg).toMatchSnapshot()
  })

  it("periodicTable - type-3-groups", () => {
    // Source: Question x105e0f2e837bf10c (Type 3: Groups)
    const input = {
      "alt": "Periodic table of the elements.",
      "type": "periodicTable",
      "caption": "Periodic table reference."
} satisfies PeriodicTableInput
    
    const svg = generatePeriodicTable(input)
    expect(svg).toMatchSnapshot()
  })

  it("periodicTable - type-3-groups", () => {
    // Source: Question x95ed053410b93df0 (Type 3: Groups)
    const input = {
      "alt": "Periodic table of the elements.",
      "type": "periodicTable",
      "caption": "Use the periodic table to compare element groups."
} satisfies PeriodicTableInput
    
    const svg = generatePeriodicTable(input)
    expect(svg).toMatchSnapshot()
  })

  it("periodicTable - type-4-elements-and-atoms", () => {
    // Source: Question xa28aa4b622b50131 (Type 4: Elements and Atoms)
    const input = {
      "alt": "Periodic table of the elements with a key showing symbols and atomic numbers.",
      "type": "periodicTable",
      "caption": ""
} satisfies PeriodicTableInput
    
    const svg = generatePeriodicTable(input)
    expect(svg).toMatchSnapshot()
  })

  it("periodicTable - type-1-matching-element-to-correct-atomic-number-m", () => {
    // Source: Question xddd9549c88b889a4 (Type 1: Matching element to correct atomic number & mass)
    const input = {
      "alt": "A periodic table of the elements.",
      "type": "periodicTable",
      "caption": "Use the periodic table to locate iridium (Ir) and determine its atomic number."
} satisfies PeriodicTableInput
    
    const svg = generatePeriodicTable(input)
    expect(svg).toMatchSnapshot()
  })

  it("periodicTable - type-4-recognizing-element-symbols", () => {
    // Source: Question x8f8052b90bb7ba68 (Type 4: Recognizing element symbols)
    const input = {
      "alt": "Periodic table of the elements showing symbols, names, and atomic numbers.",
      "type": "periodicTable",
      "caption": "Periodic table of the elements."
} satisfies PeriodicTableInput
    
    const svg = generatePeriodicTable(input)
    expect(svg).toMatchSnapshot()
  })

  it("periodicTable - type-4-element-symbols", () => {
    // Source: Question xc55dd92260e044ae (Type 4: Element symbols)
    const input = {
      "alt": "Periodic table of the elements for reference.",
      "type": "periodicTable",
      "caption": "Periodic table."
} satisfies PeriodicTableInput
    
    const svg = generatePeriodicTable(input)
    expect(svg).toMatchSnapshot()
  })

  it("periodicTable - type-1-atomic-mass", () => {
    // Source: Question x58efc54d206fd76f (Type 1: Atomic Mass)
    const input = {
      "alt": "Periodic table of the elements.",
      "type": "periodicTable",
      "caption": "Periodic table for reference."
} satisfies PeriodicTableInput
    
    const svg = generatePeriodicTable(input)
    expect(svg).toMatchSnapshot()
  })

  it("periodicTable - type-2-differentiating-elements", () => {
    // Source: Question x57c9d0477306334a (Type 2: Differentiating elements)
    const input = {
      "alt": "A full periodic table for reference. Use it to identify each element's symbol, group, period, and approximate atomic mass.",
      "type": "periodicTable",
      "caption": "Periodic table of the elements."
} satisfies PeriodicTableInput
    
    const svg = generatePeriodicTable(input)
    expect(svg).toMatchSnapshot()
  })

  it("periodicTable - type-3-understanding-elements", () => {
    // Source: Question xbeb48701ab0d369a (Type 3: Understanding elements)
    const input = {
      "alt": "Periodic table with a classification key showing element categories, with each element square labeled by symbol and atomic number.",
      "type": "periodicTable",
      "caption": "Periodic table reference."
} satisfies PeriodicTableInput
    
    const svg = generatePeriodicTable(input)
    expect(svg).toMatchSnapshot()
  })

  it("periodicTable - type-1-atomic-mass", () => {
    // Source: Question xfe3ad5961a87a8d6 (Type 1: Atomic Mass)
    const input = {
      "alt": "Periodic table of the elements showing symbols, names, atomic numbers, and approximate atomic masses.",
      "type": "periodicTable",
      "caption": "Periodic table of the elements."
} satisfies PeriodicTableInput
    
    const svg = generatePeriodicTable(input)
    expect(svg).toMatchSnapshot()
  })

  it("periodicTable - type-3-los-grupos-", () => {
    // Source: Question x8b48a7967450eccd (Type 3: ¡Los grupos! )
    const input = {
      "alt": "Periodic table of the elements in the standard layout. No specific groups or periods are indicated or highlighted.",
      "type": "periodicTable",
      "caption": ""
} satisfies PeriodicTableInput
    
    const svg = generatePeriodicTable(input)
    expect(svg).toMatchSnapshot()
  })

  it("periodicTable - type-3-groups", () => {
    // Source: Question x413afd0359e68d14 (Type 3: Groups)
    const input = {
      "alt": "Periodic table of the elements.",
      "type": "periodicTable",
      "caption": "Reference periodic table."
} satisfies PeriodicTableInput
    
    const svg = generatePeriodicTable(input)
    expect(svg).toMatchSnapshot()
  })

  it("periodicTable - type-4-element-symbols", () => {
    // Source: Question xe36738a2c73bf174 (Type 4: Element symbols)
    const input = {
      "alt": "Periodic table of the elements for reference when evaluating valid element symbols.",
      "type": "periodicTable",
      "caption": "Periodic table reference"
} satisfies PeriodicTableInput
    
    const svg = generatePeriodicTable(input)
    expect(svg).toMatchSnapshot()
  })

  it("periodicTable - type-2-differentiating-elements", () => {
    // Source: Question x17d9891d9d054552 (Type 2: Differentiating elements)
    const input = {
      "alt": "A periodic table of the elements for reference.",
      "type": "periodicTable",
      "caption": "Periodic table."
} satisfies PeriodicTableInput
    
    const svg = generatePeriodicTable(input)
    expect(svg).toMatchSnapshot()
  })

  it("periodicTable - type-4-elements-and-atoms", () => {
    // Source: Question x13b8c1571985af04 (Type 4: Elements and Atoms)
    const input = {
      "alt": "Periodic table of the elements.",
      "type": "periodicTable",
      "caption": ""
} satisfies PeriodicTableInput
    
    const svg = generatePeriodicTable(input)
    expect(svg).toMatchSnapshot()
  })

  it("periodicTable - type-4-element-symbols", () => {
    // Source: Question x01429d90ddc97f9f (Type 4: Element symbols)
    const input = {
      "alt": "Periodic table of the elements.",
      "type": "periodicTable",
      "caption": ""
} satisfies PeriodicTableInput
    
    const svg = generatePeriodicTable(input)
    expect(svg).toMatchSnapshot()
  })

  it("periodicTable - type-3-understanding-elements", () => {
    // Source: Question x646e700e02bee767 (Type 3: Understanding elements)
    const input = {
      "alt": "Periodic table of the elements with a key showing categories and element information.",
      "type": "periodicTable",
      "caption": "Reference chart of chemical elements."
} satisfies PeriodicTableInput
    
    const svg = generatePeriodicTable(input)
    expect(svg).toMatchSnapshot()
  })

  it("periodicTable - type-4-elements-and-atoms", () => {
    // Source: Question x31ddc9dd817ba615 (Type 4: Elements and Atoms)
    const input = {
      "alt": "Periodic table of the elements for reference.",
      "type": "periodicTable",
      "caption": "Use the periodic table for reference."
} satisfies PeriodicTableInput
    
    const svg = generatePeriodicTable(input)
    expect(svg).toMatchSnapshot()
  })

  it("periodicTable - type-3-los-grupos-", () => {
    // Source: Question xcdce570259721b01 (Type 3: ¡Los grupos! )
    const input = {
      "alt": "A standard periodic table of the elements showing element symbols and atomic numbers. Periods 1–7 and groups 1–18 are labeled.",
      "type": "periodicTable",
      "caption": "Periodic table of the elements"
} satisfies PeriodicTableInput
    
    const svg = generatePeriodicTable(input)
    expect(svg).toMatchSnapshot()
  })
})
