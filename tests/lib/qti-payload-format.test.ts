import { describe, expect, mock, test } from "bun:test";

/**
 * Unit tests for QTI payload format.
 *
 * These tests verify that the QTI client builds the correct payload format
 * for multi-select and ordering questions. This is a regression test for
 * the bug where array responses were sent in the wrong format.
 *
 * Bug context:
 * - Old format (broken): { identifier: "RESPONSE", response: ["A", "B"] }
 * - New format (working): { responses: { "RESPONSE": ["A", "B"] } }
 *
 * QTI Items from bug report:
 * - nice_xe41dfedfe59b56fc: Multi-select (cardinality: multiple), correct: ["A", "B", "E"]
 * - nice_x220c3c0322b3c908: Ordering (cardinality: ordered), correct: ["A", "B", "C", "D"]
 */

// Capture what payload gets sent to fetch
let capturedFetchCalls: Array<{ url: string; options: RequestInit }> = [];

// Mock fetch to capture the request payload
const mockFetch = mock(async (url: string, options?: RequestInit) => {
  capturedFetchCalls.push({ url: url.toString(), options: options ?? {} });

  // Mock token endpoint
  if (url.includes("/token")) {
    return new Response(JSON.stringify({ access_token: "mock_token" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Mock process-response endpoint
  if (url.includes("/process-response")) {
    return new Response(
      JSON.stringify({
        score: 1,
        feedback: { identifier: "CORRECT", value: "CORRECT" },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  return new Response("Not found", { status: 404 });
});

// Replace global fetch
// @ts-expect-error - mock doesn't include all fetch properties like preconnect
globalThis.fetch = mockFetch;

// Now import the QTI client (after mocking fetch)
const { Client } = await import("@/lib/qti");

describe("QTI Client payload format for processResponses", () => {
  test("processResponses sends batched format with string array value", async () => {
    capturedFetchCalls = [];

    const client = new Client({
      serverUrl: "https://test.example.com/api",
      tokenUrl: "https://test.example.com/token",
      clientId: "test_client",
      clientSecret: "test_secret",
    });

    // Call processResponses with array value (multi-select/ordering format)
    await client.processResponses("nice_xe41dfedfe59b56fc", {
      choice_interaction: ["A", "B", "E"],
    });

    // Find the process-response call
    const processCall = capturedFetchCalls.find((c) =>
      c.url.includes("/process-response"),
    );

    expect(processCall).toBeDefined();
    expect(processCall!.options.method).toBe("POST");

    // Parse the body and verify the payload format
    const body = JSON.parse(processCall!.options.body as string);

    // CRITICAL: Verify the batched format { responses: { identifier: value } }
    expect(body).toHaveProperty("responses");
    expect(body.responses).toHaveProperty("choice_interaction");
    expect(body.responses.choice_interaction).toEqual(["A", "B", "E"]);

    // Verify it does NOT have the old format
    expect(body).not.toHaveProperty("identifier");
    expect(body).not.toHaveProperty("response");
  });

  test("processResponses sends batched format with string value", async () => {
    capturedFetchCalls = [];

    const client = new Client({
      serverUrl: "https://test.example.com/api",
      tokenUrl: "https://test.example.com/token",
      clientId: "test_client",
      clientSecret: "test_secret",
    });

    // Call processResponses with string value (fill-in-the-blank format)
    await client.processResponses("nice_test_item", {
      RESPONSE__dropdown_1: "PHYSICAL",
      RESPONSE__dropdown_2: "CHEMICAL",
    });

    const processCall = capturedFetchCalls.find((c) =>
      c.url.includes("/process-response"),
    );

    expect(processCall).toBeDefined();

    const body = JSON.parse(processCall!.options.body as string);

    // Verify batched format for string values
    expect(body).toHaveProperty("responses");
    expect(body.responses).toEqual({
      RESPONSE__dropdown_1: "PHYSICAL",
      RESPONSE__dropdown_2: "CHEMICAL",
    });
  });

  test("processResponses for ordering question sends array in correct format", async () => {
    capturedFetchCalls = [];

    const client = new Client({
      serverUrl: "https://test.example.com/api",
      tokenUrl: "https://test.example.com/token",
      clientId: "test_client",
      clientSecret: "test_secret",
    });

    // Call with ordering response (matches Thiago's working curl)
    await client.processResponses("nice_x220c3c0322b3c908", {
      RESPONSE: ["A", "B", "C", "D"],
    });

    const processCall = capturedFetchCalls.find((c) =>
      c.url.includes("/process-response"),
    );

    expect(processCall).toBeDefined();

    const body = JSON.parse(processCall!.options.body as string);

    // This should match: { "responses": { "RESPONSE": ["A", "B", "C", "D"] } }
    expect(body).toEqual({
      responses: {
        RESPONSE: ["A", "B", "C", "D"],
      },
    });
  });
});

describe("QTI Client payload format for processResponse (single)", () => {
  test("processResponse sends old format for single string value", async () => {
    capturedFetchCalls = [];

    const client = new Client({
      serverUrl: "https://test.example.com/api",
      tokenUrl: "https://test.example.com/token",
      clientId: "test_client",
      clientSecret: "test_secret",
    });

    // Call processResponse (singular) with single value
    await client.processResponse("nice_test_item", {
      responseIdentifier: "RESPONSE",
      value: "A",
    });

    const processCall = capturedFetchCalls.find((c) =>
      c.url.includes("/process-response"),
    );

    expect(processCall).toBeDefined();

    const body = JSON.parse(processCall!.options.body as string);

    // Single response uses old format: { identifier, response }
    expect(body).toHaveProperty("identifier", "RESPONSE");
    expect(body).toHaveProperty("response", "A");
    expect(body).not.toHaveProperty("responses");
  });
});
