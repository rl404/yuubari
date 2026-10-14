import assert from 'node:assert/strict';
import test from 'node:test';
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
