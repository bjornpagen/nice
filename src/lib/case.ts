import * as errors from "@superbuilders/errors";
import * as logger from "@superbuilders/slog";
import { z } from "zod";

// --- Constants ---
const PAGINATION_LIMIT = 3000; // Max limit per OneRoster spec

// --- Zod Schemas for API Payloads ---
const TokenResponseSchema = z.object({
  access_token: z.string().min(1),
});

// --- API CLIENT CONFIG TYPE ---
type ApiClientConfig = {
  serverUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
};

// --- Query Options Type for Collection Methods ---
type QueryOptions = {
  filter?: string;
  sort?: string;
  orderBy?: "asc" | "desc";
  fields?: string;
};

// --- Paginated Response Type ---
type PaginatedFetchOptions<T> = QueryOptions & {
  endpoint: string;
  responseKey: keyof T;
  schema: z.ZodType<T>;
};

// --- Strict Schemas for CASE Entities ---
const URIReferenceSchema = z.object({
  sourcedId: z.string().uuid(),
  title: z.string(),
  uri: z.string().url(),
});

const CFAssociationSchema = z.object({
  sourcedId: z.string().uuid(),
  associationType: z.string(),
  sequenceNumber: z.number().nullable(),
  uri: z.string().url(),
  originNodeURI: URIReferenceSchema,
  destinationNodeURI: URIReferenceSchema,
  CFAssociationGroupingURI: URIReferenceSchema.nullable(),
  lastChangeDateTime: z.string().datetime(),
  notes: z.string().nullable(),
  extensions: z.record(z.string(), z.unknown()).nullable(),
  CFDocumentURI: URIReferenceSchema.nullable(),
});

const CFDocumentSchema = z.object({
  sourcedId: z.string().uuid(),
  title: z.string(),
  uri: z.string().url(),
  frameworkType: z.string().nullable(),
  caseVersion: z.enum(["1.1"]).nullable(),
  creator: z.string(),
  lastChangeDateTime: z.string().datetime(),
  officialSourceURL: z.string().url().nullable(),
  publisher: z.string().nullable(),
  description: z.string().nullable(),
  subject: z.array(z.string()).nullable(),
  subjectURI: z.array(URIReferenceSchema).nullable(),
  language: z.string().nullable(),
  version: z.string().nullable(),
  adoptionStatus: z.string().nullable(),
  statusStartDate: z.string().nullable(),
  statusEndDate: z.string().nullable(),
  licenseURI: URIReferenceSchema.nullable(),
  notes: z.string().nullable(),
  extensions: z.record(z.string(), z.unknown()).nullable(),
  CFPackageURI: URIReferenceSchema,
});

const CFItemSchema = z.object({
  sourcedId: z.string().uuid().optional(),
  fullStatement: z.string().optional(),
  alternativeLabel: z.string().nullable().optional(),
  CFItemType: z.string().optional(),
  uri: z.string().url().optional(),
  humanCodingScheme: z.string().nullable().optional(),
  listEnumeration: z.string().nullable().optional(),
  abbreviatedStatement: z.string().nullable().optional(),
  conceptKeywords: z.array(z.string()).nullable().optional(),
  conceptKeywordsURI: URIReferenceSchema.nullable().optional(),
  notes: z.string().nullable().optional(),
  subject: z.array(z.string()).nullable().optional(),
  subjectURI: z.array(URIReferenceSchema).nullable().optional(),
  language: z.string().nullable().optional(),
  educationLevel: z.array(z.string()).nullable().optional(),
  CFItemTypeURI: URIReferenceSchema.nullable().optional(),
  licenseURI: URIReferenceSchema.nullable().optional(),
  statusStartDate: z.string().nullable().optional(),
  statusEndDate: z.string().nullable().optional(),
  lastChangeDateTime: z.string().datetime().optional(),
  extensions: z.record(z.string(), z.unknown()).nullable().optional(),
  CFDocumentURI: URIReferenceSchema.nullable().optional(),
}).passthrough();

const CFPackageSchema = z.object({
  sourcedId: z.string().uuid(),
  CFDocument: CFDocumentSchema,
  CFItems: z.array(CFItemSchema).optional(),
  CFAssociations: z.array(CFAssociationSchema).optional(),
});

const CFPackageWithGroupsSchema = z.object({
  sourcedId: z.string().uuid(),
  CFDocument: CFDocumentSchema,
  structuredContent: z.record(z.string(), z.array(CFItemSchema.extend({
    childGroups: z.record(z.string(), z.array(z.unknown())).optional(),
  }))),
});

// --- Schemas for API responses ---
const GetCFAssociationResponseSchema = z.object({ CFAssociation: CFAssociationSchema });
const GetAllCFDocumentsResponseSchema = z.object({ CFDocuments: z.array(CFDocumentSchema) });
const GetCFDocumentResponseSchema = z.object({ CFDocument: CFDocumentSchema });
const GetAllCFItemsResponseSchema = z.object({ CFItems: z.array(CFItemSchema) });
const GetCFItemResponseSchema = z.object({ CFItem: CFItemSchema });
const GetCFPackageResponseSchema = z.object({ CFPackage: CFPackageSchema });
const GetCFPackageWithGroupsResponseSchema = z.object({ CFPackageWithGroups: CFPackageWithGroupsSchema });

// --- Custom Error for API Failures ---
export const ErrCaseAPI = errors.new("case api error");
export const ErrCaseNotFound = errors.new("case resource not found");
export const ErrJWTExpired = errors.new("jwt expired");

export class Client {
  #accessToken: string | null = null;
  #tokenPromise: Promise<string> | null = null;
  #config: ApiClientConfig;

  constructor(config: ApiClientConfig) {
    this.#config = config;
    logger.debug("case: initializing client");
  }

  async #ensureAccessToken(): Promise<void> {
    if (this.#accessToken) return;

    if (this.#tokenPromise) {
      this.#accessToken = await this.#tokenPromise;
      return;
    }

    this.#tokenPromise = this.#getAccessToken();
    try {
      this.#accessToken = await this.#tokenPromise;
    } finally {
      this.#tokenPromise = null;
    }
  }

  async #getAccessToken(): Promise<string> {
    logger.debug("case: fetching new access token");
    const params = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.#config.clientId,
      client_secret: this.#config.clientSecret,
    });

    const result = await errors.try(
      fetch(this.#config.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      })
    );

    if (result.error) {
      logger.error("case auth: token fetch failed", { error: result.error });
      throw errors.wrap(result.error, "case token fetch");
    }

    if (!result.data.ok) {
      const errorBody = await result.data.text();
      logger.error("case auth: token request rejected", { status: result.data.status, body: errorBody });
      throw errors.new(`case token request failed with status ${result.data.status}`);
    }

    const jsonResult = await errors.try(result.data.json());
    if (jsonResult.error) {
      logger.error("case auth: failed to parse token response", { error: jsonResult.error });
      throw errors.wrap(jsonResult.error, "case token response parsing");
    }

    const validation = TokenResponseSchema.safeParse(jsonResult.data);
    if (!validation.success) {
      logger.error("case auth: invalid token response schema", { error: validation.error });
      throw errors.wrap(validation.error, "case token response validation");
    }

    logger.info("case: access token acquired");
    return validation.data.access_token;
  }

  async #request<T>(
    endpoint: string,
    options: RequestInit,
    schema: z.ZodType<T>,
    requestOptions?: { swallow404?: boolean }
  ): Promise<T | null> {
    await this.#ensureAccessToken();
    const url = `${this.#config.serverUrl}${endpoint}`;
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${this.#accessToken}`,
    };

    const fetchResult = await errors.try(fetch(url, { ...options, headers }));
    if (fetchResult.error) {
      logger.error("case api request failed", { error: fetchResult.error, endpoint });
      throw errors.wrap(fetchResult.error, "case api request");
    }

    const response = fetchResult.data;

    if (!response.ok) {
        if (response.status === 404 && requestOptions?.swallow404) {
            logger.debug("Swallowing 404 for idempotent check", { endpoint });
            return null;
        }

        const text = await response.text();
        const requestBodySample = typeof options.body === "string" ? options.body.substring(0, 500) : undefined;
        logger.error("CASE API returned a non-OK status", {
            status: response.status,
            body: text,
            endpoint,
            method: options.method,
            requestBody: requestBodySample,
        });

        if (response.status === 401) {
            logger.info("CASE auth: JWT expired, attempting to refresh token", { endpoint });
            this.#accessToken = null;
            await this.#ensureAccessToken();
            // Retry the request once with the new token
            return this.#request(endpoint, options, schema, requestOptions);
        }

        if (response.status >= 500 && response.status < 600) {
            logger.warn("CASE API: Server error detected, attempting single retry", {
                status: response.status,
                endpoint,
                method: options.method,
            });
            await new Promise(resolve => setTimeout(resolve, 500));
            // Retry the request once
            return this.#request(endpoint, options, schema, requestOptions);
        }

        if (response.status === 404) {
            throw errors.wrap(ErrCaseNotFound, `CASE API error: status 404 on ${endpoint}`);
        }

        throw errors.wrap(ErrCaseAPI, `status ${response.status} on ${endpoint}: ${text}`);
    }

    if (response.status === 204) {
        return schema.parse(null);
    }

    const text = await response.text();
    if (!text || text.trim() === "") {
        return schema.parse(null);
    }

    const jsonResult = errors.trySync(() => JSON.parse(text));
    if (jsonResult.error) {
        logger.error("CASE API: failed to parse JSON response", {
            error: jsonResult.error,
            endpoint,
            responseText: text,
        });
        throw errors.wrap(jsonResult.error, `CASE API response parsing for ${endpoint}`);
    }

    const validation = schema.safeParse(jsonResult.data);
    if (!validation.success) {
        logger.error("CASE API: invalid response schema", { error: validation.error, endpoint });
        throw errors.wrap(validation.error, `CASE API response validation for ${endpoint}`);
    }

    return validation.data;
}

  async #fetchPaginatedCollection<T extends Record<string, unknown>, R>(
    options: PaginatedFetchOptions<T>
  ): Promise<R[]> {
    const { endpoint, responseKey, schema, filter, sort, orderBy, fields } = options;
    const allResults: R[] = [];
    let offset = 0;
    const limit = PAGINATION_LIMIT;

    while (true) {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (filter) params.append("filter", filter);
      if (sort) params.append("sort", sort);
      if (orderBy) params.append("orderBy", orderBy);
      if (fields) params.append("fields", fields);

      const url = `${endpoint}?${params.toString()}`;

      const response = await this.#request(url, { method: "GET" }, schema);

      if (!response || !response[responseKey]) {
        break;
      }

      const items = response[responseKey] as R[];
      if (!Array.isArray(items) || items.length === 0) {
        break;
      }

      allResults.push(...items);
      offset += items.length;

      if (items.length < limit) {
        break;
      }
    }

    return allResults;
  }

  async getCFAssociation(sourcedId: string, options?: QueryOptions) {
    const params = new URLSearchParams();
    if (options?.fields) params.append("fields", options.fields);
    const endpoint = `/ims/case/v1p1/CFAssociations/${sourcedId}?${params.toString()}`;
    const result = await this.#request(endpoint, { method: "GET" }, GetCFAssociationResponseSchema, { swallow404: true });
    return result?.CFAssociation;
  }

  async getAllCFDocuments(options?: QueryOptions) {
    logger.info("case: fetching all CFDocuments", options);
    const documents = await this.#fetchPaginatedCollection<z.infer<typeof GetAllCFDocumentsResponseSchema>, z.infer<typeof CFDocumentSchema>>({
        endpoint: "/ims/case/v1p1/CFDocuments",
        responseKey: "CFDocuments",
        schema: GetAllCFDocumentsResponseSchema,
        ...options,
    });
    logger.info("case: successfully fetched all CFDocuments", { count: documents.length, ...options });
    return documents;
  }

  async getCFDocument(sourcedId: string, options?: QueryOptions) {
    const params = new URLSearchParams();
    if (options?.fields) params.append("fields", options.fields);
    const endpoint = `/ims/case/v1p1/CFDocuments/${sourcedId}?${params.toString()}`;
    const result = await this.#request(endpoint, { method: "GET" }, GetCFDocumentResponseSchema, { swallow404: true });
    return result?.CFDocument;
  }

  async getAllCFItems(options?: QueryOptions) {
    logger.info("case: fetching all CFItems", options);
    const items = await this.#fetchPaginatedCollection<z.infer<typeof GetAllCFItemsResponseSchema>, z.infer<typeof CFItemSchema>>({
        endpoint: "/ims/case/v1p1/CFItems",
        responseKey: "CFItems",
        schema: GetAllCFItemsResponseSchema,
        ...options,
    });
    logger.info("case: successfully fetched all CFItems", { count: items.length, ...options });
    return items;
  }

  async getCFItem(sourcedId: string, options?: QueryOptions) {
    const params = new URLSearchParams();
    if (options?.fields) params.append("fields", options.fields);
    const endpoint = `/ims/case/v1p1/CFItems/${sourcedId}?${params.toString()}`;
    const result = await this.#request(endpoint, { method: "GET" }, GetCFItemResponseSchema, { swallow404: true });
    return result?.CFItem;
  }

  async getCFPackage(sourcedId: string, options?: QueryOptions) {
    const params = new URLSearchParams();
    if (options?.fields) params.append("fields", options.fields);
    const endpoint = `/ims/case/v1p1/CFPackages/${sourcedId}?${params.toString()}`;
    const result = await this.#request(endpoint, { method: "GET" }, GetCFPackageResponseSchema, { swallow404: true });
    return result?.CFPackage;
  }

  async getCFPackageWithGroups(sourcedId: string, options?: QueryOptions) {
    const params = new URLSearchParams();
    if (options?.fields) params.append("fields", options.fields);
    const endpoint = `/ims/case/v1p1/CFPackages/${sourcedId}/groups?${params.toString()}`;
    const result = await this.#request(endpoint, { method: "GET" }, GetCFPackageWithGroupsResponseSchema, { swallow404: true });
    return result?.CFPackageWithGroups;
  }
}
