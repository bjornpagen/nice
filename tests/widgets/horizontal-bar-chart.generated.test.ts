// ⚠️ AUTO-GENERATED TEST FILE
// This file was automatically generated from production widget data.
// Do not modify manually - regenerate if needed.

import { describe, expect, it } from "bun:test"
import type { z } from "zod"
import { generateHorizontalBarChart, HorizontalBarChartPropsSchema } from "@/lib/widgets/generators/horizontal-bar-chart"

type HorizontalBarChartInput = z.input<typeof HorizontalBarChartPropsSchema>

describe("horizontalBarChart widget (generated from production data)", () => {

  it("horizontalBarChart - human-impacts-on-the-environment-a-land-use-case-s", () => {
    // Source: Question xe3cd6c403bec7f97 (Human impacts on the environment: a land use case study)
    const input = {
      "data": [
            {
                  "color": "#7854ab",
                  "label": "",
                  "value": 184.8,
                  "category": "Lamb"
            },
            {
                  "color": "#01a995",
                  "label": "",
                  "value": 163.6,
                  "category": "Beef"
            },
            {
                  "color": "#ca337c",
                  "label": "",
                  "value": 10.7,
                  "category": "Pork"
            },
            {
                  "color": "#e07d10",
                  "label": "",
                  "value": 7.1,
                  "category": "Chicken"
            }
      ],
      "type": "horizontalBarChart",
      "width": 437,
      "xAxis": {
            "max": 200,
            "min": 0,
            "label": "Land use per 100 grams of protein (m²)",
            "tickInterval": 25
      },
      "height": 244,
      "gridColor": "#cccccc"
} satisfies HorizontalBarChartInput
    
    const svg = generateHorizontalBarChart(input)
    expect(svg).toMatchSnapshot()
  })

  it("horizontalBarChart - human-impacts-on-the-environment-a-land-use-case-s", () => {
    // Source: Question xe3cd6c403bec7f97 (Human impacts on the environment: a land use case study)
    const input = {
      "data": [
            {
                  "color": "#7854ab",
                  "label": "",
                  "value": 184.8,
                  "category": "Beef"
            },
            {
                  "color": "#01a995",
                  "label": "",
                  "value": 163.6,
                  "category": "Lamb"
            },
            {
                  "color": "#ca337c",
                  "label": "",
                  "value": 10.7,
                  "category": "Pork"
            },
            {
                  "color": "#e07d10",
                  "label": "",
                  "value": 7.1,
                  "category": "Chicken"
            }
      ],
      "type": "horizontalBarChart",
      "width": 437,
      "xAxis": {
            "max": 200,
            "min": 0,
            "label": "Land use per 100 grams of protein (m²)",
            "tickInterval": 25
      },
      "height": 244,
      "gridColor": "#cccccc"
} satisfies HorizontalBarChartInput
    
    const svg = generateHorizontalBarChart(input)
    expect(svg).toMatchSnapshot()
  })

  it("horizontalBarChart - human-impacts-on-the-environment-a-land-use-case-s", () => {
    // Source: Question xe3cd6c403bec7f97 (Human impacts on the environment: a land use case study)
    const input = {
      "data": [
            {
                  "color": "#7854ab",
                  "label": "",
                  "value": 184.8,
                  "category": "Lamb"
            },
            {
                  "color": "#01a995",
                  "label": "",
                  "value": 163.6,
                  "category": "Pork"
            },
            {
                  "color": "#ca337c",
                  "label": "",
                  "value": 10.7,
                  "category": "Chicken"
            },
            {
                  "color": "#e07d10",
                  "label": "",
                  "value": 7.1,
                  "category": "Beef"
            }
      ],
      "type": "horizontalBarChart",
      "width": 437,
      "xAxis": {
            "max": 200,
            "min": 0,
            "label": "Land use per 100 grams of protein (m²)",
            "tickInterval": 25
      },
      "height": 244,
      "gridColor": "#cccccc"
} satisfies HorizontalBarChartInput
    
    const svg = generateHorizontalBarChart(input)
    expect(svg).toMatchSnapshot()
  })

  it("horizontalBarChart - human-impacts-on-the-environment-a-land-use-case-s", () => {
    // Source: Question xe3cd6c403bec7f97 (Human impacts on the environment: a land use case study)
    const input = {
      "data": [
            {
                  "color": "#7854ab",
                  "label": "",
                  "value": 184.8,
                  "category": ""
            },
            {
                  "color": "#01a995",
                  "label": "",
                  "value": 163.6,
                  "category": ""
            },
            {
                  "color": "#ca337c",
                  "label": "",
                  "value": 10.7,
                  "category": ""
            },
            {
                  "color": "#e07d10",
                  "label": "",
                  "value": 7.1,
                  "category": ""
            }
      ],
      "type": "horizontalBarChart",
      "width": 437,
      "xAxis": {
            "max": 200,
            "min": 0,
            "label": "Land use per 100 grams of protein (m²)",
            "tickInterval": 25
      },
      "height": 244,
      "gridColor": "#cccccc"
} satisfies HorizontalBarChartInput
    
    const svg = generateHorizontalBarChart(input)
    expect(svg).toMatchSnapshot()
  })

  it("horizontalBarChart - human-impacts-on-the-environment-a-land-use-case-s", () => {
    // Source: Question x99432c8eb4194ecf (Human impacts on the environment: a land use case study)
    const input = {
      "data": [
            {
                  "color": "#7854ab",
                  "label": "184.8 m²",
                  "value": 184.8,
                  "category": "Lamb"
            },
            {
                  "color": "#01a995",
                  "label": "163.6 m²",
                  "value": 163.6,
                  "category": "Beef"
            },
            {
                  "color": "#ca337c",
                  "label": "10.7 m²",
                  "value": 10.7,
                  "category": "Pork"
            },
            {
                  "color": "#e07d10",
                  "label": "7.1 m²",
                  "value": 7.1,
                  "category": "Chicken"
            },
            {
                  "color": "#11accd",
                  "label": "4.6 m²",
                  "value": 4.6,
                  "category": "Grains"
            },
            {
                  "color": "#a0522d",
                  "label": "2.2 m²",
                  "value": 2.2,
                  "category": "Tofu"
            }
      ],
      "type": "horizontalBarChart",
      "width": 465,
      "xAxis": {
            "max": 200,
            "min": 0,
            "label": "Land use per 100 grams of protein (m²)",
            "tickInterval": 25
      },
      "height": 325,
      "gridColor": "#0000004d"
} satisfies HorizontalBarChartInput
    
    const svg = generateHorizontalBarChart(input)
    expect(svg).toMatchSnapshot()
  })
})
