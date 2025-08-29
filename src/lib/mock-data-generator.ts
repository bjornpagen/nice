import {
  ZodSchema,
  ZodObject,
  ZodString,
  ZodNumber,
  ZodBoolean,
  ZodArray,
  ZodOptional,
  ZodNullable,
  ZodLiteral,
  ZodEnum,
  ZodUnion,
  ZodIntersection,
  ZodTuple,
  ZodRecord,
  ZodMap,
  ZodSet,
  ZodFunction,
  ZodLazy,
  ZodPromise,
  ZodEffects,
  ZodDefault,
  ZodCatch,
  ZodBranded,
  ZodPipeline,
  ZodReadonly,
  ZodDate,
  ZodBigInt,
  ZodSymbol,
  ZodUndefined,
  ZodNull,
  ZodVoid,
  ZodNever,
  ZodAny,
  ZodUnknown,
  type ZodTypeAny,
  type ZodStringCheck,
} from "zod";
import { faker } from "@faker-js/faker";

type GeneratorOptions = {
  array?: {
    min?: number;
    max?: number;
  };
  optional?: {
    probability?: number;
  };
  numeric?: {
    min?: number;
    max?: number;
    precision?: number;
  };
  string?: {
    minLength?: number;
    maxLength?: number;
  };
};

const handleStringCheck = (check: ZodStringCheck): string => {
  switch (check.kind) {
    case "date":
      return faker.date.recent().toISOString();
    case "url":
      return faker.internet.url();
    case "email":
      return faker.internet.email();
    case "uuid":
    case "cuid":
    case "nanoid":
    case "cuid2":
    case "ulid":
      return crypto.randomUUID();
    case "emoji":
      return faker.internet.emoji();
    case "regex":
      // Handle specific regex patterns
      const regex = check.regex;
      const regexSource = regex.source;
      
      // Check for CSS hex color pattern: ^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$
      if (regexSource.includes('#') && regexSource.includes('[0-9a-fA-F]')) {
        // Generate valid CSS hex colors
        return faker.color.rgb({ format: 'hex' });
      }
      
      // Check for other color patterns
      if (regexSource.includes('rgb') || regexSource.includes('rgba')) {
        // Generate valid RGB/RGBA colors
        return faker.color.rgb({ format: 'css' });
      }
      
      // For other regex patterns, generate a simple word
      return faker.lorem.word();
    case "includes":
      return faker.lorem.word() + check.value + faker.lorem.word();
    case "startsWith":
      return check.value + faker.lorem.word();
    case "endsWith":
      return faker.lorem.word() + check.value;
    case "datetime":
      return faker.date.recent().toISOString();
    case "ip":
      return faker.internet.ip();
    case "base64":
      return btoa(faker.lorem.word());
    default:
      return faker.lorem.word();
  }
};

const getArrayLength = (options?: GeneratorOptions): number => {
  return faker.number.int({
    min: options?.array?.min || 1,
    max: options?.array?.max || 10,
  });
};

const getNumericValue = (schema: ZodNumber, options?: GeneratorOptions): number => {
  const def = schema._def;
  let min = options?.numeric?.min ?? 1;
  let max = options?.numeric?.max ?? 1000;
  let precision = options?.numeric?.precision ?? 1;

  // Check for min/max constraints in the schema
  for (const check of def.checks || []) {
    switch (check.kind) {
      case "min":
        min = Math.max(min, check.value);
        break;
      case "max":
        max = Math.min(max, check.value);
        break;
      case "int":
        precision = 0;
        break;
      case "finite":
        // Ensure finite numbers
        min = Math.max(min, -Number.MAX_SAFE_INTEGER);
        max = Math.min(max, Number.MAX_SAFE_INTEGER);
        break;
    }
  }

  // Ensure min <= max
  if (min > max) {
    min = max;
  }

  if (precision === 0) {
    return faker.number.int({ min, max });
  } else {
    return faker.number.float({ min, max, fractionDigits: precision });
  }
};

const getStringValue = (schema: ZodString, options?: GeneratorOptions): string => {
  const def = schema._def;
  let minLength = options?.string?.minLength ?? 1;
  let maxLength = options?.string?.maxLength ?? 50;

  // Check for length constraints in the schema
  for (const check of def.checks || []) {
    switch (check.kind) {
      case "min":
        minLength = Math.max(minLength, check.value);
        break;
      case "max":
        maxLength = Math.min(maxLength, check.value);
        break;
    }
  }

  // Check for specific string types
  const specificCheck = def.checks?.find((check) => 
    ["email", "url", "uuid", "date", "datetime", "ip", "emoji", "regex"].includes(check.kind)
  );

  if (specificCheck) {
    return handleStringCheck(specificCheck);
  }

  // Generate a string of appropriate length
  const length = faker.number.int({ min: minLength, max: maxLength });
  return faker.lorem.words(Math.ceil(length / 5)).slice(0, length);
};

export function generateMockDataFromSchema<T>(
  schema: ZodSchema<T>,
  options?: GeneratorOptions
): T {
  // Handle primitive types
  if (schema instanceof ZodString) {
    return getStringValue(schema, options) as T;
  }

  if (schema instanceof ZodNumber) {
    return getNumericValue(schema, options) as T;
  }

  if (schema instanceof ZodBoolean) {
    return faker.datatype.boolean() as T;
  }

  if (schema instanceof ZodDate) {
    return faker.date.recent() as T;
  }

  if (schema instanceof ZodBigInt) {
    return BigInt(faker.number.int({ min: 1, max: 1000 })) as T;
  }

  if (schema instanceof ZodSymbol) {
    return Symbol(faker.lorem.word()) as T;
  }

  if (schema instanceof ZodUndefined) {
    return undefined as T;
  }

  if (schema instanceof ZodNull) {
    return null as T;
  }

  if (schema instanceof ZodVoid) {
    return undefined as T;
  }

  if (schema instanceof ZodNever) {
    throw new Error("Cannot generate mock data for ZodNever");
  }

  if (schema instanceof ZodAny) {
    return faker.lorem.word() as T;
  }

  if (schema instanceof ZodUnknown) {
    return faker.lorem.word() as T;
  }

  // Handle complex types
  if (schema instanceof ZodArray) {
    const arraySchema = schema.element;
    const length = getArrayLength(options);
    return Array.from({ length }).map(() =>
      generateMockDataFromSchema(arraySchema, options)
    ) as T;
  }

  if (schema instanceof ZodOptional) {
    const probability = options?.optional?.probability || 0.8;
    return (
      Math.random() > probability
        ? generateMockDataFromSchema(schema.unwrap(), options)
        : undefined
    ) as T;
  }

  if (schema instanceof ZodNullable) {
    const probability = options?.optional?.probability || 0.8;
    return (
      Math.random() > probability
        ? generateMockDataFromSchema(schema.unwrap(), options)
        : null
    ) as T;
  }

  if (schema instanceof ZodDefault) {
    return generateMockDataFromSchema(schema.removeDefault(), options) as T;
  }

  if (schema instanceof ZodLiteral) {
    return schema.value as T;
  }

  if (schema instanceof ZodEnum) {
    const values = schema.options;
    return faker.helpers.arrayElement(values) as T;
  }

  if (schema instanceof ZodUnion) {
    const unionOptions = schema.options;
    const selectedOption = faker.helpers.arrayElement(unionOptions);
    return generateMockDataFromSchema(selectedOption as ZodSchema<any>, options) as T;
  }

  if (schema instanceof ZodIntersection) {
    const left = generateMockDataFromSchema(schema._def.left, options);
    const right = generateMockDataFromSchema(schema._def.right, options);
    if (typeof left === 'object' && left !== null && typeof right === 'object' && right !== null) {
      return { ...left, ...right } as T;
    }
    return left as T;
  }

  if (schema instanceof ZodTuple) {
    const items = schema.items;
    return items.map((item: any) => generateMockDataFromSchema(item, options)) as T;
  }

  if (schema instanceof ZodRecord) {
    const keySchema = schema.keySchema;
    const valueSchema = schema.valueSchema;
    const length = faker.number.int({ min: 1, max: 5 });
    const result: Record<string, any> = {};
    
    for (let i = 0; i < length; i++) {
      const key = generateMockDataFromSchema(keySchema, options);
      const value = generateMockDataFromSchema(valueSchema, options);
      result[String(key)] = value;
    }
    
    return result as T;
  }

  if (schema instanceof ZodMap) {
    const keySchema = schema.keySchema;
    const valueSchema = schema.valueSchema;
    const length = faker.number.int({ min: 1, max: 5 });
    const map = new Map();
    
    for (let i = 0; i < length; i++) {
      const key = generateMockDataFromSchema(keySchema, options);
      const value = generateMockDataFromSchema(valueSchema, options);
      map.set(key, value);
    }
    
    return map as T;
  }

  if (schema instanceof ZodSet) {
    const valueSchema = schema._def.valueType;
    const length = faker.number.int({ min: 1, max: 5 });
    const set = new Set();
    
    for (let i = 0; i < length; i++) {
      const value = generateMockDataFromSchema(valueSchema, options);
      set.add(value);
    }
    
    return set as T;
  }

  if (schema instanceof ZodFunction) {
    return (() => {}) as T;
  }

  if (schema instanceof ZodLazy) {
    return generateMockDataFromSchema(schema._def.getter(), options) as T;
  }

  if (schema instanceof ZodPromise) {
    return Promise.resolve(generateMockDataFromSchema(schema._def.type, options)) as T;
  }

  if (schema instanceof ZodEffects) {
    return generateMockDataFromSchema(schema._def.schema, options) as T;
  }

  if (schema instanceof ZodCatch) {
    return generateMockDataFromSchema(schema._def.innerType, options) as T;
  }

  if (schema instanceof ZodBranded) {
    return generateMockDataFromSchema(schema._def.type, options) as T;
  }

  if (schema instanceof ZodPipeline) {
    return generateMockDataFromSchema(schema._def.in, options) as T;
  }

  if (schema instanceof ZodReadonly) {
    return generateMockDataFromSchema(schema._def.innerType, options) as T;
  }

  if (schema instanceof ZodObject) {
    const shape = schema.shape;
    const result: any = {};
    
    for (const key in shape) {
      result[key] = generateMockDataFromSchema(shape[key] as ZodTypeAny, options);
    }
    
    return result as T;
  }

  throw new Error(`Unsupported schema type: ${schema.constructor.name}`, {
    cause: schema,
  });
}

// Helper function to generate mock data with reasonable bounds for widget testing
export function generateWidgetMockData<T>(
  schema: ZodSchema<T>,
  options?: GeneratorOptions
): T {
  const defaultOptions: GeneratorOptions = {
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 },
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    ...options,
  };

  return generateMockDataFromSchema(schema, defaultOptions);
}
