import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import { env } from "@/env"

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function retryWithBackoff<T>(
	fn: () => Promise<T>,
	options: { retries: number; initialDelay: number }
): Promise<{ data: T | null; error: Error | null }> {
	let lastError: Error | null = null

	for (let i = 0; i < options.retries; i++) {
		const result = await errors.try(fn())
		if (result.error) {
			lastError = result.error
			const delay = options.initialDelay * 2 ** i
			logger.warn("operation failed, retrying after delay", {
				attempt: i + 1,
				maxRetries: options.retries,
				delayMs: delay,
				error: lastError
			})
			await sleep(delay)
		} else {
			return { data: result.data, error: null }
		}
	}

	return { data: null, error: lastError }
}

const API_BASE_URL = "https://yt-api.p.rapidapi.com"

const API_HEADERS = {
	"x-rapidapi-key": env.RAPIDAPI_YT_API_KEY,
	"x-rapidapi-host": env.RAPIDAPI_YT_API_HOST
} as const

const YTThumbnailSchema = z.object({
	url: z.string().url(),
	width: z.number(),
	height: z.number()
})

const PlaylistSchema = z.object({
	type: z.literal("playlist"),
	playlistId: z.string(),
	title: z.string(),
	videoCount: z.string(), // API returns this as a string, e.g., "18"
	videoId: z.string(),
	thumbnail: z.array(YTThumbnailSchema)
})
export type Playlist = z.infer<typeof PlaylistSchema>

const ChannelPlaylistsApiResponseSchema = z.object({
	meta: z.record(z.unknown()).optional(), // Meta field is only present on first page
	continuation: z.string().optional().or(z.literal("")),
	data: z.array(PlaylistSchema)
})

const PlaylistItemSchema = z.object({
	type: z.string().optional(), // Can be 'shorts', 'video', etc.
	videoId: z.string(),
	title: z.string(),
	lengthSeconds: z.string().optional(),
	lengthText: z.string().optional(),
	thumbnail: z.array(YTThumbnailSchema),
	isPlayable: z.boolean().optional()
})
export type PlaylistItem = z.infer<typeof PlaylistItemSchema>

const VideoDetailsSchema = z.object({
	id: z.string(),
	title: z.string(),
	lengthSeconds: z.string(),
	keywords: z.array(z.string()).optional(),
	description: z.string(),
	thumbnail: z.array(YTThumbnailSchema),
	channelId: z.string(),
	channelTitle: z.string(),
	viewCount: z.string(),
	category: z.string(),
	publishDate: z.string(),
	isFamilySafe: z.boolean(),
	isUnlisted: z.boolean()
})
export type VideoDetails = z.infer<typeof VideoDetailsSchema>

const PlaylistDetailsApiResponseSchema = z.object({
	meta: z.record(z.unknown()).optional(),
	continuation: z.string().optional().or(z.literal("")),
	data: z.array(PlaylistItemSchema)
})

interface GetChannelPlaylistsParams {
	channelId: string
	continuationToken?: string
}

/**
 * Fetches a single page of playlists for a given YouTube channel.
 *
 * @param params - The channel ID and optional continuation token for pagination.
 * @returns A promise that resolves with the list of playlists and the next continuation token.
 */
export async function getChannelPlaylists(params: GetChannelPlaylistsParams): Promise<{
	playlists: Playlist[]
	continuationToken?: string
}> {
	logger.debug("fetching channel playlists page", { params })

	const operation = async () => {
		const url = new URL(`${API_BASE_URL}/channel/playlists`)
		url.searchParams.set("id", params.channelId)
		if (params.continuationToken) {
			url.searchParams.set("token", params.continuationToken)
		}
		logger.debug("sending request", { url: url.toString() })

		const fetchResult = await errors.try(
			fetch(url.toString(), {
				method: "GET",
				headers: API_HEADERS
			})
		)

		if (fetchResult.error) {
			logger.error("network request failed", { url: url.toString(), error: fetchResult.error })
			throw errors.wrap(fetchResult.error, "yt-api: network request failed")
		}

		const response = fetchResult.data
		logger.debug("received api response", { status: response.status })
		if (!response.ok) {
			const errorText = await response.text()
			logger.error("api request returned non-ok status", {
				status: response.status,
				url: url.toString(),
				body: errorText
			})
			throw errors.new(`yt-api: request failed with status ${response.status}`)
		}

		const jsonResult = await errors.try(response.json())
		if (jsonResult.error) {
			logger.error("failed to parse json response", { error: jsonResult.error })
			throw errors.wrap(jsonResult.error, "yt-api: failed to parse json response")
		}
		const rawBody = jsonResult.data
		logger.debug("parsed raw json response", { body: rawBody })

		const validationResult = ChannelPlaylistsApiResponseSchema.safeParse(rawBody)
		if (!validationResult.success) {
			logger.error("response validation failed", {
				error: validationResult.error,
				body: rawBody // Add raw body to the log
			})
			throw errors.wrap(validationResult.error, "yt-api: response validation failed")
		}
		logger.debug("successfully validated api response")

		return validationResult.data
	}

	const result = await retryWithBackoff(operation, { retries: 3, initialDelay: 1000 })

	if (result.error || !result.data) {
		throw result.error || errors.new("yt-api: unexpected null result data")
	}

	const { data, continuation } = result.data
	const nextToken = continuation ? continuation : undefined
	logger.debug("returning channel playlists", { count: data.length, hasMore: !!nextToken })
	return {
		playlists: data,
		continuationToken: nextToken
	}
}

/**
 * Fetches all playlists for a given YouTube channel by handling pagination automatically.
 *
 * @param channelId - The ID of the YouTube channel.
 * @returns A promise that resolves with an array of all playlists for the channel.
 */
export async function getAllChannelPlaylists(channelId: string): Promise<Playlist[]> {
	logger.info("fetching all channel playlists", { channelId })
	const allPlaylists: Playlist[] = []
	let continuationToken: string | undefined
	let pageNum = 1

	do {
		logger.debug("fetching page of playlists", { pageNum, continuationToken: continuationToken ?? "none" })
		const getPageResult = await errors.try(getChannelPlaylists({ channelId, continuationToken }))
		if (getPageResult.error) {
			logger.error("failed to fetch a page of playlists, aborting", { pageNum, error: getPageResult.error })
			throw getPageResult.error
		}

		const { playlists, continuationToken: nextToken } = getPageResult.data
		allPlaylists.push(...playlists)
		continuationToken = nextToken
		logger.debug("fetched page of playlists successfully", { pageNum, fetchedCount: playlists.length })
		pageNum++
	} while (continuationToken)

	logger.info("finished fetching all channel playlists", { channelId, totalPlaylists: allPlaylists.length })
	return allPlaylists
}

interface GetPlaylistVideosParams {
	playlistId: string
	continuationToken?: string
}

/**
 * Fetches a single page of videos for a given YouTube playlist.
 *
 * @param params - The playlist ID and optional continuation token for pagination.
 * @returns A promise that resolves with the list of videos and the next continuation token.
 */
export async function getPlaylistVideos(params: GetPlaylistVideosParams): Promise<{
	videos: PlaylistItem[]
	continuationToken?: string
}> {
	logger.debug("fetching playlist videos page", { params })

	const operation = async () => {
		const url = new URL(`${API_BASE_URL}/playlist`)
		url.searchParams.set("id", params.playlistId)
		if (params.continuationToken) {
			url.searchParams.set("token", params.continuationToken)
		}
		logger.debug("sending request", { url: url.toString() })

		const fetchResult = await errors.try(
			fetch(url.toString(), {
				method: "GET",
				headers: API_HEADERS
			})
		)

		if (fetchResult.error) {
			logger.error("network request failed", { url: url.toString(), error: fetchResult.error })
			throw errors.wrap(fetchResult.error, "yt-api: network request for playlist videos failed")
		}

		const response = fetchResult.data
		logger.debug("received api response", { status: response.status })
		if (!response.ok) {
			const errorText = await response.text()
			logger.error("api request returned non-ok status", {
				status: response.status,
				url: url.toString(),
				body: errorText
			})
			throw errors.new(`yt-api: playlist videos request failed with status ${response.status}`)
		}

		const jsonResult = await errors.try(response.json())
		if (jsonResult.error) {
			logger.error("failed to parse json response", { error: jsonResult.error })
			throw errors.wrap(jsonResult.error, "yt-api: failed to parse playlist videos json response")
		}
		const rawBody = jsonResult.data
		logger.debug("parsed raw json response", { body: rawBody })

		const validationResult = PlaylistDetailsApiResponseSchema.safeParse(rawBody)
		if (!validationResult.success) {
			logger.error("response validation failed", {
				error: validationResult.error,
				body: rawBody // Add raw body to the log
			})
			throw errors.wrap(validationResult.error, "yt-api: playlist videos response validation failed")
		}
		logger.debug("successfully validated api response")
		return validationResult.data
	}

	const result = await retryWithBackoff(operation, { retries: 3, initialDelay: 1000 })

	if (result.error || !result.data) {
		throw result.error || errors.new("yt-api: unexpected null result data")
	}

	const { data, continuation } = result.data
	const nextToken = continuation ? continuation : undefined
	logger.debug("returning playlist videos", { count: data.length, hasMore: !!nextToken })
	return {
		videos: data,
		continuationToken: nextToken
	}
}

/**
 * Fetches all videos for a given YouTube playlist by handling pagination automatically.
 *
 * @param playlistId - The ID of the YouTube playlist.
 * @returns A promise that resolves with an array of all videos for the playlist.
 */
export async function getAllPlaylistVideos(playlistId: string): Promise<PlaylistItem[]> {
	logger.info("fetching all videos for playlist", { playlistId })
	const allVideos: PlaylistItem[] = []
	let continuationToken: string | undefined
	let pageNum = 1

	do {
		logger.debug("fetching page of videos", { pageNum, continuationToken: continuationToken ?? "none" })
		const getPageResult = await errors.try(getPlaylistVideos({ playlistId, continuationToken }))
		if (getPageResult.error) {
			logger.error("failed to fetch a page of videos, aborting", { pageNum, error: getPageResult.error })
			throw getPageResult.error
		}

		const { videos, continuationToken: nextToken } = getPageResult.data
		allVideos.push(...videos)
		continuationToken = nextToken
		logger.debug("fetched page of videos successfully", { pageNum, fetchedCount: videos.length })
		pageNum++
	} while (continuationToken)

	logger.info("finished fetching all videos for playlist", { playlistId, totalVideos: allVideos.length })
	return allVideos
}

/**
 * Fetches detailed metadata for a single YouTube video.
 *
 * @param videoId - The ID of the YouTube video.
 * @returns A promise that resolves with the detailed video metadata.
 */
export async function getVideoDetails(videoId: string): Promise<VideoDetails> {
	logger.debug("fetching video details", { videoId })

	const operation = async () => {
		const url = new URL(`${API_BASE_URL}/video/info`)
		url.searchParams.set("id", videoId)
		logger.debug("sending request", { url: url.toString() })

		const fetchResult = await errors.try(
			fetch(url.toString(), {
				method: "GET",
				headers: API_HEADERS
			})
		)

		if (fetchResult.error) {
			logger.error("network request failed", { url: url.toString(), error: fetchResult.error })
			throw errors.wrap(fetchResult.error, "yt-api: network request for video details failed")
		}

		const response = fetchResult.data
		logger.debug("received api response", { status: response.status })
		if (!response.ok) {
			const errorText = await response.text()
			logger.error("api request returned non-ok status", {
				status: response.status,
				url: url.toString(),
				body: errorText
			})
			throw errors.new(`yt-api: video details request failed with status ${response.status}`)
		}

		const jsonResult = await errors.try(response.json())
		if (jsonResult.error) {
			logger.error("failed to parse json response", { error: jsonResult.error })
			throw errors.wrap(jsonResult.error, "yt-api: failed to parse video details json response")
		}
		const rawBody = jsonResult.data
		logger.debug("parsed raw json response", { body: rawBody })

		const validationResult = VideoDetailsSchema.safeParse(rawBody)
		if (!validationResult.success) {
			logger.error("response validation failed", {
				error: validationResult.error,
				body: rawBody // Add raw body to the log
			})
			throw errors.wrap(validationResult.error, "yt-api: video details response validation failed")
		}
		logger.debug("successfully validated api response")

		return validationResult.data
	}

	const result = await retryWithBackoff(operation, { retries: 3, initialDelay: 1000 })
	if (result.error || !result.data) {
		throw result.error || errors.new("yt-api: unexpected null result data")
	}

	return result.data
}
