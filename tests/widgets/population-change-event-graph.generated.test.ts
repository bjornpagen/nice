// ⚠️ AUTO-GENERATED TEST FILE
// This file was automatically generated from production widget data.
// Do not modify manually - regenerate if needed.

import { describe, expect, it } from "bun:test"
import type { z } from "zod"
import { generatePopulationChangeEventGraph, PopulationChangeEventGraphPropsSchema } from "@/lib/widgets/generators/population-change-event-graph"

type PopulationChangeEventGraphInput = z.input<typeof PopulationChangeEventGraphPropsSchema>

describe("populationChangeEventGraph widget (generated from production data)", () => {

  it("populationChangeEventGraph - reading-directional-selection-graph", () => {
    // Source: Question x5cd97c71cd5d1c54 (Reading directional selection graph)
    const input = {
      "type": "populationChangeEventGraph",
      "width": 325,
      "height": 318,
      "xAxisMax": 10,
      "xAxisMin": 0,
      "yAxisMax": 10,
      "yAxisMin": 0,
      "showLegend": true,
      "xAxisLabel": "Flowering time (from shorter to longer)",
      "yAxisLabel": "Number of plants",
      "afterSegment": {
            "color": "#555555",
            "label": "After environmental change",
            "points": [
                  {
                        "x": 0,
                        "y": 0.2
                  },
                  {
                        "x": 2,
                        "y": 1.4
                  },
                  {
                        "x": 4,
                        "y": 4.6
                  },
                  {
                        "x": 6.7,
                        "y": 9
                  },
                  {
                        "x": 8,
                        "y": 5
                  },
                  {
                        "x": 9,
                        "y": 1.2
                  },
                  {
                        "x": 10,
                        "y": 0.2
                  }
            ]
      },
      "beforeSegment": {
            "color": "#1f77b4",
            "label": "Before environmental change",
            "points": [
                  {
                        "x": 0,
                        "y": 0.2
                  },
                  {
                        "x": 1,
                        "y": 2.2
                  },
                  {
                        "x": 2,
                        "y": 5.8
                  },
                  {
                        "x": 3.3,
                        "y": 9
                  },
                  {
                        "x": 5,
                        "y": 6.2
                  },
                  {
                        "x": 7,
                        "y": 2.6
                  },
                  {
                        "x": 9,
                        "y": 0.6
                  },
                  {
                        "x": 10,
                        "y": 0.2
                  }
            ]
      }
} satisfies PopulationChangeEventGraphInput
    
    const svg = generatePopulationChangeEventGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("populationChangeEventGraph - changes-in-carrying-capacity", () => {
    // Source: Question x4f8d5e2a9d3102ea (Changes in carrying capacity)
    const input = {
      "type": "populationChangeEventGraph",
      "width": 400,
      "height": 350,
      "xAxisMax": 10,
      "xAxisMin": 0,
      "yAxisMax": 10,
      "yAxisMin": 0,
      "showLegend": true,
      "xAxisLabel": "Population size",
      "yAxisLabel": "Time",
      "afterSegment": {
            "color": "#333333",
            "label": "After drought",
            "points": [
                  {
                        "x": 5,
                        "y": 8.7
                  },
                  {
                        "x": 6,
                        "y": 6.5
                  },
                  {
                        "x": 7,
                        "y": 5.4
                  },
                  {
                        "x": 8,
                        "y": 5
                  },
                  {
                        "x": 9,
                        "y": 5.3
                  },
                  {
                        "x": 10,
                        "y": 5.1
                  }
            ]
      },
      "beforeSegment": {
            "color": "#333333",
            "label": "Before drought",
            "points": [
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
                        "y": 8.6
                  },
                  {
                        "x": 4,
                        "y": 8.1
                  },
                  {
                        "x": 5,
                        "y": 8.7
                  }
            ]
      }
} satisfies PopulationChangeEventGraphInput
    
    const svg = generatePopulationChangeEventGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("populationChangeEventGraph - changes-in-carrying-capacity", () => {
    // Source: Question x4f8d5e2a9d3102ea (Changes in carrying capacity)
    const input = {
      "type": "populationChangeEventGraph",
      "width": 400,
      "height": 350,
      "xAxisMax": 10,
      "xAxisMin": 0,
      "yAxisMax": 10,
      "yAxisMin": 0,
      "showLegend": true,
      "xAxisLabel": "Population size",
      "yAxisLabel": "Time",
      "afterSegment": {
            "color": "#333333",
            "label": "After drought",
            "points": [
                  {
                        "x": 5,
                        "y": 7.3
                  },
                  {
                        "x": 6,
                        "y": 8.3
                  },
                  {
                        "x": 7,
                        "y": 9
                  },
                  {
                        "x": 8,
                        "y": 8.8
                  },
                  {
                        "x": 9,
                        "y": 9.1
                  },
                  {
                        "x": 10,
                        "y": 8.9
                  }
            ]
      },
      "beforeSegment": {
            "color": "#333333",
            "label": "Before drought",
            "points": [
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
                        "y": 6.5
                  },
                  {
                        "x": 3,
                        "y": 7.5
                  },
                  {
                        "x": 4,
                        "y": 7
                  },
                  {
                        "x": 5,
                        "y": 7.3
                  }
            ]
      }
} satisfies PopulationChangeEventGraphInput
    
    const svg = generatePopulationChangeEventGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("populationChangeEventGraph - changes-in-carrying-capacity", () => {
    // Source: Question x4f8d5e2a9d3102ea (Changes in carrying capacity)
    const input = {
      "type": "populationChangeEventGraph",
      "width": 400,
      "height": 350,
      "xAxisMax": 10,
      "xAxisMin": 0,
      "yAxisMax": 10,
      "yAxisMin": 0,
      "showLegend": true,
      "xAxisLabel": "Population size",
      "yAxisLabel": "Time",
      "afterSegment": {
            "color": "#333333",
            "label": "After drought",
            "points": [
                  {
                        "x": 5,
                        "y": 8.7
                  },
                  {
                        "x": 6,
                        "y": 8.4
                  },
                  {
                        "x": 7,
                        "y": 8.8
                  },
                  {
                        "x": 8,
                        "y": 8.2
                  },
                  {
                        "x": 9,
                        "y": 8.6
                  },
                  {
                        "x": 10,
                        "y": 8.3
                  }
            ]
      },
      "beforeSegment": {
            "color": "#333333",
            "label": "Before drought",
            "points": [
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
                        "y": 8.6
                  },
                  {
                        "x": 4,
                        "y": 8.1
                  },
                  {
                        "x": 5,
                        "y": 8.7
                  }
            ]
      }
} satisfies PopulationChangeEventGraphInput
    
    const svg = generatePopulationChangeEventGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("populationChangeEventGraph - changes-in-carrying-capacity", () => {
    // Source: Question xf3e473613e59cfd4 (Changes in carrying capacity)
    const input = {
      "type": "populationChangeEventGraph",
      "width": 500,
      "height": 350,
      "xAxisMax": 10,
      "xAxisMin": 0,
      "yAxisMax": 100,
      "yAxisMin": 0,
      "showLegend": true,
      "xAxisLabel": "Population size",
      "yAxisLabel": "Time",
      "afterSegment": {
            "color": "#000000",
            "label": "After deforestation",
            "points": [
                  {
                        "x": 5,
                        "y": 90
                  },
                  {
                        "x": 6,
                        "y": 60
                  },
                  {
                        "x": 7,
                        "y": 50
                  },
                  {
                        "x": 8,
                        "y": 52
                  },
                  {
                        "x": 9,
                        "y": 48
                  },
                  {
                        "x": 10,
                        "y": 50
                  }
            ]
      },
      "beforeSegment": {
            "color": "#000000",
            "label": "Before deforestation",
            "points": [
                  {
                        "x": 0,
                        "y": 0
                  },
                  {
                        "x": 1,
                        "y": 20
                  },
                  {
                        "x": 2,
                        "y": 45
                  },
                  {
                        "x": 3,
                        "y": 70
                  },
                  {
                        "x": 4,
                        "y": 85
                  },
                  {
                        "x": 5,
                        "y": 90
                  }
            ]
      }
} satisfies PopulationChangeEventGraphInput
    
    const svg = generatePopulationChangeEventGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("populationChangeEventGraph - changes-in-carrying-capacity", () => {
    // Source: Question xf3e473613e59cfd4 (Changes in carrying capacity)
    const input = {
      "type": "populationChangeEventGraph",
      "width": 500,
      "height": 350,
      "xAxisMax": 10,
      "xAxisMin": 0,
      "yAxisMax": 100,
      "yAxisMin": 0,
      "showLegend": true,
      "xAxisLabel": "Population size",
      "yAxisLabel": "Time",
      "afterSegment": {
            "color": "#000000",
            "label": "After deforestation",
            "points": [
                  {
                        "x": 5,
                        "y": 90
                  },
                  {
                        "x": 6,
                        "y": 88
                  },
                  {
                        "x": 7,
                        "y": 92
                  },
                  {
                        "x": 8,
                        "y": 89
                  },
                  {
                        "x": 9,
                        "y": 91
                  },
                  {
                        "x": 10,
                        "y": 90
                  }
            ]
      },
      "beforeSegment": {
            "color": "#000000",
            "label": "Before deforestation",
            "points": [
                  {
                        "x": 0,
                        "y": 0
                  },
                  {
                        "x": 1,
                        "y": 20
                  },
                  {
                        "x": 2,
                        "y": 45
                  },
                  {
                        "x": 3,
                        "y": 70
                  },
                  {
                        "x": 4,
                        "y": 85
                  },
                  {
                        "x": 5,
                        "y": 90
                  }
            ]
      }
} satisfies PopulationChangeEventGraphInput
    
    const svg = generatePopulationChangeEventGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("populationChangeEventGraph - changes-in-carrying-capacity", () => {
    // Source: Question xf3e473613e59cfd4 (Changes in carrying capacity)
    const input = {
      "type": "populationChangeEventGraph",
      "width": 500,
      "height": 350,
      "xAxisMax": 10,
      "xAxisMin": 0,
      "yAxisMax": 100,
      "yAxisMin": 0,
      "showLegend": true,
      "xAxisLabel": "Population size",
      "yAxisLabel": "Time",
      "afterSegment": {
            "color": "#000000",
            "label": "After deforestation",
            "points": [
                  {
                        "x": 5,
                        "y": 75
                  },
                  {
                        "x": 6,
                        "y": 85
                  },
                  {
                        "x": 7,
                        "y": 92
                  },
                  {
                        "x": 8,
                        "y": 90
                  },
                  {
                        "x": 9,
                        "y": 93
                  },
                  {
                        "x": 10,
                        "y": 91
                  }
            ]
      },
      "beforeSegment": {
            "color": "#000000",
            "label": "Before deforestation",
            "points": [
                  {
                        "x": 0,
                        "y": 0
                  },
                  {
                        "x": 1,
                        "y": 18
                  },
                  {
                        "x": 2,
                        "y": 38
                  },
                  {
                        "x": 3,
                        "y": 55
                  },
                  {
                        "x": 4,
                        "y": 68
                  },
                  {
                        "x": 5,
                        "y": 75
                  }
            ]
      }
} satisfies PopulationChangeEventGraphInput
    
    const svg = generatePopulationChangeEventGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("populationChangeEventGraph - changes-in-carrying-capacity", () => {
    // Source: Question xd25b15f503333317 (Changes in carrying capacity)
    const input = {
      "type": "populationChangeEventGraph",
      "width": 400,
      "height": 300,
      "xAxisMax": 10,
      "xAxisMin": 0,
      "yAxisMax": 10,
      "yAxisMin": 0,
      "showLegend": true,
      "xAxisLabel": "Population size",
      "yAxisLabel": "Time",
      "afterSegment": {
            "color": "#1f77b4",
            "label": "After rainfall",
            "points": [
                  {
                        "x": 5,
                        "y": 7.8
                  },
                  {
                        "x": 6,
                        "y": 9
                  },
                  {
                        "x": 7,
                        "y": 9.4
                  },
                  {
                        "x": 8,
                        "y": 9.1
                  },
                  {
                        "x": 9,
                        "y": 9.6
                  },
                  {
                        "x": 10,
                        "y": 9.2
                  }
            ]
      },
      "beforeSegment": {
            "color": "#1f77b4",
            "label": "Before rainfall",
            "points": [
                  {
                        "x": 0,
                        "y": 0
                  },
                  {
                        "x": 1,
                        "y": 2.5
                  },
                  {
                        "x": 2,
                        "y": 5.5
                  },
                  {
                        "x": 3,
                        "y": 7.5
                  },
                  {
                        "x": 4,
                        "y": 7
                  },
                  {
                        "x": 5,
                        "y": 7.8
                  }
            ]
      }
} satisfies PopulationChangeEventGraphInput
    
    const svg = generatePopulationChangeEventGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("populationChangeEventGraph - changes-in-carrying-capacity", () => {
    // Source: Question xd25b15f503333317 (Changes in carrying capacity)
    const input = {
      "type": "populationChangeEventGraph",
      "width": 400,
      "height": 300,
      "xAxisMax": 10,
      "xAxisMin": 0,
      "yAxisMax": 10,
      "yAxisMin": 0,
      "showLegend": true,
      "xAxisLabel": "Population size",
      "yAxisLabel": "Time",
      "afterSegment": {
            "color": "#1f77b4",
            "label": "After rainfall",
            "points": [
                  {
                        "x": 5,
                        "y": 9
                  },
                  {
                        "x": 6,
                        "y": 9.1
                  },
                  {
                        "x": 7,
                        "y": 8.9
                  },
                  {
                        "x": 8,
                        "y": 9.2
                  },
                  {
                        "x": 9,
                        "y": 9
                  },
                  {
                        "x": 10,
                        "y": 9.1
                  }
            ]
      },
      "beforeSegment": {
            "color": "#1f77b4",
            "label": "Before rainfall",
            "points": [
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
                        "y": 6.5
                  },
                  {
                        "x": 3,
                        "y": 8.8
                  },
                  {
                        "x": 4,
                        "y": 9.2
                  },
                  {
                        "x": 5,
                        "y": 9
                  }
            ]
      }
} satisfies PopulationChangeEventGraphInput
    
    const svg = generatePopulationChangeEventGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("populationChangeEventGraph - changes-in-carrying-capacity", () => {
    // Source: Question xd25b15f503333317 (Changes in carrying capacity)
    const input = {
      "type": "populationChangeEventGraph",
      "width": 400,
      "height": 300,
      "xAxisMax": 10,
      "xAxisMin": 0,
      "yAxisMax": 10,
      "yAxisMin": 0,
      "showLegend": true,
      "xAxisLabel": "Population size",
      "yAxisLabel": "Time",
      "afterSegment": {
            "color": "#1f77b4",
            "label": "After rainfall",
            "points": [
                  {
                        "x": 5,
                        "y": 9
                  },
                  {
                        "x": 6,
                        "y": 7
                  },
                  {
                        "x": 7,
                        "y": 5.5
                  },
                  {
                        "x": 8,
                        "y": 5
                  },
                  {
                        "x": 9,
                        "y": 5.3
                  },
                  {
                        "x": 10,
                        "y": 5.1
                  }
            ]
      },
      "beforeSegment": {
            "color": "#1f77b4",
            "label": "Before rainfall",
            "points": [
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
                        "y": 6.5
                  },
                  {
                        "x": 3,
                        "y": 8.8
                  },
                  {
                        "x": 4,
                        "y": 9.2
                  },
                  {
                        "x": 5,
                        "y": 9
                  }
            ]
      }
} satisfies PopulationChangeEventGraphInput
    
    const svg = generatePopulationChangeEventGraph(input)
    expect(svg).toMatchSnapshot()
  })
})
