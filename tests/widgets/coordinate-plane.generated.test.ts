// ⚠️ AUTO-GENERATED TEST FILE
// This file was automatically generated from production widget data.
// Do not modify manually - regenerate if needed.

import { describe, expect, it } from "bun:test"
import type { z } from "zod"
import { generateCoordinatePlaneComprehensive, CoordinatePlaneComprehensivePropsSchema } from "@/lib/widgets/generators/coordinate-plane-comprehensive"

type CoordinatePlaneInput = z.input<typeof CoordinatePlaneComprehensivePropsSchema>

describe("coordinatePlane widget (generated from production data)", () => {

  it("coordinatePlane - type-4", () => {
    // Source: Question x57a2b28f4f0bf3e3 (Type 4)
    const input = {
      "type": "coordinatePlane",
      "lines": [
            {
                  "id": "ke-mass-line",
                  "color": "#000000",
                  "style": "solid",
                  "equation": {
                        "type": "slopeIntercept",
                        "slope": 1,
                        "yIntercept": 0
                  }
            }
      ],
      "width": 400,
      "xAxis": {
            "max": 4,
            "min": 0,
            "label": "mass",
            "tickInterval": 1,
            "showGridLines": true
      },
      "yAxis": {
            "max": 4,
            "min": 0,
            "label": "kinetic energy",
            "tickInterval": 1,
            "showGridLines": true
      },
      "height": 400,
      "points": [],
      "polygons": [],
      "distances": [],
      "polylines": [],
      "showQuadrantLabels": false
} satisfies CoordinatePlaneInput
    
    const svg = generateCoordinatePlaneComprehensive(input)
    expect(svg).toMatchSnapshot()
  })

  it("coordinatePlane - type-3", () => {
    // Source: Question xdbaf91dacc4e207b (Type 3)
    const input = {
      "type": "coordinatePlane",
      "lines": [],
      "width": 500,
      "xAxis": {
            "max": 20,
            "min": 0,
            "label": "Speed (m/s)",
            "tickInterval": 5,
            "showGridLines": true
      },
      "yAxis": {
            "max": 80,
            "min": 0,
            "label": "Kinetic energy (kJ)",
            "tickInterval": 20,
            "showGridLines": true
      },
      "height": 400,
      "points": [],
      "polygons": [],
      "distances": [],
      "polylines": [
            {
                  "id": "kinetic-energy-curve",
                  "color": "#000000",
                  "style": "solid",
                  "points": [
                        {
                              "x": 0,
                              "y": 0
                        },
                        {
                              "x": 1,
                              "y": 0.2
                        },
                        {
                              "x": 2,
                              "y": 0.8
                        },
                        {
                              "x": 3,
                              "y": 1.8
                        },
                        {
                              "x": 4,
                              "y": 3.2
                        },
                        {
                              "x": 5,
                              "y": 5
                        },
                        {
                              "x": 6,
                              "y": 7.2
                        },
                        {
                              "x": 7,
                              "y": 9.8
                        },
                        {
                              "x": 8,
                              "y": 12.8
                        },
                        {
                              "x": 9,
                              "y": 16.2
                        },
                        {
                              "x": 10,
                              "y": 20
                        },
                        {
                              "x": 11,
                              "y": 24.2
                        },
                        {
                              "x": 12,
                              "y": 28.8
                        },
                        {
                              "x": 13,
                              "y": 33.8
                        },
                        {
                              "x": 14,
                              "y": 39.2
                        },
                        {
                              "x": 15,
                              "y": 45
                        },
                        {
                              "x": 16,
                              "y": 51.2
                        },
                        {
                              "x": 17,
                              "y": 57.8
                        },
                        {
                              "x": 18,
                              "y": 64.8
                        },
                        {
                              "x": 19,
                              "y": 72.2
                        },
                        {
                              "x": 20,
                              "y": 80
                        }
                  ]
            }
      ],
      "showQuadrantLabels": false
} satisfies CoordinatePlaneInput
    
    const svg = generateCoordinatePlaneComprehensive(input)
    expect(svg).toMatchSnapshot()
  })

  it("coordinatePlane - type-3", () => {
    // Source: Question xb14d0a2b7ceca156 (Type 3)
    const input = {
      "type": "coordinatePlane",
      "lines": [],
      "width": 500,
      "xAxis": {
            "max": 6,
            "min": 0,
            "label": "Speed (m/s)",
            "tickInterval": 1,
            "showGridLines": true
      },
      "yAxis": {
            "max": 100,
            "min": 0,
            "label": "Kinetic energy (J)",
            "tickInterval": 25,
            "showGridLines": true
      },
      "height": 400,
      "points": [],
      "polygons": [],
      "distances": [],
      "polylines": [
            {
                  "id": "ke-curve",
                  "color": "#000000",
                  "style": "solid",
                  "points": [
                        {
                              "x": 0,
                              "y": 0
                        },
                        {
                              "x": 0.5,
                              "y": 0.69
                        },
                        {
                              "x": 1,
                              "y": 2.78
                        },
                        {
                              "x": 1.5,
                              "y": 6.25
                        },
                        {
                              "x": 2,
                              "y": 11.11
                        },
                        {
                              "x": 2.5,
                              "y": 17.36
                        },
                        {
                              "x": 3,
                              "y": 25
                        },
                        {
                              "x": 3.5,
                              "y": 34.03
                        },
                        {
                              "x": 4,
                              "y": 44.44
                        },
                        {
                              "x": 4.5,
                              "y": 56.25
                        },
                        {
                              "x": 5,
                              "y": 69.44
                        },
                        {
                              "x": 5.5,
                              "y": 83.68
                        },
                        {
                              "x": 6,
                              "y": 100
                        }
                  ]
            }
      ],
      "showQuadrantLabels": false
} satisfies CoordinatePlaneInput
    
    const svg = generateCoordinatePlaneComprehensive(input)
    expect(svg).toMatchSnapshot()
  })

  it("coordinatePlane - type-4", () => {
    // Source: Question x4b81dd5e6925ebec (Type 4)
    const input = {
      "type": "coordinatePlane",
      "lines": [],
      "width": 500,
      "xAxis": {
            "max": 4.25,
            "min": -0.25,
            "label": "speed (m/s)",
            "tickInterval": 1,
            "showGridLines": true
      },
      "yAxis": {
            "max": 16.95,
            "min": -0.95,
            "label": "kinetic energy (J)",
            "tickInterval": 2,
            "showGridLines": true
      },
      "height": 500,
      "points": [],
      "polygons": [],
      "distances": [],
      "polylines": [],
      "showQuadrantLabels": false
} satisfies CoordinatePlaneInput
    
    const svg = generateCoordinatePlaneComprehensive(input)
    expect(svg).toMatchSnapshot()
  })

  it("coordinatePlane - type-4", () => {
    // Source: Question x8961314982703e31 (Type 4)
    const input = {
      "type": "coordinatePlane",
      "lines": [],
      "width": 288,
      "xAxis": {
            "max": 22,
            "min": -1.8,
            "label": "mass (kg)",
            "tickInterval": 5,
            "showGridLines": true
      },
      "yAxis": {
            "max": 84,
            "min": -4,
            "label": "kinetic energy (J)",
            "tickInterval": 10,
            "showGridLines": true
      },
      "height": 288,
      "points": [],
      "polygons": [],
      "distances": [],
      "polylines": [],
      "showQuadrantLabels": false
} satisfies CoordinatePlaneInput
    
    const svg = generateCoordinatePlaneComprehensive(input)
    expect(svg).toMatchSnapshot()
  })
})
