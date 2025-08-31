// ⚠️ AUTO-GENERATED TEST FILE
// This file was automatically generated from production widget data.
// Do not modify manually - regenerate if needed.

import { describe, expect, it } from "bun:test"
import type { z } from "zod"
import { generatePieChart, PieChartWidgetPropsSchema } from "@/lib/widgets/generators/pi-chart"

type PieChartInput = z.input<typeof PieChartWidgetPropsSchema>

describe("pieChart widget (generated from production data)", () => {

  it("pieChart - human-impacts-on-the-environment-a-land-use-case-s", () => {
    // Source: Question x891b0cd1b605a006 (Human impacts on the environment: a land use case study)
    const input = {
      "type": "pieChart",
      "width": 600,
      "charts": [
            {
                  "title": "Earth’s land",
                  "slices": [
                        {
                              "color": "#4CAF50",
                              "label": "Habitable land",
                              "value": 71
                        },
                        {
                              "color": "#BDBDBD",
                              "label": "Uninhabitable land",
                              "value": 29
                        }
                  ]
            },
            {
                  "title": "Habitable land",
                  "slices": [
                        {
                              "color": "#FFC107",
                              "label": "Agricultural land",
                              "value": 50
                        },
                        {
                              "color": "#2E7D32",
                              "label": "Forests and shrub",
                              "value": 48
                        },
                        {
                              "color": "#2196F3",
                              "label": "Lakes and rivers",
                              "value": 1
                        },
                        {
                              "color": "#9E9E9E",
                              "label": "Urban land",
                              "value": 1
                        }
                  ]
            },
            {
                  "title": "Agricultural land",
                  "slices": [
                        {
                              "color": "#FF7043",
                              "label": "Livestock and feed",
                              "value": 77
                        },
                        {
                              "color": "#66BB6A",
                              "label": "Crops",
                              "value": 23
                        }
                  ]
            }
      ],
      "height": 660,
      "layout": "vertical",
      "spacing": 40
} satisfies PieChartInput
    
    const svg = generatePieChart(input)
    expect(svg).toMatchSnapshot()
  })
})
