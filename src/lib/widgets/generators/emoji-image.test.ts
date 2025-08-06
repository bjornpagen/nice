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
			emoji: "😊",
			size: null,
			label: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "emojiImage" as const,
			emoji: "🎯",
			size: 80,
			label: "Target"
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
