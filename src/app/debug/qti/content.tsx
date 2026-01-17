"use client"

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import * as React from "react"
import { AssessmentBottomNav, type AssessmentType } from "@/components/practice/assessment-bottom-nav"
import { QTIRenderer } from "@/components/qti-renderer"
import { Button } from "@/components/ui/button"
import { processQuestionResponse } from "@/lib/actions/assessment"

interface ContentProps {
    questionIds: string[]
    expectedIdentifiersPromises?: Promise<string[]>[]
}

export function Content({ questionIds, expectedIdentifiersPromises }: ContentProps) {
    const [visibleIndex, setVisibleIndex] = React.useState(0)
    const [selectedResponses, setSelectedResponses] = React.useState<Record<string, unknown>>({})
    const [expectedResponseIdentifiers, setExpectedResponseIdentifiers] = React.useState<string[]>([])
    const [isAnswerChecked, setIsAnswerChecked] = React.useState(false)
    const [isAnswerCorrect, setIsAnswerCorrect] = React.useState(false)
    const [attemptCount, setAttemptCount] = React.useState(0)
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [showFeedback, setShowFeedback] = React.useState(false)

    const [latestRendererEvent, setLatestRendererEvent] = React.useState<unknown>(undefined)
    const [lastCheckRequest, setLastCheckRequest] = React.useState<
        | { questionId: string; responseIdentifier: string; responseValue: string | unknown[] | Record<string, unknown> }
        | undefined
    >(undefined)
    const [lastCheckResponse, setLastCheckResponse] = React.useState<unknown>(undefined)

    const contentType: AssessmentType = "Exercise"
    const MAX_ATTEMPTS = 3

    React.useEffect(() => {
        setSelectedResponses({})
        setExpectedResponseIdentifiers([])
        setIsAnswerChecked(false)
        setIsAnswerCorrect(false)
        setShowFeedback(false)
        setAttemptCount(0)
        setLastCheckRequest(undefined)
        setLastCheckResponse(undefined)
        setLatestRendererEvent(undefined)
    }, [visibleIndex])

    // If server-provided expected identifiers are available, adopt them as the authoritative list
    const serverExpectedForCurrent =
        expectedIdentifiersPromises && expectedIdentifiersPromises[visibleIndex]
            ? React.use(expectedIdentifiersPromises[visibleIndex]!)
            : undefined

    React.useEffect(() => {
        if (serverExpectedForCurrent && Array.isArray(serverExpectedForCurrent) && serverExpectedForCurrent.length > 0) {
            setExpectedResponseIdentifiers(serverExpectedForCurrent)
        }
    }, [serverExpectedForCurrent])

    function handleResponseChange(responseIdentifier: string, response: unknown) {
        if (
            responseIdentifier === "RESPONSE" &&
            typeof response === "object" &&
            response !== null &&
            !Array.isArray(response)
        ) {
            const keys = Object.keys(response)
            setExpectedResponseIdentifiers((previous) => {
                const base = serverExpectedForCurrent ?? previous
                return Array.from(new Set([...(base ?? []), ...keys]))
            })
        } else {
            setExpectedResponseIdentifiers((previous) => {
                const base = serverExpectedForCurrent ?? previous
                return responseIdentifier ? Array.from(new Set([...(base ?? []), responseIdentifier])) : base ?? []
            })
        }

        setSelectedResponses((previous) => ({
            ...previous,
            [responseIdentifier]: response
        }))

        if (isAnswerChecked && !isAnswerCorrect) {
            setShowFeedback(false)
            setIsAnswerChecked(false)
        }
    }

    function isMeaningfulValue(value: unknown): boolean {
        if (typeof value === "string") {
            return value.trim().length > 0
        }
        if (Array.isArray(value)) {
            return value.length > 0
        }
        return value !== null && value !== undefined
    }

    function computeHasAllExpectedFilled(): boolean {
        if (expectedResponseIdentifiers.length > 0) {
            const nested = (selectedResponses as Record<string, unknown>)["RESPONSE"]
            if (nested && typeof nested === "object" && !Array.isArray(nested)) {
                const nestedEntries = Object.entries(nested)
                const nestedMap = new Map(nestedEntries)
                return expectedResponseIdentifiers.every((key) => {
                    const value = nestedMap.get(key)
                    return isMeaningfulValue(value)
                })
            }
            return expectedResponseIdentifiers.every((key) => isMeaningfulValue((selectedResponses as Record<string, unknown>)[key]))
        }

        const maybe = (selectedResponses as Record<string, unknown>)["RESPONSE"]
        if (maybe && typeof maybe === "object" && !Array.isArray(maybe)) {
            const entries = Object.values(maybe)
            return entries.length > 0 && entries.every((v) => isMeaningfulValue(v))
        }
        const values = Object.values(selectedResponses)
        return values.some((v) => isMeaningfulValue(v))
    }

    async function handleCheck() {
        if (Object.keys(selectedResponses).length === 0) {
            return
        }

        setIsSubmitting(true)
        setShowFeedback(false)

        const responseIdentifiers = Object.keys(selectedResponses)
        let responseValue: string | unknown[] | Record<string, unknown>
        let responseIdentifier: string

        if (responseIdentifiers.length === 1 && responseIdentifiers[0]) {
            const singleValue = selectedResponses[responseIdentifiers[0]]
            responseIdentifier = responseIdentifiers[0]
            if (Array.isArray(singleValue)) {
                responseValue = singleValue
            } else {
                responseValue = String(singleValue)
            }
        } else {
            const allSameIdentifier = responseIdentifiers.every((id) => id === responseIdentifiers[0])
            if (allSameIdentifier && responseIdentifiers[0] === "RESPONSE") {
                responseValue = Object.values(selectedResponses)
                responseIdentifier = "RESPONSE"
            } else {
                responseValue = selectedResponses
                responseIdentifier = "RESPONSE"
            }
        }

        const questionId = questionIds[visibleIndex]
        if (!questionId) {
            setIsSubmitting(false)
            setIsAnswerChecked(true)
            setIsAnswerCorrect(false)
            setShowFeedback(true)
            setLastCheckResponse({ error: "missing question id for current index" })
            return
        }
        setLastCheckRequest({ questionId, responseIdentifier, responseValue })

        const result = await errors.try(processQuestionResponse(questionId, responseValue, responseIdentifier))
        if (result.error) {
            logger.error("debug qti check failed", { error: result.error })
            setIsSubmitting(false)
            setIsAnswerChecked(true)
            setIsAnswerCorrect(false)
            setShowFeedback(true)
            setLastCheckResponse({ error: String(result.error) })
            return
        }

        setLastCheckResponse(result.data)
        const isCorrect = Boolean((result.data as { isCorrect?: boolean }).isCorrect)
        setIsAnswerCorrect(isCorrect)
        setIsAnswerChecked(true)
        setShowFeedback(true)
        setAttemptCount((prev) => prev + 1)
        setIsSubmitting(false)
    }

    function handleTryAgain() {
        setIsAnswerChecked(false)
        setShowFeedback(false)
    }

    function goToNext() {
        if (visibleIndex < questionIds.length - 1) {
            setVisibleIndex((prev) => prev + 1)
        } else {
            setVisibleIndex(questionIds.length - 1)
        }
    }

    const hasAllExpectedFilled = computeHasAllExpectedFilled()
    const isButtonEnabled = (isAnswerChecked || hasAllExpectedFilled) && !isSubmitting

    function getButtonConfig(): { text: string; action: () => void } {
        const hasExhaustedAttempts = attemptCount >= MAX_ATTEMPTS && !isAnswerCorrect
        const isLastQuestion = visibleIndex >= questionIds.length - 1
        if (isAnswerCorrect) {
            return { text: isLastQuestion ? "Show summary" : "Continue", action: () => goToNext() }
        }
        if (hasExhaustedAttempts) {
            return { text: isLastQuestion ? "Show summary" : "Next question", action: () => goToNext() }
        }
        if (isAnswerChecked && !isAnswerCorrect) {
            return { text: "Try again", action: handleTryAgain }
        }
        return { text: "Check", action: () => void handleCheck() }
    }

    const buttonConfig = getButtonConfig()

    return (
        <div className="h-full w-full flex">
            <div className="flex-1 min-w-0 h-[calc(100vh-0px)] bg-white">
                <div className="h-14 px-6 py-3 border-b border-gray-200 flex items-center justify-between">
                    <h1 className="text-lg font-semibold text-gray-900">QTI Debugger</h1>
                    <div className="text-sm text-gray-500">Item {visibleIndex + 1} / {questionIds.length}</div>
                </div>
                <div className="h-[calc(100%-56px-72px)]">
                    {questionIds[visibleIndex] ? (
                        <QTIRenderer
                            identifier={questionIds[visibleIndex] as string}
                            materialType="assessmentItem"
                            height="100%"
                            width="100%"
                            className="h-full w-full"
                            onResponseChange={handleResponseChange}
                            onRawMessage={(event) => {
                                setLatestRendererEvent({ type: event.data?.type, data: event.data })
                            }}
                            displayFeedback={isAnswerChecked}
                            showAllFeedback={isAnswerChecked && !isAnswerCorrect}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-sm text-red-600">
                            Missing question id for current item
                        </div>
                    )}
                </div>
                <div className="h-[72px] border-t border-gray-200">
                    <AssessmentBottomNav
                        contentType={contentType}
                        onContinue={buttonConfig.action}
                        buttonText={buttonConfig.text === "Check" ? "Check" : "Continue"}
                        isEnabled={isButtonEnabled}
                        isBusy={isSubmitting}
                        currentQuestion={visibleIndex + 1}
                        totalQuestions={questionIds.length}
                        showFeedback={showFeedback}
                        isCorrect={isAnswerCorrect}
                        onCloseFeedback={() => setShowFeedback(false)}
                        hasAnswered={isAnswerChecked}
                        attemptCount={attemptCount}
                        maxAttempts={MAX_ATTEMPTS}
                        onSkip={() => setVisibleIndex((prev) => Math.min(prev + 1, questionIds.length - 1))}
                        onReset={() => setVisibleIndex(0)}
                        canSkip={!isAnswerChecked}
                    />
                </div>
            </div>
            <aside className="w-[420px] border-l border-gray-200 h-[calc(100vh-0px)] bg-gray-50 p-4 overflow-auto">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-gray-800">Debug Panel</h2>
                    <div className="space-x-2">
                        <Button variant="outline" size="sm" onClick={() => setVisibleIndex((prev) => Math.max(prev - 1, 0))}>
                            Prev
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setVisibleIndex((prev) => Math.min(prev + 1, questionIds.length - 1))}>
                            Next
                        </Button>
                    </div>
                </div>
                <div className="text-xs text-gray-600">
                    <div className="mb-4">
                        <div className="font-medium text-gray-900 mb-1">Latest renderer message</div>
                        <pre className="bg-white p-3 border rounded overflow-auto whitespace-pre-wrap break-words">{JSON.stringify(latestRendererEvent, null, 2)}</pre>
                    </div>
                    <div className="mb-4">
                        <div className="font-medium text-gray-900 mb-1">Selected responses</div>
                        <pre className="bg-white p-3 border rounded overflow-auto whitespace-pre-wrap break-words">{JSON.stringify(selectedResponses, null, 2)}</pre>
                    </div>
                    <div className="mb-4">
                        <div className="font-medium text-gray-900 mb-1">Expected identifiers</div>
                        <pre className="bg-white p-3 border rounded overflow-auto whitespace-pre-wrap break-words">{JSON.stringify(expectedResponseIdentifiers, null, 2)}</pre>
                    </div>
                    <div className="mb-4">
                        <div className="font-medium text-gray-900 mb-1">Last check request</div>
                        <pre className="bg-white p-3 border rounded overflow-auto whitespace-pre-wrap break-words">{JSON.stringify(lastCheckRequest, null, 2)}</pre>
                    </div>
                    <div className="mb-4">
                        <div className="font-medium text-gray-900 mb-1">Last check response</div>
                        <pre className="bg-white p-3 border rounded overflow-auto whitespace-pre-wrap break-words">{JSON.stringify(lastCheckResponse, null, 2)}</pre>
                    </div>
                </div>
            </aside>
        </div>
    )
}


