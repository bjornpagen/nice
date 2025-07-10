"use client"

import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import type { CourseSidebarData } from "./course-sidebar"

export function CourseSidebarCourseCarousel({ course }: { course: CourseSidebarData }) {
	void course
	return (
		<div id="course-sidebar-course-carousel">
			<Carousel>
				<CarouselPrevious />
				<CarouselContent>
					<CarouselItem>1</CarouselItem>
					<CarouselItem>2</CarouselItem>
					<CarouselItem>3</CarouselItem>
					<CarouselItem>4</CarouselItem>
					<CarouselItem>5</CarouselItem>
					<CarouselItem>6</CarouselItem>
					<CarouselItem>7</CarouselItem>
					<CarouselItem>8</CarouselItem>
					<CarouselItem>9</CarouselItem>
				</CarouselContent>
				<CarouselNext />
			</Carousel>
		</div>
	)
}
