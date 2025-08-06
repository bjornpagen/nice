import { describe, expect, test } from "bun:test"
import { EmojiImagePropsSchema, generateEmojiImage } from "./emoji-image"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = EmojiImagePropsSchema.parse(props)
	return generateEmojiImage(parsedProps)
}

describe("generateEmojiImage", () => {
	test("should render with minimal props", () => {
		const props = {
			type: "emojiImage" as const,
			width: null,
			height: null,
			emoji: "😊",
			size: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "emojiImage" as const,
			width: 100,
			height: 100,
			emoji: "🎯",
			size: 80
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
