import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export type Activity = {
	icon: string
	title: string
	subject: string
	date: string
	level: string
	change: string
	problems: string
	time: string
}

export type ProgressTableProps = {
	activities: Activity[]
}

export function ProgressTable({ activities }: ProgressTableProps) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead className="w-[100px]">ACTIVITY</TableHead>
					<TableHead>DATE</TableHead>
					<TableHead>LEVEL</TableHead>
					<TableHead className="text-right">CHANGE</TableHead>
					<TableHead className="text-right">CORRECT/TOTAL PROBLEMS</TableHead>
					<TableHead className="text-right">TIME (MIN)</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{activities.map((activity) => (
					<TableRow key={activity.title}>
						<TableCell className="font-medium">{activity.title}</TableCell>
						<TableCell>{activity.date}</TableCell>
						<TableCell>{activity.level}</TableCell>
						<TableCell className="text-right">{activity.change}</TableCell>
						<TableCell className="text-right">{activity.problems}</TableCell>
						<TableCell className="text-right">{activity.time}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	)
}
