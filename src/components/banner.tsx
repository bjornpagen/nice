import { Flame } from "lucide-react"

export function Banner() {
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
							<Flame className="h-6 w-6 text-gray-500 fill-gray-500" />
							<div className="text-xs text-gray-600 flex items-center space-x-1">
								<div className="font-bold text-2xl text-gray-800 pr-1">0</div>
								<div className="text-[10px] flex flex-col justify-center">
									<span>week</span>
									<span>streak</span>
								</div>
							</div>
						</div>
						<div className="w-px h-5 bg-gray-300" />
						<div className="text-xs">
							<span className="font-medium text-gray-800">Level 1</span>
							<div className="flex items-center space-x-2 mt-1">
								<div className="w-12 h-1.5 bg-gray-200 rounded-full relative">
									<div className="w-0 h-1.5 bg-blue-500 rounded-full" />
									<div className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-purple-500 rounded-full" />
								</div>
								<span className="text-xs font-medium text-gray-800 font-bold">0</span>
								<span className="text-[10px] font-medium text-gray-500">/ 1 skill</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
