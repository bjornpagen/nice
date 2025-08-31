// ⚠️ AUTO-GENERATED TEST FILE
// This file was automatically generated from production widget data.
// Do not modify manually - regenerate if needed.

import { describe, expect, it } from "bun:test"
import type { z } from "zod"
import { generateConceptualGraph, ConceptualGraphPropsSchema } from "@/lib/widgets/generators/conceptual-graph"

type ConceptualGraphInput = z.input<typeof ConceptualGraphPropsSchema>

describe("conceptualGraph widget (generated from production data)", () => {

  it("conceptualGraph - competition-and-population-size", () => {
    // Source: Question x3a77b433bb16a25d (Competition and population size)
    const input = {
      "type": "conceptualGraph",
      "width": 260,
      "height": 260,
      "curveColor": "#11accd",
      "xAxisLabel": "Time",
      "yAxisLabel": "Frog population size",
      "curvePoints": [
            {
                  "x": 0,
                  "y": 0.2
            },
            {
                  "x": 1,
                  "y": 0.25
            },
            {
                  "x": 2,
                  "y": 0.4
            },
            {
                  "x": 3,
                  "y": 0.7
            },
            {
                  "x": 4,
                  "y": 1.2
            },
            {
                  "x": 5,
                  "y": 2
            },
            {
                  "x": 6,
                  "y": 3
            },
            {
                  "x": 7,
                  "y": 3.8
            },
            {
                  "x": 8,
                  "y": 4.5
            },
            {
                  "x": 9,
                  "y": 4.8
            },
            {
                  "x": 10,
                  "y": 4.95
            }
      ],
      "highlightPoints": [
            {
                  "t": 0.25,
                  "label": "A"
            },
            {
                  "t": 0.5,
                  "label": "B"
            },
            {
                  "t": 0.98,
                  "label": "C"
            }
      ],
      "highlightPointColor": "#000000",
      "highlightPointRadius": 4
} satisfies ConceptualGraphInput
    
    const svg = generateConceptualGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("conceptualGraph - type-4", () => {
    // Source: Question x57a2b28f4f0bf3e3 (Type 4)
    const input = {
      "type": "conceptualGraph",
      "width": 400,
      "height": 400,
      "curveColor": "#000000",
      "xAxisLabel": "speed",
      "yAxisLabel": "kinetic energy",
      "curvePoints": [
            {
                  "x": 0,
                  "y": 0
            },
            {
                  "x": 0.5,
                  "y": 0.06
            },
            {
                  "x": 1,
                  "y": 0.25
            },
            {
                  "x": 1.5,
                  "y": 0.56
            },
            {
                  "x": 2,
                  "y": 1
            },
            {
                  "x": 2.5,
                  "y": 1.56
            },
            {
                  "x": 3,
                  "y": 2.25
            },
            {
                  "x": 3.5,
                  "y": 3.06
            },
            {
                  "x": 4,
                  "y": 4
            }
      ],
      "highlightPoints": [],
      "highlightPointColor": "#000000",
      "highlightPointRadius": 3
} satisfies ConceptualGraphInput
    
    const svg = generateConceptualGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("conceptualGraph - competition-and-population-size", () => {
    // Source: Question xdaa032747a7e8714 (Competition and population size)
    const input = {
      "type": "conceptualGraph",
      "width": 260,
      "height": 260,
      "curveColor": "#11accd",
      "xAxisLabel": "Time",
      "yAxisLabel": "Wolf population size",
      "curvePoints": [
            {
                  "x": 0,
                  "y": 0.05
            },
            {
                  "x": 1,
                  "y": 0.1
            },
            {
                  "x": 2,
                  "y": 0.2
            },
            {
                  "x": 3,
                  "y": 0.35
            },
            {
                  "x": 4,
                  "y": 0.55
            },
            {
                  "x": 5,
                  "y": 0.8
            },
            {
                  "x": 6,
                  "y": 1.05
            },
            {
                  "x": 7,
                  "y": 1.25
            },
            {
                  "x": 8,
                  "y": 1.4
            },
            {
                  "x": 9,
                  "y": 1.5
            },
            {
                  "x": 10,
                  "y": 1.55
            }
      ],
      "highlightPoints": [
            {
                  "t": 0.45,
                  "label": "A"
            },
            {
                  "t": 0.7,
                  "label": "B"
            },
            {
                  "t": 0.98,
                  "label": "C"
            }
      ],
      "highlightPointColor": "#000000",
      "highlightPointRadius": 4
} satisfies ConceptualGraphInput
    
    const svg = generateConceptualGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("conceptualGraph - tolerance-range-conditions-and-limits-of-tolerance", () => {
    // Source: Question xeb4330f8b311e6ac (Tolerance range conditions and limits of tolerance)
    const input = {
      "type": "conceptualGraph",
      "width": 500,
      "height": 320,
      "curveColor": "#1f77b4",
      "xAxisLabel": "Air temperature",
      "yAxisLabel": "Cheetah abundance",
      "curvePoints": [
            {
                  "x": 0,
                  "y": 5
            },
            {
                  "x": 15,
                  "y": 20
            },
            {
                  "x": 30,
                  "y": 55
            },
            {
                  "x": 50,
                  "y": 90
            },
            {
                  "x": 70,
                  "y": 55
            },
            {
                  "x": 85,
                  "y": 20
            },
            {
                  "x": 100,
                  "y": 5
            }
      ],
      "highlightPoints": [
            {
                  "t": 0.25,
                  "label": ""
            },
            {
                  "t": 0.5,
                  "label": ""
            },
            {
                  "t": 0.9,
                  "label": ""
            }
      ],
      "highlightPointColor": "#d62728",
      "highlightPointRadius": 4
} satisfies ConceptualGraphInput
    
    const svg = generateConceptualGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("conceptualGraph - tolerance-range-conditions-and-limits-of-tolerance", () => {
    // Source: Question xeb4330f8b311e6ac (Tolerance range conditions and limits of tolerance)
    const input = {
      "type": "conceptualGraph",
      "width": 500,
      "height": 320,
      "curveColor": "#1f77b4",
      "xAxisLabel": "Air temperature",
      "yAxisLabel": "Cheetah abundance",
      "curvePoints": [
            {
                  "x": 0,
                  "y": 5
            },
            {
                  "x": 15,
                  "y": 20
            },
            {
                  "x": 30,
                  "y": 55
            },
            {
                  "x": 50,
                  "y": 90
            },
            {
                  "x": 70,
                  "y": 55
            },
            {
                  "x": 85,
                  "y": 20
            },
            {
                  "x": 100,
                  "y": 5
            }
      ],
      "highlightPoints": [
            {
                  "t": 0.25,
                  "label": "low abundance"
            },
            {
                  "t": 0.5,
                  "label": "high abundance"
            },
            {
                  "t": 0.9,
                  "label": "no abundance"
            }
      ],
      "highlightPointColor": "#d62728",
      "highlightPointRadius": 4
} satisfies ConceptualGraphInput
    
    const svg = generateConceptualGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("conceptualGraph - tolerance-range-conditions-and-limits-of-tolerance", () => {
    // Source: Question xeb4330f8b311e6ac (Tolerance range conditions and limits of tolerance)
    const input = {
      "type": "conceptualGraph",
      "width": 500,
      "height": 320,
      "curveColor": "#1f77b4",
      "xAxisLabel": "Air temperature",
      "yAxisLabel": "Cheetah abundance",
      "curvePoints": [
            {
                  "x": 0,
                  "y": 5
            },
            {
                  "x": 15,
                  "y": 20
            },
            {
                  "x": 30,
                  "y": 55
            },
            {
                  "x": 50,
                  "y": 90
            },
            {
                  "x": 70,
                  "y": 55
            },
            {
                  "x": 85,
                  "y": 20
            },
            {
                  "x": 100,
                  "y": 5
            }
      ],
      "highlightPoints": [
            {
                  "t": 0.25,
                  "label": "high abundance"
            },
            {
                  "t": 0.5,
                  "label": "low abundance"
            },
            {
                  "t": 0.9,
                  "label": "no abundance"
            }
      ],
      "highlightPointColor": "#d62728",
      "highlightPointRadius": 4
} satisfies ConceptualGraphInput
    
    const svg = generateConceptualGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("conceptualGraph - tolerance-range-conditions-and-limits-of-tolerance", () => {
    // Source: Question xeb4330f8b311e6ac (Tolerance range conditions and limits of tolerance)
    const input = {
      "type": "conceptualGraph",
      "width": 500,
      "height": 320,
      "curveColor": "#1f77b4",
      "xAxisLabel": "Air temperature",
      "yAxisLabel": "Cheetah abundance",
      "curvePoints": [
            {
                  "x": 0,
                  "y": 5
            },
            {
                  "x": 15,
                  "y": 20
            },
            {
                  "x": 30,
                  "y": 55
            },
            {
                  "x": 50,
                  "y": 90
            },
            {
                  "x": 70,
                  "y": 55
            },
            {
                  "x": 85,
                  "y": 20
            },
            {
                  "x": 100,
                  "y": 5
            }
      ],
      "highlightPoints": [
            {
                  "t": 0.25,
                  "label": "low abundance"
            },
            {
                  "t": 0.5,
                  "label": "no abundance"
            },
            {
                  "t": 0.9,
                  "label": "high abundance"
            }
      ],
      "highlightPointColor": "#d62728",
      "highlightPointRadius": 4
} satisfies ConceptualGraphInput
    
    const svg = generateConceptualGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("conceptualGraph - identify-logistic-and-exponential-population-growt", () => {
    // Source: Question x4bf300e0035e8c8b (Identify logistic and exponential population growth models)
    const input = {
      "type": "conceptualGraph",
      "width": 320,
      "height": 320,
      "curveColor": "#11accd",
      "xAxisLabel": "Time",
      "yAxisLabel": "Population size",
      "curvePoints": [
            {
                  "x": 0,
                  "y": 0.2
            },
            {
                  "x": 0.5,
                  "y": 0.22
            },
            {
                  "x": 1,
                  "y": 0.28
            },
            {
                  "x": 1.5,
                  "y": 0.38
            },
            {
                  "x": 2,
                  "y": 0.55
            },
            {
                  "x": 2.5,
                  "y": 0.82
            },
            {
                  "x": 3,
                  "y": 1.2
            },
            {
                  "x": 3.5,
                  "y": 1.8
            },
            {
                  "x": 4,
                  "y": 2.6
            },
            {
                  "x": 4.5,
                  "y": 3.8
            },
            {
                  "x": 5,
                  "y": 5.1
            },
            {
                  "x": 5.5,
                  "y": 6.3
            },
            {
                  "x": 6,
                  "y": 7.2
            },
            {
                  "x": 6.5,
                  "y": 7.8
            },
            {
                  "x": 7,
                  "y": 8.3
            },
            {
                  "x": 7.5,
                  "y": 8.6
            },
            {
                  "x": 8,
                  "y": 8.8
            },
            {
                  "x": 8.5,
                  "y": 9
            },
            {
                  "x": 9,
                  "y": 9.15
            },
            {
                  "x": 9.5,
                  "y": 9.25
            },
            {
                  "x": 10,
                  "y": 9.3
            }
      ],
      "highlightPoints": [],
      "highlightPointColor": "#11accd",
      "highlightPointRadius": 4
} satisfies ConceptualGraphInput
    
    const svg = generateConceptualGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("conceptualGraph - latitudinal-diversity-gradient", () => {
    // Source: Question x7fd415086ba3b8d0 (Latitudinal diversity gradient)
    const input = {
      "type": "conceptualGraph",
      "width": 500,
      "height": 350,
      "curveColor": "#1f77b4",
      "xAxisLabel": "Latitude (in degrees)",
      "yAxisLabel": "Number of marine mammal species",
      "curvePoints": [
            {
                  "x": 0,
                  "y": 40
            },
            {
                  "x": 30,
                  "y": 30
            },
            {
                  "x": 60,
                  "y": 15
            },
            {
                  "x": 90,
                  "y": 3
            },
            {
                  "x": 120,
                  "y": 15
            },
            {
                  "x": 150,
                  "y": 30
            },
            {
                  "x": 180,
                  "y": 40
            }
      ],
      "highlightPoints": [],
      "highlightPointColor": "#1f77b4",
      "highlightPointRadius": 4
} satisfies ConceptualGraphInput
    
    const svg = generateConceptualGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("conceptualGraph - latitudinal-diversity-gradient", () => {
    // Source: Question x7fd415086ba3b8d0 (Latitudinal diversity gradient)
    const input = {
      "type": "conceptualGraph",
      "width": 500,
      "height": 350,
      "curveColor": "#1f77b4",
      "xAxisLabel": "Latitude (in degrees)",
      "yAxisLabel": "Number of marine mammal species",
      "curvePoints": [
            {
                  "x": 0,
                  "y": 3
            },
            {
                  "x": 45,
                  "y": 8
            },
            {
                  "x": 90,
                  "y": 18
            },
            {
                  "x": 135,
                  "y": 30
            },
            {
                  "x": 180,
                  "y": 40
            }
      ],
      "highlightPoints": [],
      "highlightPointColor": "#1f77b4",
      "highlightPointRadius": 4
} satisfies ConceptualGraphInput
    
    const svg = generateConceptualGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("conceptualGraph - latitudinal-diversity-gradient", () => {
    // Source: Question x7fd415086ba3b8d0 (Latitudinal diversity gradient)
    const input = {
      "type": "conceptualGraph",
      "width": 500,
      "height": 350,
      "curveColor": "#1f77b4",
      "xAxisLabel": "Latitude (in degrees)",
      "yAxisLabel": "Number of marine mammal species",
      "curvePoints": [
            {
                  "x": 0,
                  "y": 40
            },
            {
                  "x": 45,
                  "y": 32
            },
            {
                  "x": 90,
                  "y": 20
            },
            {
                  "x": 135,
                  "y": 10
            },
            {
                  "x": 180,
                  "y": 3
            }
      ],
      "highlightPoints": [],
      "highlightPointColor": "#1f77b4",
      "highlightPointRadius": 4
} satisfies ConceptualGraphInput
    
    const svg = generateConceptualGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("conceptualGraph - tolerance-range", () => {
    // Source: Question x91839aaf661484bf (Tolerance range)
    const input = {
      "type": "conceptualGraph",
      "width": 500,
      "height": 294,
      "curveColor": "#2a6ca3",
      "xAxisLabel": "Percent tree cover",
      "yAxisLabel": "Relative abundance",
      "curvePoints": [
            {
                  "x": 0,
                  "y": 0
            },
            {
                  "x": 10,
                  "y": 0.02
            },
            {
                  "x": 15,
                  "y": 0.08
            },
            {
                  "x": 20,
                  "y": 0.18
            },
            {
                  "x": 30,
                  "y": 0.55
            },
            {
                  "x": 40,
                  "y": 0.92
            },
            {
                  "x": 45,
                  "y": 1
            },
            {
                  "x": 50,
                  "y": 0.9
            },
            {
                  "x": 60,
                  "y": 0.6
            },
            {
                  "x": 70,
                  "y": 0.35
            },
            {
                  "x": 75,
                  "y": 0.22
            },
            {
                  "x": 80,
                  "y": 0.12
            },
            {
                  "x": 90,
                  "y": 0.04
            },
            {
                  "x": 100,
                  "y": 0
            }
      ],
      "highlightPoints": [],
      "highlightPointColor": "#d9534f",
      "highlightPointRadius": 4
} satisfies ConceptualGraphInput
    
    const svg = generateConceptualGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("conceptualGraph - tolerance-range", () => {
    // Source: Question x308190743888881b (Tolerance range)
    const input = {
      "type": "conceptualGraph",
      "width": 500,
      "height": 294,
      "curveColor": "#3366cc",
      "xAxisLabel": "Percent tree cover",
      "yAxisLabel": "Relative abundance of lark sparrows",
      "curvePoints": [
            {
                  "x": 0,
                  "y": 0
            },
            {
                  "x": 10,
                  "y": 0.05
            },
            {
                  "x": 15,
                  "y": 0.1
            },
            {
                  "x": 20,
                  "y": 0.2
            },
            {
                  "x": 30,
                  "y": 0.6
            },
            {
                  "x": 40,
                  "y": 0.95
            },
            {
                  "x": 45,
                  "y": 1
            },
            {
                  "x": 50,
                  "y": 0.95
            },
            {
                  "x": 60,
                  "y": 0.7
            },
            {
                  "x": 70,
                  "y": 0.3
            },
            {
                  "x": 75,
                  "y": 0.1
            },
            {
                  "x": 80,
                  "y": 0.05
            },
            {
                  "x": 100,
                  "y": 0
            }
      ],
      "highlightPoints": [],
      "highlightPointColor": "#cc0000",
      "highlightPointRadius": 4
} satisfies ConceptualGraphInput
    
    const svg = generateConceptualGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("conceptualGraph - type-4", () => {
    // Source: Question x1d48119818785ff3 (Type 4)
    const input = {
      "type": "conceptualGraph",
      "width": 200,
      "height": 191,
      "curveColor": "#333333",
      "xAxisLabel": "mass",
      "yAxisLabel": "kinetic energy",
      "curvePoints": [
            {
                  "x": 0,
                  "y": 0
            },
            {
                  "x": 1,
                  "y": 1
            },
            {
                  "x": 2,
                  "y": 2
            },
            {
                  "x": 3,
                  "y": 3
            },
            {
                  "x": 4,
                  "y": 4
            }
      ],
      "highlightPoints": [],
      "highlightPointColor": "#333333",
      "highlightPointRadius": 3
} satisfies ConceptualGraphInput
    
    const svg = generateConceptualGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("conceptualGraph - type-4", () => {
    // Source: Question x1d48119818785ff3 (Type 4)
    const input = {
      "type": "conceptualGraph",
      "width": 200,
      "height": 195,
      "curveColor": "#333333",
      "xAxisLabel": "speed",
      "yAxisLabel": "kinetic energy",
      "curvePoints": [
            {
                  "x": 0,
                  "y": 0
            },
            {
                  "x": 1,
                  "y": 0.25
            },
            {
                  "x": 2,
                  "y": 1
            },
            {
                  "x": 3,
                  "y": 2.25
            },
            {
                  "x": 4,
                  "y": 4
            }
      ],
      "highlightPoints": [],
      "highlightPointColor": "#333333",
      "highlightPointRadius": 3
} satisfies ConceptualGraphInput
    
    const svg = generateConceptualGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("conceptualGraph - latitudinal-diversity-gradient", () => {
    // Source: Question x32ee680a5065a4ed (Latitudinal diversity gradient)
    const input = {
      "type": "conceptualGraph",
      "width": 420,
      "height": 300,
      "curveColor": "#0B63CE",
      "xAxisLabel": "Latitude (in degrees north)",
      "yAxisLabel": "Number of squamate species",
      "curvePoints": [
            {
                  "x": 10,
                  "y": 173
            },
            {
                  "x": 20,
                  "y": 160
            },
            {
                  "x": 30,
                  "y": 130
            },
            {
                  "x": 40,
                  "y": 80
            },
            {
                  "x": 50,
                  "y": 30
            },
            {
                  "x": 60,
                  "y": 0
            },
            {
                  "x": 70,
                  "y": 0
            },
            {
                  "x": 80,
                  "y": 0
            }
      ],
      "highlightPoints": [],
      "highlightPointColor": "#0B63CE",
      "highlightPointRadius": 4
} satisfies ConceptualGraphInput
    
    const svg = generateConceptualGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("conceptualGraph - latitudinal-diversity-gradient", () => {
    // Source: Question x32ee680a5065a4ed (Latitudinal diversity gradient)
    const input = {
      "type": "conceptualGraph",
      "width": 420,
      "height": 300,
      "curveColor": "#C95A00",
      "xAxisLabel": "Latitude (in degrees north)",
      "yAxisLabel": "Number of squamate species",
      "curvePoints": [
            {
                  "x": 30,
                  "y": 0
            },
            {
                  "x": 40,
                  "y": 20
            },
            {
                  "x": 50,
                  "y": 60
            },
            {
                  "x": 60,
                  "y": 100
            },
            {
                  "x": 70,
                  "y": 140
            },
            {
                  "x": 80,
                  "y": 173
            }
      ],
      "highlightPoints": [],
      "highlightPointColor": "#C95A00",
      "highlightPointRadius": 4
} satisfies ConceptualGraphInput
    
    const svg = generateConceptualGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("conceptualGraph - latitudinal-diversity-gradient", () => {
    // Source: Question x32ee680a5065a4ed (Latitudinal diversity gradient)
    const input = {
      "type": "conceptualGraph",
      "width": 420,
      "height": 300,
      "curveColor": "#0B63CE",
      "xAxisLabel": "Latitude (in degrees north)",
      "yAxisLabel": "Number of squamate species",
      "curvePoints": [
            {
                  "x": 10,
                  "y": 173
            },
            {
                  "x": 20,
                  "y": 120
            },
            {
                  "x": 30,
                  "y": 60
            },
            {
                  "x": 40,
                  "y": 10
            },
            {
                  "x": 45,
                  "y": 0
            },
            {
                  "x": 50,
                  "y": 10
            },
            {
                  "x": 60,
                  "y": 60
            },
            {
                  "x": 70,
                  "y": 120
            },
            {
                  "x": 80,
                  "y": 173
            }
      ],
      "highlightPoints": [],
      "highlightPointColor": "#0B63CE",
      "highlightPointRadius": 4
} satisfies ConceptualGraphInput
    
    const svg = generateConceptualGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("conceptualGraph - changes-in-carrying-capacity", () => {
    // Source: Question x4f8d5e2a9d3102ea (Changes in carrying capacity)
    const input = {
      "type": "conceptualGraph",
      "width": 210,
      "height": 210,
      "curveColor": "#000000",
      "xAxisLabel": "Population size",
      "yAxisLabel": "Time",
      "curvePoints": [
            {
                  "x": 0,
                  "y": 0
            },
            {
                  "x": 1,
                  "y": 3
            },
            {
                  "x": 2,
                  "y": 7
            },
            {
                  "x": 3,
                  "y": 9
            },
            {
                  "x": 4,
                  "y": 8.2
            },
            {
                  "x": 5,
                  "y": 8.8
            },
            {
                  "x": 6,
                  "y": 7.9
            },
            {
                  "x": 7,
                  "y": 8.6
            },
            {
                  "x": 8,
                  "y": 7.8
            },
            {
                  "x": 9,
                  "y": 8.4
            }
      ],
      "highlightPoints": [],
      "highlightPointColor": "#000000",
      "highlightPointRadius": 0.01
} satisfies ConceptualGraphInput
    
    const svg = generateConceptualGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("conceptualGraph - tolerance-range", () => {
    // Source: Question x1a01a2b43ecc60e7 (Tolerance range)
    const input = {
      "type": "conceptualGraph",
      "width": 500,
      "height": 294,
      "curveColor": "#1f77b4",
      "xAxisLabel": "Percent tree cover",
      "yAxisLabel": "Relative abundance of lark sparrows",
      "curvePoints": [
            {
                  "x": 0,
                  "y": 0
            },
            {
                  "x": 10,
                  "y": 0
            },
            {
                  "x": 15,
                  "y": 0.05
            },
            {
                  "x": 25,
                  "y": 0.5
            },
            {
                  "x": 35,
                  "y": 0.85
            },
            {
                  "x": 45,
                  "y": 1
            },
            {
                  "x": 55,
                  "y": 0.7
            },
            {
                  "x": 65,
                  "y": 0.4
            },
            {
                  "x": 75,
                  "y": 0.15
            },
            {
                  "x": 90,
                  "y": 0
            },
            {
                  "x": 100,
                  "y": 0
            }
      ],
      "highlightPoints": [],
      "highlightPointColor": "#d62728",
      "highlightPointRadius": 4
} satisfies ConceptualGraphInput
    
    const svg = generateConceptualGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("conceptualGraph - identify-logistic-and-exponential-population-growt", () => {
    // Source: Question x8faec5c7b7171cb0 (Identify logistic and exponential population growth models)
    const input = {
      "type": "conceptualGraph",
      "width": 420,
      "height": 280,
      "curveColor": "#1f77b4",
      "xAxisLabel": "Time",
      "yAxisLabel": "Population size",
      "curvePoints": [
            {
                  "x": 0,
                  "y": 0.1
            },
            {
                  "x": 1,
                  "y": 0.12
            },
            {
                  "x": 2,
                  "y": 0.15
            },
            {
                  "x": 3,
                  "y": 0.2
            },
            {
                  "x": 4,
                  "y": 0.28
            },
            {
                  "x": 5,
                  "y": 0.4
            },
            {
                  "x": 6,
                  "y": 0.6
            },
            {
                  "x": 7,
                  "y": 0.9
            },
            {
                  "x": 8,
                  "y": 1.35
            },
            {
                  "x": 9,
                  "y": 2
            },
            {
                  "x": 10,
                  "y": 3
            }
      ],
      "highlightPoints": [],
      "highlightPointColor": "#1f77b4",
      "highlightPointRadius": 4
} satisfies ConceptualGraphInput
    
    const svg = generateConceptualGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("conceptualGraph - identify-logistic-and-exponential-population-growt", () => {
    // Source: Question x8faec5c7b7171cb0 (Identify logistic and exponential population growth models)
    const input = {
      "type": "conceptualGraph",
      "width": 420,
      "height": 280,
      "curveColor": "#1f77b4",
      "xAxisLabel": "Time",
      "yAxisLabel": "Population size",
      "curvePoints": [
            {
                  "x": 0,
                  "y": 0.1
            },
            {
                  "x": 1,
                  "y": 0.12
            },
            {
                  "x": 2,
                  "y": 0.18
            },
            {
                  "x": 3,
                  "y": 0.3
            },
            {
                  "x": 4,
                  "y": 0.5
            },
            {
                  "x": 5,
                  "y": 0.85
            },
            {
                  "x": 6,
                  "y": 1.2
            },
            {
                  "x": 7,
                  "y": 1.5
            },
            {
                  "x": 8,
                  "y": 1.7
            },
            {
                  "x": 9,
                  "y": 1.85
            },
            {
                  "x": 10,
                  "y": 1.95
            },
            {
                  "x": 11,
                  "y": 2
            },
            {
                  "x": 12,
                  "y": 2
            }
      ],
      "highlightPoints": [],
      "highlightPointColor": "#1f77b4",
      "highlightPointRadius": 4
} satisfies ConceptualGraphInput
    
    const svg = generateConceptualGraph(input)
    expect(svg).toMatchSnapshot()
  })
})
