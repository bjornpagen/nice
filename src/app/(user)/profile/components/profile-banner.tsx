"use client"
import Image from "next/image"
import * as React from "react"
import { EditProfileModal } from "@/components/edit-profile-modal"
import { Button } from "@/components/ui/button"

// const badges = [
// 	{ color: "bg-red-500", count: 0 },
// 	{ color: "bg-yellow-500", count: 0 },
// 	{ color: "bg-green-500", count: 0 },
// 	{ color: "bg-purple-500", count: 0 },
// 	{ color: "bg-gray-500", count: 0 }
// ] as const

export function ProfileBanner({ uid, username, bio }: { uid: string; username: string; bio: string }) {
	const [showEditModal, setShowEditModal] = React.useState(false)

	return (
		<>
			<div className="bg-gray-50 border-b border-gray-200">
				<div className="mx-auto max-w-7xl px-4 py-6">
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-4">
							<div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center overflow-hidden">
								<Image
									src="https://cdn.kastatic.org/images/avatars/svg/blobby-green.svg"
									alt="Profile Picture"
									width={64}
									height={64}
								/>
							</div>
							<div>
								<h2 className="text-2xl font-bold text-gray-900 mb-1">{uid}</h2>
								<div className="flex items-center space-x-2 text-sm">
									<Button
										variant="link"
										className={
											username !== ""
												? "text-black p-0 h-auto hover:text-gray-600"
												: "text-blue-600 hover:underline p-0 h-auto underline"
										}
										onClick={() => setShowEditModal(true)}
									>
										{username !== "" ? `@${username}` : "Pick a username"}
									</Button>
									<span className="text-gray-400">-</span>
									<Button
										variant="link"
										className={
											bio !== ""
												? "text-black p-0 h-auto hover:text-gray-600"
												: "text-blue-600 hover:underline p-0 h-auto underline"
										}
										onClick={() => setShowEditModal(true)}
									>
										{bio === "" ? "Add your bio" : bio}
									</Button>
								</div>
							</div>
						</div>
						<div className="flex flex-col items-end space-y-2">
							<Button
								variant="outline"
								className="font-medium border-gray-300 text-gray-700 hover:text-gray-900 hover:bg-gray-50"
								onClick={() => setShowEditModal(true)}
							>
								Edit Profile
							</Button>
							{/*
					<div className="flex items-center space-x-3">
						<div className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">0</div>
						<div className="flex items-center space-x-1">
							{badges.map((badge, index) => (
								<div key={index} className="flex items-center space-x-0.5">
									<div className={`w-2 h-2 ${badge.color} rounded-full`} />
									<span className="text-xs text-gray-600">{badge.count}</span>
								</div>
							))}
						</div>
					</div>
					*/}
						</div>
					</div>
				</div>
			</div>

			{/* Edit Profile Modal */}
			<EditProfileModal
				open={showEditModal}
				onOpenChange={setShowEditModal}
				initialData={{
					nickname: uid,
					username: username,
					bio: bio
				}}
			/>
		</>
	)
}
