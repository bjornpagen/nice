import { Flame } from "lucide-react"

export function Banner({ streakCount }: { streakCount: number }) {
	return (
		<section className="w-full bg-white border-b border-gray-200 py-2">
			<div className="max-w-5xl mx-auto px-4">
				<div className="flex items-center justify-between">
					{/* Left side - Main heading */}
					<div className="flex items-center">
						<h2 className="text-base font-medium text-gray-800">Start leveling up and building your weekly streak!</h2>
					</div>

					{/* Right side - Stats */}
					<div className="flex items-center space-x-4">
						<div className="flex items-center space-x-2">
							{streakCount > 0 ? (
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="24"
									height="24"
									fill="none"
									viewBox="0 0 24 24"
									className="h-6 w-6"
									aria-label="Streak flame"
								>
									<title>Streak flame</title>
									<path
										stroke="white"
										strokeWidth="2.6"
										d="M13.31 1.19a0.90.90 0 0 0-0.37-.17.94.94 0 0 0-0.41.1.90.90 0 0 0-0.36.19.81.81 0 0 0-.23.32L8.13 7.69 6.88 5.30a0.89.89 0 0 0-.31-0.18.94.94 0 0 0-0.72.5.86.86 0 0 0-0.28.22C3.20 8.29 2 11.19 2 14.04c0 2.38 1.01 4.66 2.82 6.34C6.62 22.05 9.07 23 11.62 23s5-0.94 6.81-2.63c1.80-1.68 2.82-3.96 2.82-6.34 0-6.05-5.55-11-7.94-12.85Z"
									/>
									<path
										fill="#F56B0F"
										d="M13.31 1.19a0.90.90 0 0 0-0.37-.17.94.94 0 0 0-0.41.1.90.90 0 0 0-0.36.19.81.81 0 0 0-.23.32L8.13 7.69 6.88 5.30a0.89.89 0 0 0-.31-0.18.94.94 0 0 0-0.72.5.86.86 0 0 0-0.28.22C3.20 8.29 2 11.19 2 14.04c0 2.38 1.01 4.66 2.82 6.34C6.62 22.05 9.07 23 11.62 23s5-0.94 6.81-2.63c1.80-1.68 2.82-3.96 2.82-6.34 0-6.05-5.55-11-7.94-12.85Z"
									/>
									<path fill="#ffb100" d="M16 16a4 4 0 0 1-8 0c0-2.21 3-6 4-6s4 3.79 4 6Z" />
								</svg>
							) : (
								<Flame className="h-6 w-6 text-gray-500 fill-gray-500" />
							)}
							<div className="text-xs text-gray-600 flex items-center space-x-1">
								<div className="font-bold text-2xl text-gray-800 pr-1">{streakCount}</div>
								<div className="text-[10px] flex flex-col justify-center">
									<span>week</span>
									<span>streak</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
