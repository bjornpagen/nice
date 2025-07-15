import { unstable_cacheLife as cacheLife } from "next/cache"
import { qti } from "@/lib/clients"

export async function getAllQuestionsForTest(identifier: string) {
	"use cache"
	cacheLife("curriculum")
	return qti.getAllQuestionsForTest(identifier)
}
