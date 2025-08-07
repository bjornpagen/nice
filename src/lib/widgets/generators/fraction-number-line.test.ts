import { describe, expect, test } from "bun:test"
import { FractionNumberLinePropsSchema, generateFractionNumberLine } from "./fraction-number-line"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = FractionNumberLinePropsSchema.parse(props)
	return generateFractionNumberLine(parsedProps)
}

describe("generateFractionNumberLine", () => {
	describe("Basic Number Line Configurations", () => {
		test("should render simple number line with basic ticks", () => {
			const props = {
				type: "fractionNumberLine" as const,
				width: 500,
				height: 200,
				min: 0,
				max: 1,
				ticks: [
					{
						value: 0,
						topLabel: null,
						bottomLabel: "0",
						isMajor: true
					},
					{
						value: 0.5,
						topLabel: "1/2",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 1,
						topLabel: null,
						bottomLabel: "1",
						isMajor: true
					}
				],
				segments: null,
				model: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render number line with quarters", () => {
			const props = {
				type: "fractionNumberLine" as const,
				width: 600,
				height: 200,
				min: 0,
				max: 1,
				ticks: [
					{
						value: 0,
						topLabel: null,
						bottomLabel: "0",
						isMajor: true
					},
					{
						value: 0.25,
						topLabel: "1/4",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.5,
						topLabel: "2/4",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.75,
						topLabel: "3/4",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 1,
						topLabel: null,
						bottomLabel: "1",
						isMajor: true
					}
				],
				segments: null,
				model: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render number line with eighths", () => {
			const props = {
				type: "fractionNumberLine" as const,
				width: 700,
				height: 200,
				min: 0,
				max: 1,
				ticks: [
					{
						value: 0,
						topLabel: null,
						bottomLabel: "0",
						isMajor: true
					},
					{
						value: 0.125,
						topLabel: "1/8",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.25,
						topLabel: "2/8",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.375,
						topLabel: "3/8",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.5,
						topLabel: "4/8",
						bottomLabel: null,
						isMajor: true
					},
					{
						value: 0.625,
						topLabel: "5/8",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.75,
						topLabel: "6/8",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.875,
						topLabel: "7/8",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 1,
						topLabel: null,
						bottomLabel: "1",
						isMajor: true
					}
				],
				segments: null,
				model: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render extended number line (0 to 2)", () => {
			const props = {
				type: "fractionNumberLine" as const,
				width: 800,
				height: 200,
				min: 0,
				max: 2,
				ticks: [
					{
						value: 0,
						topLabel: null,
						bottomLabel: "0",
						isMajor: true
					},
					{
						value: 0.5,
						topLabel: "1/2",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 1,
						topLabel: null,
						bottomLabel: "1",
						isMajor: true
					},
					{
						value: 1.5,
						topLabel: "3/2",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 2,
						topLabel: null,
						bottomLabel: "2",
						isMajor: true
					}
				],
				segments: null,
				model: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render number line with mixed fractions", () => {
			const props = {
				type: "fractionNumberLine" as const,
				width: 600,
				height: 200,
				min: 0,
				max: 2,
				ticks: [
					{
						value: 0,
						topLabel: null,
						bottomLabel: "0",
						isMajor: true
					},
					{
						value: 0.333,
						topLabel: "1/3",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.666,
						topLabel: "2/3",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 1,
						topLabel: null,
						bottomLabel: "1",
						isMajor: true
					},
					{
						value: 1.333,
						topLabel: "1 1/3",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 1.666,
						topLabel: "1 2/3",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 2,
						topLabel: null,
						bottomLabel: "2",
						isMajor: true
					}
				],
				segments: null,
				model: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Tick Mark Variations", () => {
		test("should render ticks with only top labels", () => {
			const props = {
				type: "fractionNumberLine" as const,
				width: 500,
				height: 200,
				min: 0,
				max: 1,
				ticks: [
					{
						value: 0,
						topLabel: "0/4",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.25,
						topLabel: "1/4",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.5,
						topLabel: "2/4",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.75,
						topLabel: "3/4",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 1,
						topLabel: "4/4",
						bottomLabel: null,
						isMajor: false
					}
				],
				segments: null,
				model: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render ticks with only bottom labels", () => {
			const props = {
				type: "fractionNumberLine" as const,
				width: 500,
				height: 200,
				min: 0,
				max: 1,
				ticks: [
					{
						value: 0,
						topLabel: null,
						bottomLabel: "0",
						isMajor: true
					},
					{
						value: 0.25,
						topLabel: null,
						bottomLabel: "0.25",
						isMajor: false
					},
					{
						value: 0.5,
						topLabel: null,
						bottomLabel: "0.5",
						isMajor: false
					},
					{
						value: 0.75,
						topLabel: null,
						bottomLabel: "0.75",
						isMajor: false
					},
					{
						value: 1,
						topLabel: null,
						bottomLabel: "1",
						isMajor: true
					}
				],
				segments: null,
				model: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render ticks with both top and bottom labels", () => {
			const props = {
				type: "fractionNumberLine" as const,
				width: 600,
				height: 200,
				min: 0,
				max: 1,
				ticks: [
					{
						value: 0,
						topLabel: "0/8",
						bottomLabel: "0",
						isMajor: true
					},
					{
						value: 0.25,
						topLabel: "2/8",
						bottomLabel: "1/4",
						isMajor: false
					},
					{
						value: 0.5,
						topLabel: "4/8",
						bottomLabel: "1/2",
						isMajor: true
					},
					{
						value: 0.75,
						topLabel: "6/8",
						bottomLabel: "3/4",
						isMajor: false
					},
					{
						value: 1,
						topLabel: "8/8",
						bottomLabel: "1",
						isMajor: true
					}
				],
				segments: null,
				model: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render ticks without any labels", () => {
			const props = {
				type: "fractionNumberLine" as const,
				width: 400,
				height: 200,
				min: 0,
				max: 1,
				ticks: [
					{
						value: 0,
						topLabel: null,
						bottomLabel: null,
						isMajor: true
					},
					{
						value: 0.2,
						topLabel: null,
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.4,
						topLabel: null,
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.6,
						topLabel: null,
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.8,
						topLabel: null,
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 1,
						topLabel: null,
						bottomLabel: null,
						isMajor: true
					}
				],
				segments: null,
				model: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render all major ticks", () => {
			const props = {
				type: "fractionNumberLine" as const,
				width: 500,
				height: 200,
				min: 0,
				max: 1,
				ticks: [
					{
						value: 0,
						topLabel: null,
						bottomLabel: "0",
						isMajor: true
					},
					{
						value: 0.25,
						topLabel: "1/4",
						bottomLabel: null,
						isMajor: true
					},
					{
						value: 0.5,
						topLabel: "1/2",
						bottomLabel: null,
						isMajor: true
					},
					{
						value: 0.75,
						topLabel: "3/4",
						bottomLabel: null,
						isMajor: true
					},
					{
						value: 1,
						topLabel: null,
						bottomLabel: "1",
						isMajor: true
					}
				],
				segments: null,
				model: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Number Line Segments", () => {
		test("should render single segment", () => {
			const props = {
				type: "fractionNumberLine" as const,
				width: 500,
				height: 200,
				min: 0,
				max: 1,
				ticks: [
					{
						value: 0,
						topLabel: null,
						bottomLabel: "0",
						isMajor: true
					},
					{
						value: 0.5,
						topLabel: "1/2",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 1,
						topLabel: null,
						bottomLabel: "1",
						isMajor: true
					}
				],
				segments: [
					{
						start: 0,
						end: 0.5,
						color: "#11accd"
					}
				],
				model: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render multiple non-overlapping segments", () => {
			const props = {
				type: "fractionNumberLine" as const,
				width: 600,
				height: 200,
				min: 0,
				max: 1,
				ticks: [
					{
						value: 0,
						topLabel: null,
						bottomLabel: "0",
						isMajor: true
					},
					{
						value: 0.25,
						topLabel: "1/4",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.5,
						topLabel: "2/4",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.75,
						topLabel: "3/4",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 1,
						topLabel: null,
						bottomLabel: "1",
						isMajor: true
					}
				],
				segments: [
					{
						start: 0,
						end: 0.25,
						color: "#ff6b6b"
					},
					{
						start: 0.5,
						end: 0.75,
						color: "#4ecdc4"
					}
				],
				model: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render overlapping segments", () => {
			const props = {
				type: "fractionNumberLine" as const,
				width: 500,
				height: 200,
				min: 0,
				max: 1,
				ticks: [
					{
						value: 0,
						topLabel: null,
						bottomLabel: "0",
						isMajor: true
					},
					{
						value: 0.25,
						topLabel: "1/4",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.5,
						topLabel: "1/2",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.75,
						topLabel: "3/4",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 1,
						topLabel: null,
						bottomLabel: "1",
						isMajor: true
					}
				],
				segments: [
					{
						start: 0,
						end: 0.5,
						color: "orange"
					},
					{
						start: 0.25,
						end: 0.75,
						color: "purple"
					}
				],
				model: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render segments with various colors", () => {
			const props = {
				type: "fractionNumberLine" as const,
				width: 700,
				height: 200,
				min: 0,
				max: 1,
				ticks: [
					{
						value: 0,
						topLabel: null,
						bottomLabel: "0",
						isMajor: true
					},
					{
						value: 0.125,
						topLabel: "1/8",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.375,
						topLabel: "3/8",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.625,
						topLabel: "5/8",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.875,
						topLabel: "7/8",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 1,
						topLabel: null,
						bottomLabel: "1",
						isMajor: true
					}
				],
				segments: [
					{
						start: 0,
						end: 0.125,
						color: "#FF5722"
					},
					{
						start: 0.125,
						end: 0.375,
						color: "#4CAF50"
					},
					{
						start: 0.625,
						end: 0.875,
						color: "#2196F3"
					},
					{
						start: 0.875,
						end: 1,
						color: "#9C27B0"
					}
				],
				model: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render full-length segment", () => {
			const props = {
				type: "fractionNumberLine" as const,
				width: 500,
				height: 200,
				min: 0,
				max: 1,
				ticks: [
					{
						value: 0,
						topLabel: null,
						bottomLabel: "0",
						isMajor: true
					},
					{
						value: 1,
						topLabel: null,
						bottomLabel: "1",
						isMajor: true
					}
				],
				segments: [
					{
						start: 0,
						end: 1,
						color: "rgba(255, 193, 7, 0.7)"
					}
				],
				model: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Fraction Model", () => {
		test("should render simple fraction model with single group", () => {
			const props = {
				type: "fractionNumberLine" as const,
				width: 500,
				height: 200,
				min: 0,
				max: 1,
				ticks: [
					{
						value: 0,
						topLabel: null,
						bottomLabel: "0",
						isMajor: true
					},
					{
						value: 0.25,
						topLabel: "1/4",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.5,
						topLabel: "2/4",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.75,
						topLabel: "3/4",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 1,
						topLabel: null,
						bottomLabel: "1",
						isMajor: true
					}
				],
				segments: null,
				model: {
					totalCells: 4,
					cellGroups: [
						{
							count: 3,
							color: "#4CAF50"
						}
					],
					bracketLabel: "3/4"
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render fraction model with multiple groups", () => {
			const props = {
				type: "fractionNumberLine" as const,
				width: 600,
				height: 200,
				min: 0,
				max: 1,
				ticks: [
					{
						value: 0,
						topLabel: null,
						bottomLabel: "0",
						isMajor: true
					},
					{
						value: 0.125,
						topLabel: "1/8",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.375,
						topLabel: "3/8",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.625,
						topLabel: "5/8",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 1,
						topLabel: null,
						bottomLabel: "1",
						isMajor: true
					}
				],
				segments: null,
				model: {
					totalCells: 8,
					cellGroups: [
						{
							count: 2,
							color: "#FF5722"
						},
						{
							count: 1,
							color: "#2196F3"
						},
						{
							count: 2,
							color: "#4CAF50"
						}
					],
					bracketLabel: "5/8"
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render fraction model without bracket label", () => {
			const props = {
				type: "fractionNumberLine" as const,
				width: 500,
				height: 200,
				min: 0,
				max: 1,
				ticks: [
					{
						value: 0,
						topLabel: null,
						bottomLabel: "0",
						isMajor: true
					},
					{
						value: 0.333,
						topLabel: "1/3",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.666,
						topLabel: "2/3",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 1,
						topLabel: null,
						bottomLabel: "1",
						isMajor: true
					}
				],
				segments: null,
				model: {
					totalCells: 3,
					cellGroups: [
						{
							count: 2,
							color: "#9C27B0"
						}
					],
					bracketLabel: null
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render fraction model with many cells", () => {
			const props = {
				type: "fractionNumberLine" as const,
				width: 800,
				height: 200,
				min: 0,
				max: 1,
				ticks: [
					{
						value: 0,
						topLabel: null,
						bottomLabel: "0",
						isMajor: true
					},
					{
						value: 0.1,
						topLabel: "1/10",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.5,
						topLabel: "5/10",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.7,
						topLabel: "7/10",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 1,
						topLabel: null,
						bottomLabel: "1",
						isMajor: true
					}
				],
				segments: null,
				model: {
					totalCells: 10,
					cellGroups: [
						{
							count: 7,
							color: "#FF9800"
						}
					],
					bracketLabel: "7/10"
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render fraction model with partial fill", () => {
			const props = {
				type: "fractionNumberLine" as const,
				width: 600,
				height: 200,
				min: 0,
				max: 1,
				ticks: [
					{
						value: 0,
						topLabel: null,
						bottomLabel: "0",
						isMajor: true
					},
					{
						value: 0.167,
						topLabel: "1/6",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.5,
						topLabel: "3/6",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.833,
						topLabel: "5/6",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 1,
						topLabel: null,
						bottomLabel: "1",
						isMajor: true
					}
				],
				segments: null,
				model: {
					totalCells: 6,
					cellGroups: [
						{
							count: 4,
							color: "#E91E63"
						}
					],
					bracketLabel: "4/6"
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Combined Features", () => {
		test("should render number line with segments and model", () => {
			const props = {
				type: "fractionNumberLine" as const,
				width: 600,
				height: 200,
				min: 0,
				max: 1,
				ticks: [
					{
						value: 0,
						topLabel: null,
						bottomLabel: "0",
						isMajor: true
					},
					{
						value: 0.25,
						topLabel: "1/4",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.5,
						topLabel: "2/4",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.75,
						topLabel: "3/4",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 1,
						topLabel: null,
						bottomLabel: "1",
						isMajor: true
					}
				],
				segments: [
					{
						start: 0,
						end: 0.75,
						color: "#4CAF50"
					}
				],
				model: {
					totalCells: 4,
					cellGroups: [
						{
							count: 3,
							color: "#4CAF50"
						}
					],
					bracketLabel: "3/4"
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render complex fraction comparison", () => {
			const props = {
				type: "fractionNumberLine" as const,
				width: 700,
				height: 200,
				min: 0,
				max: 1,
				ticks: [
					{
						value: 0,
						topLabel: "0/8",
						bottomLabel: "0",
						isMajor: true
					},
					{
						value: 0.125,
						topLabel: "1/8",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.25,
						topLabel: "2/8",
						bottomLabel: "1/4",
						isMajor: false
					},
					{
						value: 0.375,
						topLabel: "3/8",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.5,
						topLabel: "4/8",
						bottomLabel: "1/2",
						isMajor: true
					},
					{
						value: 0.625,
						topLabel: "5/8",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.75,
						topLabel: "6/8",
						bottomLabel: "3/4",
						isMajor: false
					},
					{
						value: 0.875,
						topLabel: "7/8",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 1,
						topLabel: "8/8",
						bottomLabel: "1",
						isMajor: true
					}
				],
				segments: [
					{
						start: 0,
						end: 0.375,
						color: "#FF5722"
					},
					{
						start: 0.5,
						end: 0.875,
						color: "#2196F3"
					}
				],
				model: {
					totalCells: 8,
					cellGroups: [
						{
							count: 3,
							color: "#FF5722"
						},
						{
							count: 1,
							color: "transparent"
						},
						{
							count: 3,
							color: "#2196F3"
						}
					],
					bracketLabel: "Compare 3/8 and 3/8"
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render equivalent fractions demonstration", () => {
			const props = {
				type: "fractionNumberLine" as const,
				width: 600,
				height: 200,
				min: 0,
				max: 1,
				ticks: [
					{
						value: 0,
						topLabel: "0",
						bottomLabel: "0",
						isMajor: true
					},
					{
						value: 0.167,
						topLabel: "1/6",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.333,
						topLabel: "2/6",
						bottomLabel: "1/3",
						isMajor: false
					},
					{
						value: 0.5,
						topLabel: "3/6",
						bottomLabel: "1/2",
						isMajor: true
					},
					{
						value: 0.667,
						topLabel: "4/6",
						bottomLabel: "2/3",
						isMajor: false
					},
					{
						value: 0.833,
						topLabel: "5/6",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 1,
						topLabel: "6/6",
						bottomLabel: "1",
						isMajor: true
					}
				],
				segments: [
					{
						start: 0,
						end: 0.5,
						color: "#9C27B0"
					}
				],
				model: {
					totalCells: 6,
					cellGroups: [
						{
							count: 3,
							color: "#9C27B0"
						}
					],
					bracketLabel: "3/6 = 1/2"
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Canvas and Sizing", () => {
		test("should render with custom large dimensions", () => {
			const props = {
				type: "fractionNumberLine" as const,
				width: 1000,
				height: 300,
				min: 0,
				max: 1,
				ticks: [
					{
						value: 0,
						topLabel: null,
						bottomLabel: "0",
						isMajor: true
					},
					{
						value: 0.5,
						topLabel: "1/2",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 1,
						topLabel: null,
						bottomLabel: "1",
						isMajor: true
					}
				],
				segments: [
					{
						start: 0,
						end: 0.5,
						color: "#FFC107"
					}
				],
				model: {
					totalCells: 2,
					cellGroups: [
						{
							count: 1,
							color: "#FFC107"
						}
					],
					bracketLabel: "1/2"
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with small dimensions", () => {
			const props = {
				type: "fractionNumberLine" as const,
				width: 300,
				height: 150,
				min: 0,
				max: 1,
				ticks: [
					{
						value: 0,
						topLabel: null,
						bottomLabel: "0",
						isMajor: true
					},
					{
						value: 1,
						topLabel: null,
						bottomLabel: "1",
						isMajor: true
					}
				],
				segments: [
					{
						start: 0,
						end: 1,
						color: "#795548"
					}
				],
				model: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with square canvas", () => {
			const props = {
				type: "fractionNumberLine" as const,
				width: 400,
				height: 400,
				min: 0,
				max: 1,
				ticks: [
					{
						value: 0,
						topLabel: null,
						bottomLabel: "0",
						isMajor: true
					},
					{
						value: 0.25,
						topLabel: "1/4",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.5,
						topLabel: "1/2",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.75,
						topLabel: "3/4",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 1,
						topLabel: null,
						bottomLabel: "1",
						isMajor: true
					}
				],
				segments: null,
				model: {
					totalCells: 4,
					cellGroups: [
						{
							count: 2,
							color: "#607D8B"
						}
					],
					bracketLabel: "Square Canvas"
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Edge Cases and Special Configurations", () => {
		test("should render with min and max equal (invalid range)", () => {
			const props = {
				type: "fractionNumberLine" as const,
				width: 500,
				height: 200,
				min: 1,
				max: 1,
				ticks: [
					{
						value: 1,
						topLabel: null,
						bottomLabel: "1",
						isMajor: true
					}
				],
				segments: null,
				model: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with negative range", () => {
			const props = {
				type: "fractionNumberLine" as const,
				width: 600,
				height: 200,
				min: -1,
				max: 1,
				ticks: [
					{
						value: -1,
						topLabel: null,
						bottomLabel: "-1",
						isMajor: true
					},
					{
						value: -0.5,
						topLabel: "-1/2",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0,
						topLabel: null,
						bottomLabel: "0",
						isMajor: true
					},
					{
						value: 0.5,
						topLabel: "1/2",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 1,
						topLabel: null,
						bottomLabel: "1",
						isMajor: true
					}
				],
				segments: [
					{
						start: -0.5,
						end: 0.5,
						color: "#00BCD4"
					}
				],
				model: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with very small interval", () => {
			const props = {
				type: "fractionNumberLine" as const,
				width: 800,
				height: 200,
				min: 0,
				max: 0.1,
				ticks: [
					{
						value: 0,
						topLabel: null,
						bottomLabel: "0",
						isMajor: true
					},
					{
						value: 0.01,
						topLabel: "1/100",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.05,
						topLabel: "5/100",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.1,
						topLabel: "10/100",
						bottomLabel: "1/10",
						isMajor: true
					}
				],
				segments: [
					{
						start: 0,
						end: 0.05,
						color: "#CDDC39"
					}
				],
				model: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with large interval", () => {
			const props = {
				type: "fractionNumberLine" as const,
				width: 800,
				height: 200,
				min: 0,
				max: 10,
				ticks: [
					{
						value: 0,
						topLabel: null,
						bottomLabel: "0",
						isMajor: true
					},
					{
						value: 2.5,
						topLabel: "5/2",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 5,
						topLabel: null,
						bottomLabel: "5",
						isMajor: true
					},
					{
						value: 7.5,
						topLabel: "15/2",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 10,
						topLabel: null,
						bottomLabel: "10",
						isMajor: true
					}
				],
				segments: [
					{
						start: 0,
						end: 5,
						color: "#8BC34A"
					}
				],
				model: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with single tick", () => {
			const props = {
				type: "fractionNumberLine" as const,
				width: 400,
				height: 200,
				min: 0,
				max: 1,
				ticks: [
					{
						value: 0.5,
						topLabel: "1/2",
						bottomLabel: "0.5",
						isMajor: true
					}
				],
				segments: null,
				model: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with many ticks", () => {
			const props = {
				type: "fractionNumberLine" as const,
				width: 900,
				height: 200,
				min: 0,
				max: 1,
				ticks: Array.from({ length: 21 }, (_, i) => {
					let bottomLabel = null
					if (i === 0) {
						bottomLabel = "0"
					} else if (i === 20) {
						bottomLabel = "1"
					}

					return {
						value: i / 20,
						topLabel: i === 0 || i === 20 ? null : `${i}/20`,
						bottomLabel,
						isMajor: i % 4 === 0
					}
				}),
				segments: null,
				model: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render model with single cell", () => {
			const props = {
				type: "fractionNumberLine" as const,
				width: 400,
				height: 200,
				min: 0,
				max: 1,
				ticks: [
					{
						value: 0,
						topLabel: null,
						bottomLabel: "0",
						isMajor: true
					},
					{
						value: 1,
						topLabel: null,
						bottomLabel: "1",
						isMajor: true
					}
				],
				segments: null,
				model: {
					totalCells: 1,
					cellGroups: [
						{
							count: 1,
							color: "#3F51B5"
						}
					],
					bracketLabel: "1/1"
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render model with no filled cells", () => {
			const props = {
				type: "fractionNumberLine" as const,
				width: 500,
				height: 200,
				min: 0,
				max: 1,
				ticks: [
					{
						value: 0,
						topLabel: null,
						bottomLabel: "0",
						isMajor: true
					},
					{
						value: 0.25,
						topLabel: "1/4",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.5,
						topLabel: "2/4",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 0.75,
						topLabel: "3/4",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 1,
						topLabel: null,
						bottomLabel: "1",
						isMajor: true
					}
				],
				segments: null,
				model: {
					totalCells: 4,
					cellGroups: [],
					bracketLabel: "0/4"
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Default Values", () => {
		test("should render with width null (defaults to 500)", () => {
			const props = {
				type: "fractionNumberLine" as const,
				width: null,
				height: 200,
				min: 0,
				max: 1,
				ticks: [
					{
						value: 0,
						topLabel: null,
						bottomLabel: "0",
						isMajor: true
					},
					{
						value: 0.5,
						topLabel: "1/2",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 1,
						topLabel: null,
						bottomLabel: "1",
						isMajor: true
					}
				],
				segments: null,
				model: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with height null (defaults to 200)", () => {
			const props = {
				type: "fractionNumberLine" as const,
				width: 500,
				height: null,
				min: 0,
				max: 1,
				ticks: [
					{
						value: 0,
						topLabel: null,
						bottomLabel: "0",
						isMajor: true
					},
					{
						value: 0.5,
						topLabel: "1/2",
						bottomLabel: null,
						isMajor: false
					},
					{
						value: 1,
						topLabel: null,
						bottomLabel: "1",
						isMajor: true
					}
				],
				segments: null,
				model: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with all nullable properties set to null (defaults applied)", () => {
			const props = {
				type: "fractionNumberLine" as const,
				width: null, // defaults to 500
				height: null, // defaults to 200
				min: 0,
				max: 1,
				ticks: [
					{
						value: 0,
						topLabel: null,
						bottomLabel: "0",
						isMajor: false // defaults to false
					},
					{
						value: 0.5,
						topLabel: "1/2",
						bottomLabel: null,
						isMajor: false // defaults to false
					},
					{
						value: 1,
						topLabel: null,
						bottomLabel: "1",
						isMajor: false // defaults to false
					}
				],
				segments: null, // no segments
				model: null // no model
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})
})
