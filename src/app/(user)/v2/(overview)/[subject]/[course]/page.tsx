export default function CoursePage() {
	return (
		<div id="course-page" className="p-4">
			<h1 className="text-3xl font-bold mb-8">CoursePage</h1>
			{Array.from({ length: 50 }).map((_, i) => (
				<section key={i} className="mb-12">
					<h2 className="text-2xl font-semibold mb-2">unit {i + 1}</h2>
					<p className="mb-4 text-gray-700">
						{
							"lorem ipsum dolor sit amet, consectetur adipiscing elit. sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
						}
					</p>
					<ul className="list-disc pl-8 space-y-1">
						{Array.from({ length: 10 }).map((_, j) => (
							<li key={j}>
								lesson {i + 1}.{j + 1} — more lorem, more ipsum, more dolor, more sit, more amet
							</li>
						))}
					</ul>
				</section>
			))}
			<div className="h-32" />
			<p className="text-center text-gray-400 mt-12">wow, you really scrolled all the way down huh</p>
		</div>
	)
}
