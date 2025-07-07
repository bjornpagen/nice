"use client"

import type * as React from "react"
import { DialogManagerProvider } from "./dialog-manager-provider"

export function AppProvider({ children }: { children: React.ReactNode }) {
	return <DialogManagerProvider>{children}</DialogManagerProvider>
}
