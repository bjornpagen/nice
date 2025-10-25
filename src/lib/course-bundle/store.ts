import * as errors from "@superbuilders/errors"
import type { CourseResourceBundle } from "@/lib/data/fetchers/oneroster"

const bundleByOwner = new WeakMap<object, CourseResourceBundle>()

export function stashBundle<T extends object>(owner: T, bundle: CourseResourceBundle): T {
	bundleByOwner.set(owner, bundle)
	return owner
}

export function requireBundle(owner: object): CourseResourceBundle {
	const bundle = bundleByOwner.get(owner)
	if (!bundle) {
		throw errors.new("course bundle missing for owner")
	}
	return bundle
}
