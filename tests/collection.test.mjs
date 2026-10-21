import assert from 'node:assert/strict';
import test from 'node:test';
import { get } from 'svelte/store';
import { createServerCollection } from '../src/lib/collection/servers.ts';

const alpha = { id: '100', name: 'Alpha', features: ['DISCOVERABLE'] };
const beta = { id: '101', name: 'Beta', features: ['DISCOVERABLE'] };
const response = (name) =>
	Response.json({
		data: { emojis: [{ id: name.startsWith('Beta') ? '201' : '200', name }], stickers: [] }
	});

test('server refresh retains old data, ignores duplicate requests, and retries only failures', async (t) => {
	const requests = [];
	let finishRefresh;
	const collection = createServerCollection([alpha, beta], async (url, options) => {
		requests.push({ url, cache: options.cache });
		if (requests.length === 3)
			return new Promise((resolve) => {
				finishRefresh = resolve;
			});
		return response(
			url.includes('/101/')
				? 'Beta_original'
				: requests.length > 3
					? 'Alpha_updated'
					: 'Alpha_original'
		);
	});
	t.after(() => collection.destroy());
	await collection.start();
	const before = get(collection).entries;
	const refreshing = collection.reload(alpha);
	assert.equal(get(collection).loading, true);
	assert.deepEqual(get(collection).entries, before);
	await collection.reload(beta);
	assert.equal(requests.length, 3);
	finishRefresh(new Response('', { status: 503 }));
	await refreshing;
	assert.deepEqual(get(collection).entries, before);
	assert.match(get(collection).failed[0].error, /Showing the previous collection/);
	await collection.retryFailed();
	assert.equal(requests.length, 4);
	assert.ok(requests[3].url.includes('/100/'));
	assert.equal(requests[2].cache, 'reload');
	assert.equal(requests[3].cache, 'reload');
	assert.deepEqual(
		get(collection).entries.map((entry) => entry.name),
		['Alpha_updated', 'Beta_original']
	);
	assert.equal(get(collection).failed.length, 0);
});

test('Discord cooldown blocks both individual refresh and bulk retry', async (t) => {
	let requests = 0;
	const collection = createServerCollection([alpha], async () => {
		requests++;
		return new Response('', { status: 429, headers: { 'Retry-After': '30' } });
	});
	t.after(() => collection.destroy());
	await collection.start();
	assert.ok(get(collection.cooldown) >= 29);
	await collection.reload(alpha);
	await collection.retryFailed();
	assert.equal(requests, 1);
});

test('destroy aborts pending server work and prevents late collection updates', async () => {
	let finishRequest;
	let signal;
	const collection = createServerCollection([alpha], async (_url, options) => {
		signal = options.signal;
		return new Promise((resolve) => {
			finishRequest = resolve;
		});
	});
	const loading = collection.start();
	collection.destroy();
	assert.equal(signal.aborted, true);
	finishRequest(response('Alpha_late'));
	await loading;
	assert.equal(get(collection).entries.length, 0);
});
