// ⚠️ AUTO-GENERATED TEST FILE
// This file was automatically generated from production widget data.
// Do not modify manually - regenerate if needed.

import { describe, expect, it } from "bun:test"
import type { z } from "zod"
import { generateScatterPlot, ScatterPlotPropsSchema } from "@/lib/widgets/generators/scatter-plot"

type ScatterPlotInput = z.input<typeof ScatterPlotPropsSchema>

describe("scatterPlot widget (generated from production data)", () => {

  it("scatterPlot - magnetic-field-data", () => {
    // Source: Question x8622474646909250 (Magnetic field data)
    const input = {
      "type": "scatterPlot",
      "lines": [],
      "title": "Magnetic field strength vs. distance",
      "width": 288,
      "xAxis": {
            "max": 7.5,
            "min": -0.45,
            "label": "distance (cm)",
            "gridLines": true,
            "tickInterval": 1
      },
      "yAxis": {
            "max": 2.2,
            "min": -0.1,
            "label": "field strength (mT)",
            "gridLines": true,
            "tickInterval": 0.5
      },
      "height": 288,
      "points": [
            {
                  "x": 3,
                  "y": 2,
                  "label": ""
            },
            {
                  "x": 4,
                  "y": 0.8,
                  "label": ""
            },
            {
                  "x": 5,
                  "y": 0.43,
                  "label": ""
            },
            {
                  "x": 6,
                  "y": 0.25,
                  "label": ""
            },
            {
                  "x": 7,
                  "y": 0.16,
                  "label": ""
            }
      ]
} satisfies ScatterPlotInput
    
    const svg = generateScatterPlot(input)
    expect(svg).toMatchSnapshot()
  })

  it("scatterPlot - type-4", () => {
    // Source: Question x4b81dd5e6925ebec (Type 4)
    const input = {
      "type": "scatterPlot",
      "lines": [],
      "title": "kinetic energy vs. speed",
      "width": 600,
      "xAxis": {
            "max": 4.25,
            "min": -0.25,
            "label": "speed (m/s)",
            "gridLines": true,
            "tickInterval": 1
      },
      "yAxis": {
            "max": 16.95,
            "min": -0.95,
            "label": "kinetic energy (J)",
            "gridLines": true,
            "tickInterval": 2
      },
      "height": 400,
      "points": [
            {
                  "x": 1,
                  "y": 1,
                  "label": ""
            },
            {
                  "x": 2,
                  "y": 4,
                  "label": ""
            },
            {
                  "x": 3,
                  "y": 9,
                  "label": ""
            },
            {
                  "x": 4,
                  "y": 16,
                  "label": ""
            }
      ]
} satisfies ScatterPlotInput
    
    const svg = generateScatterPlot(input)
    expect(svg).toMatchSnapshot()
  })

  it("scatterPlot - type-4", () => {
    // Source: Question x4b81dd5e6925ebec (Type 4)
    const input = {
      "type": "scatterPlot",
      "lines": [],
      "title": "kinetic energy vs. speed",
      "width": 600,
      "xAxis": {
            "max": 4.25,
            "min": -0.25,
            "label": "speed (m/s)",
            "gridLines": true,
            "tickInterval": 1
      },
      "yAxis": {
            "max": 16.95,
            "min": -0.95,
            "label": "kinetic energy (J)",
            "gridLines": true,
            "tickInterval": 2
      },
      "height": 400,
      "points": [
            {
                  "x": 1,
                  "y": 2,
                  "label": ""
            },
            {
                  "x": 2,
                  "y": 4,
                  "label": ""
            },
            {
                  "x": 3,
                  "y": 6,
                  "label": ""
            },
            {
                  "x": 4,
                  "y": 8,
                  "label": ""
            }
      ]
} satisfies ScatterPlotInput
    
    const svg = generateScatterPlot(input)
    expect(svg).toMatchSnapshot()
  })

  it("scatterPlot - type-4", () => {
    // Source: Question x4b81dd5e6925ebec (Type 4)
    const input = {
      "type": "scatterPlot",
      "lines": [],
      "title": "kinetic energy vs. speed",
      "width": 600,
      "xAxis": {
            "max": 4.25,
            "min": -0.25,
            "label": "speed (m/s)",
            "gridLines": true,
            "tickInterval": 1
      },
      "yAxis": {
            "max": 16.95,
            "min": -0.95,
            "label": "kinetic energy (J)",
            "gridLines": true,
            "tickInterval": 2
      },
      "height": 400,
      "points": [
            {
                  "x": 2,
                  "y": 2,
                  "label": ""
            },
            {
                  "x": 2,
                  "y": 4,
                  "label": ""
            },
            {
                  "x": 2,
                  "y": 6,
                  "label": ""
            },
            {
                  "x": 2,
                  "y": 8,
                  "label": ""
            }
      ]
} satisfies ScatterPlotInput
    
    const svg = generateScatterPlot(input)
    expect(svg).toMatchSnapshot()
  })

  it("scatterPlot - type-4", () => {
    // Source: Question x4a8633aa97f85d4e (Type 4)
    const input = {
      "type": "scatterPlot",
      "lines": [],
      "title": "kinetic energy vs. mass",
      "width": 500,
      "xAxis": {
            "max": 4.25,
            "min": -0.25,
            "label": "mass (kg)",
            "gridLines": true,
            "tickInterval": 1
      },
      "yAxis": {
            "max": 16.95,
            "min": -0.95,
            "label": "kinetic energy (J)",
            "gridLines": true,
            "tickInterval": 2
      },
      "height": 350,
      "points": [
            {
                  "x": 1,
                  "y": 2,
                  "label": ""
            },
            {
                  "x": 2,
                  "y": 4,
                  "label": ""
            },
            {
                  "x": 3,
                  "y": 6,
                  "label": ""
            },
            {
                  "x": 4,
                  "y": 8,
                  "label": ""
            }
      ]
} satisfies ScatterPlotInput
    
    const svg = generateScatterPlot(input)
    expect(svg).toMatchSnapshot()
  })

  it("scatterPlot - type-4", () => {
    // Source: Question x4a8633aa97f85d4e (Type 4)
    const input = {
      "type": "scatterPlot",
      "lines": [],
      "title": "kinetic energy vs. mass",
      "width": 500,
      "xAxis": {
            "max": 4.25,
            "min": -0.25,
            "label": "mass (kg)",
            "gridLines": true,
            "tickInterval": 1
      },
      "yAxis": {
            "max": 16.95,
            "min": -0.95,
            "label": "kinetic energy (J)",
            "gridLines": true,
            "tickInterval": 2
      },
      "height": 350,
      "points": [
            {
                  "x": 2,
                  "y": 1,
                  "label": ""
            },
            {
                  "x": 2,
                  "y": 4,
                  "label": ""
            },
            {
                  "x": 2,
                  "y": 9,
                  "label": ""
            },
            {
                  "x": 2,
                  "y": 16,
                  "label": ""
            }
      ]
} satisfies ScatterPlotInput
    
    const svg = generateScatterPlot(input)
    expect(svg).toMatchSnapshot()
  })

  it("scatterPlot - type-4", () => {
    // Source: Question x4a8633aa97f85d4e (Type 4)
    const input = {
      "type": "scatterPlot",
      "lines": [],
      "title": "kinetic energy vs. mass",
      "width": 500,
      "xAxis": {
            "max": 4.25,
            "min": -0.25,
            "label": "mass (kg)",
            "gridLines": true,
            "tickInterval": 1
      },
      "yAxis": {
            "max": 16.95,
            "min": -0.95,
            "label": "kinetic energy (J)",
            "gridLines": true,
            "tickInterval": 2
      },
      "height": 350,
      "points": [
            {
                  "x": 1,
                  "y": 2,
                  "label": ""
            },
            {
                  "x": 2,
                  "y": 9,
                  "label": ""
            },
            {
                  "x": 3,
                  "y": 6,
                  "label": ""
            },
            {
                  "x": 4,
                  "y": 8,
                  "label": ""
            }
      ]
} satisfies ScatterPlotInput
    
    const svg = generateScatterPlot(input)
    expect(svg).toMatchSnapshot()
  })

  it("scatterPlot - type-4", () => {
    // Source: Question x8961314982703e31 (Type 4)
    const input = {
      "type": "scatterPlot",
      "lines": [],
      "title": "kinetic energy vs. mass",
      "width": 400,
      "xAxis": {
            "max": 22,
            "min": -1.8,
            "label": "mass (kg)",
            "gridLines": true,
            "tickInterval": 5
      },
      "yAxis": {
            "max": 84,
            "min": -4,
            "label": "kinetic energy (J)",
            "gridLines": true,
            "tickInterval": 10
      },
      "height": 300,
      "points": [
            {
                  "x": 5,
                  "y": 10,
                  "label": ""
            },
            {
                  "x": 10,
                  "y": 20,
                  "label": ""
            },
            {
                  "x": 15,
                  "y": 30,
                  "label": ""
            },
            {
                  "x": 20,
                  "y": 40,
                  "label": ""
            }
      ]
} satisfies ScatterPlotInput
    
    const svg = generateScatterPlot(input)
    expect(svg).toMatchSnapshot()
  })

  it("scatterPlot - type-4", () => {
    // Source: Question x8961314982703e31 (Type 4)
    const input = {
      "type": "scatterPlot",
      "lines": [],
      "title": "kinetic energy vs. mass",
      "width": 400,
      "xAxis": {
            "max": 22,
            "min": -1.8,
            "label": "mass (kg)",
            "gridLines": true,
            "tickInterval": 5
      },
      "yAxis": {
            "max": 84,
            "min": -4,
            "label": "kinetic energy (J)",
            "gridLines": true,
            "tickInterval": 10
      },
      "height": 300,
      "points": [
            {
                  "x": 10,
                  "y": 5,
                  "label": ""
            },
            {
                  "x": 10,
                  "y": 20,
                  "label": ""
            },
            {
                  "x": 10,
                  "y": 45,
                  "label": ""
            },
            {
                  "x": 10,
                  "y": 80,
                  "label": ""
            }
      ]
} satisfies ScatterPlotInput
    
    const svg = generateScatterPlot(input)
    expect(svg).toMatchSnapshot()
  })

  it("scatterPlot - type-4", () => {
    // Source: Question x8961314982703e31 (Type 4)
    const input = {
      "type": "scatterPlot",
      "lines": [],
      "title": "kinetic energy vs. mass",
      "width": 400,
      "xAxis": {
            "max": 22,
            "min": -1.8,
            "label": "mass (kg)",
            "gridLines": true,
            "tickInterval": 5
      },
      "yAxis": {
            "max": 84,
            "min": -4,
            "label": "kinetic energy (J)",
            "gridLines": true,
            "tickInterval": 10
      },
      "height": 300,
      "points": [
            {
                  "x": 5,
                  "y": 10,
                  "label": ""
            },
            {
                  "x": 10,
                  "y": 20,
                  "label": ""
            },
            {
                  "x": 10,
                  "y": 45,
                  "label": ""
            },
            {
                  "x": 20,
                  "y": 40,
                  "label": ""
            }
      ]
} satisfies ScatterPlotInput
    
    const svg = generateScatterPlot(input)
    expect(svg).toMatchSnapshot()
  })

  it("scatterPlot - species-richness-in-aquatic-systems", () => {
    // Source: Question x37f3db6193228a48 (Species richness in aquatic systems)
    const input = {
      "type": "scatterPlot",
      "lines": [
            {
                  "a": {
                        "x": 0,
                        "y": 2.5
                  },
                  "b": {
                        "x": 22,
                        "y": 15
                  },
                  "type": "twoPoints",
                  "label": "",
                  "style": {
                        "dash": false,
                        "color": "#0C7F99",
                        "strokeWidth": 3
                  }
            }
      ],
      "title": "Foraminifera species richness vs. sea surface temperature",
      "width": 349,
      "xAxis": {
            "max": 22,
            "min": 0,
            "label": "Sea surface temperature (in degrees Celsius)",
            "gridLines": true,
            "tickInterval": 2
      },
      "yAxis": {
            "max": 20,
            "min": 0,
            "label": "Number of Foraminifera species",
            "gridLines": true,
            "tickInterval": 5
      },
      "height": 360,
      "points": [
            {
                  "x": 0.9,
                  "y": 2.5,
                  "label": ""
            },
            {
                  "x": 1,
                  "y": 3.8,
                  "label": ""
            },
            {
                  "x": 1.1,
                  "y": 5,
                  "label": ""
            },
            {
                  "x": 2.6,
                  "y": 3.3,
                  "label": ""
            },
            {
                  "x": 3.2,
                  "y": 3,
                  "label": ""
            },
            {
                  "x": 3.4,
                  "y": 2.3,
                  "label": ""
            },
            {
                  "x": 4.6,
                  "y": 2.7,
                  "label": ""
            },
            {
                  "x": 4.6,
                  "y": 4.6,
                  "label": ""
            },
            {
                  "x": 5.5,
                  "y": 3.8,
                  "label": ""
            },
            {
                  "x": 6.1,
                  "y": 5,
                  "label": ""
            },
            {
                  "x": 6.9,
                  "y": 4.9,
                  "label": ""
            },
            {
                  "x": 8.3,
                  "y": 4.8,
                  "label": ""
            },
            {
                  "x": 8.5,
                  "y": 3.5,
                  "label": ""
            },
            {
                  "x": 8,
                  "y": 6.3,
                  "label": ""
            },
            {
                  "x": 4.3,
                  "y": 7.3,
                  "label": ""
            },
            {
                  "x": 6,
                  "y": 6.7,
                  "label": ""
            },
            {
                  "x": 7,
                  "y": 6.8,
                  "label": ""
            },
            {
                  "x": 5,
                  "y": 8.1,
                  "label": ""
            },
            {
                  "x": 5.5,
                  "y": 9.2,
                  "label": ""
            },
            {
                  "x": 7,
                  "y": 9.3,
                  "label": ""
            },
            {
                  "x": 8.1,
                  "y": 8.3,
                  "label": ""
            },
            {
                  "x": 9.3,
                  "y": 7.5,
                  "label": ""
            },
            {
                  "x": 11.3,
                  "y": 9.6,
                  "label": ""
            },
            {
                  "x": 9.8,
                  "y": 11,
                  "label": ""
            },
            {
                  "x": 11.1,
                  "y": 10,
                  "label": ""
            },
            {
                  "x": 12.3,
                  "y": 9.4,
                  "label": ""
            },
            {
                  "x": 12.2,
                  "y": 9.1,
                  "label": ""
            },
            {
                  "x": 10.5,
                  "y": 9,
                  "label": ""
            },
            {
                  "x": 10.8,
                  "y": 8.6,
                  "label": ""
            },
            {
                  "x": 12.1,
                  "y": 8.5,
                  "label": ""
            },
            {
                  "x": 10,
                  "y": 6.8,
                  "label": ""
            },
            {
                  "x": 9.4,
                  "y": 5.5,
                  "label": ""
            },
            {
                  "x": 11.1,
                  "y": 6.6,
                  "label": ""
            },
            {
                  "x": 11.5,
                  "y": 7.3,
                  "label": ""
            },
            {
                  "x": 13.7,
                  "y": 4,
                  "label": ""
            },
            {
                  "x": 13.4,
                  "y": 7.9,
                  "label": ""
            },
            {
                  "x": 12.5,
                  "y": 10.8,
                  "label": ""
            },
            {
                  "x": 12,
                  "y": 11.6,
                  "label": ""
            },
            {
                  "x": 13.2,
                  "y": 12,
                  "label": ""
            },
            {
                  "x": 12,
                  "y": 12.9,
                  "label": ""
            },
            {
                  "x": 14.3,
                  "y": 11.7,
                  "label": ""
            },
            {
                  "x": 15.8,
                  "y": 11.2,
                  "label": ""
            },
            {
                  "x": 14.9,
                  "y": 9.9,
                  "label": ""
            },
            {
                  "x": 15.8,
                  "y": 10.2,
                  "label": ""
            },
            {
                  "x": 16.1,
                  "y": 10,
                  "label": ""
            },
            {
                  "x": 15.8,
                  "y": 9.3,
                  "label": ""
            },
            {
                  "x": 17.1,
                  "y": 8.2,
                  "label": ""
            },
            {
                  "x": 16.3,
                  "y": 11.4,
                  "label": ""
            },
            {
                  "x": 16.6,
                  "y": 11,
                  "label": ""
            },
            {
                  "x": 16.9,
                  "y": 10.6,
                  "label": ""
            },
            {
                  "x": 17.4,
                  "y": 10.5,
                  "label": ""
            },
            {
                  "x": 17.5,
                  "y": 9.9,
                  "label": ""
            },
            {
                  "x": 17.1,
                  "y": 9.6,
                  "label": ""
            },
            {
                  "x": 14.5,
                  "y": 13.2,
                  "label": ""
            },
            {
                  "x": 15.4,
                  "y": 14.2,
                  "label": ""
            },
            {
                  "x": 16,
                  "y": 15.8,
                  "label": ""
            },
            {
                  "x": 17.1,
                  "y": 15.6,
                  "label": ""
            },
            {
                  "x": 17.7,
                  "y": 15.7,
                  "label": ""
            },
            {
                  "x": 19.8,
                  "y": 16.3,
                  "label": ""
            },
            {
                  "x": 17.8,
                  "y": 15,
                  "label": ""
            },
            {
                  "x": 18.2,
                  "y": 16.5,
                  "label": ""
            },
            {
                  "x": 17.3,
                  "y": 13.9,
                  "label": ""
            },
            {
                  "x": 17.9,
                  "y": 13.2,
                  "label": ""
            },
            {
                  "x": 18.5,
                  "y": 13.6,
                  "label": ""
            },
            {
                  "x": 18.8,
                  "y": 14.2,
                  "label": ""
            },
            {
                  "x": 19.6,
                  "y": 14.2,
                  "label": ""
            },
            {
                  "x": 19.7,
                  "y": 14.6,
                  "label": ""
            },
            {
                  "x": 19.8,
                  "y": 15.3,
                  "label": ""
            },
            {
                  "x": 20.5,
                  "y": 15.3,
                  "label": ""
            },
            {
                  "x": 20.4,
                  "y": 15.8,
                  "label": ""
            },
            {
                  "x": 20,
                  "y": 15.8,
                  "label": ""
            },
            {
                  "x": 19.7,
                  "y": 15.9,
                  "label": ""
            },
            {
                  "x": 20,
                  "y": 17.2,
                  "label": ""
            },
            {
                  "x": 20.4,
                  "y": 16.9,
                  "label": ""
            },
            {
                  "x": 20.8,
                  "y": 17.3,
                  "label": ""
            },
            {
                  "x": 20.7,
                  "y": 17.8,
                  "label": ""
            },
            {
                  "x": 20.2,
                  "y": 18.3,
                  "label": ""
            },
            {
                  "x": 21,
                  "y": 15.3,
                  "label": ""
            },
            {
                  "x": 21.5,
                  "y": 9.3,
                  "label": ""
            }
      ]
} satisfies ScatterPlotInput
    
    const svg = generateScatterPlot(input)
    expect(svg).toMatchSnapshot()
  })

  it("scatterPlot - species-richness-in-terrestrial-systems", () => {
    // Source: Question x1c02483196101f90 (Species richness in terrestrial systems)
    const input = {
      "type": "scatterPlot",
      "lines": [
            {
                  "a": {
                        "x": 0,
                        "y": 5.8
                  },
                  "b": {
                        "x": 10,
                        "y": 37
                  },
                  "type": "twoPoints",
                  "label": "",
                  "style": {
                        "dash": false,
                        "color": "#0d923f",
                        "strokeWidth": 3
                  }
            }
      ],
      "title": "Number of plant species vs. soil temperature",
      "width": 356,
      "xAxis": {
            "max": 10,
            "min": 0,
            "label": "Soil temperature (in degrees Celsius)",
            "gridLines": true,
            "tickInterval": 2
      },
      "yAxis": {
            "max": 40,
            "min": 0,
            "label": "Number of plant species",
            "gridLines": true,
            "tickInterval": 5
      },
      "height": 371,
      "points": [
            {
                  "x": 1.88,
                  "y": 3.97,
                  "label": ""
            },
            {
                  "x": 2.78,
                  "y": 2.91,
                  "label": ""
            },
            {
                  "x": 2.47,
                  "y": 10.88,
                  "label": ""
            },
            {
                  "x": 2.69,
                  "y": 11.73,
                  "label": ""
            },
            {
                  "x": 2.67,
                  "y": 16.8,
                  "label": ""
            },
            {
                  "x": 2.88,
                  "y": 18.94,
                  "label": ""
            },
            {
                  "x": 4.01,
                  "y": 10.82,
                  "label": ""
            },
            {
                  "x": 4.79,
                  "y": 12.75,
                  "label": ""
            },
            {
                  "x": 5.43,
                  "y": 11.71,
                  "label": ""
            },
            {
                  "x": 4.48,
                  "y": 18.78,
                  "label": ""
            },
            {
                  "x": 5.76,
                  "y": 16.89,
                  "label": ""
            },
            {
                  "x": 5.05,
                  "y": 20.82,
                  "label": ""
            },
            {
                  "x": 5.58,
                  "y": 20.96,
                  "label": ""
            },
            {
                  "x": 6.22,
                  "y": 21.55,
                  "label": ""
            },
            {
                  "x": 5.46,
                  "y": 24,
                  "label": ""
            },
            {
                  "x": 5.05,
                  "y": 24.7,
                  "label": ""
            },
            {
                  "x": 5,
                  "y": 25.85,
                  "label": ""
            },
            {
                  "x": 4.53,
                  "y": 26.11,
                  "label": ""
            },
            {
                  "x": 4.12,
                  "y": 26.86,
                  "label": ""
            },
            {
                  "x": 3.75,
                  "y": 26.91,
                  "label": ""
            },
            {
                  "x": 5.86,
                  "y": 28.83,
                  "label": ""
            },
            {
                  "x": 6.24,
                  "y": 28.83,
                  "label": ""
            },
            {
                  "x": 6.28,
                  "y": 25.89,
                  "label": ""
            },
            {
                  "x": 7.34,
                  "y": 23.84,
                  "label": ""
            },
            {
                  "x": 9.1,
                  "y": 23.9,
                  "label": ""
            },
            {
                  "x": 6.73,
                  "y": 32.91,
                  "label": ""
            },
            {
                  "x": 6.24,
                  "y": 32.85,
                  "label": ""
            },
            {
                  "x": 6.54,
                  "y": 35.06,
                  "label": ""
            },
            {
                  "x": 5.91,
                  "y": 36,
                  "label": ""
            },
            {
                  "x": 0.61,
                  "y": 10.85,
                  "label": ""
            },
            {
                  "x": 0.98,
                  "y": 9.8,
                  "label": ""
            }
      ]
} satisfies ScatterPlotInput
    
    const svg = generateScatterPlot(input)
    expect(svg).toMatchSnapshot()
  })

  it("scatterPlot - species-richness-in-terrestrial-systems", () => {
    // Source: Question x76920739d5586c3a (Species richness in terrestrial systems)
    const input = {
      "type": "scatterPlot",
      "lines": [
            {
                  "a": {
                        "x": 0,
                        "y": 700
                  },
                  "b": {
                        "x": 3500,
                        "y": 3010
                  },
                  "type": "twoPoints",
                  "label": "Best-fit line",
                  "style": {
                        "dash": false,
                        "color": "#0D923F",
                        "strokeWidth": 3
                  }
            }
      ],
      "title": "Average annual precipitation vs. number of plant species",
      "width": 700,
      "xAxis": {
            "max": 3500,
            "min": 0,
            "label": "Average annual precipitation (in millimeters)",
            "gridLines": true,
            "tickInterval": 500
      },
      "yAxis": {
            "max": 4000,
            "min": 0,
            "label": "Number of plant species",
            "gridLines": true,
            "tickInterval": 500
      },
      "height": 500,
      "points": [
            {
                  "x": 174,
                  "y": 165,
                  "label": ""
            },
            {
                  "x": 467,
                  "y": 225,
                  "label": ""
            },
            {
                  "x": 471,
                  "y": 418,
                  "label": ""
            },
            {
                  "x": 631,
                  "y": 474,
                  "label": ""
            },
            {
                  "x": 631,
                  "y": 568,
                  "label": ""
            },
            {
                  "x": 851,
                  "y": 408,
                  "label": ""
            },
            {
                  "x": 998,
                  "y": 431,
                  "label": ""
            },
            {
                  "x": 1263,
                  "y": 442,
                  "label": ""
            },
            {
                  "x": 1432,
                  "y": 474,
                  "label": ""
            },
            {
                  "x": 1360,
                  "y": 662,
                  "label": ""
            },
            {
                  "x": 1500,
                  "y": 854,
                  "label": ""
            },
            {
                  "x": 1492,
                  "y": 914,
                  "label": ""
            },
            {
                  "x": 1373,
                  "y": 1078,
                  "label": ""
            },
            {
                  "x": 1140,
                  "y": 1258,
                  "label": ""
            },
            {
                  "x": 1121,
                  "y": 1083,
                  "label": ""
            },
            {
                  "x": 1002,
                  "y": 854,
                  "label": ""
            },
            {
                  "x": 860,
                  "y": 788,
                  "label": ""
            },
            {
                  "x": 800,
                  "y": 679,
                  "label": ""
            },
            {
                  "x": 961,
                  "y": 1290,
                  "label": ""
            },
            {
                  "x": 942,
                  "y": 1195,
                  "label": ""
            },
            {
                  "x": 787,
                  "y": 1139,
                  "label": ""
            },
            {
                  "x": 682,
                  "y": 1073,
                  "label": ""
            },
            {
                  "x": 727,
                  "y": 961,
                  "label": ""
            },
            {
                  "x": 750,
                  "y": 943,
                  "label": ""
            },
            {
                  "x": 1518,
                  "y": 2802,
                  "label": ""
            },
            {
                  "x": 1634,
                  "y": 2855,
                  "label": ""
            },
            {
                  "x": 1784,
                  "y": 2246,
                  "label": ""
            },
            {
                  "x": 1879,
                  "y": 1931,
                  "label": ""
            },
            {
                  "x": 1949,
                  "y": 2006,
                  "label": ""
            },
            {
                  "x": 2036,
                  "y": 2338,
                  "label": ""
            },
            {
                  "x": 2123,
                  "y": 2509,
                  "label": ""
            },
            {
                  "x": 2201,
                  "y": 2180,
                  "label": ""
            },
            {
                  "x": 2352,
                  "y": 2251,
                  "label": ""
            },
            {
                  "x": 2516,
                  "y": 1060,
                  "label": ""
            },
            {
                  "x": 2627,
                  "y": 2040,
                  "label": ""
            },
            {
                  "x": 2842,
                  "y": 2561,
                  "label": ""
            },
            {
                  "x": 3136,
                  "y": 2143,
                  "label": ""
            },
            {
                  "x": 1863,
                  "y": 3417,
                  "label": ""
            },
            {
                  "x": 1409,
                  "y": 3493,
                  "label": ""
            },
            {
                  "x": 774,
                  "y": 3374,
                  "label": ""
            }
      ]
} satisfies ScatterPlotInput
    
    const svg = generateScatterPlot(input)
    expect(svg).toMatchSnapshot()
  })

  it("scatterPlot - magnetic-field-data", () => {
    // Source: Question x6c8c97eb917e85aa (Magnetic field data)
    const input = {
      "type": "scatterPlot",
      "lines": [],
      "title": "Magnetic field strength vs. distance",
      "width": 600,
      "xAxis": {
            "max": 7.5,
            "min": -0.45,
            "label": "distance (cm)",
            "gridLines": true,
            "tickInterval": 1
      },
      "yAxis": {
            "max": 2.2,
            "min": -0.1,
            "label": "field strength (mT)",
            "gridLines": true,
            "tickInterval": 0.5
      },
      "height": 400,
      "points": [
            {
                  "x": 3,
                  "y": 2,
                  "label": ""
            },
            {
                  "x": 4,
                  "y": 0.8,
                  "label": ""
            },
            {
                  "x": 5,
                  "y": 0.43,
                  "label": ""
            },
            {
                  "x": 6,
                  "y": 0.25,
                  "label": ""
            },
            {
                  "x": 7,
                  "y": 0.16,
                  "label": ""
            }
      ]
} satisfies ScatterPlotInput
    
    const svg = generateScatterPlot(input)
    expect(svg).toMatchSnapshot()
  })

  it("scatterPlot - magnetic-field-data", () => {
    // Source: Question x0c0c4fc82d791a0c (Magnetic field data)
    const input = {
      "type": "scatterPlot",
      "lines": [],
      "title": "Magnetic field strength vs. distance",
      "width": 600,
      "xAxis": {
            "max": 7.5,
            "min": -0.45,
            "label": "distance (cm)",
            "gridLines": true,
            "tickInterval": 1
      },
      "yAxis": {
            "max": 2.2,
            "min": -0.1,
            "label": "field strength (mT)",
            "gridLines": true,
            "tickInterval": 0.5
      },
      "height": 400,
      "points": [
            {
                  "x": 3,
                  "y": 2,
                  "label": ""
            },
            {
                  "x": 4,
                  "y": 0.8,
                  "label": ""
            },
            {
                  "x": 5,
                  "y": 0.43,
                  "label": ""
            },
            {
                  "x": 6,
                  "y": 0.25,
                  "label": ""
            },
            {
                  "x": 7,
                  "y": 0.16,
                  "label": ""
            }
      ]
} satisfies ScatterPlotInput
    
    const svg = generateScatterPlot(input)
    expect(svg).toMatchSnapshot()
  })

  it("scatterPlot - species-richness-in-terrestrial-systems", () => {
    // Source: Question xe027a58694ae8a7e (Species richness in terrestrial systems)
    const input = {
      "type": "scatterPlot",
      "lines": [
            {
                  "a": {
                        "x": 0,
                        "y": 73
                  },
                  "b": {
                        "x": 3000,
                        "y": 10
                  },
                  "type": "twoPoints",
                  "label": "Regression line",
                  "style": {
                        "dash": false,
                        "color": "#0D923F",
                        "strokeWidth": 3
                  }
            }
      ],
      "title": "Tree species richness vs. elevation",
      "width": 350,
      "xAxis": {
            "max": 3000,
            "min": 0,
            "label": "Elevation (in meters)",
            "gridLines": true,
            "tickInterval": 500
      },
      "yAxis": {
            "max": 80,
            "min": 0,
            "label": "Number of tree species",
            "gridLines": true,
            "tickInterval": 10
      },
      "height": 357,
      "points": [
            {
                  "x": 331,
                  "y": 70,
                  "label": ""
            },
            {
                  "x": 374,
                  "y": 55.3,
                  "label": ""
            },
            {
                  "x": 609,
                  "y": 57,
                  "label": ""
            },
            {
                  "x": 617,
                  "y": 54.1,
                  "label": ""
            },
            {
                  "x": 702,
                  "y": 54.3,
                  "label": ""
            },
            {
                  "x": 779,
                  "y": 52.2,
                  "label": ""
            },
            {
                  "x": 718,
                  "y": 44.3,
                  "label": ""
            },
            {
                  "x": 774,
                  "y": 59.1,
                  "label": ""
            },
            {
                  "x": 869,
                  "y": 69.1,
                  "label": ""
            },
            {
                  "x": 761,
                  "y": 75.3,
                  "label": ""
            },
            {
                  "x": 1776,
                  "y": 44.5,
                  "label": ""
            },
            {
                  "x": 2221,
                  "y": 32.5,
                  "label": ""
            },
            {
                  "x": 2290,
                  "y": 25.9,
                  "label": ""
            },
            {
                  "x": 2282,
                  "y": 24.2,
                  "label": ""
            },
            {
                  "x": 2117,
                  "y": 23.7,
                  "label": ""
            },
            {
                  "x": 2161,
                  "y": 19.6,
                  "label": ""
            },
            {
                  "x": 2448,
                  "y": 21.8,
                  "label": ""
            },
            {
                  "x": 2541,
                  "y": 16.9,
                  "label": ""
            },
            {
                  "x": 2511,
                  "y": 13.7,
                  "label": ""
            },
            {
                  "x": 2850,
                  "y": 17.7,
                  "label": ""
            }
      ]
} satisfies ScatterPlotInput
    
    const svg = generateScatterPlot(input)
    expect(svg).toMatchSnapshot()
  })

  it("scatterPlot - species-richness-in-aquatic-systems", () => {
    // Source: Question x5d28c4135dcb1510 (Species richness in aquatic systems)
    const input = {
      "type": "scatterPlot",
      "lines": [
            {
                  "a": {
                        "x": 20,
                        "y": 60
                  },
                  "b": {
                        "x": 250,
                        "y": 1
                  },
                  "type": "twoPoints",
                  "label": "Trend line",
                  "style": {
                        "dash": false,
                        "color": "#0c7f99",
                        "strokeWidth": 3
                  }
            }
      ],
      "title": "Sponge species richness vs. water depth",
      "width": 350,
      "xAxis": {
            "max": 250,
            "min": 0,
            "label": "Water depth (in millimeters)",
            "gridLines": true,
            "tickInterval": 50
      },
      "yAxis": {
            "max": 60,
            "min": 0,
            "label": "Number of sponge species",
            "gridLines": true,
            "tickInterval": 10
      },
      "height": 359,
      "points": [
            {
                  "x": 30,
                  "y": 22,
                  "label": ""
            },
            {
                  "x": 35,
                  "y": 21,
                  "label": ""
            },
            {
                  "x": 45,
                  "y": 19,
                  "label": ""
            },
            {
                  "x": 55,
                  "y": 18,
                  "label": ""
            },
            {
                  "x": 65,
                  "y": 16,
                  "label": ""
            },
            {
                  "x": 75,
                  "y": 15,
                  "label": ""
            },
            {
                  "x": 85,
                  "y": 14,
                  "label": ""
            },
            {
                  "x": 95,
                  "y": 13,
                  "label": ""
            },
            {
                  "x": 105,
                  "y": 12,
                  "label": ""
            },
            {
                  "x": 115,
                  "y": 11,
                  "label": ""
            },
            {
                  "x": 125,
                  "y": 10,
                  "label": ""
            },
            {
                  "x": 135,
                  "y": 9,
                  "label": ""
            },
            {
                  "x": 145,
                  "y": 8,
                  "label": ""
            },
            {
                  "x": 155,
                  "y": 7,
                  "label": ""
            },
            {
                  "x": 165,
                  "y": 6,
                  "label": ""
            },
            {
                  "x": 175,
                  "y": 5,
                  "label": ""
            },
            {
                  "x": 185,
                  "y": 4,
                  "label": ""
            },
            {
                  "x": 195,
                  "y": 3,
                  "label": ""
            },
            {
                  "x": 205,
                  "y": 2,
                  "label": ""
            },
            {
                  "x": 215,
                  "y": 2,
                  "label": ""
            },
            {
                  "x": 220,
                  "y": 1,
                  "label": ""
            }
      ]
} satisfies ScatterPlotInput
    
    const svg = generateScatterPlot(input)
    expect(svg).toMatchSnapshot()
  })

  it("scatterPlot - species-richness-in-aquatic-systems", () => {
    // Source: Question xfb97e3cc106f1851 (Species richness in aquatic systems)
    const input = {
      "type": "scatterPlot",
      "lines": [
            {
                  "type": "bestFit",
                  "label": "Trend line",
                  "style": {
                        "dash": false,
                        "color": "#0C7F99",
                        "strokeWidth": 3
                  },
                  "method": "linear"
            }
      ],
      "title": "",
      "width": 350,
      "xAxis": {
            "max": 40,
            "min": 0,
            "label": "Sunlight (in percent solar irradiance)",
            "gridLines": true,
            "tickInterval": 10
      },
      "yAxis": {
            "max": 120,
            "min": 0,
            "label": "Number of coral species",
            "gridLines": true,
            "tickInterval": 20
      },
      "height": 350,
      "points": [
            {
                  "x": 3,
                  "y": 5,
                  "label": ""
            },
            {
                  "x": 5,
                  "y": 12,
                  "label": ""
            },
            {
                  "x": 7,
                  "y": 18,
                  "label": ""
            },
            {
                  "x": 9,
                  "y": 25,
                  "label": ""
            },
            {
                  "x": 11,
                  "y": 32,
                  "label": ""
            },
            {
                  "x": 13,
                  "y": 38,
                  "label": ""
            },
            {
                  "x": 15,
                  "y": 45,
                  "label": ""
            },
            {
                  "x": 17,
                  "y": 52,
                  "label": ""
            },
            {
                  "x": 19,
                  "y": 58,
                  "label": ""
            },
            {
                  "x": 21,
                  "y": 65,
                  "label": ""
            },
            {
                  "x": 23,
                  "y": 70,
                  "label": ""
            },
            {
                  "x": 25,
                  "y": 76,
                  "label": ""
            },
            {
                  "x": 27,
                  "y": 80,
                  "label": ""
            },
            {
                  "x": 29,
                  "y": 86,
                  "label": ""
            },
            {
                  "x": 31,
                  "y": 90,
                  "label": ""
            },
            {
                  "x": 33,
                  "y": 95,
                  "label": ""
            },
            {
                  "x": 35,
                  "y": 100,
                  "label": ""
            },
            {
                  "x": 36,
                  "y": 103,
                  "label": ""
            }
      ]
} satisfies ScatterPlotInput
    
    const svg = generateScatterPlot(input)
    expect(svg).toMatchSnapshot()
  })
})
