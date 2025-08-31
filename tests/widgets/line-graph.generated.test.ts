// ⚠️ AUTO-GENERATED TEST FILE
// This file was automatically generated from production widget data.
// Do not modify manually - regenerate if needed.

import { describe, expect, it } from "bun:test"
import type { z } from "zod"
import { generateLineGraph, LineGraphPropsSchema } from "@/lib/widgets/generators/line-graph"

type LineGraphInput = z.input<typeof LineGraphPropsSchema>

describe("lineGraph widget (generated from production data)", () => {

  it("lineGraph - reading-directional-selection-graph", () => {
    // Source: Question x20b802162032aefa (Reading directional selection graph)
    const input = {
      "type": "lineGraph",
      "title": "Beak length distribution before and after environmental change",
      "width": 600,
      "xAxis": {
            "label": "Beak length",
            "categories": [
                  "Shortest",
                  "Very short",
                  "Short",
                  "Medium-short",
                  "Medium",
                  "Medium-long",
                  "Long",
                  "Very long",
                  "Longest"
            ]
      },
      "yAxis": {
            "max": 40,
            "min": 0,
            "label": "Number of birds",
            "tickInterval": 10,
            "showGridLines": true
      },
      "height": 400,
      "series": [
            {
                  "name": "before environmental change",
                  "color": "#1f77b4",
                  "style": "solid",
                  "yAxis": "left",
                  "values": [
                        2,
                        5,
                        9,
                        14,
                        20,
                        28,
                        35,
                        18,
                        6
                  ],
                  "pointShape": "circle"
            },
            {
                  "name": "after environmental change",
                  "color": "#888888",
                  "style": "dashed",
                  "yAxis": "left",
                  "values": [
                        2,
                        12,
                        28,
                        36,
                        25,
                        16,
                        9,
                        4,
                        2
                  ],
                  "pointShape": "circle"
            }
      ],
      "showLegend": true,
      "yAxisRight": null
} satisfies LineGraphInput
    
    const svg = generateLineGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("lineGraph - human-impacts-on-the-environment-a-land-use-case-s", () => {
    // Source: Question xe1796f56ed28fb84 (Human impacts on the environment: a land use case study)
    const input = {
      "type": "lineGraph",
      "title": "Global meat production, 1975–2020",
      "width": 396.658,
      "xAxis": {
            "label": "Year",
            "categories": [
                  "1975",
                  "1980",
                  "1985",
                  "1990",
                  "1995",
                  "2000",
                  "2005",
                  "2010",
                  "2015",
                  "2020"
            ]
      },
      "yAxis": {
            "max": 400,
            "min": 0,
            "label": "Global meat production (million tonnes)",
            "tickInterval": 50,
            "showGridLines": true
      },
      "height": 259,
      "series": [
            {
                  "name": "Global meat production",
                  "color": "#000000",
                  "style": "solid",
                  "yAxis": "left",
                  "values": [
                        115,
                        140,
                        170,
                        200,
                        230,
                        260,
                        290,
                        310,
                        325,
                        340
                  ],
                  "pointShape": "circle"
            }
      ],
      "showLegend": false,
      "yAxisRight": null
} satisfies LineGraphInput
    
    const svg = generateLineGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("lineGraph - identify-logistic-and-exponential-population-growt", () => {
    // Source: Question xe0d263e40b5840e5 (Identify logistic and exponential population growth models)
    const input = {
      "type": "lineGraph",
      "title": "",
      "width": 345,
      "xAxis": {
            "label": "Time",
            "categories": [
                  "1",
                  "2",
                  "3",
                  "4",
                  "5",
                  "6",
                  "7",
                  "8",
                  "9",
                  "10"
            ]
      },
      "yAxis": {
            "max": 100,
            "min": 0,
            "label": "Population size",
            "tickInterval": 10,
            "showGridLines": true
      },
      "height": 345,
      "series": [
            {
                  "name": "Population",
                  "color": "#11accd",
                  "style": "solid",
                  "yAxis": "left",
                  "values": [
                        2,
                        3,
                        4,
                        6,
                        9,
                        14,
                        22,
                        34,
                        52,
                        78
                  ],
                  "pointShape": "circle"
            }
      ],
      "showLegend": false,
      "yAxisRight": null
} satisfies LineGraphInput
    
    const svg = generateLineGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("lineGraph - human-impacts-on-the-environment-a-land-use-case-s", () => {
    // Source: Question xa5ea435dac8ef795 (Human impacts on the environment: a land use case study)
    const input = {
      "type": "lineGraph",
      "title": "",
      "width": 381,
      "xAxis": {
            "label": "Year",
            "categories": [
                  "1975",
                  "2020"
            ]
      },
      "yAxis": {
            "max": 9,
            "min": 0,
            "label": "World population (billion people)",
            "tickInterval": 1,
            "showGridLines": true
      },
      "height": 259,
      "series": [
            {
                  "name": "World population",
                  "color": "#000000",
                  "style": "solid",
                  "yAxis": "left",
                  "values": [
                        4.1,
                        7.8
                  ],
                  "pointShape": "circle"
            }
      ],
      "showLegend": false,
      "yAxisRight": null
} satisfies LineGraphInput
    
    const svg = generateLineGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("lineGraph - elevation-and-temperature", () => {
    // Source: Question x696f91e65b2d59a1 (Elevation and temperature)
    const input = {
      "type": "lineGraph",
      "title": "",
      "width": 343,
      "xAxis": {
            "label": "Month",
            "categories": [
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December"
            ]
      },
      "yAxis": {
            "max": 40,
            "min": -5,
            "label": "Average temperature (°C)",
            "tickInterval": 5,
            "showGridLines": true
      },
      "height": 367,
      "series": [
            {
                  "name": "Yuma",
                  "color": "#000",
                  "style": "solid",
                  "yAxis": "left",
                  "values": [
                        14.9,
                        16.6,
                        19.8,
                        22.8,
                        27,
                        31.7,
                        34.8,
                        34.9,
                        31.9,
                        25.6,
                        18.9,
                        14.1
                  ],
                  "pointShape": "circle"
            },
            {
                  "name": "Sedona",
                  "color": "#11accd",
                  "style": "dashed",
                  "yAxis": "left",
                  "values": [
                        7.9,
                        9.3,
                        12.1,
                        15.2,
                        20.2,
                        25.4,
                        27.9,
                        27,
                        23.9,
                        18.2,
                        12.2,
                        7.4
                  ],
                  "pointShape": "circle"
            },
            {
                  "name": "Williams",
                  "color": "#e84d39",
                  "style": "dotted",
                  "yAxis": "left",
                  "values": [
                        1.3,
                        2.2,
                        5.1,
                        8.2,
                        12.8,
                        18.3,
                        20.4,
                        19.4,
                        16.4,
                        10.7,
                        5.4,
                        1.1
                  ],
                  "pointShape": "circle"
            }
      ],
      "showLegend": true,
      "yAxisRight": null
} satisfies LineGraphInput
    
    const svg = generateLineGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("lineGraph - elevation-and-temperature", () => {
    // Source: Question x50cff7f2e3fa4d9a (Elevation and temperature)
    const input = {
      "type": "lineGraph",
      "title": "Average Monthly Temperatures for Three Arizona Cities",
      "width": 343,
      "xAxis": {
            "label": "Month",
            "categories": [
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December"
            ]
      },
      "yAxis": {
            "max": 40,
            "min": -5,
            "label": "Average temperature (°C)",
            "tickInterval": 5,
            "showGridLines": true
      },
      "height": 367,
      "series": [
            {
                  "name": "Yuma",
                  "color": "#000000",
                  "style": "solid",
                  "yAxis": "left",
                  "values": [
                        14.9,
                        16.6,
                        19.8,
                        22.8,
                        27,
                        31.7,
                        34.8,
                        34.9,
                        31.9,
                        25.6,
                        18.9,
                        14.1
                  ],
                  "pointShape": "circle"
            },
            {
                  "name": "Kingman",
                  "color": "#11accd",
                  "style": "dashed",
                  "yAxis": "left",
                  "values": [
                        6.8,
                        8.3,
                        11.5,
                        15.1,
                        20.4,
                        25.9,
                        29.1,
                        28.4,
                        24.2,
                        17.6,
                        10.7,
                        6.1
                  ],
                  "pointShape": "circle"
            },
            {
                  "name": "Flagstaff",
                  "color": "#e84d39",
                  "style": "dotted",
                  "yAxis": "left",
                  "values": [
                        -2,
                        -0.6,
                        2.3,
                        5.5,
                        9.2,
                        14.1,
                        17.9,
                        17.1,
                        13.4,
                        7.7,
                        2.1,
                        -2.2
                  ],
                  "pointShape": "circle"
            }
      ],
      "showLegend": true,
      "yAxisRight": null
} satisfies LineGraphInput
    
    const svg = generateLineGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("lineGraph - identifying-terrestrial-biome-climates", () => {
    // Source: Question xadb3a0dc46bb4974 (Identifying terrestrial biome climates)
    const input = {
      "type": "lineGraph",
      "title": "Monthly Precipitation and Average Temperature",
      "width": 600,
      "xAxis": {
            "label": "Month",
            "categories": [
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December"
            ]
      },
      "yAxis": {
            "max": 300,
            "min": 0,
            "label": "Precipitation (in millimeters)",
            "tickInterval": 50,
            "showGridLines": true
      },
      "height": 400,
      "series": [
            {
                  "name": "Precipitation",
                  "color": "#1f77b4",
                  "style": "solid",
                  "yAxis": "left",
                  "values": [
                        18,
                        15,
                        24,
                        26,
                        40,
                        49,
                        68,
                        93,
                        78,
                        66,
                        35,
                        22
                  ],
                  "pointShape": "circle"
            },
            {
                  "name": "Average temperature",
                  "color": "#ff7f0e",
                  "style": "dotted",
                  "yAxis": "right",
                  "values": [
                        -25,
                        -18,
                        -11,
                        -4,
                        3,
                        11,
                        12,
                        12,
                        6,
                        -2,
                        -12,
                        -21
                  ],
                  "pointShape": "circle"
            }
      ],
      "showLegend": true,
      "yAxisRight": {
            "max": 30,
            "min": -30,
            "label": "Average Temperature (in degrees Celsius)",
            "tickInterval": 10,
            "showGridLines": false
      }
} satisfies LineGraphInput
    
    const svg = generateLineGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("lineGraph - identifying-terrestrial-biome-climates", () => {
    // Source: Question xadb3a0dc46bb4974 (Identifying terrestrial biome climates)
    const input = {
      "type": "lineGraph",
      "title": "Monthly Precipitation and Average Temperature",
      "width": 600,
      "xAxis": {
            "label": "Month",
            "categories": [
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December"
            ]
      },
      "yAxis": {
            "max": 300,
            "min": 0,
            "label": "Precipitation (in millimeters)",
            "tickInterval": 50,
            "showGridLines": true
      },
      "height": 400,
      "series": [
            {
                  "name": "Precipitation",
                  "color": "#1f77b4",
                  "style": "solid",
                  "yAxis": "left",
                  "values": [
                        50,
                        54,
                        50,
                        34,
                        35,
                        12,
                        121,
                        132,
                        67,
                        35,
                        33,
                        45
                  ],
                  "pointShape": "circle"
            },
            {
                  "name": "Average temperature",
                  "color": "#ff7f0e",
                  "style": "dotted",
                  "yAxis": "right",
                  "values": [
                        -1,
                        0,
                        4,
                        8,
                        13,
                        18,
                        21,
                        15,
                        9,
                        4,
                        0,
                        -1
                  ],
                  "pointShape": "circle"
            }
      ],
      "showLegend": true,
      "yAxisRight": {
            "max": 30,
            "min": -30,
            "label": "Average Temperature (in degrees Celsius)",
            "tickInterval": 10,
            "showGridLines": false
      }
} satisfies LineGraphInput
    
    const svg = generateLineGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("lineGraph - identifying-terrestrial-biome-climates", () => {
    // Source: Question xadb3a0dc46bb4974 (Identifying terrestrial biome climates)
    const input = {
      "type": "lineGraph",
      "title": "Monthly Precipitation and Average Temperature",
      "width": 600,
      "xAxis": {
            "label": "Month",
            "categories": [
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December"
            ]
      },
      "yAxis": {
            "max": 300,
            "min": 0,
            "label": "Precipitation (in millimeters)",
            "tickInterval": 50,
            "showGridLines": true
      },
      "height": 400,
      "series": [
            {
                  "name": "Precipitation",
                  "color": "#1f77b4",
                  "style": "solid",
                  "yAxis": "left",
                  "values": [
                        163,
                        181,
                        245,
                        189,
                        159,
                        136,
                        159,
                        182,
                        134,
                        152,
                        215,
                        215
                  ],
                  "pointShape": "circle"
            },
            {
                  "name": "Average temperature",
                  "color": "#ff7f0e",
                  "style": "dotted",
                  "yAxis": "right",
                  "values": [
                        19,
                        20,
                        21,
                        21,
                        22,
                        22,
                        22,
                        22,
                        21,
                        20,
                        20,
                        19
                  ],
                  "pointShape": "circle"
            }
      ],
      "showLegend": true,
      "yAxisRight": {
            "max": 30,
            "min": -30,
            "label": "Average Temperature (in degrees Celsius)",
            "tickInterval": 10,
            "showGridLines": false
      }
} satisfies LineGraphInput
    
    const svg = generateLineGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("lineGraph - greenhouse-effect-simulation", () => {
    // Source: Question xa39fadd753bc28ba (Greenhouse effect simulation)
    const input = {
      "type": "lineGraph",
      "title": "Atmospheric carbon dioxide concentration from 1700 to the present.",
      "width": 500,
      "xAxis": {
            "label": "Year",
            "categories": [
                  "1700",
                  "1750",
                  "1800",
                  "1850",
                  "1900",
                  "1950",
                  "2000"
            ]
      },
      "yAxis": {
            "max": 400,
            "min": 260,
            "label": "Carbon dioxide concentration (ppm)",
            "tickInterval": 20,
            "showGridLines": true
      },
      "height": 312,
      "series": [
            {
                  "name": "Carbon dioxide",
                  "color": "#cc0000",
                  "style": "solid",
                  "yAxis": "left",
                  "values": [
                        275,
                        276,
                        278,
                        279,
                        280,
                        310,
                        370
                  ],
                  "pointShape": "circle"
            }
      ],
      "showLegend": false,
      "yAxisRight": null
} satisfies LineGraphInput
    
    const svg = generateLineGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("lineGraph - elevation-and-temperature", () => {
    // Source: Question x437666529fbcc495 (Elevation and temperature)
    const input = {
      "type": "lineGraph",
      "title": "",
      "width": 343,
      "xAxis": {
            "label": "Month",
            "categories": [
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December"
            ]
      },
      "yAxis": {
            "max": 40,
            "min": -5,
            "label": "Average temperature (°C)",
            "tickInterval": 5,
            "showGridLines": true
      },
      "height": 367,
      "series": [
            {
                  "name": "Bullhead City",
                  "color": "#000",
                  "style": "solid",
                  "yAxis": "left",
                  "values": [
                        12.7,
                        14.6,
                        18.1,
                        22.2,
                        27.3,
                        32.2,
                        35.5,
                        35.1,
                        30.9,
                        24.1,
                        16.9,
                        12.1
                  ],
                  "pointShape": "circle"
            },
            {
                  "name": "Sedona",
                  "color": "#11accd",
                  "style": "dashed",
                  "yAxis": "left",
                  "values": [
                        7.5,
                        9.3,
                        12.1,
                        15.2,
                        20.2,
                        25.4,
                        27.9,
                        27,
                        23.9,
                        18.2,
                        12.2,
                        7.4
                  ],
                  "pointShape": "circle"
            },
            {
                  "name": "Flagstaff",
                  "color": "#e84d39",
                  "style": "dotted",
                  "yAxis": "left",
                  "values": [
                        -2,
                        -0.6,
                        2.3,
                        5.5,
                        9.2,
                        14.1,
                        17.9,
                        17.1,
                        13.4,
                        7.7,
                        2.1,
                        -2.2
                  ],
                  "pointShape": "circle"
            }
      ],
      "showLegend": true,
      "yAxisRight": null
} satisfies LineGraphInput
    
    const svg = generateLineGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("lineGraph - reading-directional-selection-graph", () => {
    // Source: Question x5c1e52b867ea421d (Reading directional selection graph)
    const input = {
      "type": "lineGraph",
      "title": "Body length distribution before and after environmental change",
      "width": 325,
      "xAxis": {
            "label": "Body length (shorter to longer)",
            "categories": [
                  "Shorter",
                  "Short",
                  "Somewhat short",
                  "Medium",
                  "Somewhat long",
                  "Long",
                  "Longer"
            ]
      },
      "yAxis": {
            "max": 50,
            "min": 0,
            "label": "Number of snakes",
            "tickInterval": 10,
            "showGridLines": true
      },
      "height": 319,
      "series": [
            {
                  "name": "Before environmental change",
                  "color": "#223366",
                  "style": "solid",
                  "yAxis": "left",
                  "values": [
                        2,
                        8,
                        18,
                        28,
                        40,
                        22,
                        4
                  ],
                  "pointShape": "circle"
            },
            {
                  "name": "After environmental change",
                  "color": "#aa5522",
                  "style": "dashed",
                  "yAxis": "left",
                  "values": [
                        2,
                        28,
                        38,
                        32,
                        24,
                        14,
                        6
                  ],
                  "pointShape": "circle"
            }
      ],
      "showLegend": true,
      "yAxisRight": null
} satisfies LineGraphInput
    
    const svg = generateLineGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("lineGraph - identifying-terrestrial-biome-climates", () => {
    // Source: Question x8ac6cf3687599328 (Identifying terrestrial biome climates)
    const input = {
      "type": "lineGraph",
      "title": "Monthly precipitation and average temperature",
      "width": 600,
      "xAxis": {
            "label": "Month",
            "categories": [
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December"
            ]
      },
      "yAxis": {
            "max": 150,
            "min": 0,
            "label": "Precipitation (in millimeters)",
            "tickInterval": 25,
            "showGridLines": true
      },
      "height": 400,
      "series": [
            {
                  "name": "Precipitation",
                  "color": "#1f77b4",
                  "style": "solid",
                  "yAxis": "left",
                  "values": [
                        114,
                        110,
                        125,
                        110,
                        98,
                        98,
                        124,
                        88,
                        92,
                        78,
                        97,
                        124
                  ],
                  "pointShape": "square"
            },
            {
                  "name": "Average temperature",
                  "color": "#d62728",
                  "style": "dotted",
                  "yAxis": "right",
                  "values": [
                        3,
                        7,
                        11,
                        15,
                        19,
                        23,
                        24,
                        24,
                        20,
                        15,
                        9,
                        5
                  ],
                  "pointShape": "circle"
            }
      ],
      "showLegend": true,
      "yAxisRight": {
            "max": 30,
            "min": -30,
            "label": "Average Temperature (in degrees Celsius)",
            "tickInterval": 10,
            "showGridLines": false
      }
} satisfies LineGraphInput
    
    const svg = generateLineGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("lineGraph - identifying-terrestrial-biome-climates", () => {
    // Source: Question x8ac6cf3687599328 (Identifying terrestrial biome climates)
    const input = {
      "type": "lineGraph",
      "title": "Monthly precipitation and average temperature",
      "width": 600,
      "xAxis": {
            "label": "Month",
            "categories": [
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December"
            ]
      },
      "yAxis": {
            "max": 150,
            "min": 0,
            "label": "Precipitation (in millimeters)",
            "tickInterval": 25,
            "showGridLines": true
      },
      "height": 400,
      "series": [
            {
                  "name": "Precipitation",
                  "color": "#1f77b4",
                  "style": "solid",
                  "yAxis": "left",
                  "values": [
                        97,
                        83,
                        69,
                        54,
                        26,
                        21,
                        12,
                        17,
                        61,
                        74,
                        88,
                        112
                  ],
                  "pointShape": "square"
            },
            {
                  "name": "Average temperature",
                  "color": "#d62728",
                  "style": "dotted",
                  "yAxis": "right",
                  "values": [
                        13,
                        14,
                        16,
                        19,
                        22,
                        24,
                        25,
                        26,
                        24,
                        21,
                        18,
                        15
                  ],
                  "pointShape": "circle"
            }
      ],
      "showLegend": true,
      "yAxisRight": {
            "max": 30,
            "min": -30,
            "label": "Average Temperature (in degrees Celsius)",
            "tickInterval": 10,
            "showGridLines": false
      }
} satisfies LineGraphInput
    
    const svg = generateLineGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("lineGraph - identifying-terrestrial-biome-climates", () => {
    // Source: Question x8ac6cf3687599328 (Identifying terrestrial biome climates)
    const input = {
      "type": "lineGraph",
      "title": "Monthly precipitation and average temperature",
      "width": 600,
      "xAxis": {
            "label": "Month",
            "categories": [
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December"
            ]
      },
      "yAxis": {
            "max": 150,
            "min": 0,
            "label": "Precipitation (in millimeters)",
            "tickInterval": 25,
            "showGridLines": true
      },
      "height": 400,
      "series": [
            {
                  "name": "Precipitation",
                  "color": "#1f77b4",
                  "style": "solid",
                  "yAxis": "left",
                  "values": [
                        18,
                        14,
                        14,
                        12,
                        19,
                        31,
                        44,
                        47,
                        38,
                        28,
                        20,
                        17
                  ],
                  "pointShape": "square"
            },
            {
                  "name": "Average temperature",
                  "color": "#d62728",
                  "style": "dotted",
                  "yAxis": "right",
                  "values": [
                        -25,
                        -24,
                        -22,
                        -14,
                        -4,
                        6,
                        14,
                        6,
                        -6,
                        -16,
                        -22,
                        -24
                  ],
                  "pointShape": "circle"
            }
      ],
      "showLegend": true,
      "yAxisRight": {
            "max": 30,
            "min": -30,
            "label": "Average Temperature (in degrees Celsius)",
            "tickInterval": 10,
            "showGridLines": false
      }
} satisfies LineGraphInput
    
    const svg = generateLineGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("lineGraph - latitudinal-diversity-gradient", () => {
    // Source: Question x80f94e231cb2fffb (Latitudinal diversity gradient)
    const input = {
      "type": "lineGraph",
      "title": "Number of mammal species vs. latitude",
      "width": 500,
      "xAxis": {
            "label": "Latitude (in degrees)",
            "categories": [
                  "0",
                  "10",
                  "20",
                  "30",
                  "40",
                  "50"
            ]
      },
      "yAxis": {
            "max": 100,
            "min": 0,
            "label": "Number of mammal species",
            "tickInterval": 20,
            "showGridLines": true
      },
      "height": 350,
      "series": [
            {
                  "name": "Trend",
                  "color": "#3377dd",
                  "style": "solid",
                  "yAxis": "left",
                  "values": [
                        100,
                        90,
                        70,
                        45,
                        20,
                        0
                  ],
                  "pointShape": "circle"
            }
      ],
      "showLegend": false,
      "yAxisRight": null
} satisfies LineGraphInput
    
    const svg = generateLineGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("lineGraph - latitudinal-diversity-gradient", () => {
    // Source: Question x80f94e231cb2fffb (Latitudinal diversity gradient)
    const input = {
      "type": "lineGraph",
      "title": "Number of mammal species vs. latitude",
      "width": 500,
      "xAxis": {
            "label": "Latitude (in degrees)",
            "categories": [
                  "0",
                  "10",
                  "20",
                  "30",
                  "40",
                  "50"
            ]
      },
      "yAxis": {
            "max": 100,
            "min": 0,
            "label": "Number of mammal species",
            "tickInterval": 20,
            "showGridLines": true
      },
      "height": 350,
      "series": [
            {
                  "name": "Trend",
                  "color": "#3377dd",
                  "style": "solid",
                  "yAxis": "left",
                  "values": [
                        0,
                        20,
                        45,
                        70,
                        90,
                        100
                  ],
                  "pointShape": "circle"
            }
      ],
      "showLegend": false,
      "yAxisRight": null
} satisfies LineGraphInput
    
    const svg = generateLineGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("lineGraph - latitudinal-diversity-gradient", () => {
    // Source: Question x80f94e231cb2fffb (Latitudinal diversity gradient)
    const input = {
      "type": "lineGraph",
      "title": "Number of mammal species vs. latitude",
      "width": 500,
      "xAxis": {
            "label": "Latitude (in degrees)",
            "categories": [
                  "0",
                  "10",
                  "20",
                  "30",
                  "40",
                  "50"
            ]
      },
      "yAxis": {
            "max": 100,
            "min": 0,
            "label": "Number of mammal species",
            "tickInterval": 20,
            "showGridLines": true
      },
      "height": 350,
      "series": [
            {
                  "name": "Trend",
                  "color": "#3377dd",
                  "style": "solid",
                  "yAxis": "left",
                  "values": [
                        0,
                        55,
                        90,
                        100,
                        50,
                        0
                  ],
                  "pointShape": "circle"
            }
      ],
      "showLegend": false,
      "yAxisRight": null
} satisfies LineGraphInput
    
    const svg = generateLineGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("lineGraph - latitudinal-diversity-gradient", () => {
    // Source: Question x80f94e231cb2fffb (Latitudinal diversity gradient)
    const input = {
      "type": "lineGraph",
      "title": "Number of mammal species vs. latitude",
      "width": 500,
      "xAxis": {
            "label": "Latitude (in degrees)",
            "categories": [
                  "0",
                  "10",
                  "20",
                  "30",
                  "40",
                  "50"
            ]
      },
      "yAxis": {
            "max": 100,
            "min": 0,
            "label": "Number of mammal species",
            "tickInterval": 20,
            "showGridLines": true
      },
      "height": 350,
      "series": [
            {
                  "name": "Trend",
                  "color": "#3377dd",
                  "style": "solid",
                  "yAxis": "left",
                  "values": [
                        100,
                        50,
                        15,
                        0,
                        55,
                        100
                  ],
                  "pointShape": "circle"
            }
      ],
      "showLegend": false,
      "yAxisRight": null
} satisfies LineGraphInput
    
    const svg = generateLineGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("lineGraph - phet-simulation-natural-selection", () => {
    // Source: Question x9a5a635a3f13348c (PhET simulation: natural selection)
    const input = {
      "type": "lineGraph",
      "title": "Number of rabbits by fur color across generations",
      "width": 625,
      "xAxis": {
            "label": "Generation",
            "categories": [
                  "0",
                  "1",
                  "2",
                  "3",
                  "4",
                  "5",
                  "6",
                  "7",
                  "8",
                  "9",
                  "10"
            ]
      },
      "yAxis": {
            "max": 40,
            "min": 0,
            "label": "Number of rabbits",
            "tickInterval": 5,
            "showGridLines": true
      },
      "height": 398,
      "series": [
            {
                  "name": "White-furred rabbits",
                  "color": "#666666",
                  "style": "solid",
                  "yAxis": "left",
                  "values": [
                        20,
                        25,
                        30,
                        36,
                        32,
                        22,
                        14,
                        9,
                        7,
                        6,
                        5
                  ],
                  "pointShape": "circle"
            },
            {
                  "name": "Brown-furred rabbits",
                  "color": "#8b4513",
                  "style": "dashed",
                  "yAxis": "left",
                  "values": [
                        0,
                        0,
                        0,
                        3,
                        6,
                        12,
                        18,
                        24,
                        29,
                        33,
                        36
                  ],
                  "pointShape": "circle"
            }
      ],
      "showLegend": true,
      "yAxisRight": null
} satisfies LineGraphInput
    
    const svg = generateLineGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("lineGraph - temperaturedependent-sex-determination", () => {
    // Source: Question x106b7ab44be30862 (Temperature-dependent sex determination)
    const input = {
      "type": "lineGraph",
      "title": "Percent male hatchlings versus incubation temperature",
      "width": 350,
      "xAxis": {
            "label": "Temperature in degrees Celsius",
            "categories": [
                  "26",
                  "28",
                  "29",
                  "30",
                  "31",
                  "32",
                  "33",
                  "34",
                  "35"
            ]
      },
      "yAxis": {
            "max": 100,
            "min": 0,
            "label": "Percent male hatchlings",
            "tickInterval": 20,
            "showGridLines": true
      },
      "height": 350,
      "series": [
            {
                  "name": "Leopard gecko hatchlings",
                  "color": "#000000",
                  "style": "solid",
                  "yAxis": "left",
                  "values": [
                        0,
                        0,
                        19,
                        29,
                        83,
                        88,
                        74,
                        6,
                        0
                  ],
                  "pointShape": "circle"
            }
      ],
      "showLegend": false,
      "yAxisRight": null
} satisfies LineGraphInput
    
    const svg = generateLineGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("lineGraph - temperaturedependent-sex-determination", () => {
    // Source: Question x263c0060465cd350 (Temperature-dependent sex determination)
    const input = {
      "type": "lineGraph",
      "title": "Percent male hatchlings by incubation temperature",
      "width": 350,
      "xAxis": {
            "label": "Temperature (°C)",
            "categories": [
                  "26",
                  "28",
                  "29",
                  "30",
                  "31",
                  "32",
                  "33",
                  "34",
                  "35"
            ]
      },
      "yAxis": {
            "max": 100,
            "min": 0,
            "label": "Percent male hatchlings",
            "tickInterval": 20,
            "showGridLines": true
      },
      "height": 350,
      "series": [
            {
                  "name": "Percent male hatchlings",
                  "color": "#000000",
                  "style": "solid",
                  "yAxis": "left",
                  "values": [
                        0,
                        0,
                        19,
                        29,
                        83,
                        88,
                        74,
                        6,
                        0
                  ],
                  "pointShape": "circle"
            }
      ],
      "showLegend": false,
      "yAxisRight": null
} satisfies LineGraphInput
    
    const svg = generateLineGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("lineGraph - changes-in-carrying-capacity", () => {
    // Source: Question xf3e473613e59cfd4 (Changes in carrying capacity)
    const input = {
      "type": "lineGraph",
      "title": "Population size over time",
      "width": 500,
      "xAxis": {
            "label": "Population size",
            "categories": [
                  "0",
                  "1",
                  "2",
                  "3",
                  "4",
                  "5",
                  "6",
                  "7",
                  "8",
                  "9",
                  "10"
            ]
      },
      "yAxis": {
            "max": 100,
            "min": 0,
            "label": "Time",
            "tickInterval": 10,
            "showGridLines": true
      },
      "height": 350,
      "series": [
            {
                  "name": "Population",
                  "color": "#000000",
                  "style": "solid",
                  "yAxis": "left",
                  "values": [
                        0,
                        15,
                        35,
                        60,
                        80,
                        90,
                        85,
                        89,
                        86,
                        90,
                        87
                  ],
                  "pointShape": "circle"
            }
      ],
      "showLegend": false,
      "yAxisRight": null
} satisfies LineGraphInput
    
    const svg = generateLineGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("lineGraph - temperaturedependent-sex-determination", () => {
    // Source: Question x0ef2f454f50cfea1 (Temperature-dependent sex determination)
    const input = {
      "type": "lineGraph",
      "title": "Percent male hatchlings by incubation temperature",
      "width": 350,
      "xAxis": {
            "label": "Temperature (°C)",
            "categories": [
                  "26",
                  "28",
                  "29",
                  "30",
                  "31",
                  "32",
                  "33",
                  "34",
                  "35"
            ]
      },
      "yAxis": {
            "max": 100,
            "min": 0,
            "label": "Percent male hatchlings",
            "tickInterval": 20,
            "showGridLines": true
      },
      "height": 350,
      "series": [
            {
                  "name": "Percent male hatchlings",
                  "color": "#000",
                  "style": "solid",
                  "yAxis": "left",
                  "values": [
                        0,
                        0,
                        19,
                        29,
                        83,
                        88,
                        74,
                        6,
                        0
                  ],
                  "pointShape": "circle"
            }
      ],
      "showLegend": false,
      "yAxisRight": null
} satisfies LineGraphInput
    
    const svg = generateLineGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("lineGraph - changes-in-carrying-capacity", () => {
    // Source: Question xd25b15f503333317 (Changes in carrying capacity)
    const input = {
      "type": "lineGraph",
      "title": "Population size over time",
      "width": 210,
      "xAxis": {
            "label": "Population size",
            "categories": [
                  "0",
                  "1",
                  "2",
                  "3",
                  "4",
                  "5",
                  "6",
                  "7",
                  "8",
                  "9",
                  "10"
            ]
      },
      "yAxis": {
            "max": 10,
            "min": 0,
            "label": "Time",
            "tickInterval": 2,
            "showGridLines": true
      },
      "height": 210,
      "series": [
            {
                  "name": "Population",
                  "color": "#1155cc",
                  "style": "solid",
                  "yAxis": "left",
                  "values": [
                        0,
                        3,
                        6.5,
                        8.8,
                        8.2,
                        8.7,
                        8.3,
                        8.9,
                        8.5,
                        8.8,
                        8.6
                  ],
                  "pointShape": "circle"
            }
      ],
      "showLegend": false,
      "yAxisRight": null
} satisfies LineGraphInput
    
    const svg = generateLineGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("lineGraph - identifying-terrestrial-biome-climates", () => {
    // Source: Question xe1f6f815c6f988e2 (Identifying terrestrial biome climates)
    const input = {
      "type": "lineGraph",
      "title": "Monthly precipitation and average temperature",
      "width": 600,
      "xAxis": {
            "label": "Month",
            "categories": [
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December"
            ]
      },
      "yAxis": {
            "max": 360,
            "min": 0,
            "label": "Precipitation (in millimeters)",
            "tickInterval": 60,
            "showGridLines": true
      },
      "height": 420,
      "series": [
            {
                  "name": "Precipitation",
                  "color": "#4472c4",
                  "style": "solid",
                  "yAxis": "left",
                  "values": [
                        69,
                        57,
                        58,
                        57,
                        68,
                        73,
                        88,
                        86,
                        76,
                        70,
                        68,
                        74
                  ],
                  "pointShape": "square"
            },
            {
                  "name": "Average Temperature",
                  "color": "#ff7f0e",
                  "style": "dotted",
                  "yAxis": "right",
                  "values": [
                        4,
                        4,
                        6,
                        10,
                        14,
                        16,
                        18,
                        18,
                        16,
                        12,
                        8,
                        5
                  ],
                  "pointShape": "circle"
            }
      ],
      "showLegend": true,
      "yAxisRight": {
            "max": 30,
            "min": 0,
            "label": "Average Temperature (in degrees Celsius)",
            "tickInterval": 5,
            "showGridLines": false
      }
} satisfies LineGraphInput
    
    const svg = generateLineGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("lineGraph - identifying-terrestrial-biome-climates", () => {
    // Source: Question xe1f6f815c6f988e2 (Identifying terrestrial biome climates)
    const input = {
      "type": "lineGraph",
      "title": "Monthly precipitation and average temperature",
      "width": 600,
      "xAxis": {
            "label": "Month",
            "categories": [
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December"
            ]
      },
      "yAxis": {
            "max": 360,
            "min": 0,
            "label": "Precipitation (in millimeters)",
            "tickInterval": 60,
            "showGridLines": true
      },
      "height": 420,
      "series": [
            {
                  "name": "Precipitation",
                  "color": "#4472c4",
                  "style": "solid",
                  "yAxis": "left",
                  "values": [
                        113,
                        118,
                        83,
                        40,
                        21,
                        6,
                        2,
                        2,
                        3,
                        25,
                        57,
                        111
                  ],
                  "pointShape": "square"
            },
            {
                  "name": "Average Temperature",
                  "color": "#ff7f0e",
                  "style": "dotted",
                  "yAxis": "right",
                  "values": [
                        10,
                        11,
                        12,
                        13,
                        14,
                        15,
                        16,
                        16,
                        17,
                        15,
                        12,
                        10
                  ],
                  "pointShape": "circle"
            }
      ],
      "showLegend": true,
      "yAxisRight": {
            "max": 30,
            "min": 0,
            "label": "Average Temperature (in degrees Celsius)",
            "tickInterval": 5,
            "showGridLines": false
      }
} satisfies LineGraphInput
    
    const svg = generateLineGraph(input)
    expect(svg).toMatchSnapshot()
  })

  it("lineGraph - identifying-terrestrial-biome-climates", () => {
    // Source: Question xe1f6f815c6f988e2 (Identifying terrestrial biome climates)
    const input = {
      "type": "lineGraph",
      "title": "Monthly precipitation and average temperature",
      "width": 600,
      "xAxis": {
            "label": "Month",
            "categories": [
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December"
            ]
      },
      "yAxis": {
            "max": 360,
            "min": 0,
            "label": "Precipitation (in millimeters)",
            "tickInterval": 60,
            "showGridLines": true
      },
      "height": 420,
      "series": [
            {
                  "name": "Precipitation",
                  "color": "#4472c4",
                  "style": "solid",
                  "yAxis": "left",
                  "values": [
                        265,
                        243,
                        313,
                        304,
                        282,
                        230,
                        173,
                        163,
                        184,
                        210,
                        241,
                        269
                  ],
                  "pointShape": "square"
            },
            {
                  "name": "Average Temperature",
                  "color": "#ff7f0e",
                  "style": "dotted",
                  "yAxis": "right",
                  "values": [
                        25,
                        25,
                        26,
                        26,
                        25,
                        24,
                        24,
                        24,
                        24,
                        25,
                        25,
                        25
                  ],
                  "pointShape": "circle"
            }
      ],
      "showLegend": true,
      "yAxisRight": {
            "max": 30,
            "min": 0,
            "label": "Average Temperature (in degrees Celsius)",
            "tickInterval": 5,
            "showGridLines": false
      }
} satisfies LineGraphInput
    
    const svg = generateLineGraph(input)
    expect(svg).toMatchSnapshot()
  })
})
