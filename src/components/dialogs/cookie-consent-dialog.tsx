"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface CookieConsentDialogProps {
	show: boolean
	onComplete: () => void
}

export function CookieConsentDialog({ show, onComplete }: CookieConsentDialogProps) {
	return (
		<Dialog open={show} onOpenChange={(isOpen) => !isOpen && onComplete()}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="text-lg font-semibold">Use of cookies</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<p className="text-sm text-gray-600 leading-relaxed">
						Cookies are small files placed on your device that collect information when you use Nice Academy. Strictly
						necessary cookies are used to make our site work and are required. Other types of cookies are used to
						improve your experience, to analyze how Nice Academy is used, and to market our service.
					</p>
					<div className="flex flex-col space-y-2">
						<Button onClick={onComplete} className="bg-blue-600 hover:bg-blue-700 font-medium">
							Accept All Cookies
						</Button>
						<Button variant="outline" onClick={onComplete} className="font-medium">
							Strictly Necessary Only
						</Button>
						<Button variant="ghost" onClick={onComplete} className="font-medium">
							Cookies Settings
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
