import { describe, expect, mock, test } from "bun:test"

// --- MOCKS (BEFORE SUT IMPORT) ---

// Authorization
mock.module("@/lib/authorization", () => ({
  getCurrentUserSourcedId: mock(() => Promise.resolve("user_test"))
}))

// QTI client: we want to simulate a renderer sending both a valid id and an undeclared one
const mockProcessResponse = mock(
  (_identifier: string, input: { responseIdentifier: string; value: unknown }) => {
    if (input.responseIdentifier === "numeric_input_1") {
      // Simulate a successful scorer response
      return Promise.resolve({ score: 1, feedback: { identifier: "CORRECT", value: "Correct" } })
    }
    if (input.responseIdentifier === "RESPONSE") {
      // Simulate the QTI API rejecting an undeclared identifier (current bug path)
      return Promise.reject(new Error("Response declaration with identifier \"RESPONSE\" does not exist in the assessment item"))
    }
    return Promise.reject(new Error(`unexpected identifier: ${input.responseIdentifier}`))
  }
)

const mockGetAssessmentItem = mock((_id: string) => {
  // Authoritative metadata: only one declared response identifier
  return Promise.resolve({
    identifier: "item_1",
    title: "Test",
    type: "text-entry",
    qtiVersion: "3.0",
    timeDependent: false,
    adaptive: false,
    responseDeclarations: [
      { identifier: "numeric_input_1", cardinality: "single", baseType: "integer", correctResponse: { value: ["8"] } }
    ],
    outcomeDeclarations: [],
    metadata: {},
    rawXml: "<xml />",
    content: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })
})

mock.module("@/lib/clients", () => ({
  qti: {
    processResponse: mockProcessResponse,
    getAssessmentItem: mockGetAssessmentItem
  }
}))

describe("QTI response filtering (server-side)", () => {
  test("ignores undeclared response identifiers and succeeds (currently fails without filtering)", async () => {
    const { processQuestionResponse } = await import("@/lib/actions/assessment")

    // Simulate the iframe emitting both the valid id and an extra bogus one
    const selectedResponse = {
      numeric_input_1: "8",
      RESPONSE: ""
    }

    // Desired behavior after hardening: should succeed, treating only numeric_input_1
    // Current behavior: will attempt both; the RESPONSE call rejects and the function throws
    const result = await processQuestionResponse("item_1", selectedResponse, "RESPONSE")

    // Expectation for hardened behavior (will fail today):
    expect(result.isCorrect).toBe(true)
  })
})


