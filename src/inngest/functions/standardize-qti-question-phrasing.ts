import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { zodResponseFormat } from "openai/helpers/zod"
import { z } from "zod/v3"
import { env } from "@/env"
import { inngest } from "@/inngest/client"
import { qti } from "@/lib/clients"
import OpenAI from "openai"

const openai = new OpenAI({
	apiKey: env.OPENAI_API_KEY
})

const CORRECT_SIMPLIFIED_FRACTION_PHRASING = "<p>(Write your answer as a fraction in the simplest form without spaces.)</p>"
const CORRECT_SCIENTIFIC_NOTATION_PHRASING = "<p>(Do not include spaces in your answer. Answer using scientific notation, using '*' for multiplication and '^' for exponents.)</p>"
const CORRECT_GENERIC_PHRASING = "<p>(Do not include spaces in your response.)</p>"

const PhrasingIssueSchema = z.object({
	issueType: z.enum(["simplified-fraction", "scientific-notation", "generic-spaces", "none"]).describe("The type of phrasing issue found, or 'none' if no issues"),
	faultyLine: z.string().nullable().describe("The exact faulty line from the XML that needs to be replaced, if an issue was found. null if issueType is 'none'"),
	correctResponseValue: z.string().nullable().describe("The value from <qti-correct-response><qti-value> for verification purposes"),
	explanation: z.string().describe("Brief explanation of why this line needs to be changed, or why no changes are needed")
})

type PhrasingIssue = z.infer<typeof PhrasingIssueSchema>

const StandardizePhrasingResponseSchema = z.object({
	issues: z.array(PhrasingIssueSchema).describe("Array of phrasing issues found in the question")
})

type StandardizePhrasingResponse = z.infer<typeof StandardizePhrasingResponseSchema>

export const standardizeQtiQuestionPhrasing = inngest.createFunction(
	{
		id: "standardize-qti-question-phrasing",
		name: "Standardize QTI Question Phrasing",
		retries: 3
	},
	{ event: "qti/question.standardize-phrasing" },
	async ({ event, step, logger }) => {
		const { identifier, rawXml, title } = event.data
		logger.info("starting qti question phrasing standardization", { identifier, title })

		const backupPath = await step.run("backup-original-xml", async () => {
			const backupDir = path.join(process.cwd(), "data", "backups", "qti-standardization")

			const mkdirResult = await errors.try(fs.mkdir(backupDir, { recursive: true }))
			if (mkdirResult.error) {
				logger.error("failed to create backup directory", { error: mkdirResult.error, backupDir })
				throw errors.wrap(mkdirResult.error, "backup directory creation")
			}

			const backupFilePath = path.join(backupDir, `${identifier}.xml`)
			const writeResult = await errors.try(fs.writeFile(backupFilePath, rawXml, "utf-8"))
			if (writeResult.error) {
				logger.error("failed to write backup file", { error: writeResult.error, backupFilePath })
				throw errors.wrap(writeResult.error, "backup file write")
			}

			logger.debug("backed up original xml", { identifier, backupFilePath })
			return backupFilePath
		})

		const analysisResult = await step.run("analyze-phrasing-with-openai", async () => {
			const systemPrompt = `You are a QTI XML standardization expert. Your task is to identify specific phrasing issues in QTI assessment items.

CRITICAL: You MUST first examine the <qti-correct-response><qti-value> element to determine what answer format is ACTUALLY expected before identifying any issues.

You must identify THREE specific types of issues:

## 1. Vague instances of using simplified fractions (ONLY when answer is a fraction).
The questions often have varying ways of telling the user to use "simplified form." However, we want to standardize the way it's phrased. For example, we might have the following incorrect QTI question:
<incorrect-qti-question-for-simplified-fractions>
\`\`\`xml
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_xa718c64c3c49258e_21224"
    title="Convert the repeating decimal to a simplified fraction"
    time-dependent="false"
    xml:lang="en-US">
    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="string">
        <qti-correct-response>
            <qti-value>77/30</qti-value>
        </qti-correct-response>
        <qti-mapping default-value="0">
            <qti-map-entry map-key="77/30" mapped-value="1"/>
        </qti-mapping>
    </qti-response-declaration>
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value><qti-value>0</qti-value></qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>
    <qti-outcome-declaration identifier="FEEDBACK-INLINE" cardinality="multiple" base-type="identifier"/>
    <qti-item-body>
        <p>Express as a simplified fraction.</p>
        <p><math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mn>2.</mn><mn>5</mn><mover><mn>6</mn><mo>‾</mo></mover><mo>=</mo></mrow></math> <qti-text-entry-interaction response-identifier="RESPONSE" expected-length="5"/></p>
        <p>(Provide the fraction in simplest form, no spaces)</p>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body><p>Correct! The simplified fraction is <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>77</mn><mn>30</mn></mfrac></math>.</p></qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body><p>Not quite. Let <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi></math> be the decimal <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>2.</mn><mn>5</mn><mover><mn>6</mn><mo>‾</mo></mover></math>. Then <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>100</mn><mi>x</mi><mo>=</mo><mn>256</mn><mo>.</mo><mover><mn>6</mn><mo>‾</mo></mover></math> and <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>10</mn><mi>x</mi><mo>=</mo><mn>25</mn><mo>.</mo><mover><mn>6</mn><mo>‾</mo></mover></math>. Subtract to get <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>90</mn><mi>x</mi><mo>=</mo><mn>231</mn></math>, so <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>=</mo><mfrac><mn>231</mn><mn>90</mn></mfrac><mo>=</mo><mfrac><mn>77</mn><mn>30</mn></mfrac></math></p></qti-content-body>
        </qti-feedback-block>
    </qti-item-body>
    <qti-response-processing>

        <qti-set-outcome-value identifier="SCORE"><qti-map-response identifier="RESPONSE"/></qti-set-outcome-value>

        <qti-response-condition>
            <qti-response-if>
                <qti-gt>
                    <qti-variable identifier="SCORE"/>
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-gt>
                <qti-set-outcome-value identifier="FEEDBACK"><qti-base-value base-type="identifier">CORRECT</qti-base-value></qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="FEEDBACK"><qti-base-value base-type="identifier">INCORRECT</qti-base-value></qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>
</qti-assessment-item>
\`\`\`
</incorrect-qti-question-for-simplified-fractions>

The question above has the faulty line \`<p>(Provide the fraction in simplest form, no spaces)</p>\`. We want to standardize these faulty lines to:
<correct-simplified-fraction-phrasing>
\`\`\`xml
<p>(Write your answer as a fraction in the simplest form without spaces.)</p>
\`\`\`
</correct-simplified-fraction-phrasing>

## 2. Vague instances of using scientific notation (ONLY when answer is in scientific notation format like "6*10^1").
The questions often have varying ways of telling the user to use scientific notation. However, we want to standardize the way it's phrased.

CRITICAL: Only apply this fix if the <qti-correct-response><qti-value> contains a pattern like "a*10^b" (e.g., "6*10^1", "1.5*10^-3"). If the answer is NOT in scientific notation format, do NOT mark this as a scientific notation issue.

For example, we might have the following incorrect QTI question:
<incorrect-qti-question-for-scientific-notation>
\`\`\`xml
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_x8a5ff3b99588e62e_49190"
    title="Compute a quotient in scientific notation"
    time-dependent="false"
    xml:lang="en-US">
    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="string">
        <qti-correct-response>
            <qti-value>6*10^1</qti-value>
        </qti-correct-response>
        <qti-mapping default-value="0">
            <qti-map-entry map-key="6*10^1" mapped-value="1"/>
        </qti-mapping>
    </qti-response-declaration>
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value><qti-value>0</qti-value></qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>
    <qti-outcome-declaration identifier="FEEDBACK-INLINE" cardinality="multiple" base-type="identifier"/>
    <qti-item-body>
        <p>Calculate the quotient below and give your answer in scientific notation.</p>
        <p><math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mfrac><mrow><mn>4.2</mn><mo>×</mo><msup><mn>10</mn><mn>5</mn></msup></mrow><mrow><mn>7,000</mn></mrow></mfrac><mo>=</mo><mo>?</mo></mrow></math></p>
        <p>(In the format a*10^b and do not include spaces in your answer)</p>
        <p>Answer: <qti-text-entry-interaction response-identifier="RESPONSE" expected-length="6"/></p>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body><p>Correct! The quotient in scientific notation is <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>6</mn><mo>×</mo><msup><mn>10</mn><mn>1</mn></msup></math>.</p>
        <p><math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mfrac><mrow><mn>4.2</mn><mo>×</mo><msup><mn>10</mn><mn>5</mn></msup></mrow><mrow><mn>7.0</mn><mo>×</mo><msup><mn>10</mn><mn>3</mn></msup></mrow></mfrac><mo>=</mo><mo>(</mo><mfrac><mn>4.2</mn><mn>7.0</mn></mfrac><mo>)</mo><mo>×</mo><msup><mn>10</mn><mrow><mn>5</mn><mo>−</mo><mn>3</mn></mrow></msup><mo>=</mo><mn>0.6</mn><mo>×</mo><msup><mn>10</mn><mn>2</mn></msup><mo>=</mo><mn>6</mn><mo>×</mo><msup><mn>10</mn><mn>1</mn></msup></mrow></math></p></qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body><p>Not quite. Divide the coefficients and subtract the exponents of <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>10</mn></math>, then adjust so the first factor is between <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>1</mn></math> and <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>10</mn></math>. For example,</p>
        <p><math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mfrac><mn>4.2</mn><mn>7.0</mn></mfrac><mo>=</mo><mn>0.6</mn><mo>,</mo><mspace width="0.5em"/><mfrac><msup><mn>10</mn><mn>5</mn></msup><msup><mn>10</mn><mn>3</mn></msup></mfrac><mo>=</mo><msup><mn>10</mn><mn>2</mn></msup></mrow></math></p></qti-content-body>
        </qti-feedback-block>
    </qti-item-body>
    <qti-response-processing>

        <qti-set-outcome-value identifier="SCORE"><qti-map-response identifier="RESPONSE"/></qti-set-outcome-value>

        <qti-response-condition>
            <qti-response-if>
                <qti-gt>
                    <qti-variable identifier="SCORE"/>
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-gt>
                <qti-set-outcome-value identifier="FEEDBACK"><qti-base-value base-type="identifier">CORRECT</qti-base-value></qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="FEEDBACK"><qti-base-value base-type="identifier">INCORRECT</qti-base-value></qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>
</qti-assessment-item>
\`\`\`
</incorrect-qti-question-for-scientific-notation>

The question above has the faulty line \`<p>(In the format a*10^b and do not include spaces in your answer)</p>\`. We want to standardize these faulty lines to:
<correct-scientific-notation-phrasing>
\`\`\`xml
<p>(Do not include spaces in your answer. Answer using scientific notation, using '*' for multiplication and '^' for exponents.)</p>
\`\`\`
</correct-scientific-notation-phrasing>

### Notes

#### Faulty Scientific Notation Cases with XML Inside
There may be cases for the scientific notation case where the faulty line contains XML inside. For example, the faulty line might be: \`<p>(Use the format <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>a</mi><mo>*</mo><msup><mn>10</mn><mi>n</mi></msup></math>; do not include spaces in your answer.)</p>\`. The entire faulty line would need to be replaced with the correct phrasing.

## 3. Generic "do not include spaces" phrasing (for answers that are NOT fractions or scientific notation).
For questions where the answer is neither a fraction nor scientific notation (e.g., algebraic expressions like "9^-9", polynomial answers, etc.), we want to standardize generic spacing instructions.

CRITICAL: Only apply this fix if:
- The <qti-correct-response><qti-value> does NOT contain "/" (not a fraction)
- The <qti-correct-response><qti-value> does NOT contain "*10^" (not scientific notation)
- There exists a vague instruction about spaces like "(Do not include spaces in your answer)" or similar

These should be standardized to:
<correct-generic-phrasing>
\`\`\`xml
<p>(Do not include spaces in your response.)</p>
\`\`\`
</correct-generic-phrasing>

### Decision Tree for Issue Type

1. First, extract the <qti-correct-response><qti-value> content
2. Then classify:
   - If value contains "/" (e.g., "77/30", "1/2") → issueType: "simplified-fraction" (if vague fraction phrasing exists)
   - If value contains "*10^" (e.g., "6*10^1", "1.5*10^-3") → issueType: "scientific-notation" (if vague scientific notation phrasing exists)
   - If value is neither (e.g., "9^-9", "x^2+3x-1") → issueType: "generic-spaces" (if vague spacing instruction exists)
   - If no vague phrasing exists → issueType: "none"

#### Other Questions in the Test
It's important to note that there *are* other questions that have either already been fixed or don't relate to these issues. These questions should be ignored (return issueType: "none").

For each issue you find:
- Return the EXACT faulty line from the XML that needs to be replaced
- Return the correctResponseValue from <qti-correct-response><qti-value> for verification
- The faulty line MUST match character-for-character what appears in the XML`

			const completionResult = await errors.try(
				openai.chat.completions.create({
					model: "gpt-4o",
					temperature: 0.3,
					messages: [
						{ role: "system", content: systemPrompt },
						{ role: "user", content: `Analyze this QTI question XML:\n\n${rawXml}` }
					],
					response_format: zodResponseFormat(StandardizePhrasingResponseSchema, "standardize_phrasing_response")
				})
			)

			if (completionResult.error) {
				logger.error("openai completion failed", { error: completionResult.error, identifier })
				throw errors.wrap(completionResult.error, "openai completion")
			}

			const completion = completionResult.data
			const messageContent = completion.choices[0]?.message?.content
			if (!messageContent) {
				logger.error("openai response missing content", { identifier })
				throw errors.new("openai response missing content")
			}

			const parseResult = errors.trySync(() => JSON.parse(messageContent))
			if (parseResult.error) {
				logger.error("failed to parse openai response", { error: parseResult.error, identifier })
				throw errors.wrap(parseResult.error, "openai response parsing")
			}

			const validationResult = StandardizePhrasingResponseSchema.safeParse(parseResult.data)
			if (!validationResult.success) {
				logger.error("openai response validation failed", { error: validationResult.error, identifier })
				throw errors.wrap(validationResult.error, "openai response validation")
			}

			logger.debug("openai analysis complete", { identifier, issues: validationResult.data.issues })
			return validationResult.data
		})

		const hasIssues = analysisResult.issues.some((issue: PhrasingIssue) => issue.issueType !== "none")

		if (!hasIssues) {
			logger.info("no phrasing issues found", { identifier, title })
			return {
				status: "no-changes",
				message: "no phrasing issues found",
				identifier,
				backupPath
			}
		}

		const updateResult = await step.run("apply-standardization", async () => {
			let updatedXml = rawXml

			for (const issue of analysisResult.issues) {
				if (issue.issueType === "none" || !issue.faultyLine) continue

				let correctPhrasing: string
				if (issue.issueType === "simplified-fraction") {
					correctPhrasing = CORRECT_SIMPLIFIED_FRACTION_PHRASING
				} else if (issue.issueType === "scientific-notation") {
					correctPhrasing = CORRECT_SCIENTIFIC_NOTATION_PHRASING
				} else if (issue.issueType === "generic-spaces") {
					correctPhrasing = CORRECT_GENERIC_PHRASING
				} else {
					logger.error("unknown issue type", { identifier, issueType: issue.issueType })
					throw errors.new(`unknown issue type: ${issue.issueType}`)
				}

				if (!updatedXml.includes(issue.faultyLine)) {
					logger.error("faulty line not found in xml", {
						identifier,
						faultyLine: issue.faultyLine,
						issueType: issue.issueType
					})
					throw errors.new(`faulty line not found in xml: ${issue.faultyLine}`)
				}

				updatedXml = updatedXml.replace(issue.faultyLine, correctPhrasing)
				logger.debug("replaced faulty line", {
					identifier,
					issueType: issue.issueType,
					faultyLine: issue.faultyLine,
					correctPhrasing,
					correctResponseValue: issue.correctResponseValue
				})
			}

			const updateResult = await errors.try(
				qti.updateAssessmentItem({
					identifier,
					xml: updatedXml,
					metadata: undefined
				})
			)

			if (updateResult.error) {
				logger.error("failed to update qti assessment item", { error: updateResult.error, identifier })
				throw errors.wrap(updateResult.error, "qti assessment item update")
			}

			logger.info("qti assessment item updated", { identifier })
			return {
				identifier,
				issuesFixed: analysisResult.issues.filter((i: PhrasingIssue) => i.issueType !== "none").length
			}
		})

		logger.info("standardization complete", {
			identifier,
			title,
			issuesFixed: updateResult.issuesFixed,
			backupPath
		})

		return {
			status: "updated",
			message: `fixed ${updateResult.issuesFixed} phrasing issue(s)`,
			identifier,
			issuesFixed: updateResult.issuesFixed,
			backupPath
		}
	}
)
