"use client"

import * as errors from "@superbuilders/errors"
import { useRouter } from "next/navigation"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { updateUserProfile } from "@/lib/actions/profile"

interface EditProfileModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	initialData: {
		nickname: string
		username: string
		bio: string
	}
}

export function EditProfileModal({ open, onOpenChange, initialData }: EditProfileModalProps) {
	const [formData, setFormData] = React.useState(initialData)
	const [isSubmitting, setIsSubmitting] = React.useState(false)
	const router = useRouter()

	// Reset form data when modal opens/closes or initial data changes
	React.useEffect(() => {
		if (open) {
			setFormData(initialData)
		}
	}, [open, initialData])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsSubmitting(true)

		const result = await errors.try(
			updateUserProfile({
				nickname: formData.nickname,
				username: formData.username,
				bio: formData.bio
			})
		)

		setIsSubmitting(false)

		if (result.error) {
			// TODO: Show error toast notification
			return
		}

		// Close modal and refresh the page to show updated data
		onOpenChange(false)
		router.refresh()
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Edit Profile</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="nickname">NICKNAME</Label>
						<Input
							id="nickname"
							value={formData.nickname}
							onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
							placeholder="Sal Nice"
							maxLength={100}
						/>
						<p className="text-sm text-gray-500">
							This is how your name will appear around Nice Academy, and how your friends and coaches will recognize
							you.
						</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="username">USERNAME</Label>
						<Input
							id="username"
							value={formData.username}
							onChange={(e) => setFormData({ ...formData, username: e.target.value })}
							placeholder="salkhan"
							maxLength={50}
						/>
						<p className="text-sm text-gray-500">
							Your username will appear in your Nice Academy address.
							<br />
							http://www.nice.academy/profile/{formData.username}
						</p>
						<div className="flex items-center space-x-1 text-sm text-gray-500">
							<span>Anyone can see your username, avatar, and bio.</span>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="bio">Bio</Label>
						<Textarea
							id="bio"
							value={formData.bio}
							onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
							placeholder="Tell us about yourself..."
							rows={4}
							maxLength={500}
						/>
						<p className="text-sm text-gray-500">{formData.bio.length}/500 characters</p>
					</div>

					<div className="flex justify-end space-x-2 pt-4">
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
							{isSubmitting ? "Saving..." : "Save"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	)
}
