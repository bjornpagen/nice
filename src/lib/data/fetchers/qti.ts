import { qti } from "@/lib/clients"

export async function getAllQuestionsForTest(identifier: string) {
	"use cache"
	return qti.getAllQuestionsForTest(identifier)
}
