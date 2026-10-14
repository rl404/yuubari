import assert from 'node:assert/strict';
import test from 'node:test';
import { parseGuildEntries } from '../src/lib/catalog.ts';
import {
	buildOfflineHtml,
	escapeHtml,
	exportEmojis,
	imageDataUrl
} from '../src/lib/offline-export.ts';

const entries = parseGuildEntries(
	{ id: '1', name: 'Server', features: ['DISCOVERABLE'] },
	{
		data: {
			emojis: [
				{ id: '2', name: 'Clock', animated: true },
				{ id: '3', name: 'Badge', animated: false }
			],
			stickers: []
		}
	}
);
const image = 'data:image/png;base64,AQID';

test('offline images preserve exact bytes, MIME type, and animated formats', async () => {
	const bytes = new Uint8Array(70000).map((_, index) => index % 256);
	const url = await imageDataUrl(new Blob([bytes], { type: 'image/webp' }));
	assert.ok(url.startsWith('data:image/webp;base64,'));
	assert.deepEqual(new Uint8Array(Buffer.from(url.split(',')[1], 'base64')), bytes);
	await assert.rejects(imageDataUrl(new Blob(['not an image'], { type: 'text/html' })));
});

test('offline document embeds images and codes with no remote asset dependencies', () => {
	const html = buildOfflineHtml(entries.map((entry) => ({ entry, image })));
	assert.equal((html.match(/<article /g) || []).length, 2);
	assert.equal((html.match(/src="data:image/g) || []).length, 2);
	assert.match(html, /&lt;a:Clock:2&gt;/);
	assert.match(html, /&lt;:Badge:3&gt;/);
	assert.ok(!/<(?:img|script|link)[^>]+(?:src|href)="https?:/.test(html));
	assert.match(html, /default-src 'none'/);
	assert.match(html, /img-src data:/);
	assert.match(html, /id="search"/);
});

test('hostile server and emoji metadata cannot escape attributes, text, or insert scripts', () => {
	const hostile = {
		...entries[0],
		name: '"><script>alert(1)</script>',
		guildName: "</p><img src=x onerror='alert(2)'>",
		code: '<a:Clock:2>'
	};
	const html = buildOfflineHtml([{ entry: hostile, image }]);
	assert.ok(!html.includes('<script>alert(1)</script>'));
	assert.ok(!html.includes('<img src=x'));
	assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
	assert.equal(escapeHtml('&<>"\''), '&amp;&lt;&gt;&quot;&#39;');
	assert.throws(() =>
		buildOfflineHtml([{ entry: hostile, image: 'https://example.com/image.png' }])
	);
});

test('export downloads the entire selected set and reports completion in source order', async () => {
	const progress = [];
	const fetched = [];
	const html = await exportEmojis(entries, {
		fetch: async (url) => {
			fetched.push(url);
			return new Response(new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }));
		},
		onProgress: (done, total) => progress.push([done, total])
	});
	assert.equal(fetched.length, 2);
	assert.deepEqual(progress.at(-1), [2, 2]);
	assert.ok(html.indexOf('alt="Badge"') < html.indexOf('alt="Clock"'));
	assert.equal((html.match(/data:image\/png;base64,AQID/g) || []).length, 2);
});

test('failed downloads and invalid MIME responses prevent an incomplete export', async () => {
	await assert.rejects(
		exportEmojis(entries, { fetch: async () => new Response('missing', { status: 404 }) }),
		/2 images.*No file was saved/
	);
	await assert.rejects(
		exportEmojis(entries, {
			fetch: async () =>
				new Response('<html>error</html>', { headers: { 'content-type': 'text/html' } })
		}),
		/No file was saved/
	);
	await assert.rejects(exportEmojis([], {}), /No emojis/);
});

test('cancelled export produces no downloadable document', async () => {
	const controller = new AbortController();
	await assert.rejects(
		exportEmojis(entries, {
			signal: controller.signal,
			fetch: async () => {
				controller.abort();
				return new Response(new Blob(['x'], { type: 'image/png' }));
			}
		}),
		{ name: 'AbortError' }
	);
});
