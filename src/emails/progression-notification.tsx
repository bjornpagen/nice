import * as React from "react"
import {
    Body,
    Container,
    Head,
    Html,
    Preview,
    Section,
    Text,
    Row,
    Column,
} from "@react-email/components"

export interface ProgressionNotificationProps {
    studentName: string
    studentEmail: string
    fromCourse: string
    toCourse: string
    isSupplementary: boolean
    pipelinePosition: number
    totalCourses: number
    timestamp: Date
}

const PIPELINE_COURSES = [
    "Biology",
    "Chemistry",
    "Physics",
    "Earth & Space",
    "Supplementary",
]

export function ProgressionNotificationEmail({
    studentName = "Sarah Chen",
    studentEmail = "sarah.chen@students.school.edu",
    fromCourse = "MS Biology",
    toCourse = "MS Chemistry",
    isSupplementary = false,
    pipelinePosition = 2,
    totalCourses = 5,
    timestamp = new Date(),
}: ProgressionNotificationProps) {
    const formattedDate = timestamp.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    })
    const formattedTime = timestamp.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
    })

    // Distinguish between "enrolling in terminal course" vs "completed terminal course"
    const isTerminalCompletion = isSupplementary && toCourse === "Completed"
    const completedCount = isTerminalCompletion ? totalCourses : pipelinePosition - 1

    return (
        <Html>
            <Head>
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                `}</style>
            </Head>
            <Preview>
                {studentName} progressed: {fromCourse} → {toCourse}
            </Preview>
            <Body style={body}>
                <Container style={wrapper}>
                    {/* Main Card */}
                    <Section style={mainCard}>
                        {/* Header with icon */}
                        <table cellPadding="0" cellSpacing="0" style={{ width: "100%", marginBottom: "32px" }}>
                            <tbody>
                                <tr>
                                    <td>
                                        <table cellPadding="0" cellSpacing="0">
                                            <tbody>
                                                <tr>
                                                    <td style={iconWrapper}>
                                                        <Text style={iconText}>📚</Text>
                                                    </td>
                                                    <td style={{ paddingLeft: "16px" }}>
                                                        <Text style={headerLabel}>Progress Report</Text>
                                                        <Text style={timestamp_}>{formattedDate} at {formattedTime}</Text>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Student Info */}
                        <Section style={studentCard}>
                            <Text style={studentLabel}>STUDENT</Text>
                            <Text style={studentName_}>{studentName}</Text>
                            <Text style={studentEmail_}>{studentEmail}</Text>
                        </Section>

                        {/* Progression */}
                        <Section style={progressionSection}>
                            <table cellPadding="0" cellSpacing="0" style={{ width: "100%" }}>
                                <tbody>
                                    <tr>
                                        <td style={fromBlock}>
                                            <Text style={blockLabel}>COMPLETED</Text>
                                            <table cellPadding="0" cellSpacing="0">
                                                <tbody>
                                                    <tr>
                                                        <td style={{ verticalAlign: "top", width: "32px" }}>
                                                            <table cellPadding="0" cellSpacing="0" style={{ width: "32px", height: "32px" }}>
                                                                <tbody>
                                                                    <tr>
                                                                        <td style={iconBubbleGreen}>
                                                                            <Text style={iconBubbleText}>✓</Text>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </td>
                                                        <td style={{ paddingLeft: "12px", verticalAlign: "top" }}>
                                                            <Text style={courseNamePlain}>{fromCourse}</Text>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </td>
                                        <td style={arrowBlock}>
                                            <Text style={arrowText}>→</Text>
                                        </td>
                                        <td style={toBlock}>
                                            <Text style={blockLabel}>{isSupplementary ? "FINAL COURSE" : "NOW ENROLLED"}</Text>
                                            <table cellPadding="0" cellSpacing="0">
                                                <tbody>
                                                    <tr>
                                                        <td style={{ verticalAlign: "top", width: "32px" }}>
                                                            <table cellPadding="0" cellSpacing="0" style={{ width: "32px", height: "32px" }}>
                                                                <tbody>
                                                                    <tr>
                                                                        <td style={iconBubbleBlue}>
                                                                            <Text style={iconBubbleText}>⋯</Text>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </td>
                                                        <td style={{ paddingLeft: "12px", verticalAlign: "top" }}>
                                                            <Text style={courseNamePlain}>{toCourse}</Text>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </Section>
                    </Section>

                    {/* Pipeline Card */}
                    <Section style={pipelineCard}>
                        <Text style={pipelineHeader}>Course Pipeline</Text>
                        <Text style={pipelineSubheader}>{completedCount} of {totalCourses} courses completed</Text>

                        {/* Progress bar */}
                        <Section style={progressBarWrapper}>
                            <table cellPadding="0" cellSpacing="0" style={progressBarTable}>
                                <tbody>
                                    <tr>
                                        {PIPELINE_COURSES.map((_, i) => {
                                            const position = i + 1
                                            const isCompleted = isTerminalCompletion ? true : position < pipelinePosition
                                            const isCurrent = isTerminalCompletion ? false : position === pipelinePosition

                                            return (
                                                <td
                                                    key={i}
                                                    style={
                                                        isCompleted
                                                            ? progressSegmentComplete
                                                            : isCurrent
                                                            ? progressSegmentCurrent
                                                            : progressSegmentPending
                                                    }
                                                />
                                            )
                                        })}
                                    </tr>
                                </tbody>
                            </table>
                        </Section>

                        {/* Course list */}
                        <table cellPadding="0" cellSpacing="0" style={{ width: "100%", marginTop: "24px" }}>
                            <tbody>
                                {PIPELINE_COURSES.map((course, i) => {
                                    const position = i + 1
                                    const isCompleted = isTerminalCompletion ? true : position < pipelinePosition
                                    const isCurrent = isTerminalCompletion ? false : position === pipelinePosition

                                    return (
                                        <tr key={course}>
                                            <td style={courseRowNumber}>
                                                <Text style={isCompleted ? courseNumberComplete : isCurrent ? courseNumberCurrent : courseNumberPending}>
                                                    {position}
                                                </Text>
                                            </td>
                                            <td style={courseRowName}>
                                                <Text style={isCompleted ? courseNameComplete : isCurrent ? courseNameCurrent : courseNamePending}>
                                                    {course}
                                                </Text>
                                            </td>
                                            <td style={courseRowStatus}>
                                                <table cellPadding="0" cellSpacing="0" style={{ marginLeft: "auto" }}>
                                                    <tbody>
                                                        <tr>
                                                            <td style={isCompleted ? statusBubbleGreen : isCurrent ? statusBubbleBlue : statusBubbleGray}>
                                                                <Text style={isCompleted || isCurrent ? statusBubbleIcon : statusBubbleIconGray}>
                                                                    {isCompleted ? "✓" : isCurrent ? "⋯" : "○"}
                                                                </Text>
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </Section>

                    {/* Footer */}
                    <Text style={footer}>
                        Nice Academy · Automated notification
                    </Text>
                </Container>
            </Body>
        </Html>
    )
}

// High contrast color palette
const body: React.CSSProperties = {
    backgroundColor: "#f4f4f5",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    margin: 0,
    padding: "48px 24px",
}

const wrapper: React.CSSProperties = {
    maxWidth: "520px",
    margin: "0 auto",
}

const mainCard: React.CSSProperties = {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    padding: "32px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.12), 0 8px 32px rgba(0,0,0,0.08)",
    marginBottom: "16px",
}

const iconWrapper: React.CSSProperties = {
    width: "52px",
    height: "52px",
    backgroundColor: "#eef2ff",
    borderRadius: "12px",
    textAlign: "center",
    verticalAlign: "middle",
}

const iconText: React.CSSProperties = {
    fontSize: "26px",
    lineHeight: "52px",
    margin: 0,
}

const headerLabel: React.CSSProperties = {
    fontSize: "20px",
    fontWeight: 700,
    color: "#18181b",
    margin: "0 0 2px 0",
    letterSpacing: "-0.4px",
}

const timestamp_: React.CSSProperties = {
    fontSize: "14px",
    color: "#71717a",
    margin: 0,
    fontWeight: 500,
}

const studentCard: React.CSSProperties = {
    backgroundColor: "#fafafa",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "28px",
    border: "1px solid #e4e4e7",
}

const studentLabel: React.CSSProperties = {
    fontSize: "11px",
    fontWeight: 700,
    color: "#71717a",
    letterSpacing: "0.8px",
    margin: "0 0 10px 0",
}

const studentName_: React.CSSProperties = {
    fontSize: "24px",
    fontWeight: 700,
    color: "#18181b",
    margin: "0 0 6px 0",
    letterSpacing: "-0.4px",
}

const studentEmail_: React.CSSProperties = {
    fontSize: "15px",
    color: "#52525b",
    margin: 0,
    fontWeight: 500,
}

const progressionSection: React.CSSProperties = {
    padding: "0",
}

const fromBlock: React.CSSProperties = {
    width: "42%",
    verticalAlign: "top",
}

const toBlock: React.CSSProperties = {
    width: "42%",
    verticalAlign: "top",
}

const arrowBlock: React.CSSProperties = {
    width: "16%",
    textAlign: "center",
    verticalAlign: "middle",
    paddingTop: "28px",
}

const blockLabel: React.CSSProperties = {
    fontSize: "11px",
    fontWeight: 700,
    color: "#71717a",
    letterSpacing: "0.8px",
    margin: "0 0 12px 0",
}

const iconBubbleGreen: React.CSSProperties = {
    width: "32px",
    height: "32px",
    maxWidth: "32px",
    maxHeight: "32px",
    backgroundColor: "#22c55e",
    borderRadius: "50%",
    textAlign: "center",
    verticalAlign: "middle",
    fontSize: "0",
}

const iconBubbleBlue: React.CSSProperties = {
    width: "32px",
    height: "32px",
    maxWidth: "32px",
    maxHeight: "32px",
    backgroundColor: "#3b82f6",
    borderRadius: "50%",
    textAlign: "center",
    verticalAlign: "middle",
    fontSize: "0",
}

const iconBubbleText: React.CSSProperties = {
    fontSize: "14px",
    fontWeight: 700,
    color: "#ffffff",
    margin: 0,
    lineHeight: "32px",
}

const courseNamePlain: React.CSSProperties = {
    fontSize: "17px",
    fontWeight: 600,
    color: "#18181b",
    margin: 0,
}

const arrowText: React.CSSProperties = {
    fontSize: "28px",
    color: "#a1a1aa",
    margin: 0,
    fontWeight: 400,
}

const pipelineCard: React.CSSProperties = {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    padding: "28px 32px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.12), 0 8px 32px rgba(0,0,0,0.08)",
    marginBottom: "24px",
}

const pipelineHeader: React.CSSProperties = {
    fontSize: "18px",
    fontWeight: 700,
    color: "#18181b",
    margin: "0 0 6px 0",
    letterSpacing: "-0.3px",
}

const pipelineSubheader: React.CSSProperties = {
    fontSize: "14px",
    color: "#71717a",
    margin: "0 0 24px 0",
    fontWeight: 500,
}

const progressBarWrapper: React.CSSProperties = {
    padding: "0",
}

const progressBarTable: React.CSSProperties = {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: "6px 0",
}

const progressSegmentComplete: React.CSSProperties = {
    height: "10px",
    backgroundColor: "#22c55e",
    borderRadius: "5px",
}

const progressSegmentCurrent: React.CSSProperties = {
    height: "10px",
    backgroundColor: "#3b82f6",
    borderRadius: "5px",
    boxShadow: "0 0 0 4px rgba(59, 130, 246, 0.25)",
}

const progressSegmentPending: React.CSSProperties = {
    height: "10px",
    backgroundColor: "#e4e4e7",
    borderRadius: "5px",
}

const courseRowNumber: React.CSSProperties = {
    width: "36px",
    paddingTop: "14px",
    paddingBottom: "14px",
    verticalAlign: "middle",
}

const courseRowName: React.CSSProperties = {
    paddingTop: "14px",
    paddingBottom: "14px",
    verticalAlign: "middle",
}

const courseRowStatus: React.CSSProperties = {
    textAlign: "right",
    paddingTop: "14px",
    paddingBottom: "14px",
    verticalAlign: "middle",
}

const courseNumberComplete: React.CSSProperties = {
    fontSize: "15px",
    fontWeight: 700,
    color: "#22c55e",
    margin: 0,
}

const courseNumberCurrent: React.CSSProperties = {
    fontSize: "15px",
    fontWeight: 700,
    color: "#3b82f6",
    margin: 0,
}

const courseNumberPending: React.CSSProperties = {
    fontSize: "15px",
    fontWeight: 600,
    color: "#a1a1aa",
    margin: 0,
}

const courseNameComplete: React.CSSProperties = {
    fontSize: "15px",
    fontWeight: 600,
    color: "#18181b",
    margin: 0,
}

const courseNameCurrent: React.CSSProperties = {
    fontSize: "15px",
    fontWeight: 700,
    color: "#18181b",
    margin: 0,
}

const courseNamePending: React.CSSProperties = {
    fontSize: "15px",
    fontWeight: 500,
    color: "#71717a",
    margin: 0,
}

const statusBubbleGreen: React.CSSProperties = {
    width: "28px",
    height: "28px",
    maxWidth: "28px",
    maxHeight: "28px",
    backgroundColor: "#22c55e",
    borderRadius: "50%",
    textAlign: "center",
    verticalAlign: "middle",
    fontSize: "0",
}

const statusBubbleBlue: React.CSSProperties = {
    width: "28px",
    height: "28px",
    maxWidth: "28px",
    maxHeight: "28px",
    backgroundColor: "#3b82f6",
    borderRadius: "50%",
    textAlign: "center",
    verticalAlign: "middle",
    fontSize: "0",
}

const statusBubbleGray: React.CSSProperties = {
    width: "28px",
    height: "28px",
    maxWidth: "28px",
    maxHeight: "28px",
    backgroundColor: "#e4e4e7",
    borderRadius: "50%",
    textAlign: "center",
    verticalAlign: "middle",
    fontSize: "0",
}

const statusBubbleIcon: React.CSSProperties = {
    fontSize: "12px",
    fontWeight: 700,
    color: "#ffffff",
    margin: 0,
    lineHeight: "28px",
}

const statusBubbleIconGray: React.CSSProperties = {
    fontSize: "12px",
    fontWeight: 700,
    color: "#a1a1aa",
    margin: 0,
    lineHeight: "28px",
}

const footer: React.CSSProperties = {
    fontSize: "13px",
    color: "#a1a1aa",
    textAlign: "center",
    margin: 0,
    fontWeight: 500,
}

export default ProgressionNotificationEmail
