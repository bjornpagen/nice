"use client"

import * as React from "react"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Base64Tools } from "./base64-tools"
import { QTIFetcher } from "./qti-fetcher"

export default function QTITestPage() {
  const base64ToolsRef = React.useRef<{ updateFromBase64: (value: string, questionTitle?: string) => void }>(null)
  const [qtiUrl, setQtiUrl] = React.useState("https://qti.alpha-1edtech.com/api/assessment-tests/nice_xeea483e9835f1f34/questions")

  const handleBase64Click = (base64Data: string, questionTitle: string) => {
    base64ToolsRef.current?.updateFromBase64(base64Data, questionTitle)
  }

  return (
    <div className="h-screen w-full flex flex-col">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex gap-4 items-center">
          <label className="text-sm font-medium whitespace-nowrap">QTI API URL:</label>
          <input
            type="text"
            value={qtiUrl}
            onChange={(e) => setQtiUrl(e.target.value)}
            className="flex-1 px-3 py-1 border rounded text-sm"
            placeholder="Enter QTI assessment-tests API URL..."
          />
        </div>
      </div>
      <ResizablePanelGroup direction="vertical" className="flex-1">
        <ResizablePanel defaultSize={60}>
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={50}>
              <iframe
                src="https://www.amp-up.io/testrunner/sandbox/"
                className="h-full w-full border-0"
                title="QTI Test Runner"
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50}>
              <Base64Tools ref={base64ToolsRef} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={40}>
          <QTIFetcher qtiUrl={qtiUrl} onBase64Click={handleBase64Click} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
