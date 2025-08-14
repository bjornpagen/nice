import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export const metadata = {
	title: "Attributions | Nice Academy"
}

export default function AttributionsPage() {
	return (
		<main className="max-w-4xl mx-auto px-4 py-8">
			<Card>
				<CardHeader>
					<CardTitle>Attributions</CardTitle>
					<CardDescription>
						This site includes content from Khan Academy licensed under{" "}
						<a
							href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
							target="_blank"
							rel="noopener noreferrer"
							className="text-blue-600 hover:underline"
						>
							Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)
						</a>
						.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<p className="text-sm text-gray-600">
						Unless otherwise noted, adaptations are available under the same license (ShareAlike). This site is not
						affiliated with or endorsed by Khan Academy.
					</p>

					<Separator />

					<section className="space-y-4">
						<div>
							<h2 className="text-lg font-semibold">Items</h2>
							<p className="text-sm text-gray-500 mt-1">
								Below are representative entries. Maintain an internal inventory to keep this list accurate.
							</p>
						</div>

						<ul className="list-disc pl-5 space-y-2 text-sm">
							<li>
								<span className="font-medium">[Title]</span> — Khan Academy. Source:{" "}
								<a
									href="https://www.khanacademy.org/"
									target="_blank"
									rel="noopener noreferrer"
									className="text-blue-600 hover:underline"
								>
									original URL
								</a>
								. License:{" "}
								<a
									href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
									target="_blank"
									rel="noopener noreferrer"
									className="text-blue-600 hover:underline"
								>
									CC BY-NC-SA 4.0
								</a>
								. Changes: adapted for layout.
							</li>
						</ul>
					</section>
				</CardContent>
			</Card>
		</main>
	)
}
