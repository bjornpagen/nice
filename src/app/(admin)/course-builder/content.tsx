"use client"
import * as React from "react"
import type { ExplorerResource } from "@/app/(admin)/course-builder/page"
import { ResourceMetadataSchema } from "@/lib/metadata/oneroster"
import {
    X,
    ChevronDown,
    ChevronRight,
    Search,
    FileText,
    Video,
    BookOpen,
    ExternalLink,
    Filter,
    Sparkles,
    GripVertical,
    Plus,
    Trash2,
    Check,
    Layers,
    Package
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
    buildCoursePayloadAction,
    createCourseStep,
    createComponentsStep,
    createResourcesStep,
    createComponentResourcesStep,
    createAssessmentLineItemsStep,
    copyStimuliAction,
    copyQtiTestsAction
} from "./actions"
import { MultiStepLoader } from "@/components/ui/multi-step-loader"

type ActivityType = "Article" | "Video" | "Exercise"

type ResourceLite = {
    id: string
    title: string
    type: ActivityType
    launchUrl: string | undefined
    subjectSlug: string
    courseSlug: string
    caseIds: string[]
    xp: number
}

type LessonResource = {
    id: string
    title: string
    type: ActivityType
    xp: number
    launchUrl: string | undefined
    caseIds?: string[]
}

type Lesson = {
    id: string
    title: string
    resources: LessonResource[]
}

type Unit = {
    id: string
    title: string
    lessons: Lesson[]
}

const activityIcons = {
    Article: FileText,
    Video: Video,
    Exercise: BookOpen
}

const activityColors = {
    Article: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
    Video: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
    Exercise: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
}

export function Content({ resourcesPromise, caseMapPromise }: { resourcesPromise: Promise<ExplorerResource[]>; caseMapPromise: Promise<Record<string, string>> }) {

    const resources = React.use(resourcesPromise)
    const caseMap = React.use(caseMapPromise)
    const [query, setQuery] = React.useState("")
    const [activities, setActivities] = React.useState<ActivityType[]>([])
    const [subjects, setSubjects] = React.useState<string[]>([])
    const [courses, setCourses] = React.useState<string[]>([])
    const [standards, setStandards] = React.useState<string[]>([])
    const [selectedResource, setSelectedResource] = React.useState<ResourceLite | null>(null)
    const [isGenerating, setIsGenerating] = React.useState(false)
    const [currentStep, setCurrentStep] = React.useState(0)
    const [isBuilderOpen, setIsBuilderOpen] = React.useState(false)
    const [validationErrors, setValidationErrors] = React.useState<{
        title?: string
        description?: string
        units?: Record<string, string>
        lessons?: Record<string, string>
    }>({})
    const [showValidation, setShowValidation] = React.useState(false)

    // Course builder state
    const [courseTitle, setCourseTitle] = React.useState("")
    const [courseDescription, setCourseDescription] = React.useState("")
    const [courseSubject, setCourseSubject] = React.useState<string>("")
    const [courseGrades, setCourseGrades] = React.useState<string[]>([])
    const [units, setUnits] = React.useState<Unit[]>([
        {
            id: "unit-1",
            title: "Unit 1: Introduction",
            lessons: [
                {
                    id: "lesson-1-1",
                    title: "Lesson 1: Getting Started",
                    resources: []
                }
            ]
        }
    ])

    // Drag state
    const [draggedResource, setDraggedResource] = React.useState<ResourceLite | null>(null)
    const [dragOverLesson, setDragOverLesson] = React.useState<string | null>(null)

    // Builder drag state for reordering
    const [draggedItem, setDraggedItem] = React.useState<{
        type: 'unit' | 'lesson' | 'resource'
        unitId?: string
        lessonId?: string
        resourceId?: string
        data: any
        originalIndex?: number
    } | null>(null)
    const [dragOverInfo, setDragOverInfo] = React.useState<{
        unitId?: string
        lessonId?: string
        resourceIndex?: number
        lessonIndex?: number
        unitIndex?: number
    } | null>(null)

    // Drag and drop handlers for resources from left panel
    const handleDragStart = (e: React.DragEvent, resource: ResourceLite) => {
        setDraggedResource(resource)
        setDraggedItem(null) // Clear any builder drag state
        e.dataTransfer.effectAllowed = "copy"
        e.dataTransfer.setData("text/plain", resource.id) // Add data to make drag work in all browsers
    }

    const handleDragEnd = () => {
        setDraggedResource(null)
        setDragOverLesson(null)
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "copy"
    }

    const handleDragEnter = (lessonId: string) => {
        setDragOverLesson(lessonId)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        // Only clear if we're leaving the drop zone entirely
        const relatedTarget = e.relatedTarget as HTMLElement
        if (!relatedTarget || !relatedTarget.closest('[data-lesson-drop-zone]')) {
            setDragOverLesson(null)
        }
    }

    const handleDrop = (e: React.DragEvent, unitId: string, lessonId: string) => {
        e.preventDefault()
        e.stopPropagation()

        if (!draggedResource) {
            setDragOverLesson(null)
            return
        }

        // Add resource to lesson
        setUnits(prevUnits =>
            prevUnits.map(unit => {
                if (unit.id !== unitId) return unit

                return {
                    ...unit,
                    lessons: unit.lessons.map(lesson => {
                        if (lesson.id !== lessonId) return lesson

                        // Check if resource already exists in this lesson
                        if (lesson.resources.some(r => r.id === draggedResource.id)) {
                            return lesson
                        }

                        return {
                            ...lesson,
                            resources: [...lesson.resources, {
                                id: draggedResource.id,
                                title: draggedResource.title,
                                type: draggedResource.type,
                                xp: draggedResource.xp,
                                launchUrl: draggedResource.launchUrl
                            }]
                        }
                    })
                }
            })
        )

        // Clear drag states
        setDraggedResource(null)
        setDragOverLesson(null)
    }

    const removeResourceFromLesson = (unitId: string, lessonId: string, resourceId: string) => {
        setUnits(prevUnits =>
            prevUnits.map(unit => {
                if (unit.id !== unitId) return unit

                return {
                    ...unit,
                    lessons: unit.lessons.map(lesson => {
                        if (lesson.id !== lessonId) return lesson

                        return {
                            ...lesson,
                            resources: lesson.resources.filter(r => r.id !== resourceId)
                        }
                    })
                }
            })
        )
    }

    const addLesson = (unitId: string) => {
        setUnits(prevUnits =>
            prevUnits.map(unit => {
                if (unit.id !== unitId) return unit

                const newLessonNumber = unit.lessons.length + 1
                return {
                    ...unit,
                    lessons: [...unit.lessons, {
                        id: `lesson-${unitId}-${Date.now()}`,
                        title: `Lesson ${newLessonNumber}: New Lesson`,
                        resources: []
                    }]
                }
            })
        )
    }

    const addUnit = () => {
        const newUnitNumber = units.length + 1
        setUnits(prevUnits => [...prevUnits, {
            id: `unit-${Date.now()}`,
            title: `Unit ${newUnitNumber}: New Unit`,
            lessons: [{
                id: `lesson-${Date.now()}-1`,
                title: "Lesson 1: New Lesson",
                resources: []
            }]
        }])
    }

    const updateUnitTitle = (unitId: string, title: string) => {
        setUnits(prevUnits =>
            prevUnits.map(unit =>
                unit.id === unitId ? { ...unit, title } : unit
            )
        )
    }

    const updateLessonTitle = (unitId: string, lessonId: string, title: string) => {
        setUnits(prevUnits =>
            prevUnits.map(unit => {
                if (unit.id !== unitId) return unit

                return {
                    ...unit,
                    lessons: unit.lessons.map(lesson =>
                        lesson.id === lessonId ? { ...lesson, title } : lesson
                    )
                }
            })
        )
    }

    const removeUnit = (unitId: string) => {
        setUnits(prevUnits => prevUnits.filter(unit => unit.id !== unitId))
    }

    const removeLesson = (unitId: string, lessonId: string) => {
        setUnits(prevUnits =>
            prevUnits.map(unit => {
                if (unit.id !== unitId) return unit

                return {
                    ...unit,
                    lessons: unit.lessons.filter(lesson => lesson.id !== lessonId)
                }
            })
        )
    }

    // Helper to get reordered items for visual feedback
    const getReorderedUnits = React.useMemo(() => {
        if (!draggedItem || draggedItem.type !== 'unit' || dragOverInfo?.unitIndex === undefined) {
            return units
        }

        const draggedUnitIndex = units.findIndex(u => u.id === draggedItem.unitId)
        if (draggedUnitIndex === -1) return units

        // Don't reorder if dropping in the same position
        if (draggedUnitIndex === dragOverInfo.unitIndex ||
            draggedUnitIndex === dragOverInfo.unitIndex - 1) {
            return units
        }

        const newUnits = [...units]
        const [draggedUnit] = newUnits.splice(draggedUnitIndex, 1)
        if (draggedUnit) {
            // The target index needs adjustment based on removal
            let insertIndex = dragOverInfo.unitIndex
            if (insertIndex > draggedUnitIndex) {
                // When moving down, account for the removal shifting indices
                insertIndex = insertIndex - 1
            }
            // Ensure we don't go out of bounds
            insertIndex = Math.max(0, Math.min(insertIndex, newUnits.length))
            newUnits.splice(insertIndex, 0, draggedUnit)
        }
        return newUnits
    }, [units, draggedItem, dragOverInfo])

    const getReorderedLessons = React.useCallback((unitId: string, lessons: Lesson[]) => {
        if (!draggedItem || draggedItem.type !== 'lesson' || dragOverInfo?.lessonIndex === undefined || dragOverInfo.unitId !== unitId) {
            return lessons
        }

        // Only allow reordering within the same unit
        if (draggedItem.unitId !== unitId) {
            return lessons
        }

        // Reordering within same unit
        const draggedLessonIndex = lessons.findIndex(l => l.id === draggedItem.lessonId)
        if (draggedLessonIndex === -1) return lessons

        // Don't reorder if dropping in the same position
        if (draggedLessonIndex === dragOverInfo.lessonIndex ||
            draggedLessonIndex === dragOverInfo.lessonIndex - 1) {
            return lessons
        }

        const newLessons = [...lessons]
        const [draggedLesson] = newLessons.splice(draggedLessonIndex, 1)
        if (draggedLesson) {
            // The target index needs adjustment based on removal
            let insertIndex = dragOverInfo.lessonIndex
            if (insertIndex > draggedLessonIndex) {
                // When moving down, account for the removal shifting indices
                insertIndex = insertIndex - 1
            }
            // Ensure we don't go out of bounds
            insertIndex = Math.max(0, Math.min(insertIndex, newLessons.length))
            newLessons.splice(insertIndex, 0, draggedLesson)
        }
        return newLessons
    }, [units, draggedItem, dragOverInfo])

    const getReorderedResources = React.useCallback((unitId: string, lessonId: string, resources: LessonResource[]) => {
        if (!draggedItem || draggedItem.type !== 'resource' || dragOverInfo?.resourceIndex === undefined ||
            dragOverInfo.unitId !== unitId || dragOverInfo.lessonId !== lessonId) {
            return resources
        }

        // Only allow reordering within the same lesson
        if (draggedItem.unitId !== unitId || draggedItem.lessonId !== lessonId) {
            return resources
        }

        // Reordering within same lesson
        const draggedResourceIndex = resources.findIndex(r => r.id === draggedItem.resourceId)
        if (draggedResourceIndex === -1) return resources

        // Don't reorder if dropping in the same position
        if (draggedResourceIndex === dragOverInfo.resourceIndex ||
            draggedResourceIndex === dragOverInfo.resourceIndex - 1) {
            return resources
        }

        const newResources = [...resources]
        const [draggedResource] = newResources.splice(draggedResourceIndex, 1)
        if (draggedResource) {
            // The target index needs adjustment based on removal
            let insertIndex = dragOverInfo.resourceIndex
            if (insertIndex > draggedResourceIndex) {
                // When moving down, account for the removal shifting indices
                insertIndex = insertIndex - 1
            }
            // Ensure we don't go out of bounds
            insertIndex = Math.max(0, Math.min(insertIndex, newResources.length))
            newResources.splice(insertIndex, 0, draggedResource)
        }
        return newResources
    }, [units, draggedItem, dragOverInfo])

    // Builder drag handlers for reordering
    const handleBuilderDragStart = (e: React.DragEvent, item: typeof draggedItem) => {
        setDraggedItem(item)
        setDraggedResource(null) // Clear any resource drag state
        setDragOverLesson(null)
        e.dataTransfer.effectAllowed = "move"
    }

    const handleBuilderDragEnd = () => {
        // Apply the reordering if there was a valid drop
        if (draggedItem && dragOverInfo) {
            // The actual reordering will be handled in handleBuilderDrop
        }
        setDraggedItem(null)
        setDragOverInfo(null)
    }

    const handleBuilderDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
    }

    const handleBuilderDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (!draggedItem || !dragOverInfo) {
            setDraggedItem(null)
            setDragOverInfo(null)
            return
        }

        // Apply the visual reordering as the actual state
        if (draggedItem.type === 'unit' && dragOverInfo.unitIndex !== undefined) {
            setUnits(getReorderedUnits)
        } else if (draggedItem.type === 'lesson' && dragOverInfo.lessonIndex !== undefined) {
            // Only allow reordering within the same unit
            if (draggedItem.unitId === dragOverInfo.unitId) {
                setUnits(prevUnits => {
                    return prevUnits.map(unit => {
                        if (unit.id === draggedItem.unitId) {
                            return {
                                ...unit,
                                lessons: getReorderedLessons(unit.id, unit.lessons)
                            }
                        }
                        return unit
                    })
                })
            }
        } else if (draggedItem.type === 'resource' && dragOverInfo.resourceIndex !== undefined) {
            // Only allow reordering within the same lesson
            if (draggedItem.unitId === dragOverInfo.unitId && draggedItem.lessonId === dragOverInfo.lessonId) {
                setUnits(prevUnits => {
                    return prevUnits.map(unit => {
                        if (unit.id === draggedItem.unitId) {
                            return {
                                ...unit,
                                lessons: unit.lessons.map(lesson => {
                                    if (lesson.id === draggedItem.lessonId) {
                                        return {
                                            ...lesson,
                                            resources: getReorderedResources(unit.id, lesson.id, lesson.resources)
                                        }
                                    }
                                    return lesson
                                })
                            }
                        }
                        return unit
                    })
                })
            }
        }

        setDraggedItem(null)
        setDragOverInfo(null)
    }

    const items = React.useMemo<ResourceLite[]>(() => {
        const list: ResourceLite[] = []
        for (const r of resources) {
            // Parse known fields via schema
            const metaResult = ResourceMetadataSchema.safeParse(r.metadata)
            if (!metaResult.success) continue
            const meta = metaResult.data
            // Use raw metadata to read extra fields not present in the schema (Zod strips unknown keys)
            const rawMd = (r.metadata ?? {}) as Record<string, unknown>
            if (meta.type !== "interactive") continue
            if (meta.khanActivityType !== "Article" && meta.khanActivityType !== "Video" && meta.khanActivityType !== "Exercise") continue
            const pathVal = typeof rawMd.path === "string" ? (rawMd.path as string) : ""
            const parts = pathVal.split("/")
            const subjectSlug = parts.length > 1 ? parts[1] ?? "" : ""
            const courseSlug = parts.length > 2 ? parts[2] ?? "" : ""
            const los = rawMd.learningObjectiveSet as
                | Array<{ source: string; learningObjectiveIds: string[] }>
                | undefined
            const caseIds = Array.isArray(los)
                ? los
                    .filter((lo) => lo && lo.source === "CASE" && Array.isArray(lo.learningObjectiveIds))
                    .flatMap((lo) => lo.learningObjectiveIds)
                    .filter((id) => typeof id === "string" && id.length > 0)
                : []

            list.push({
                id: r.sourcedId,
                title: r.title,
                type: meta.khanActivityType as ActivityType,
                launchUrl: meta.launchUrl,
                subjectSlug,
                courseSlug,
                caseIds,
                xp: meta.xp
            })
        }
        return list
    }, [resources])

    const subjectOptions = React.useMemo(() => {
        const set = new Set<string>()
        for (const r of items) {
            if (r.subjectSlug) set.add(r.subjectSlug)
        }
        return Array.from(set).sort()
    }, [items])

    const courseOptions = React.useMemo(() => {
        const set = new Set<string>()
        for (const r of items) {
            // If subjects are selected, only show courses from those subjects
            if (subjects.length > 0 && !subjects.includes(r.subjectSlug)) continue
            if (r.courseSlug) set.add(r.courseSlug)
        }
        return Array.from(set).sort()
    }, [items, subjects])

    const standardOptions = React.useMemo(() => {
        const set = new Set<string>()
        for (const r of items) {
            // If subjects are selected, only show standards from those subjects
            if (subjects.length > 0 && !subjects.includes(r.subjectSlug)) continue
            // If courses are selected, only show standards from those courses
            if (courses.length > 0 && !courses.includes(r.courseSlug)) continue

            for (const id of r.caseIds) {
                const hcs = caseMap[id]
                if (typeof hcs === "string" && hcs.length > 0) set.add(hcs)
            }
        }
        return Array.from(set).sort()
    }, [items, subjects, courses, caseMap])

    // Track which resources are already added to the course
    const addedResourceIds = React.useMemo(() => {
        const ids = new Set<string>()
        units.forEach(unit => {
            unit.lessons.forEach(lesson => {
                lesson.resources.forEach(resource => {
                    ids.add(resource.id)
                })
            })
        })
        return ids
    }, [units])

    const filtered = React.useMemo(() => {
        const q = query.trim().toLowerCase()
        return items.filter((r) => {
            if (activities.length > 0 && !activities.includes(r.type)) return false
            if (subjects.length > 0 && !subjects.includes(r.subjectSlug)) return false
            if (courses.length > 0 && !courses.includes(r.courseSlug)) return false
            if (q) {
                const matchesTitle = r.title.toLowerCase().includes(q)
                const matchesUrl = r.launchUrl?.toLowerCase().includes(q) ?? false
                if (!matchesTitle && !matchesUrl) return false
            }
            if (standards.length > 0) {
                const resourceStandards = r.caseIds
                    .map((id) => caseMap[id])
                    .filter((v): v is string => typeof v === "string" && v.length > 0)
                const anySelected = standards.some((s) => resourceStandards.includes(s))
                if (!anySelected) return false
            }
            return true
        })
    }, [items, query, activities, subjects, courses, standards, caseMap])

    // Client-side pagination to reduce DOM size
    const [page, setPage] = React.useState(1)
    const [pageSize] = React.useState(100)
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const pageItems = React.useMemo(() => filtered.slice(start, end), [filtered, start, end])

    // Reset page when filters/search change
    React.useEffect(() => {
        setPage(1)
    }, [query, activities, subjects, courses, standards])

    const loadingSteps = [
        { text: "Building course payload..." },
        { text: "Creating course in Timeback..." },
        { text: "Creating course components..." },
        { text: "Creating new resources..." },
        { text: "Linking resources to lessons..." },
        { text: "Creating assessment line items..." },
        { text: "Copying QTI tests for exercises..." },
        { text: "Course generation complete!" }
    ]

    // Check if course has content (no empty units or lessons)
    const courseHasContent = React.useMemo(() => {
        if (units.length === 0) return false

        for (const unit of units) {
            // Check if unit has no lessons
            if (unit.lessons.length === 0) return false

            // Check if any lesson has no resources
            for (const lesson of unit.lessons) {
                if (lesson.resources.length === 0) return false
            }
        }

        return true
    }, [units])

    // Validation helper
    const validateCourse = (): boolean => {
        const errors: typeof validationErrors = {}
        let isValid = true

        if (!courseTitle.trim()) {
            errors.title = "Course title is required"
            isValid = false
        }
        if (!courseDescription.trim()) {
            errors.description = "Course description is required"
            isValid = false
        }

        // Check for duplicate unit names
        const unitNames = new Map<string, string[]>()
        units.forEach(u => {
            const name = u.title.trim().toLowerCase()
            if (name) {
                if (!unitNames.has(name)) unitNames.set(name, [])
                unitNames.get(name)!.push(u.id)
            }
        })

        const unitErrors: Record<string, string> = {}
        unitNames.forEach((ids, name) => {
            if (ids.length > 1) {
                ids.forEach(id => {
                    unitErrors[id] = "Duplicate unit name"
                })
            }
        })
        if (Object.keys(unitErrors).length > 0) {
            errors.units = unitErrors
            isValid = false
        }

        // Check for duplicate lesson names within each unit
        const lessonErrors: Record<string, string> = {}
        for (const unit of units) {
            const lessonNames = new Map<string, string[]>()
            unit.lessons.forEach(l => {
                const name = l.title.trim().toLowerCase()
                if (name) {
                    if (!lessonNames.has(name)) lessonNames.set(name, [])
                    lessonNames.get(name)!.push(l.id)
                }
            })

            lessonNames.forEach((ids, name) => {
                if (ids.length > 1) {
                    ids.forEach(id => {
                        lessonErrors[id] = `Duplicate lesson name in unit "${unit.title}"`
                    })
                }
            })
        }
        if (Object.keys(lessonErrors).length > 0) {
            errors.lessons = lessonErrors
            isValid = false
        }

        setValidationErrors(errors)
        setShowValidation(true)
        return isValid
    }

    const handleGenerateCourse = async () => {
        // Validate before generating
        if (!validateCourse()) {
            return
        }

        // Clear validation errors on successful validation
        setValidationErrors({})
        setShowValidation(false)

        setIsGenerating(true)
        setCurrentStep(0)

        const input = {
            title: courseTitle.trim(),
            description: courseDescription.trim(),
            subject: (courseSubject || "General") as "Math" | "Science" | "English Language Arts" | "Social Studies" | "Computing" | "General",
            grades: courseGrades.length > 0 ? courseGrades : ["6th"],
            units: units.map((u) => ({
                id: u.id,
                title: u.title || "Untitled Unit",
                lessons: u.lessons.map((l) => ({
                    id: l.id,
                    title: l.title || "Untitled Lesson",
                    resources: l.resources.map((r) => ({
                        id: r.id,
                        title: r.title,
                        type: r.type,
                        xp: r.xp,
                        caseIds: (items.find((it) => it.id === r.id)?.caseIds) || []
                    }))
                }))
            }))
        }

        try {
            // Step 0: Building payload
            setCurrentStep(0)
            const payload = await buildCoursePayloadAction(input)

            // Step 1: Creating course
            setCurrentStep(1)
            await createCourseStep(payload.course)

            // Step 2: Creating components
            setCurrentStep(2)
            await createComponentsStep(payload.courseComponents)

            // Step 3: Creating resources
            setCurrentStep(3)
            await createResourcesStep(payload.resources)

            // Step 4: Linking resources
            setCurrentStep(4)
            await createComponentResourcesStep(payload.componentResources)

            // Step 5: Creating assessments
            setCurrentStep(5)
            await createAssessmentLineItemsStep(payload.assessmentLineItems)

            // Step 6: Copying QTI stimuli and tests
            setCurrentStep(6)
            await Promise.all([
                copyStimuliAction(payload.stimuliCopyPlan),
                copyQtiTestsAction(payload.qtiCopyPlan)
            ])

            // Step 7: Complete
            setCurrentStep(7)
            await new Promise(resolve => setTimeout(resolve, 1000))

            // Reset builder state
            setCourseTitle("")
            setCourseDescription("")
            setCourseSubject("")
            setCourseGrades([])
            setUnits([
                {
                    id: `unit_${Date.now()}`,
                    title: "Unit 1: Introduction",
                    lessons: [
                        {
                            id: `lesson_${Date.now()}`,
                            title: "Lesson 1: Getting Started",
                            resources: []
                        }
                    ]
                }
            ])
        } catch (error) {
            // Error already logged by server action
        } finally {
            // Let the final step display briefly before closing
            setTimeout(() => {
                setIsGenerating(false)
                setCurrentStep(0)
            }, 800)
        }
    }

    return (
        <div className="min-h-screen bg-white">
            <div className="border-b bg-white px-6 py-4 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">
                        Course Builder • Resources
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {items.length.toLocaleString()} resources available
                    </p>
                </div>
                <Button
                    size="lg"
                    className="bg-black hover:bg-gray-800 text-white font-semibold px-6"
                    onClick={() => setIsBuilderOpen(!isBuilderOpen)}
                >
                    {isBuilderOpen ? (
                        <>
                            <X className="mr-2 h-5 w-5" />
                            Close Builder
                        </>
                    ) : (
                        <>
                            <Sparkles className="mr-2 h-5 w-5" />
                            Create New Course
                        </>
                    )}
                </Button>
            </div>

            {/* Split Screen Layout */}
            <div className={cn(
                "flex h-[calc(100vh-73px)]", // Subtract header height
                isBuilderOpen ? "gap-0" : ""
            )}>
                {/* Left Panel - Resources */}
                <div
                    className={cn(
                        "overflow-y-auto border-r transition-all duration-300",
                        isBuilderOpen ? "w-1/2" : "w-full"
                    )}
                    style={{ scrollbarGutter: "stable both-edges", overscrollBehavior: "contain" }}
                >
                    <div className="p-6 space-y-6">
                        {/* Search and Filters */}
                        <div className="flex gap-3 items-center flex-wrap">
                            <div className="relative flex-1 min-w-[300px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search by title or launch URL"
                                    className="pl-10 h-11 text-base shadow-sm"
                                />
                            </div>

                            {/* Types Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="h-11 min-w-[180px] justify-between shadow-sm">
                                        <span className="flex items-center gap-2">
                                            <Filter className="h-4 w-4" />
                                            {activities.length === 0 ? "All Types" : `${activities.length} Types`}
                                        </span>
                                        <ChevronDown className="h-4 w-4 opacity-50" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56">
                                    <DropdownMenuLabel>Resource Types</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {(["Article", "Video", "Exercise"] as ActivityType[]).map((type) => {
                                        const Icon = activityIcons[type]
                                        return (
                                            <DropdownMenuCheckboxItem
                                                key={type}
                                                checked={activities.includes(type)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setActivities([...activities, type])
                                                    } else {
                                                        setActivities(activities.filter(a => a !== type))
                                                    }
                                                }}
                                            >
                                                <Icon className="mr-2 h-4 w-4" />
                                                {type}
                                            </DropdownMenuCheckboxItem>
                                        )
                                    })}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Subjects Combobox (multi-select) */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="h-11 min-w-[180px] justify-between shadow-sm">
                                        <span>{subjects.length === 0 ? "All Subjects" : `${subjects.length} Subjects`}</span>
                                        <ChevronDown className="h-4 w-4 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="p-0 w-64">
                                    <Command>
                                        <CommandInput placeholder="Search subjects..." />
                                        <CommandList>
                                            <CommandEmpty>No subject found.</CommandEmpty>
                                            <CommandGroup>
                                                {subjectOptions.map((s) => {
                                                    const checked = subjects.includes(s)
                                                    return (
                                                        <CommandItem
                                                            key={s}
                                                            onSelect={() => {
                                                                if (checked) {
                                                                    const remaining = subjects.filter((x) => x !== s)
                                                                    setSubjects(remaining)
                                                                    if (remaining.length > 0) {
                                                                        setCourses(courses.filter((c) => items.some((it) => it.courseSlug === c && remaining.includes(it.subjectSlug))))
                                                                    }
                                                                    setStandards(standards.filter((std) => items.some((it) => (remaining.length === 0 || remaining.includes(it.subjectSlug)) && it.caseIds.some((id) => caseMap[id] === std))))
                                                                } else {
                                                                    setSubjects([...subjects, s])
                                                                }
                                                            }}
                                                        >
                                                            {s}
                                                            {checked && <Check className="ml-auto h-4 w-4" />}
                                                        </CommandItem>
                                                    )
                                                })}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>

                            {/* Courses Combobox (multi-select) */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="h-11 min-w-[200px] justify-between shadow-sm">
                                        <span>{courses.length === 0 ? "All Courses" : `${courses.length} Courses`}</span>
                                        <ChevronDown className="h-4 w-4 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="p-0 w-72">
                                    <Command>
                                        <CommandInput placeholder="Search courses..." />
                                        <CommandList>
                                            <CommandEmpty>No course found.</CommandEmpty>
                                            <CommandGroup>
                                                {courseOptions.map((c) => {
                                                    const checked = courses.includes(c)
                                                    return (
                                                        <CommandItem
                                                            key={c}
                                                            onSelect={() => {
                                                                if (checked) {
                                                                    const remaining = courses.filter((x) => x !== c)
                                                                    setCourses(remaining)
                                                                    setStandards(standards.filter((std) => items.some((it) => (subjects.length === 0 || subjects.includes(it.subjectSlug)) && (remaining.length === 0 || remaining.includes(it.courseSlug)) && it.caseIds.some((id) => caseMap[id] === std))))
                                                                } else {
                                                                    setCourses([...courses, c])
                                                                }
                                                            }}
                                                        >
                                                            {c}
                                                            {checked && <Check className="ml-auto h-4 w-4" />}
                                                        </CommandItem>
                                                    )
                                                })}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>

                            {/* Standards Combobox (multi-select) */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="h-11 min-w-[220px] justify-between shadow-sm">
                                        <span>{standards.length === 0 ? "Select Standards" : `${standards.length} Standards`}</span>
                                        <ChevronDown className="h-4 w-4 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="p-0 w-[320px] max-h-[320px] overflow-auto">
                                    <Command>
                                        <CommandInput placeholder="Search standards..." />
                                        <CommandList>
                                            <CommandEmpty>No standard found.</CommandEmpty>
                                            <CommandGroup>
                                                {standardOptions.map((s) => {
                                                    const checked = standards.includes(s)
                                                    return (
                                                        <CommandItem
                                                            key={s}
                                                            onSelect={() => {
                                                                if (checked) {
                                                                    setStandards(standards.filter((x) => x !== s))
                                                                } else {
                                                                    setStandards([...standards, s])
                                                                }
                                                            }}
                                                        >
                                                            {s}
                                                            {checked && <Check className="ml-auto h-4 w-4" />}
                                                        </CommandItem>
                                                    )
                                                })}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Active Filter Tags */}
                        {(activities.length > 0 || subjects.length > 0 || courses.length > 0 || standards.length > 0) && (
                            <div className="flex gap-2 flex-wrap items-center p-4 bg-gray-50 rounded-lg">
                                <span className="text-sm font-medium text-gray-600">Active filters:</span>

                                {activities.map((type) => {
                                    const Icon = activityIcons[type]
                                    return (
                                        <Badge
                                            key={type}
                                            variant="secondary"
                                            className={cn("gap-1", activityColors[type])}
                                        >
                                            <Icon className="h-3 w-3" />
                                            {type}
                                            <button
                                                onClick={() => setActivities(activities.filter(a => a !== type))}
                                                className="ml-1 hover:bg-black/10 rounded p-0.5"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    )
                                })}

                                {subjects.map((s) => (
                                    <Badge
                                        key={s}
                                        variant="secondary"
                                        className="gap-1 bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
                                    >
                                        {s}
                                        <button
                                            onClick={() => setSubjects(subjects.filter(subj => subj !== s))}
                                            className="ml-1 hover:bg-black/10 rounded p-0.5"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}

                                {courses.map((c) => (
                                    <Badge
                                        key={c}
                                        variant="secondary"
                                        className="gap-1 bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                                    >
                                        {c}
                                        <button
                                            onClick={() => setCourses(courses.filter(course => course !== c))}
                                            className="ml-1 hover:bg-black/10 rounded p-0.5"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}

                                {standards.map((s) => (
                                    <Badge
                                        key={s}
                                        variant="secondary"
                                        className="gap-1 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                    >
                                        {s}
                                        <button
                                            onClick={() => setStandards(standards.filter(std => std !== s))}
                                            className="ml-1 hover:bg-black/10 rounded p-0.5"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setActivities([])
                                        setSubjects([])
                                        setCourses([])
                                        setStandards([])
                                    }}
                                    className="ml-auto"
                                >
                                    Clear all
                                </Button>
                            </div>
                        )}

                        {/* Results Count */}
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                                Showing <span className="font-semibold text-foreground">{filtered.length.toLocaleString()}</span> of {items.length.toLocaleString()} resources
                            </p>
                        </div>

                        {/* Resources Table */}
                        <div className="rounded-lg border overflow-hidden shadow-sm">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50/50">
                                        <TableHead className="font-semibold">Title</TableHead>
                                        <TableHead className="font-semibold w-[120px]">Type</TableHead>
                                        <TableHead className="font-semibold w-[150px]">Course</TableHead>
                                        <TableHead className="font-semibold">Standards</TableHead>
                                        <TableHead className="font-semibold w-[100px] text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pageItems.map((r, index) => {
                                        const Icon = activityIcons[r.type]
                                        const isAdded = addedResourceIds.has(r.id)
                                        return (
                                            <TableRow
                                                key={r.id}
                                                className={cn(
                                                    "transition-colors cursor-pointer hover:bg-gray-100 relative h-12",
                                                    index % 2 === 0 ? "bg-white" : "bg-gray-50/30",
                                                    draggedResource?.id === r.id && "opacity-50",
                                                    isAdded && "bg-green-50/50"
                                                )}
                                                onClick={() => setSelectedResource(r)}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, r)}
                                                onDragEnd={handleDragEnd}
                                            >
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <GripVertical className="h-4 w-4 text-gray-400" />
                                                        <div className="flex items-center gap-2 flex-1">
                                                            {r.title}
                                                            {isAdded && (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="ml-2 gap-1 bg-green-50 text-green-700 border-green-200"
                                                                >
                                                                    <Check className="h-3 w-3" />
                                                                    Added
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={cn("gap-1", activityColors[r.type])}
                                                    >
                                                        <Icon className="h-3 w-3" />
                                                        {r.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {r.courseSlug || <span className="text-gray-400">—</span>}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1 overflow-hidden">
                                                        {r.caseIds.length > 0 ? (
                                                            <>
                                                                {r.caseIds
                                                                    .map((id) => caseMap[id])
                                                                    .filter((v): v is string => typeof v === "string" && v.length > 0)
                                                                    .slice(0, isBuilderOpen ? 2 : 3)
                                                                    .map((hcs) => (
                                                                        <Badge key={hcs} variant="outline" className="text-xs shrink-0">
                                                                            {hcs}
                                                                        </Badge>
                                                                    ))}
                                                                {(() => {
                                                                    const mappedStandards = r.caseIds
                                                                        .map((id) => caseMap[id])
                                                                        .filter((v): v is string => typeof v === "string" && v.length > 0)
                                                                    const limit = isBuilderOpen ? 2 : 3
                                                                    if (mappedStandards.length > limit) {
                                                                        return (
                                                                            <Badge variant="outline" className="text-xs shrink-0">
                                                                                +{mappedStandards.length - limit} more
                                                                            </Badge>
                                                                        )
                                                                    }
                                                                    return null
                                                                })()}
                                                            </>
                                                        ) : (
                                                            <span className="text-gray-400 text-sm">—</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {r.launchUrl && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            asChild
                                                        >
                                                            <a
                                                                href={r.launchUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex items-center gap-1"
                                                            >
                                                                <ExternalLink className="h-4 w-4" />
                                                                Open
                                                            </a>
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                            {filtered.length === 0 && (
                                <div className="p-12 text-center">
                                    <p className="text-muted-foreground">No resources found matching your filters</p>
                                </div>
                            )}
                            {filtered.length > 0 && (
                                <div className="flex items-center justify-between px-2 py-3">
                                    <div className="text-sm text-muted-foreground">
                                        Page {page} of {totalPages} • {filtered.length.toLocaleString()} results
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={page <= 1}
                                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        >
                                            Prev
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={page >= totalPages}
                                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Panel - Course Builder */}
                {isBuilderOpen && (
                    <div className="w-1/2 bg-gray-50 animate-in slide-in-from-right duration-300 flex flex-col">
                        <div className="flex-1 overflow-y-auto p-6 space-y-6" style={{ scrollbarGutter: "stable both-edges", overscrollBehavior: "contain" }}>
                            {/* Course Header */}
                            <div className="bg-white rounded-lg border p-6">
                                <h2 className="text-xl font-semibold mb-4">New Course</h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Course Title</label>
                                        <Input
                                            placeholder="Enter course title..."
                                            className={cn(
                                                "mt-1",
                                                showValidation && validationErrors.title && "border-red-500 focus:border-red-500"
                                            )}
                                            value={courseTitle}
                                            onChange={(e) => {
                                                setCourseTitle(e.target.value)
                                                if (showValidation && validationErrors.title) {
                                                    setValidationErrors(prev => ({ ...prev, title: undefined }))
                                                }
                                            }}
                                        />
                                        {showValidation && validationErrors.title && (
                                            <p className="mt-1 text-xs text-red-500">{validationErrors.title}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Description</label>
                                        <textarea
                                            placeholder="Enter course description..."
                                            className={cn(
                                                "mt-1 w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm",
                                                showValidation && validationErrors.description && "border-red-500 focus:border-red-500"
                                            )}
                                            value={courseDescription}
                                            onChange={(e) => {
                                                setCourseDescription(e.target.value)
                                                if (showValidation && validationErrors.description) {
                                                    setValidationErrors(prev => ({ ...prev, description: undefined }))
                                                }
                                            }}
                                        />
                                        {showValidation && validationErrors.description && (
                                            <p className="mt-1 text-xs text-red-500">{validationErrors.description}</p>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-gray-700">Subject</label>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="outline" className="mt-1 w-full justify-between">
                                                        {courseSubject || "Select subject"}
                                                        <ChevronDown className="h-4 w-4 opacity-50" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="min-w-[var(--radix-dropdown-menu-trigger-width)]">
                                                    {[
                                                        "Math",
                                                        "Science",
                                                        "English Language Arts",
                                                        "Social Studies",
                                                        "Computing",
                                                        "General"
                                                    ].map((s) => (
                                                        <div key={s} className="px-2 py-1.5 cursor-pointer" onClick={() => setCourseSubject(s)}>
                                                            {s}
                                                        </div>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700">Grade Level</label>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="outline" className="mt-1 w-full justify-between">
                                                        {courseGrades.length > 0 ? `${courseGrades.join(", ")}` : "Select grades"}
                                                        <ChevronDown className="h-4 w-4 opacity-50" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="min-w-[var(--radix-dropdown-menu-trigger-width)]">
                                                    <DropdownMenuLabel>Grade Levels</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    {["2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"].map((g) => (
                                                        <DropdownMenuCheckboxItem
                                                            key={g}
                                                            checked={courseGrades.includes(g)}
                                                            onCheckedChange={(checked) => {
                                                                setCourseGrades((prev) => checked ? [...prev, g] : prev.filter((x) => x !== g))
                                                            }}
                                                        >
                                                            {g}
                                                        </DropdownMenuCheckboxItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Course Structure */}
                            <div className="bg-white rounded-lg border">
                                <div className="p-4 border-b">
                                    <h3 className="font-semibold">Course Structure</h3>
                                    <p className="text-sm text-muted-foreground">Drag resources from the left to add them to lessons</p>
                                </div>
                                <div className="p-4">
                                    <div className="space-y-4">
                                        {getReorderedUnits.map((unit, unitIndex) => {
                                            const isBeingDragged = draggedItem?.type === 'unit' && draggedItem?.unitId === unit.id

                                            return (
                                                <div
                                                    key={unit.id}
                                                    className={cn(
                                                        "border rounded-lg p-4 bg-gray-50 relative",
                                                        isBeingDragged && "opacity-50",
                                                        unit.lessons.length === 0 && "border-2 border-dashed border-orange-300"
                                                    )}
                                                    draggable={units.length > 1}
                                                    onDragStart={(e) => {
                                                        e.stopPropagation()
                                                        handleBuilderDragStart(e, {
                                                            type: 'unit',
                                                            unitId: unit.id,
                                                            data: unit
                                                        })
                                                    }}
                                                    onDragEnd={handleBuilderDragEnd}
                                                    onDragOver={(e) => {
                                                        e.preventDefault()
                                                        e.stopPropagation()

                                                        if (draggedItem?.type === 'unit') {
                                                            // Skip if this is the item being dragged
                                                            if (draggedItem.unitId === unit.id) {
                                                                return
                                                            }

                                                            const rect = e.currentTarget.getBoundingClientRect()
                                                            const midpoint = rect.top + rect.height / 2
                                                            const isAboveMidpoint = e.clientY < midpoint

                                                            // Calculate target index based on midpoint
                                                            const targetIndex = isAboveMidpoint ? unitIndex : unitIndex + 1

                                                            // Only update if the target index has actually changed
                                                            if (dragOverInfo?.unitIndex !== targetIndex) {
                                                                setDragOverInfo({ unitIndex: targetIndex })
                                                            }
                                                        }
                                                    }}
                                                    onDragLeave={(e) => {
                                                        e.stopPropagation()
                                                        // Only clear if we're leaving the units area entirely
                                                        const relatedTarget = e.relatedTarget as HTMLElement
                                                        if (!relatedTarget?.closest('.space-y-4')) {
                                                            setDragOverInfo(null)
                                                        }
                                                    }}
                                                    onDrop={(e) => {
                                                        if (draggedItem?.type === 'unit') {
                                                            handleBuilderDrop(e)
                                                        } else if (draggedItem?.type === 'lesson') {
                                                            // Allow dropping lessons into units
                                                            e.stopPropagation()
                                                            setDragOverInfo({ unitId: unit.id, lessonIndex: unit.lessons.length })
                                                            handleBuilderDrop(e)
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            {units.length > 1 && (
                                                                <GripVertical className="h-5 w-5 text-gray-400 cursor-move" />
                                                            )}
                                                            <Input
                                                                value={unit.title}
                                                                onChange={(e) => {
                                                                    updateUnitTitle(unit.id, e.target.value)
                                                                    if (showValidation && validationErrors.units?.[unit.id]) {
                                                                        setValidationErrors(prev => {
                                                                            const newErrors = { ...prev }
                                                                            if (newErrors.units) {
                                                                                delete newErrors.units[unit.id]
                                                                                if (Object.keys(newErrors.units).length === 0) {
                                                                                    delete newErrors.units
                                                                                }
                                                                            }
                                                                            return newErrors
                                                                        })
                                                                    }
                                                                }}
                                                                className={cn(
                                                                    "font-medium bg-transparent border-none px-0 focus:ring-0",
                                                                    showValidation && validationErrors.units?.[unit.id] && "text-red-500"
                                                                )}
                                                            />
                                                            {showValidation && validationErrors.units?.[unit.id] && (
                                                                <p className="text-xs text-red-500 ml-2">{validationErrors.units[unit.id]}</p>
                                                            )}
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => removeUnit(unit.id)}
                                                            disabled={units.length === 1}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>

                                                    {/* Lessons */}
                                                    {unit.lessons.length === 0 && (
                                                        <div className="ml-4 text-sm text-orange-500 italic">
                                                            Add at least one lesson to this unit
                                                        </div>
                                                    )}
                                                    <div className="ml-4 space-y-2">
                                                        {getReorderedLessons(unit.id, unit.lessons).map((lesson, lessonIndex) => {
                                                            const totalXP = lesson.resources.reduce((sum, r) => sum + r.xp, 0)
                                                            const isBeingDragged = draggedItem?.type === 'lesson' && draggedItem?.lessonId === lesson.id

                                                            return (
                                                                <div
                                                                    key={lesson.id}
                                                                    className={cn(
                                                                        "border rounded bg-white p-3 transition-all relative",
                                                                        dragOverLesson === lesson.id && "ring-2 ring-blue-500 bg-blue-50",
                                                                        isBeingDragged && "opacity-50",
                                                                        lesson.resources.length === 0 && "border-2 border-dashed border-orange-300"
                                                                    )}
                                                                    data-lesson-drop-zone
                                                                    draggable={!draggedResource && (unit.lessons.length > 1 || units.length > 1)}
                                                                    onDragStart={(e) => {
                                                                        if (!draggedResource) {
                                                                            e.stopPropagation()
                                                                            handleBuilderDragStart(e, {
                                                                                type: 'lesson',
                                                                                unitId: unit.id,
                                                                                lessonId: lesson.id,
                                                                                data: lesson,
                                                                                originalIndex: lessonIndex
                                                                            })
                                                                        }
                                                                    }}
                                                                    onDragEnd={(e) => {
                                                                        if (!draggedResource) {
                                                                            handleBuilderDragEnd()
                                                                        }
                                                                    }}
                                                                    onDragOver={(e) => {
                                                                        e.preventDefault()
                                                                        e.stopPropagation()

                                                                        // Calculate drop position for lessons
                                                                        if (draggedItem?.type === 'lesson') {
                                                                            // Only allow reordering within the same unit
                                                                            if (draggedItem.unitId !== unit.id) {
                                                                                return
                                                                            }

                                                                            // Skip if this is the item being dragged
                                                                            if (draggedItem.lessonId === lesson.id) {
                                                                                return
                                                                            }

                                                                            const rect = e.currentTarget.getBoundingClientRect()
                                                                            const midpoint = rect.top + rect.height / 2
                                                                            const isAboveMidpoint = e.clientY < midpoint

                                                                            // Find the actual index of this lesson in the ORIGINAL array
                                                                            const actualLessonIndex = unit.lessons.findIndex(l => l.id === lesson.id)
                                                                            if (actualLessonIndex === -1) return

                                                                            // Calculate target index based on midpoint
                                                                            const targetIndex = isAboveMidpoint ? actualLessonIndex : actualLessonIndex + 1

                                                                            // Only update if the target index has actually changed
                                                                            if (dragOverInfo?.lessonIndex !== targetIndex ||
                                                                                dragOverInfo?.unitId !== unit.id) {
                                                                                setDragOverInfo({ unitId: unit.id, lessonIndex: targetIndex })
                                                                            }
                                                                        }
                                                                    }}
                                                                    onDragEnter={(e) => {
                                                                        e.preventDefault()
                                                                        e.stopPropagation()
                                                                        if (draggedResource) {
                                                                            handleDragEnter(lesson.id)
                                                                        }
                                                                    }}
                                                                    onDragLeave={(e) => {
                                                                        e.preventDefault()
                                                                        e.stopPropagation()
                                                                        if (draggedResource) {
                                                                            // Only clear if leaving to a non-drop-zone element
                                                                            const relatedTarget = e.relatedTarget as HTMLElement
                                                                            if (!relatedTarget?.closest('[data-lesson-drop-zone]')) {
                                                                                setDragOverLesson(null)
                                                                            }
                                                                        } else if (draggedItem?.type === 'lesson') {
                                                                            // Clear drag over info if leaving the lessons area
                                                                            const relatedTarget = e.relatedTarget as HTMLElement
                                                                            if (!relatedTarget?.closest('.ml-4')) {
                                                                                setDragOverInfo(null)
                                                                            }
                                                                        }
                                                                    }}
                                                                    onDrop={(e) => {
                                                                        e.preventDefault()
                                                                        e.stopPropagation()
                                                                        if (draggedResource) {
                                                                            handleDrop(e, unit.id, lesson.id)
                                                                        } else if (draggedItem?.type === 'lesson') {
                                                                            handleBuilderDrop(e)
                                                                        }
                                                                    }}
                                                                >
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <div className="flex items-center gap-2">
                                                                            {(unit.lessons.length > 1 || units.length > 1) && (
                                                                                <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                                                                            )}
                                                                            <Input
                                                                                value={lesson.title}
                                                                                onChange={(e) => {
                                                                                    updateLessonTitle(unit.id, lesson.id, e.target.value)
                                                                                    if (showValidation && validationErrors.lessons?.[lesson.id]) {
                                                                                        setValidationErrors(prev => {
                                                                                            const newErrors = { ...prev }
                                                                                            if (newErrors.lessons) {
                                                                                                delete newErrors.lessons[lesson.id]
                                                                                                if (Object.keys(newErrors.lessons).length === 0) {
                                                                                                    delete newErrors.lessons
                                                                                                }
                                                                                            }
                                                                                            return newErrors
                                                                                        })
                                                                                    }
                                                                                }}
                                                                                className={cn(
                                                                                    "text-sm font-medium bg-transparent border-none px-0 focus:ring-0",
                                                                                    showValidation && validationErrors.lessons?.[lesson.id] && "text-red-500"
                                                                                )}
                                                                            />
                                                                            {showValidation && validationErrors.lessons?.[lesson.id] && (
                                                                                <p className="text-xs text-red-500 ml-2">{validationErrors.lessons[lesson.id]}</p>
                                                                            )}
                                                                        </div>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            onClick={() => removeLesson(unit.id, lesson.id)}
                                                                            disabled={unit.lessons.length === 1}
                                                                        >
                                                                            <X className="h-3 w-3" />
                                                                        </Button>
                                                                    </div>

                                                                    {lesson.resources.length > 0 ? (
                                                                        <div className="space-y-1">
                                                                            {getReorderedResources(unit.id, lesson.id, lesson.resources).map((resource, resourceIndex) => {
                                                                                const Icon = activityIcons[resource.type]
                                                                                const isBeingDraggedResource = draggedItem?.type === 'resource' && draggedItem?.resourceId === resource.id

                                                                                return (
                                                                                    <div
                                                                                        key={resource.id}
                                                                                        className={cn(
                                                                                            "flex items-center justify-between p-2 bg-gray-50 rounded text-xs relative transition-all",
                                                                                            isBeingDraggedResource && "opacity-50"
                                                                                        )}
                                                                                        draggable={lesson.resources.length > 1 || units.some(u => u.lessons.length > 1) || units.some(u => u.lessons.some(l => l.id !== lesson.id && l.resources.length > 0))}
                                                                                        onDragStart={(e) => {
                                                                                            e.stopPropagation()
                                                                                            handleBuilderDragStart(e, {
                                                                                                type: 'resource',
                                                                                                unitId: unit.id,
                                                                                                lessonId: lesson.id,
                                                                                                resourceId: resource.id,
                                                                                                data: resource,
                                                                                                originalIndex: resourceIndex
                                                                                            })
                                                                                        }}
                                                                                        onDragEnd={handleBuilderDragEnd}
                                                                                        onDragOver={(e) => {
                                                                                            if (draggedItem?.type === 'resource') {
                                                                                                e.stopPropagation()
                                                                                                e.preventDefault()

                                                                                                // Only allow reordering within the same lesson
                                                                                                if (draggedItem.unitId !== unit.id || draggedItem.lessonId !== lesson.id) {
                                                                                                    return
                                                                                                }

                                                                                                // Skip if this is the item being dragged
                                                                                                if (draggedItem.resourceId === resource.id) {
                                                                                                    return
                                                                                                }

                                                                                                const rect = e.currentTarget.getBoundingClientRect()
                                                                                                const midpoint = rect.top + rect.height / 2
                                                                                                const isAboveMidpoint = e.clientY < midpoint

                                                                                                // Find the actual index of this resource in the ORIGINAL array
                                                                                                const actualResourceIndex = lesson.resources.findIndex(r => r.id === resource.id)
                                                                                                if (actualResourceIndex === -1) return

                                                                                                // Calculate target index based on midpoint
                                                                                                const targetIndex = isAboveMidpoint ? actualResourceIndex : actualResourceIndex + 1

                                                                                                // Only update if the target index has actually changed
                                                                                                if (dragOverInfo?.resourceIndex !== targetIndex ||
                                                                                                    dragOverInfo?.unitId !== unit.id ||
                                                                                                    dragOverInfo?.lessonId !== lesson.id) {
                                                                                                    setDragOverInfo({
                                                                                                        unitId: unit.id,
                                                                                                        lessonId: lesson.id,
                                                                                                        resourceIndex: targetIndex
                                                                                                    })
                                                                                                }
                                                                                            }
                                                                                        }}
                                                                                        onDragLeave={(e) => {
                                                                                            if (draggedItem?.type === 'resource') {
                                                                                                e.stopPropagation()
                                                                                                // Only clear if leaving the resources area
                                                                                                const relatedTarget = e.relatedTarget as HTMLElement
                                                                                                if (!relatedTarget?.closest('.space-y-1')) {
                                                                                                    setDragOverInfo(null)
                                                                                                }
                                                                                            }
                                                                                        }}
                                                                                        onDrop={(e) => {
                                                                                            if (draggedItem?.type === 'resource') {
                                                                                                e.stopPropagation()
                                                                                                e.preventDefault()
                                                                                                handleBuilderDrop(e)
                                                                                            }
                                                                                        }}
                                                                                    >
                                                                                        <div className="flex items-center gap-2">
                                                                                            {(lesson.resources.length > 1 || units.some(u => u.lessons.some(l => l.id !== lesson.id && l.resources.length > 0))) && (
                                                                                                <GripVertical className="h-3 w-3 text-gray-400 cursor-move" />
                                                                                            )}
                                                                                            <Icon className="h-3 w-3" />
                                                                                            <span className="truncate">{resource.title}</span>
                                                                                            <Badge variant="secondary" className="text-xs px-1 py-0">
                                                                                                {resource.xp} XP
                                                                                            </Badge>
                                                                                        </div>
                                                                                        <Button
                                                                                            size="sm"
                                                                                            variant="ghost"
                                                                                            onClick={() => removeResourceFromLesson(unit.id, lesson.id, resource.id)}
                                                                                            className="h-6 w-6 p-0"
                                                                                        >
                                                                                            <X className="h-3 w-3" />
                                                                                        </Button>
                                                                                    </div>
                                                                                )
                                                                            })}
                                                                            <div className="text-xs text-muted-foreground pt-1">
                                                                                Total: {lesson.resources.length} resources • {totalXP} XP
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className={cn(
                                                                            "text-xs text-muted-foreground py-4 text-center border-2 border-dashed rounded",
                                                                            dragOverLesson === lesson.id ? "border-blue-500 text-blue-600" : "border-gray-200"
                                                                        )}>
                                                                            {dragOverLesson === lesson.id ? (
                                                                                <span>Drop resource here</span>
                                                                            ) : (
                                                                                <span>Drag resources here</span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )
                                                        })}

                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-full"
                                                            onClick={() => addLesson(unit.id)}
                                                        >
                                                            <Plus className="h-3 w-3 mr-1" />
                                                            Add Lesson
                                                        </Button>
                                                    </div>
                                                </div>
                                            )
                                        })}

                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                className="flex-1"
                                                onClick={addUnit}
                                            >
                                                <Plus className="h-4 w-4 mr-2" />
                                                Add Unit
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Course Summary */}
                            <div className="bg-white rounded-lg border">
                                <div className="p-4 border-b">
                                    <h3 className="font-semibold">Course Summary</h3>
                                    <p className="text-sm text-muted-foreground">Overview of your course content</p>
                                </div>
                                <div className="p-4">
                                    {(() => {
                                        const totalResources = units.reduce((sum, unit) =>
                                            sum + unit.lessons.reduce((lSum, lesson) =>
                                                lSum + lesson.resources.length, 0), 0)
                                        const totalXP = units.reduce((sum, unit) =>
                                            sum + unit.lessons.reduce((lSum, lesson) =>
                                                lSum + lesson.resources.reduce((rSum, r) => rSum + r.xp, 0), 0), 0)
                                        const resourcesByType = units.reduce((acc, unit) => {
                                            unit.lessons.forEach(lesson => {
                                                lesson.resources.forEach(resource => {
                                                    acc[resource.type] = (acc[resource.type] || 0) + 1
                                                })
                                            })
                                            return acc
                                        }, {} as Record<ActivityType, number>)

                                        if (totalResources === 0) {
                                            return (
                                                <div className="text-center py-8 text-muted-foreground">
                                                    <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                                    <p className="text-sm">No resources added yet</p>
                                                    <p className="text-xs mt-1">Drag resources from the left panel to add them to lessons</p>
                                                </div>
                                            )
                                        }

                                        return (
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                                    <span className="text-sm font-medium">Total Units</span>
                                                    <span className="font-semibold">{units.length}</span>
                                                </div>
                                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                                    <span className="text-sm font-medium">Total Lessons</span>
                                                    <span className="font-semibold">
                                                        {units.reduce((sum, unit) => sum + unit.lessons.length, 0)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                                    <span className="text-sm font-medium">Total Resources</span>
                                                    <span className="font-semibold">{totalResources}</span>
                                                </div>
                                                <div className="flex justify-between items-center p-3 bg-yellow-50 rounded">
                                                    <span className="text-sm font-medium flex items-center gap-1">
                                                        <Sparkles className="h-4 w-4 text-yellow-500" />
                                                        Total XP
                                                    </span>
                                                    <span className="font-semibold text-yellow-700">{totalXP} XP</span>
                                                </div>

                                                {Object.keys(resourcesByType).length > 0 && (
                                                    <div className="pt-2 border-t">
                                                        <p className="text-xs font-medium text-gray-600 mb-2">Resources by Type</p>
                                                        <div className="space-y-1">
                                                            {Object.entries(resourcesByType).map(([type, count]) => {
                                                                const Icon = activityIcons[type as ActivityType]
                                                                return (
                                                                    <div key={type} className="flex items-center justify-between text-sm">
                                                                        <span className="flex items-center gap-2">
                                                                            <Icon className="h-3 w-3" />
                                                                            {type}s
                                                                        </span>
                                                                        <span>{count}</span>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })()}
                                </div>
                            </div>

                        </div>

                        {/* Action Bar - Fixed at bottom */}
                        <div className="flex-shrink-0 bg-white border-t p-3">
                            {!courseHasContent && (
                                <p className="text-xs text-orange-500 text-center mb-2">
                                    All units must have lessons, and all lessons must have resources
                                </p>
                            )}
                            <Button
                                className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                onClick={handleGenerateCourse}
                                disabled={isGenerating || !courseHasContent}
                                title={!courseHasContent ? "Add resources to all lessons before generating" : undefined}
                            >
                                {isGenerating ? "Generating..." : "Generate Course"}
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Multi-step Loader */}
            <MultiStepLoader loading={isGenerating} loadingStates={loadingSteps} value={currentStep} loop={false} />

            {/* Resource Detail Dialog */}
            <Dialog open={!!selectedResource} onOpenChange={(open) => !open && setSelectedResource(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh]">
                    {selectedResource && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                                    {(() => {
                                        const Icon = activityIcons[selectedResource.type]
                                        return <Icon className="h-5 w-5" />
                                    })()}
                                    {selectedResource.title}
                                    {addedResourceIds.has(selectedResource.id) && (
                                        <Badge
                                            variant="outline"
                                            className="ml-auto gap-1 bg-green-50 text-green-700 border-green-200"
                                        >
                                            <Check className="h-3 w-3" />
                                            Added to course
                                        </Badge>
                                    )}
                                </DialogTitle>
                                <DialogDescription>
                                    Resource ID: {selectedResource.id}
                                </DialogDescription>
                            </DialogHeader>

                            <ScrollArea className="max-h-[60vh] pr-4">
                                <div className="space-y-6">
                                    {/* Resource Type & XP */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <h3 className="text-sm font-semibold text-gray-600 mb-2">Type</h3>
                                            <Badge
                                                variant="outline"
                                                className={cn("gap-1", activityColors[selectedResource.type])}
                                            >
                                                {(() => {
                                                    const Icon = activityIcons[selectedResource.type]
                                                    return <Icon className="h-3 w-3" />
                                                })()}
                                                {selectedResource.type}
                                            </Badge>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-gray-600 mb-2">XP Value</h3>
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="h-4 w-4 text-yellow-500" />
                                                <span className="font-semibold text-lg">{selectedResource.xp} XP</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Subject & Course */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <h3 className="text-sm font-semibold text-gray-600 mb-2">Subject</h3>
                                            <p className="text-sm">
                                                {selectedResource.subjectSlug || <span className="text-gray-400">Not specified</span>}
                                            </p>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-gray-600 mb-2">Course</h3>
                                            <p className="text-sm">
                                                {selectedResource.courseSlug || <span className="text-gray-400">Not specified</span>}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Launch URL */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-600 mb-2">Launch URL</h3>
                                        {selectedResource.launchUrl ? (
                                            <div className="flex items-center gap-2">
                                                <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-1 overflow-x-auto">
                                                    {selectedResource.launchUrl}
                                                </code>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    asChild
                                                >
                                                    <a
                                                        href={selectedResource.launchUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        <ExternalLink className="h-4 w-4 mr-1" />
                                                        Open
                                                    </a>
                                                </Button>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-400">No launch URL available</p>
                                        )}
                                    </div>

                                    {/* Standards */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-600 mb-2">
                                            CASE Standards ({selectedResource.caseIds.length})
                                        </h3>
                                        {selectedResource.caseIds.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {selectedResource.caseIds.map((id) => {
                                                    const hcs = caseMap[id]
                                                    return hcs ? (
                                                        <Badge key={id} variant="outline">
                                                            {hcs}
                                                        </Badge>
                                                    ) : (
                                                        <Badge key={id} variant="outline" className="text-gray-400">
                                                            {id.slice(0, 8)}...
                                                        </Badge>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-400">No standards associated</p>
                                        )}
                                    </div>

                                    {/* Raw CASE IDs (for debugging) */}
                                    {selectedResource.caseIds.length > 0 && (
                                        <details className="cursor-pointer">
                                            <summary className="text-sm font-semibold text-gray-600 mb-2">
                                                Raw CASE IDs (Technical Details)
                                            </summary>
                                            <div className="mt-2 space-y-1">
                                                {selectedResource.caseIds.map((id) => (
                                                    <code key={id} className="block text-xs bg-gray-100 px-2 py-1 rounded">
                                                        {id}
                                                    </code>
                                                ))}
                                            </div>
                                        </details>
                                    )}
                                </div>
                            </ScrollArea>

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button
                                    variant="outline"
                                    onClick={() => setSelectedResource(null)}
                                >
                                    Close
                                </Button>
                                {selectedResource.launchUrl && (
                                    <Button asChild>
                                        <a
                                            href={selectedResource.launchUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            <ExternalLink className="h-4 w-4 mr-2" />
                                            Open Resource
                                        </a>
                                    </Button>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}