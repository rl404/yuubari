import { DISCORD_CDN_HOST, DISCORD_MEDIA_HOST } from './const.ts';
import { retryAfterMs, waitForRetry } from './retry-after.ts';

export type CopyMode = 'code' | 'link';
export type AssetKind = 'emoji' | 'sticker';

export type CatalogGuild = {
	id: string;
	name: string;
	icon?: string | null;
	features: string[];
};

export type CatalogEntry = {
	id: string;
	name: string;
	kind: AssetKind;
	guildId: string;
	guildName: string;
	animated: boolean;
	imageUrl?: string;
	assetUrl: string;
	code?: string;
};

export type GuildState = {
	guildId: string;
	status: 'loading' | 'loaded' | 'error';
	entries: CatalogEntry[];
	error?: string;
	statusCode?: number;
	retryAt?: number;
};

export function emojiCode(emoji: { id: string; name: string; animated?: boolean }): string {
	return `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`;
}

export function entryKey(entry: Pick<CatalogEntry, 'kind' | 'id'>): string {
	return `${entry.kind}:${entry.id}`;
}

export function copyValue(entry: CatalogEntry, mode: CopyMode): string {
	return mode === 'code' && entry.kind === 'emoji' ? entry.code || '' : entry.assetUrl;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function validId(value: unknown): value is string {
	return typeof value === 'string' && /^\d{1,20}$/.test(value);
}

export function parseGuildEntries(guild: CatalogGuild, body: unknown): CatalogEntry[] {
	if (!isRecord(body) || !isRecord(body.data)) throw new Error('Unexpected server response.');
	const { emojis, stickers } = body.data;
	if (!Array.isArray(emojis) || !Array.isArray(stickers)) {
		throw new Error('Unexpected server response.');
	}
	const entries: CatalogEntry[] = [];
	for (const value of emojis) {
		if (
			!isRecord(value) ||
			!validId(value.id) ||
			(typeof value.name !== 'string' && value.name !== null) ||
			(value.animated !== undefined && typeof value.animated !== 'boolean')
		) {
			throw new Error('Unexpected emoji data.');
		}
		const name = typeof value.name === 'string' && value.name ? value.name : 'emoji';
		const animated = value.animated === true;
		const imageUrl = `${DISCORD_CDN_HOST}/emojis/${value.id}.webp?animated=${animated}&size=128`;
		entries.push({
			id: value.id,
			name,
			kind: 'emoji',
			guildId: guild.id,
			guildName: guild.name,
			animated,
			imageUrl,
			assetUrl: `${DISCORD_CDN_HOST}/emojis/${value.id}.${animated ? 'gif' : 'png'}?size=128`,
			code: emojiCode({ id: value.id, name, animated })
		});
	}
	for (const value of stickers) {
		if (
			!isRecord(value) ||
			!validId(value.id) ||
			typeof value.name !== 'string' ||
			typeof value.format_type !== 'number' ||
			![1, 2, 3, 4].includes(value.format_type)
		) {
			throw new Error('Unexpected sticker data.');
		}
		const format = value.format_type;
		// Discord serves GIF stickers from its media host, not the standard CDN.
		const host = format === 4 ? DISCORD_MEDIA_HOST : DISCORD_CDN_HOST;
		const assetUrl = `${host}/stickers/${value.id}.${format === 3 ? 'json' : format === 4 ? 'gif' : 'png'}`;
		entries.push({
			id: value.id,
			name: value.name,
			kind: 'sticker',
			guildId: guild.id,
			guildName: guild.name,
			animated: format !== 1,
			imageUrl: format === 3 ? undefined : assetUrl,
			assetUrl
		});
	}
	return entries.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

export type CatalogFilters = {
	query: string;
	kind: AssetKind;
	guildId: string;
	animation: 'all' | 'static' | 'animated';
	favouritesOnly: boolean;
	favourites: ReadonlySet<string>;
};

export function filterEntries(entries: CatalogEntry[], filters: CatalogFilters): CatalogEntry[] {
	const words = filters.query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
	return entries.filter((entry) => {
		if (entry.kind !== filters.kind) return false;
		if (filters.guildId && entry.guildId !== filters.guildId) return false;
		if (filters.favouritesOnly && !filters.favourites.has(entryKey(entry))) return false;
		if (filters.animation === 'static' && entry.animated) return false;
		if (filters.animation === 'animated' && !entry.animated) return false;
		const text = `${entry.name} ${entry.guildName} ${entry.id}`.toLocaleLowerCase();
		return words.every((word) => text.includes(word));
	});
}

export function readFavourites(storage: Pick<Storage, 'getItem'>, key: string): Set<string> {
	try {
		const value: unknown = JSON.parse(storage.getItem(key) || '[]');
		if (!Array.isArray(value)) return new Set();
		return new Set(
			value.filter(
				(item): item is string =>
					typeof item === 'string' && /^(emoji|sticker):\d{1,20}$/.test(item)
			)
		);
	} catch {
		return new Set();
	}
}

// Application retry budget, not a hard-coded Discord request limit.
const maxRateLimitRetries = 2;
const maxAutomaticWaitMs = 10_000;

export async function loadGuilds(
	guilds: CatalogGuild[],
	onUpdate: (state: GuildState) => void,
	options: {
		signal?: AbortSignal;
		fetch?: typeof fetch;
		concurrency?: number;
		refresh?: boolean;
	} = {}
): Promise<void> {
	const request = options.fetch || fetch;
	const eligible = guilds.filter((guild) => guild.features.includes('DISCOVERABLE'));
	let cursor = 0;
	// Pause the whole batch conservatively: the proxy may have hit a shared/global limit.
	let pauseUntil = 0;
	async function worker() {
		while (cursor < eligible.length && !options.signal?.aborted) {
			const guild = eligible[cursor++];
			onUpdate({ guildId: guild.id, status: 'loading', entries: [] });
			let statusCode: number | undefined;
			let retryAt: number | undefined;
			try {
				for (let attempt = 0; ; attempt++) {
					while (pauseUntil > Date.now()) {
						const delay = pauseUntil - Date.now();
						if (delay > maxAutomaticWaitMs) {
							statusCode = 429;
							retryAt = pauseUntil;
							throw new Error(
								'Loading paused by Discord’s rate limit. Please retry after the countdown.'
							);
						}
						if (!(await waitForRetry(delay, options.signal))) return;
					}
					if (options.signal?.aborted) return;
					statusCode = undefined;
					retryAt = undefined;
					const response = await request(`/api/guilds/${guild.id}/emojis_stickers`, {
						signal: options.signal,
						cache: options.refresh ? 'reload' : undefined
					});
					if (response.ok) {
						const entries = parseGuildEntries(guild, await response.json());
						if (!options.signal?.aborted)
							onUpdate({ guildId: guild.id, status: 'loaded', entries });
						break;
					}
					statusCode = response.status;
					if (statusCode === 429) {
						const delay = retryAfterMs(response.headers.get('Retry-After'));
						if (delay > 0) {
							retryAt = Date.now() + delay;
							pauseUntil = Math.max(pauseUntil, retryAt);
							if (attempt < maxRateLimitRetries && delay <= maxAutomaticWaitMs) {
								onUpdate({ guildId: guild.id, status: 'loading', entries: [], retryAt });
								continue;
							}
						}
					}
					throw new Error(
						statusCode === 429
							? 'Discord rate limit reached. Please retry shortly.'
							: statusCode === 401
								? 'The Discord bot token is invalid. Check your server configuration.'
								: `Could not load this server (${statusCode}).`
					);
				}
			} catch (error) {
				if (options.signal?.aborted) return;
				onUpdate({
					guildId: guild.id,
					status: 'error',
					entries: [],
					statusCode,
					retryAt,
					error: error instanceof Error ? error.message : 'Could not load this server.'
				});
			}
		}
	}
	await Promise.all(
		Array.from({ length: Math.min(eligible.length, Math.max(1, options.concurrency || 3)) }, worker)
	);
}
