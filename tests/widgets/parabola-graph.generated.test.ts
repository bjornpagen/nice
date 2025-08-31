// ⚠️ AUTO-GENERATED TEST FILE
// This file was automatically generated from production widget data.
// Do not modify manually - regenerate if needed.

import { describe, expect, it } from "bun:test"
import type { z } from "zod"
import { generateParabolaGraph, ParabolaGraphPropsSchema } from "@/lib/widgets/generators/parabola-graph"

type ParabolaGraphInput = z.input<typeof ParabolaGraphPropsSchema>

describe("parabolaGraph widget (generated from production data)", () => {

  it("parabolaGraph - latitudinal-diversity-gradient", () => {
    // Source: Question x7fd415086ba3b8d0 (Latitudinal diversity gradient)
    const input = {
      "type": "parabolaGraph",
      "width": 500,
      "xAxis": {
            "max": 180,
            "min": 0,
            "label": "Latitude (in degrees)",
            "tickInterval": 30,
            "showGridLines": true,
            "showTickLabels": false
      },
      "yAxis": {
            "max": 40,
            "min": 0,
            "label": "Number of marine mammal species",
            "tickInterval": 10,
            "showGridLines": true,
            "showTickLabels": true
      },
      "height": 350,
      "parabola": {
            "color": "#1f77b4",
            "style": "solid",
            "vertex": {
                  "x": 90,
                  "y": 40
            },
            "yIntercept": 3
      }
} satisfies ParabolaGraphInput
    
    const svg = generateParabolaGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("parabolaGraph - latitudinal-diversity-gradient", () => {
    // Source: Question x32ee680a5065a4ed (Latitudinal diversity gradient)
    const input = {
      "type": "parabolaGraph",
      "width": 420,
      "xAxis": {
            "max": 80,
            "min": 10,
            "label": "Latitude (in degrees north)",
            "tickInterval": 10,
            "showGridLines": false,
            "showTickLabels": true
      },
      "yAxis": {
            "max": 200,
            "min": 0,
            "label": "Number of squamate species",
            "tickInterval": 40,
            "showGridLines": false,
            "showTickLabels": true
      },
      "height": 300,
      "parabola": {
            "color": "#0B63CE",
            "style": "solid",
            "vertex": {
                  "x": 45,
                  "y": 173
            },
            "yIntercept": 60
      }
} satisfies ParabolaGraphInput
    
    const svg = generateParabolaGraph(input)
    expect(svg).toMatchSnapshot()
  })
})
