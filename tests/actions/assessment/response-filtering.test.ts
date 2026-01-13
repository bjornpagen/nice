import { describe, expect, mock, test } from "bun:test";
import * as errors from "@superbuilders/errors";

// --- MOCKS (BEFORE SUT IMPORT) ---

type ProcessResponsesCall = {
  identifier: string;
  responses: Record<string, string>;
};
let lastProcessResponsesCall: ProcessResponsesCall | null = null;
function getLastCall(): ProcessResponsesCall | null {
  return lastProcessResponsesCall;
}

const mockProcessResponse = mock(
  (
    _identifier: string,
    input: { responseIdentifier: string; value: unknown },
  ) => {
    if (input.responseIdentifier === "numeric_input_1") {
      return Promise.resolve({
        score: 1,
        feedback: { identifier: "CORRECT", value: "Correct" },
      });
    }
    if (input.responseIdentifier === "RESPONSE") {
      return Promise.reject(
        errors.new(
          'Response declaration with identifier "RESPONSE" does not exist',
        ),
      );
    }
    return Promise.reject(
      errors.new(`unexpected identifier: ${input.responseIdentifier}`),
    );
  },
);

const mockProcessResponses = mock(
  (identifier: string, responses: Record<string, string>) => {
    lastProcessResponsesCall = { identifier, responses };

    const keys = Object.keys(responses);
    if (keys.includes("RESPONSE")) {
      return Promise.reject(
        errors.new(
          "Filtering failed: Received forbidden identifier 'RESPONSE'",
        ),
      );
    }

    if (keys.some((k) => k.startsWith("RESPONSE__dropdown"))) {
      const correctAnswers: Record<string, string> = {
        RESPONSE__dropdown_1: "PHYSICAL",
        RESPONSE__dropdown_2: "CHEMICAL",
        RESPONSE__dropdown_6: "DIFFERENT",
        RESPONSE__dropdown_7: "DIFFERENT",
      };
      const allCorrect = keys.every(
        (key) => responses[key] === correctAnswers[key],
      );
      return Promise.resolve({
        score: allCorrect ? 1 : 0,
        feedback: {
          identifier: allCorrect ? "correct" : "incorrect",
          value: allCorrect ? "Correct" : "Incorrect",
        },
      });
    }

    if (
      keys.includes("numeric_input_1") &&
      responses["numeric_input_1"] === "8"
    ) {
      return Promise.resolve({
        score: 1,
        feedback: { identifier: "CORRECT", value: "Correct" },
      });
    }

    return Promise.resolve({
      score: 0,
      feedback: { identifier: "INCORRECT", value: "Incorrect" },
    });
  },
);

const mockGetAssessmentItem = mock((id: string) => {
  if (id === "nice_x8c9a2007637b937b") {
    return Promise.resolve({
      identifier: "nice_x8c9a2007637b937b",
      title: "Types of Mixtures",
      type: "inline-choice",
      qtiVersion: "3.0",
      timeDependent: false,
      adaptive: false,
      responseDeclarations: [
        {
          identifier: "RESPONSE__dropdown_1",
          cardinality: "single",
          baseType: "identifier",
          correctResponse: { value: ["PHYSICAL"] },
        },
        {
          identifier: "RESPONSE__dropdown_2",
          cardinality: "single",
          baseType: "identifier",
          correctResponse: { value: ["CHEMICAL"] },
        },
        {
          identifier: "RESPONSE__dropdown_6",
          cardinality: "single",
          baseType: "identifier",
          correctResponse: { value: ["DIFFERENT"] },
        },
        {
          identifier: "RESPONSE__dropdown_7",
          cardinality: "single",
          baseType: "identifier",
          correctResponse: { value: ["DIFFERENT"] },
        },
      ],
      outcomeDeclarations: [],
      metadata: {},
      rawXml: "<xml />",
      content: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  return Promise.resolve({
    identifier: "item_1",
    title: "Test",
    type: "text-entry",
    qtiVersion: "3.0",
    timeDependent: false,
    adaptive: false,
    responseDeclarations: [
      {
        identifier: "numeric_input_1",
        cardinality: "single",
        baseType: "integer",
        correctResponse: { value: ["8"] },
      },
    ],
    outcomeDeclarations: [],
    metadata: {},
    rawXml: "<xml />",
    content: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
});

const actualAuthorization = await import("@/lib/authorization");
mock.module("@/lib/authorization", () => ({
  ...actualAuthorization,
  getCurrentUserSourcedId: mock(() => Promise.resolve("user_test")),
  isUserAuthorizedForQuestion: mock(() => Promise.resolve(true)),
}));

mock.module("@clerk/nextjs/server", () => ({
  auth: mock(() => Promise.resolve({ userId: "mock_clerk_user_id" })),
  clerkClient: () => ({
    users: {
      getUser: () =>
        Promise.resolve({
          publicMetadata: {},
          emailAddresses: [{ emailAddress: "test@example.com" }],
        }),
    },
  }),
}));

mock.module("@/lib/clients", () => ({
  qti: {
    processResponse: mockProcessResponse,
    processResponses: mockProcessResponses,
    getAssessmentItem: mockGetAssessmentItem,
  },
  oneroster: { getAllResults: mock(() => Promise.resolve([])) },
  caliper: { sendCaliperEvents: mock(() => Promise.resolve()) },
  caseApi: {},
  powerpath: {},
}));

const { processQuestionResponse } = await import("@/lib/actions/assessment");

describe("QTI response filtering (server-side)", () => {
  test("ignores undeclared response identifiers and succeeds", async () => {
    lastProcessResponsesCall = null;
    const selectedResponse = { numeric_input_1: "8", RESPONSE: "" };

    const result = await processQuestionResponse(
      "item_1",
      selectedResponse,
      "RESPONSE",
    );

    expect(result.isCorrect).toBe(true);
    expect(getLastCall()?.identifier).toBe("item_1");
    expect(getLastCall()?.responses).toEqual({
      numeric_input_1: "8",
    });
    expect(getLastCall()?.responses).not.toHaveProperty("RESPONSE");
  });

  test("sends all dropdown responses in a single batched request", async () => {
    lastProcessResponsesCall = null;
    const selectedResponse = {
      RESPONSE__dropdown_1: "PHYSICAL",
      RESPONSE__dropdown_2: "CHEMICAL",
      RESPONSE__dropdown_6: "DIFFERENT",
      RESPONSE__dropdown_7: "DIFFERENT",
    };

    const result = await processQuestionResponse(
      "nice_x8c9a2007637b937b",
      selectedResponse,
      "RESPONSE__dropdown_1",
    );

    expect(result.isCorrect).toBe(true);
    expect(result.score).toBe(1);
    expect(getLastCall()?.identifier).toBe("nice_x8c9a2007637b937b");
    expect(Object.keys(getLastCall()?.responses ?? {}).length).toBe(4);
    expect(getLastCall()?.responses).toEqual({
      RESPONSE__dropdown_1: "PHYSICAL",
      RESPONSE__dropdown_2: "CHEMICAL",
      RESPONSE__dropdown_6: "DIFFERENT",
      RESPONSE__dropdown_7: "DIFFERENT",
    });
  });

  test("returns incorrect when some dropdown responses are wrong", async () => {
    lastProcessResponsesCall = null;
    const selectedResponse = {
      RESPONSE__dropdown_1: "CHEMICAL", // Wrong
      RESPONSE__dropdown_2: "PHYSICAL", // Wrong
      RESPONSE__dropdown_6: "DIFFERENT",
      RESPONSE__dropdown_7: "DIFFERENT",
    };

    const result = await processQuestionResponse(
      "nice_x8c9a2007637b937b",
      selectedResponse,
      "RESPONSE__dropdown_1",
    );

    expect(result.isCorrect).toBe(false);
    expect(result.score).toBe(0);
    expect(Object.keys(getLastCall()?.responses ?? {}).length).toBe(4);
  });

  test("handles array values in multi-input by joining them", async () => {
    lastProcessResponsesCall = null;
    const selectedResponse = { numeric_input_1: ["8", "9"] };

    const result = await processQuestionResponse(
      "item_1",
      selectedResponse,
      "numeric_input_1",
    );

    expect(result.isCorrect).toBe(false); // "8,9" !== "8"
    expect(getLastCall()?.responses).toEqual({
      numeric_input_1: "8,9",
    });
  });
});
