import * as React from "react"

const activities = [
	{
		icon: "🎯",
		title: "Intro to multiplication: Quiz 1",
		subject: "Arithmetic",
		date: "Jul 03, 2025 at 1:11 PM",
		level: "–",
		change: "–",
		correct: "–",
		time: "1"
	},
	{
		icon: "▶",
		title: "Multiplication on the number line",
		subject: "Arithmetic",
		date: "Jul 03, 2025 at 1:10 PM",
		level: "–",
		change: "–",
		correct: "–",
		time: "0"
	},
	{
		icon: "✏",
		title: "Understand equal groups as multiplication",
		subject: "Arithmetic",
		date: "Jul 03, 2025 at 1:10 PM",
		level: "–",
		change: "–",
		correct: "–",
		time: "0"
	},
	{
		icon: "▶",
		title: "Introduction to multiplication",
		subject: "Arithmetic",
		date: "Jul 03, 2025 at 1:10 PM",
		level: "–",
		change: "–",
		correct: "–",
		time: "0"
	},
	{
		icon: "▶",
		title: "Multiplication as repeated addition",
		subject: "Arithmetic",
		date: "Jul 03, 2025 at 1:10 PM",
		level: "–",
		change: "–",
		correct: "–",
		time: "1"
	},
	{
		icon: "✏",
		title: "Understand equal groups as multiplication",
		subject: "Arithmetic",
		date: "Jul 03, 2025 at 11:59 AM",
		level: "Attempted",
		change: "⬇",
		correct: "0/7",
		time: "7"
	},
	{
		icon: "✏",
		title: "Understand equal groups as multiplication",
		subject: "Arithmetic",
		date: "Jul 03, 2025 at 11:21 AM",
		level: "–",
		change: "–",
		correct: "–",
		time: "1"
	}
] as const

export default function ProgressPage() {
	return (
		<React.Fragment>
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold text-gray-800">My progress</h1>

				{/* Stats */}
				<div className="flex items-center space-x-6">
					<span className="text-sm">
						<span className="font-bold text-xl">0</span> exercise minutes
					</span>
					<span className="text-sm">
						<span className="font-bold text-xl">0</span> total learning minutes
					</span>
				</div>
			</div>

			{/* Activity Table */}
			<div className="bg-white rounded-lg border border-gray-200">
				{/* Table Header */}
				<div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
					<div className="col-span-4">ACTIVITY</div>
					<div className="col-span-2">DATE</div>
					<div className="col-span-2">LEVEL</div>
					<div className="col-span-1">CHANGE</div>
					<div className="col-span-2">CORRECT/TOTAL PROBLEMS</div>
					<div className="col-span-1">TIME (MIN)</div>
				</div>

				{/* Table Rows */}
				<div className="divide-y divide-gray-200">
					{activities.map((activity, index) => (
						<div
							key={`${activity.title}-${activity.date}-${index}`}
							className="grid grid-cols-12 gap-4 p-4 hover:bg-gray-50"
						>
							<div className="col-span-4 flex items-center space-x-3">
								<span className="text-lg">{activity.icon}</span>
								<div>
									<div className="font-medium text-gray-800">{activity.title}</div>
									<div className="text-sm text-gray-500">{activity.subject}</div>
								</div>
							</div>
							<div className="col-span-2 text-sm text-gray-600">{activity.date}</div>
							<div className="col-span-2 text-sm">
								{activity.level === "Attempted" ? (
									<span className="text-orange-600 font-medium">{activity.level}</span>
								) : (
									<span className="text-gray-400">{activity.level}</span>
								)}
							</div>
							<div className="col-span-1 text-sm">
								{activity.change === "⬇" ? (
									<span className="text-red-500">{activity.change}</span>
								) : (
									<span className="text-gray-400">{activity.change}</span>
								)}
							</div>
							<div className="col-span-2 text-sm text-gray-600">{activity.correct}</div>
							<div className="col-span-1 text-sm text-gray-600">{activity.time}</div>
						</div>
					))}
				</div>
			</div>
		</React.Fragment>
	)
}
