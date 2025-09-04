import * as React from "react"
import { Content } from "@/app/debug/qti/content"

export default function DebugQTIPage() {
    // Explicit list of QTI item identifiers to render in order
    const questionIds = [
        "nice_xc32839bc3e4470f8",
        "nice_x0de5c6cab4dacbf6",
        "nice_x7e7f75aa93091d74",
        "nice_x9ab6528ba6c89792",
        "nice_x547c88abf28d67dc"
    ]

    return (
        <main className="h-full w-full">
            <Content questionIds={questionIds} />
        </main>
    )
}


