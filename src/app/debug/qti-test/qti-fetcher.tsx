"use client"

import * as React from "react"
import Editor from "@monaco-editor/react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Question {
  reference: {
    identifier: string
    href: string
    testPart: string
    section: string
  }
  question: {
    identifier: string
    title: string
    type: string
    rawXml: string
    metadata?: Record<string, any>
  }
}

interface QTIResponse {
  assessmentTest: string
  title: string
  totalQuestions: number
  questions: Question[]
}

interface QTIFetcherProps {
  qtiUrl: string
  onBase64Click?: (base64Data: string, questionTitle: string) => void
}

export function QTIFetcher({ qtiUrl, onBase64Click }: QTIFetcherProps) {
  const [data, setData] = React.useState<QTIResponse | undefined>(undefined)
  const [selectedQuestion, setSelectedQuestion] = React.useState<Question | undefined>(undefined)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string>("")
  const [xmlContent, setXmlContent] = React.useState<string>("")
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [checkedQuestions, setCheckedQuestions] = React.useState<Set<string>>(new Set())

  const fetchQTI = async () => {
    if (!qtiUrl.trim()) {
      setError("Please enter a QTI API URL")
      return
    }

    setLoading(true)
    setError("")
    try {
      const response = await fetch(qtiUrl)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const result = await response.json()
      setData(result)
      if (result.questions?.length > 0) {
        setSelectedQuestion(result.questions[0])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to fetch QTI data")
    }
    setLoading(false)
  }

  const hasBase64SVG = (rawXml: string) => {
    return rawXml.includes("data:image/svg+xml;base64,")
  }

  const toggleQuestionChecked = (questionId: string) => {
    setCheckedQuestions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(questionId)) {
        newSet.delete(questionId)
      } else {
        newSet.add(questionId)
      }
      return newSet
    })
  }

  // Update XML content when selected question changes
  React.useEffect(() => {
    if (selectedQuestion) {
      setXmlContent(selectedQuestion.question.rawXml)
      setHasUnsavedChanges(false)
    }
  }, [selectedQuestion])

  const handleXmlChange = (value: string | undefined) => {
    if (value !== undefined) {
      setXmlContent(value)
      setHasUnsavedChanges(value !== selectedQuestion?.question.rawXml)
    }
  }

  const handleResetChanges = () => {
    if (selectedQuestion) {
      setXmlContent(selectedQuestion.question.rawXml)
      setHasUnsavedChanges(false)
    }
  }

  const handleSaveChanges = async () => {
    if (!selectedQuestion || !hasUnsavedChanges) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/qti/update-item', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: selectedQuestion.question.identifier,
          xml: xmlContent,
          metadata: selectedQuestion.question.metadata
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // Update the local question data with the new XML
      setSelectedQuestion({
        ...selectedQuestion,
        question: {
          ...selectedQuestion.question,
          rawXml: xmlContent
        }
      })
      
      setHasUnsavedChanges(false)
      setError("") // Clear any previous errors
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes")
    } finally {
      setIsSaving(false)
    }
  }

  const handleBase64Click = (base64Data: string, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    
    // Copy to clipboard
    copyToClipboard(base64Data)
    // Also send to base64 tools
    onBase64Click?.(base64Data, selectedQuestion?.question.title || "")
    
    // Select just the text in the overlay element
    const target = event.currentTarget as HTMLElement
    if (target && window.getSelection) {
      const selection = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(target)
      selection?.removeAllRanges()
      selection?.addRange(range)
    }
  }

  const processXmlWithClickableBase64 = (xmlString: string) => {
    // Find all base64 data URLs
    const base64Regex = /(data:image\/svg\+xml;base64,)([A-Za-z0-9+/=]+)/g
    const parts = []
    let lastIndex = 0
    let match

    while ((match = base64Regex.exec(xmlString)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: xmlString.slice(lastIndex, match.index)
        })
      }
      
      // Add the prefix
      parts.push({
        type: 'text',
        content: match[1]
      })
      
      // Add the clickable base64 part
      parts.push({
        type: 'base64',
        content: match[2]
      })
      
      lastIndex = match.index + match[0].length
    }
    
    // Add remaining text
    if (lastIndex < xmlString.length) {
      parts.push({
        type: 'text',
        content: xmlString.slice(lastIndex)
      })
    }
    
    return parts.length > 0 ? parts : [{ type: 'text', content: xmlString }]
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (error) {
      const textArea = document.createElement("textarea")
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
    }
  }

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={fetchQTI}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? "fetching..." : "fetch QTI questions"}
        </button>
        {data && (
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{data.totalQuestions} questions loaded</span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              {data.questions.filter(q => hasBase64SVG(q.question.rawXml)).length} with base64 SVG
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {data && (
        <div className="flex-1 flex gap-4 min-h-0">
          <div className="w-1/3 flex flex-col">
            <h3 className="font-semibold mb-2">questions ({data.questions.length})</h3>
            <div className="flex-1 overflow-y-auto border rounded p-2 space-y-1">
              {data.questions.map((question, index) => {
                const hasSVG = hasBase64SVG(question.question.rawXml)
                const isChecked = checkedQuestions.has(question.question.identifier)
                return (
                  <div
                    key={question.question.identifier}
                    className={`w-full p-2 rounded text-sm relative flex items-start gap-2 ${
                      selectedQuestion?.question.identifier === question.question.identifier
                        ? "bg-blue-100 border border-blue-300"
                        : "hover:bg-gray-100 border border-transparent"
                    }`}
                  >
                    <button
                      onClick={() => setSelectedQuestion(question)}
                      className="flex-1 text-left pr-8"
                    >
                      <div className={`font-medium truncate ${isChecked ? "line-through text-gray-500" : ""}`}>
                        {question.question.title}
                      </div>
                      <div className={`text-xs ${isChecked ? "line-through text-gray-400" : "text-gray-500"}`}>
                        {question.question.type} • {question.question.identifier}
                      </div>
                    </button>
                    {hasSVG && (
                      <div className="absolute top-2 right-8 w-3 h-3 bg-green-500 rounded" title="Contains base64 SVG"></div>
                    )}
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleQuestionChecked(question.question.identifier)}
                      className="absolute top-2 right-2 w-5 h-5 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            {selectedQuestion && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">raw XML</h3>
                    {hasUnsavedChanges && (
                      <span className="text-orange-600 text-sm">● unsaved changes</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {hasUnsavedChanges && (
                      <>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              disabled={isSaving}
                              className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:opacity-50"
                            >
                              {isSaving ? "saving..." : "save changes"}
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Save QTI Changes</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to save the changes to this QTI question? 
                                This will update the question in the timeback QTI API and affect how it appears to users.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleSaveChanges}>
                                Save Changes
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <button
                          onClick={handleResetChanges}
                          className="px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600"
                        >
                          reset
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => copyToClipboard(xmlContent)}
                      className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                    >
                      copy xml
                    </button>
                  </div>
                </div>
                <div className="flex-1 border rounded overflow-hidden relative">
                  <Editor
                    height="100%"
                    defaultLanguage="xml"
                    value={xmlContent}
                    onChange={handleXmlChange}
                    options={{
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      fontSize: 12,
                      wordWrap: "on",
                      lineNumbers: "on",
                      folding: true,
                      automaticLayout: true
                    }}
                    theme="vs"
                  />
                  {/* Overlay for base64 detection and clicking */}
                  <div className="absolute inset-0 pointer-events-none">
                    {xmlContent.split('\n').map((line, lineIndex) => {
                      const base64Matches = Array.from(line.matchAll(/(data:image\/svg\+xml;base64,)([A-Za-z0-9+/=]+)/g))
                      if (base64Matches.length === 0) return null
                      
                      return base64Matches.map((match, matchIndex) => {
                        const base64Data = match[2]
                        const startPos = match.index || 0
                        const prefixLength = match[1]?.length || 0
                        
                        if (!base64Data) return null
                        
                        return (
                           <div
                             key={`${lineIndex}-${matchIndex}`}
                             className="absolute pointer-events-auto cursor-pointer hover:bg-yellow-200 bg-yellow-100 rounded px-1 select-all"
                             style={{
                               top: `${lineIndex * 18 + 4}px`, // Approximate line height
                               left: `${(startPos + prefixLength) * 7.2 + 54}px`, // Approximate char width + line number width
                               width: `${base64Data.length * 7.2}px`,
                               height: '16px',
                               fontSize: '12px',
                               fontFamily: 'monospace',
                               lineHeight: '16px',
                               whiteSpace: 'nowrap',
                               overflow: 'hidden',
                               zIndex: 10
                             }}
                             onClick={(e) => handleBase64Click(base64Data, e)}
                             onMouseDown={(e) => e.stopPropagation()}
                             title="Click to copy and decode this base64 data"
                           >
                             {base64Data}
                           </div>
                        )
                      })
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
