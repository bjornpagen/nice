"use client"

import * as React from "react"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ListCaliperEventsQuerySchema } from "@/lib/caliper"
import { listCaliperEvents } from "@/lib/actions/caliper"

const DEFAULT_SENSOR = "https://www.nice.academy"

export function Content() {
	const [limit, setLimit] = React.useState<string>("100")
	const [offset, setOffset] = React.useState<string>("0")
	const [sensor, setSensor] = React.useState<string>(DEFAULT_SENSOR)
	const [startDate, setStartDate] = React.useState<string>("")
	const [endDate, setEndDate] = React.useState<string>("")
	const [actorId, setActorId] = React.useState<string>("")
	const [actorEmail, setActorEmail] = React.useState<string>("")

	const [loading, setLoading] = React.useState(false)
	const [error, setError] = React.useState<string>("")
	const [output, setOutput] = React.useState<string>("")
	const [copied, setCopied] = React.useState(false)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setLoading(true)
		setError("")
		setOutput("")

		const parsed = ListCaliperEventsQuerySchema.safeParse({
			limit: limit ? Number(limit) : undefined,
			offset: offset ? Number(offset) : undefined,
			sensor: sensor || undefined,
			startDate: startDate || undefined,
			endDate: endDate || undefined,
			actorId: actorId || undefined,
			actorEmail: actorEmail || undefined
		})

		if (!parsed.success) {
			setError(parsed.error.issues.map((i) => i.message).join("; "))
			setLoading(false)
			return
		}

		try {
			const res = await listCaliperEvents(parsed.data)
			setOutput(JSON.stringify(res.data, null, 2))
		} catch (err) {
			setError(err instanceof Error ? err.message : "request failed")
		}
		setLoading(false)
	}

	const handleCopy = () => {
		if (!output) return
		navigator.clipboard.writeText(output).then(() => {
			setCopied(true)
			setTimeout(() => setCopied(false), 1500)
		})
	}

	return (
		<div className="container mx-auto p-6">
			<Card>
				<CardHeader>
					<CardTitle>caliper events debugger</CardTitle>
				</CardHeader>
				<CardContent>
					<form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
						<div>
							<Label htmlFor="limit">limit</Label>
							<Input id="limit" placeholder="100" value={limit} onChange={(e) => setLimit(e.target.value)} />
						</div>
						<div>
							<Label htmlFor="offset">offset</Label>
							<Input id="offset" placeholder="0" value={offset} onChange={(e) => setOffset(e.target.value)} />
						</div>
						<div className="md:col-span-2">
							<Label htmlFor="sensor">sensor</Label>
							<Input id="sensor" placeholder={DEFAULT_SENSOR} value={sensor} onChange={(e) => setSensor(e.target.value)} />
						</div>
						<div>
							<Label htmlFor="startDate">start date (iso)</Label>
							<Input id="startDate" placeholder="2025-01-01T00:00:00.000Z" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
						</div>
						<div>
							<Label htmlFor="endDate">end date (iso)</Label>
							<Input id="endDate" placeholder="2025-12-31T23:59:59.000Z" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
						</div>
						<div>
							<Label htmlFor="actorId">actor id (url)</Label>
							<Input id="actorId" placeholder="https://timeback.alpha/users/123" value={actorId} onChange={(e) => setActorId(e.target.value)} />
						</div>
						<div>
							<Label htmlFor="actorEmail">actor email</Label>
							<Input id="actorEmail" placeholder="student@example.com" value={actorEmail} onChange={(e) => setActorEmail(e.target.value)} />
						</div>
						<div className="md:col-span-2 flex items-center gap-3">
							<Button type="submit" disabled={loading}>{loading ? "loading…" : "fetch events"}</Button>
							{error && <span className="text-red-600 text-sm">{error}</span>}
						</div>
						<div className="md:col-span-2">
							<Label htmlFor="output">response</Label>
							<div className="relative">
								<div className="absolute right-2 top-2 z-10 flex gap-2">
									<Button type="button" size="sm" onClick={handleCopy} disabled={!output}>
										{copied ? "copied" : "copy"}
									</Button>
								</div>
								<ScrollArea className="h-[480px] w-full rounded border bg-white">
									<pre id="output" className="p-3 m-0 font-mono text-xs whitespace-pre-wrap break-words">
										{output || "response json will appear here"}
									</pre>
								</ScrollArea>
							</div>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	)
}


