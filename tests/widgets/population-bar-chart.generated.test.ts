// ⚠️ AUTO-GENERATED TEST FILE
// This file was automatically generated from production widget data.
// Do not modify manually - regenerate if needed.

import { describe, expect, it } from "bun:test"
import type { z } from "zod"
import { generatePopulationBarChart, PopulationBarChartPropsSchema } from "@/lib/widgets/generators/population-bar-chart"

type PopulationBarChartInput = z.input<typeof PopulationBarChartPropsSchema>

describe("populationBarChart widget (generated from production data)", () => {

  it("populationBarChart - timing-of-features-associated-with-natural-hazards", () => {
    // Source: Question x634cfce48dfbb76e (Timing of features associated with natural hazards)
    const input = {
      "data": [
            {
                  "label": "1",
                  "value": 65
            },
            {
                  "label": "2",
                  "value": 25
            },
            {
                  "label": "3",
                  "value": 20
            },
            {
                  "label": "4",
                  "value": 10
            }
      ],
      "type": "populationBarChart",
      "width": 300,
      "yAxis": {
            "max": 70,
            "min": 0,
            "label": "Number of aftershocks",
            "tickInterval": 5
      },
      "height": 270,
      "barColor": "#ffbb71",
      "gridColor": "#cccccc",
      "xAxisLabel": "Week",
      "xAxisVisibleLabels": [
            "1",
            "2",
            "3",
            "4"
      ]
} satisfies PopulationBarChartInput
    
    const svg = generatePopulationBarChart(input)
    expect(svg).toMatchSnapshot()
  })

  it("populationBarChart - timing-of-features-associated-with-natural-hazards", () => {
    // Source: Question x1937e3e2635ab49d (Timing of features associated with natural hazards)
    const input = {
      "data": [
            {
                  "label": "1",
                  "value": 275
            },
            {
                  "label": "2",
                  "value": 100
            },
            {
                  "label": "3",
                  "value": 75
            },
            {
                  "label": "4",
                  "value": 50
            }
      ],
      "type": "populationBarChart",
      "width": 300,
      "yAxis": {
            "max": 300,
            "min": 0,
            "label": "Number of aftershocks",
            "tickInterval": 25
      },
      "height": 270,
      "barColor": "#c6b9fc",
      "gridColor": "#cccccc",
      "xAxisLabel": "Week",
      "xAxisVisibleLabels": [
            "1",
            "2",
            "3",
            "4"
      ]
} satisfies PopulationBarChartInput
    
    const svg = generatePopulationBarChart(input)
    expect(svg).toMatchSnapshot()
  })

  it("populationBarChart - resource-availability-and-population-size", () => {
    // Source: Question xed60d4396209d105 (Resource availability and population size)
    const input = {
      "data": [
            {
                  "label": "2010",
                  "value": 350
            },
            {
                  "label": "2011",
                  "value": 325
            },
            {
                  "label": "2012",
                  "value": 305
            },
            {
                  "label": "2013",
                  "value": 250
            },
            {
                  "label": "2014",
                  "value": 225
            },
            {
                  "label": "2015",
                  "value": 225
            }
      ],
      "type": "populationBarChart",
      "width": 360,
      "yAxis": {
            "max": 400,
            "min": 0,
            "label": "Number of birds",
            "tickInterval": 100
      },
      "height": 270,
      "barColor": "#babec2",
      "gridColor": "#cccccc",
      "xAxisLabel": "Year",
      "xAxisVisibleLabels": [
            "2010",
            "2011",
            "2012",
            "2013",
            "2014",
            "2015"
      ]
} satisfies PopulationBarChartInput
    
    const svg = generatePopulationBarChart(input)
    expect(svg).toMatchSnapshot()
  })

  it("populationBarChart - timing-of-features-associated-with-natural-hazards", () => {
    // Source: Question xa267321b469476ce (Timing of features associated with natural hazards)
    const input = {
      "data": [
            {
                  "label": "1",
                  "value": 140
            },
            {
                  "label": "2",
                  "value": 60
            },
            {
                  "label": "3",
                  "value": 30
            },
            {
                  "label": "4",
                  "value": 20
            }
      ],
      "type": "populationBarChart",
      "width": 300,
      "yAxis": {
            "max": 160,
            "min": 0,
            "label": "Number of aftershocks",
            "tickInterval": 10
      },
      "height": 270,
      "barColor": "#ff92c6",
      "gridColor": "#cccccc",
      "xAxisLabel": "Week",
      "xAxisVisibleLabels": [
            "1",
            "2",
            "3",
            "4"
      ]
} satisfies PopulationBarChartInput
    
    const svg = generatePopulationBarChart(input)
    expect(svg).toMatchSnapshot()
  })

  it("populationBarChart - resource-availability-and-population-size", () => {
    // Source: Question xef0676ca8b4d5cd6 (Resource availability and population size)
    const input = {
      "data": [
            {
                  "label": "2010",
                  "value": 250
            },
            {
                  "label": "2011",
                  "value": 380
            },
            {
                  "label": "2012",
                  "value": 500
            },
            {
                  "label": "2013",
                  "value": 760
            },
            {
                  "label": "2014",
                  "value": 850
            },
            {
                  "label": "2015",
                  "value": 850
            }
      ],
      "type": "populationBarChart",
      "width": 360,
      "yAxis": {
            "max": 900,
            "min": 0,
            "label": "Number of grass plants",
            "tickInterval": 100
      },
      "height": 270,
      "barColor": "#208388",
      "gridColor": "#cccccc",
      "xAxisLabel": "Year",
      "xAxisVisibleLabels": []
} satisfies PopulationBarChartInput
    
    const svg = generatePopulationBarChart(input)
    expect(svg).toMatchSnapshot()
  })

  it("populationBarChart - resource-availability-and-population-size", () => {
    // Source: Question x5f7d0b5857abe527 (Resource availability and population size)
    const input = {
      "data": [
            {
                  "label": "2010",
                  "value": 225
            },
            {
                  "label": "2011",
                  "value": 250
            },
            {
                  "label": "2012",
                  "value": 310
            },
            {
                  "label": "2013",
                  "value": 325
            },
            {
                  "label": "2014",
                  "value": 350
            },
            {
                  "label": "2015",
                  "value": 350
            }
      ],
      "type": "populationBarChart",
      "width": 360,
      "yAxis": {
            "max": 400,
            "min": 0,
            "label": "Number of bears",
            "tickInterval": 50
      },
      "height": 270,
      "barColor": "#626569",
      "gridColor": "#cccccc",
      "xAxisLabel": "Year",
      "xAxisVisibleLabels": []
} satisfies PopulationBarChartInput
    
    const svg = generatePopulationBarChart(input)
    expect(svg).toMatchSnapshot()
  })

  it("populationBarChart - interpret-population-data-from-a-bar-graph", () => {
    // Source: Question x01bb5f8623a9da1d (Interpret population data from a bar graph)
    const input = {
      "data": [
            {
                  "label": "1990",
                  "value": 160
            },
            {
                  "label": "1991",
                  "value": 350
            },
            {
                  "label": "1992",
                  "value": 647
            },
            {
                  "label": "1993",
                  "value": 940
            },
            {
                  "label": "1994",
                  "value": 1139
            },
            {
                  "label": "1995",
                  "value": 1235
            },
            {
                  "label": "1996",
                  "value": 1278
            },
            {
                  "label": "1997",
                  "value": 1247
            },
            {
                  "label": "1998",
                  "value": 1175
            },
            {
                  "label": "1999",
                  "value": 1050
            },
            {
                  "label": "2000",
                  "value": 975
            },
            {
                  "label": "2001",
                  "value": 1025
            },
            {
                  "label": "2002",
                  "value": 985
            },
            {
                  "label": "2003",
                  "value": 1015
            },
            {
                  "label": "2004",
                  "value": 995
            },
            {
                  "label": "2005",
                  "value": 1005
            }
      ],
      "type": "populationBarChart",
      "width": 390,
      "yAxis": {
            "max": 1400,
            "min": 0,
            "label": "Number of deer",
            "tickInterval": 200
      },
      "height": 268,
      "barColor": "#0c7f99",
      "gridColor": "#cccccc",
      "xAxisLabel": "Year",
      "xAxisVisibleLabels": []
} satisfies PopulationBarChartInput
    
    const svg = generatePopulationBarChart(input)
    expect(svg).toMatchSnapshot()
  })

  it("populationBarChart - interpret-population-data-from-a-bar-graph", () => {
    // Source: Question xea18dc7b614a4565 (Interpret population data from a bar graph)
    const input = {
      "data": [
            {
                  "label": "1990",
                  "value": 175
            },
            {
                  "label": "1991",
                  "value": 210
            },
            {
                  "label": "1992",
                  "value": 400
            },
            {
                  "label": "1993",
                  "value": 580
            },
            {
                  "label": "1994",
                  "value": 610
            },
            {
                  "label": "1995",
                  "value": 800
            },
            {
                  "label": "1996",
                  "value": 1100
            },
            {
                  "label": "1997",
                  "value": 1300
            },
            {
                  "label": "1998",
                  "value": 1500
            },
            {
                  "label": "1999",
                  "value": 1575
            },
            {
                  "label": "2000",
                  "value": 1575
            },
            {
                  "label": "2001",
                  "value": 1500
            },
            {
                  "label": "2002",
                  "value": 1310
            },
            {
                  "label": "2003",
                  "value": 1250
            },
            {
                  "label": "2004",
                  "value": 1190
            },
            {
                  "label": "2005",
                  "value": 1170
            },
            {
                  "label": "2006",
                  "value": 1190
            },
            {
                  "label": "2007",
                  "value": 1165
            },
            {
                  "label": "2008",
                  "value": 1190
            },
            {
                  "label": "2009",
                  "value": 1170
            },
            {
                  "label": "2010",
                  "value": 1190
            }
      ],
      "type": "populationBarChart",
      "width": 392,
      "yAxis": {
            "max": 1600,
            "min": 0,
            "label": "Number of deer",
            "tickInterval": 200
      },
      "height": 268,
      "barColor": "#0c7f99",
      "gridColor": "#cccccc",
      "xAxisLabel": "Year",
      "xAxisVisibleLabels": [
            "1990",
            "1995",
            "2000",
            "2005",
            "2010"
      ]
} satisfies PopulationBarChartInput
    
    const svg = generatePopulationBarChart(input)
    expect(svg).toMatchSnapshot()
  })

  it("populationBarChart - interpret-population-data-from-a-bar-graph", () => {
    // Source: Question xd74be4e7b4c344c4 (Interpret population data from a bar graph)
    const input = {
      "data": [
            {
                  "label": "1",
                  "value": 225
            },
            {
                  "label": "2",
                  "value": 230
            },
            {
                  "label": "3",
                  "value": 235
            },
            {
                  "label": "4",
                  "value": 238
            },
            {
                  "label": "5",
                  "value": 307
            },
            {
                  "label": "6",
                  "value": 413
            },
            {
                  "label": "7",
                  "value": 751
            },
            {
                  "label": "8",
                  "value": 1397
            },
            {
                  "label": "9",
                  "value": 2500
            },
            {
                  "label": "10",
                  "value": 3489
            },
            {
                  "label": "11",
                  "value": 4185
            },
            {
                  "label": "12",
                  "value": 4492
            },
            {
                  "label": "13",
                  "value": 4624
            },
            {
                  "label": "14",
                  "value": 4750
            },
            {
                  "label": "15",
                  "value": 4770
            },
            {
                  "label": "16",
                  "value": 4486
            },
            {
                  "label": "17",
                  "value": 4350
            },
            {
                  "label": "18",
                  "value": 4150
            },
            {
                  "label": "19",
                  "value": 4250
            },
            {
                  "label": "20",
                  "value": 4200
            }
      ],
      "type": "populationBarChart",
      "width": 391,
      "yAxis": {
            "max": 4800,
            "min": 0,
            "label": "Number of mice",
            "tickInterval": 600
      },
      "height": 268,
      "barColor": "#0c7f99",
      "gridColor": "#cccccc",
      "xAxisLabel": "Month",
      "xAxisVisibleLabels": []
} satisfies PopulationBarChartInput
    
    const svg = generatePopulationBarChart(input)
    expect(svg).toMatchSnapshot()
  })
})
