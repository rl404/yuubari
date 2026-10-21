import assert from 'node:assert/strict';
import test from 'node:test';
import { retryAfterMs } from '../src/lib/retry-after.ts';
import {
	copyValue,
	emojiCode,
	entryKey,
	filterEntries,
	loadGuilds,
	parseGuildEntries,
	readFavourites
} from '../src/lib/catalog.ts';

const guild = { id: '100', name: 'Brawl Stars', features: ['DISCOVERABLE'] };
const payload = {
	data: {
		emojis: [
			{ id: '744766264823513149', name: 'Badge11', animated: false },
			{ id: '814929532996943872', name: 'Clock', animated: true }
		],
		stickers: [
			{ id: '200', name: 'Lottie', format_type: 3 },
			{ id: '201', name: 'AnimatedSticker', format_type: 4 }
		]
	}
};

test('Discord codes preserve full snowflake IDs and distinguish an animated clock', () => {
	assert.equal(emojiCode(payload.data.emojis[0]), '<:Badge11:744766264823513149>');
	assert.equal(emojiCode(payload.data.emojis[1]), '<a:Clock:814929532996943872>');
	assert.equal(emojiCode({ id: '1', name: 'Static' }), '<:Static:1>');
});

test('copy format changes the value without breaking sticker links or animated assets', () => {
	const entries = parseGuildEntries(guild, payload);
	const clock = entries.find((entry) => entry.name === 'Clock');
	assert.equal(copyValue(clock, 'code'), '<a:Clock:814929532996943872>');
	assert.match(copyValue(clock, 'link'), /814929532996943872\.gif\?size=128$/);
	assert.match(clock.imageUrl, /animated=true/);
	const lottie = entries.find((entry) => entry.name === 'Lottie');
	assert.equal(lottie.imageUrl, undefined);
	assert.match(copyValue(lottie, 'code'), /\/stickers\/200\.json$/);
	const gif = entries.find((entry) => entry.id === '201');
	assert.match(gif.imageUrl, /201\.gif$/);
});

test('stickers use Discord’s format-specific hosts for both preview and copied links', () => {
	const entries = parseGuildEntries(guild, {
		data: {
			emojis: [],
			stickers: [1, 2, 3, 4].map((format_type) => ({
				id: String(200 + format_type),
				name: `Format${format_type}`,
				format_type
			}))
		}
	});
	const expected = [
		'https://cdn.discordapp.com/stickers/201.png',
		'https://cdn.discordapp.com/stickers/202.png',
		'https://cdn.discordapp.com/stickers/203.json',
		'https://media.discordapp.net/stickers/204.gif'
	];
	for (const [index, entry] of entries.entries()) {
		assert.equal(entry.assetUrl, expected[index]);
		assert.equal(entry.imageUrl, index === 2 ? undefined : expected[index]);
		assert.equal(copyValue(entry, 'code'), expected[index]);
		assert.equal(copyValue(entry, 'link'), expected[index]);
		assert.equal(entry.animated, index !== 0);
	}
});

test('malformed payloads fail visibly instead of silently dropping collection entries', () => {
	assert.throws(() => parseGuildEntries(guild, { data: { emojis: [] } }));
	assert.throws(() =>
		parseGuildEntries(guild, { data: { emojis: [{ id: 123, name: 'bad' }], stickers: [] } })
	);
	assert.throws(() =>
		parseGuildEntries(guild, { data: { emojis: [{ id: '../bad', name: 'bad' }], stickers: [] } })
	);
	const [fallback] = parseGuildEntries(guild, {
		data: { emojis: [{ id: '1', name: null }], stickers: [] }
	});
	assert.equal(fallback.code, '<:emoji:1>');
});

test('search combines emoji/server words, IDs, format, server and favourite filters', () => {
	const entries = parseGuildEntries(guild, payload);
	const clock = entries.find((entry) => entry.name === 'Clock');
	const filters = {
		query: 'BRAWL clock',
		kind: 'emoji',
		guildId: '',
		animation: 'all',
		favouritesOnly: false,
		favourites: new Set()
	};
	assert.deepEqual(
		filterEntries(entries, filters).map((entry) => entry.id),
		[clock.id]
	);
	assert.equal(filterEntries(entries, { ...filters, animation: 'static' }).length, 0);
	assert.equal(filterEntries(entries, { ...filters, query: clock.id }).length, 1);
	assert.equal(filterEntries(entries, { ...filters, query: '', guildId: '999' }).length, 0);
	assert.equal(filterEntries(entries, { ...filters, favouritesOnly: true }).length, 0);
	assert.equal(
		filterEntries(entries, {
			...filters,
			favouritesOnly: true,
			favourites: new Set([entryKey(clock)])
		}).length,
		1
	);
});

test('corrupt and blocked local storage do not prevent browsing; invalid favourite keys are ignored', () => {
	assert.equal(readFavourites({ getItem: () => '{broken' }, 'key').size, 0);
	assert.equal(
		readFavourites(
			{
				getItem: () => {
					throw new Error('blocked');
				}
			},
			'key'
		).size,
		0
	);
	assert.deepEqual(
		[
			...readFavourites(
				{ getItem: () => '["emoji:123","sticker:456","token","emoji:bad",42]' },
				'key'
			)
		],
		['emoji:123', 'sticker:456']
	);
});

test('collection loads all eligible guilds with bounded concurrency and recoverable failures', async () => {
	const guilds = Array.from({ length: 7 }, (_, index) => ({ ...guild, id: String(index + 1) }));
	guilds.push({ id: '99', name: 'Private', features: [] });
	let active = 0;
	let maximum = 0;
	const requests = [];
	const updates = [];
	await loadGuilds(guilds, (state) => updates.push(state), {
		fetch: async (url) => {
			requests.push(url);
			maximum = Math.max(maximum, ++active);
			await new Promise((resolve) => setTimeout(resolve, 2));
			active--;
			return url.includes('/4/') ? new Response('', { status: 429 }) : Response.json(payload);
		}
	});
	assert.equal(maximum, 3);
	assert.equal(requests.length, 7);
	assert.equal(updates.filter((state) => state.status === 'loaded').length, 6);
	assert.match(updates.find((state) => state.status === 'error').error, /retry/);
	assert.ok(!requests.some((url) => url.includes('/99/')));
});

test('aborting a load stops queued guild requests and stale completion updates', async () => {
	const controller = new AbortController();
	const updates = [];
	let requests = 0;
	await loadGuilds([guild, { ...guild, id: '101' }], (state) => updates.push(state), {
		concurrency: 1,
		signal: controller.signal,
		fetch: async () => {
			requests++;
			controller.abort();
			return Response.json(payload);
		}
	});
	assert.equal(requests, 1);
	assert.equal(updates.filter((state) => state.status === 'loaded').length, 0);
});

test('retry delays accept fractional seconds and HTTP dates without inventing a cooldown', () => {
	const now = Date.parse('2026-10-21T12:00:00Z');
	assert.equal(retryAfterMs('1.25', now), 1250);
	assert.equal(retryAfterMs('Wed, 21 Oct 2026 12:00:05 GMT', now), 5000);
	for (const value of [
		null,
		'',
		' ',
		'-2',
		'invalid',
		'Infinity',
		'Wed, 21 Oct 2026 11:59:00 GMT'
	]) {
		assert.equal(retryAfterMs(value, now), 0);
	}
});

test('rate-limited server failures retain their status and retry deadline for recovery', async () => {
	const updates = [];
	const before = Date.now();
	await loadGuilds([guild, { ...guild, id: '101' }], (state) => updates.push(state), {
		fetch: async (url) =>
			url.includes('/100/')
				? new Response('', { status: 429, headers: { 'Retry-After': '1.25' } })
				: new Response('', { status: 403 })
	});
	const limited = updates.find((state) => state.guildId === '100' && state.status === 'error');
	assert.equal(limited.statusCode, 429);
	assert.ok(limited.retryAt >= before + 1250 && limited.retryAt <= Date.now() + 1250);
	const forbidden = updates.find((state) => state.guildId === '101' && state.status === 'error');
	assert.equal(forbidden.statusCode, 403);
	assert.equal(forbidden.retryAt, undefined);
});

test('a temporary Discord rate limit is retried automatically before advancing the queue', async () => {
	const requests = [];
	const updates = [];
	await loadGuilds([guild, { ...guild, id: '101' }], (state) => updates.push(state), {
		concurrency: 1,
		fetch: async (url) => {
			requests.push({ url, at: Date.now() });
			return requests.length === 1
				? new Response('', { status: 429, headers: { 'Retry-After': '0.03' } })
				: Response.json(payload);
		}
	});
	assert.equal(updates.filter((state) => state.status === 'loaded').length, 2);
	assert.equal(updates.filter((state) => state.status === 'error').length, 0);
	assert.equal(requests.length, 3);
	assert.ok(requests[0].url.includes('/100/') && requests[1].url.includes('/100/'));
	assert.ok(requests[1].at - requests[0].at >= 30);
});

test('a shared cooldown pauses other workers before they start more queued requests', async () => {
	const requests = [];
	const targets = Array.from({ length: 6 }, (_, i) => ({ ...guild, id: String(100 + i) }));
	let first = true;
	await loadGuilds(targets, () => {}, {
		fetch: async (url) => {
			requests.push({ url, at: Date.now() });
			if (url.includes('/100/') && first) {
				first = false;
				return new Response('', { status: 429, headers: { 'Retry-After': '0.04' } });
			}
			await new Promise((resolve) => setTimeout(resolve, 5));
			return Response.json(payload);
		}
	});
	const queued = requests.filter(({ url }) => /\/(103|104|105)\//.test(url));
	assert.equal(queued.length, 3);
	assert.ok(queued.every(({ at }) => at - requests[0].at >= 40));
});

test('automatic rate-limit recovery is bounded and long cooldowns stop further requests', async () => {
	let requests = 0;
	const updates = [];
	await loadGuilds([guild], (state) => updates.push(state), {
		fetch: async () => {
			requests++;
			return new Response('', { status: 429, headers: { 'Retry-After': '0.01' } });
		}
	});
	assert.equal(requests, 3);
	assert.equal(updates.filter((state) => state.status === 'error').length, 1);
	requests = 0;
	const paused = [];
	await loadGuilds([guild, { ...guild, id: '101' }], (state) => paused.push(state), {
		concurrency: 1,
		fetch: async () => {
			requests++;
			return new Response('', { status: 429, headers: { 'Retry-After': '30' } });
		}
	});
	assert.equal(requests, 1);
	assert.equal(paused.filter((state) => state.status === 'error').length, 2);
	assert.ok(
		paused.filter((state) => state.status === 'error').every((state) => state.retryAt > Date.now())
	);
});

test('cancelling while waiting for a rate limit ends recovery without another request', async () => {
	const controller = new AbortController();
	const updates = [];
	let requests = 0;
	await loadGuilds(
		[guild],
		(state) => {
			updates.push(state);
			if (state.status === 'loading' && state.retryAt) controller.abort();
		},
		{
			signal: controller.signal,
			fetch: async () => {
				requests++;
				return new Response('', { status: 429, headers: { 'Retry-After': '1' } });
			}
		}
	);
	assert.equal(requests, 1);
	assert.equal(controller.signal.aborted, true);
	assert.equal(updates.filter((state) => state.status === 'error').length, 0);
});
