import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { unzipSync, strFromU8 } from 'fflate';
import { exportPngs, imageToPng, isPng, planPngFiles } from '../src/lib/png-export.ts';

const pngBytes = new Uint8Array(readFileSync(new URL('../static/logo.png', import.meta.url)));
const png = () => new Blob([pngBytes], { type: 'image/png' });
const entry = (id, name = 'Wave') => ({
	id,
	name,
	kind: 'emoji',
	guildId: '10',
	guildName: 'Server',
	animated: false,
	imageUrl: `https://cdn.discordapp.com/emojis/${id}.webp`,
	assetUrl: `https://cdn.discordapp.com/emojis/${id}.png`,
	code: `<:${name}:${id}>`
});
const response = () => new Response(new Blob(['source'], { type: 'image/webp' }));

test('PNG filenames are portable, unique across case and duplicate names, and cannot escape the archive', () => {
	const files = planPngFiles([
		entry('1', 'Wave'),
		entry('2', 'wave'),
		entry('3', 'wave_2'),
		entry('1', 'duplicate'),
		entry('4', '../../bad\\name:!?'),
		entry('5', 'CON'),
		entry('6', '__proto__'),
		entry('7', 'x'.repeat(300)),
		{ ...entry('8', 'Sticker'), kind: 'sticker' }
	]);
	assert.equal(files.length, 7);
	assert.deepEqual(
		files.slice(0, 3).map((file) => file.filename),
		['Wave.png', 'wave_2.png', 'wave_2_3.png']
	);
	assert.equal(files[4].filename, 'emoji_CON.png');
	assert.equal(new Set(files.map((file) => file.filename.toLowerCase())).size, files.length);
	for (const file of files) {
		assert.match(file.filename, /^[A-Za-z0-9_-]+\.png$/);
		assert.ok(file.filename.length < 200);
	}
	assert.equal(files[0].shortcode, ':Wave:');
	assert.equal(planPngFiles([entry('9', 'line\nbreak')])[0].shortcode, ':line break:');
});

test('selected PNG ZIP round-trips images, exact :emoji: names, and collision mappings', async () => {
	const selected = [
		entry('1', 'Wave'),
		{ ...entry('2', 'Wave'), animated: true },
		entry('3', 'Badge')
	];
	const progress = [];
	const sources = [];
	const blob = await exportPngs([...selected, selected[0]], {
		fetch: async (url) => {
			sources.push(url);
			return response();
		},
		convert: async (source) => {
			assert.equal(await source.text(), 'source');
			return png();
		},
		onProgress: (done, total) => progress.push([done, total])
	});
	assert.equal(blob.type, 'application/zip');
	const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
	assert.deepEqual(
		Object.keys(files).sort(),
		['Badge.png', 'Wave.png', 'Wave_2.png', 'emoji-manifest.json', 'emoji-names.txt'].sort()
	);
	for (const name of ['Badge.png', 'Wave.png', 'Wave_2.png'])
		assert.deepEqual(files[name], pngBytes);
	assert.equal(strFromU8(files['emoji-names.txt']), ':Wave:\n:Wave:\n:Badge:\n');
	const manifest = JSON.parse(strFromU8(files['emoji-manifest.json']));
	assert.deepEqual(
		manifest.map((file) => [file.file, file.shortcode]),
		[
			['Wave.png', ':Wave:'],
			['Wave_2.png', ':Wave:'],
			['Badge.png', ':Badge:']
		]
	);
	assert.equal(manifest[1].animatedSource, true);
	assert.equal(sources.length, 3);
	assert.deepEqual(progress.at(-1), [3, 3]);
	assert.equal(isPng(pngBytes), true);
	assert.equal(isPng(new Uint8Array([1, 2, 3])), false);
});

test('PNG conversion jobs are bounded and every selected image is included', async () => {
	let active = 0;
	let peak = 0;
	const selected = Array.from({ length: 13 }, (_, index) => entry(String(index), `Emoji_${index}`));
	const blob = await exportPngs(selected, {
		fetch: async () => response(),
		convert: async () => {
			active++;
			peak = Math.max(peak, active);
			await new Promise((resolve) => setTimeout(resolve, 2));
			active--;
			return png();
		}
	});
	assert.ok(peak > 1 && peak <= 4);
	assert.equal(
		Object.keys(unzipSync(new Uint8Array(await blob.arrayBuffer()))).filter((name) =>
			name.endsWith('.png')
		).length,
		13
	);
});

test('download failures, invalid conversion bytes, and invalid image MIME never return a partial ZIP', async () => {
	await assert.rejects(
		exportPngs([entry('1'), entry('2')], {
			fetch: async () => new Response('missing', { status: 404 }),
			convert: async () => png()
		}),
		/2 emojis.*No ZIP was saved/
	);
	await assert.rejects(
		exportPngs([entry('1')], {
			fetch: async () => response(),
			convert: async () => new Blob(['not PNG'], { type: 'image/png' })
		}),
		/No ZIP was saved/
	);
	await assert.rejects(exportPngs([{ ...entry('1'), imageUrl: undefined }]), /No ZIP was saved/);
	await assert.rejects(imageToPng(new Blob(['html'], { type: 'text/html' })), /not an image/);
	await assert.rejects(exportPngs([]), /No emojis selected/);
});

test('cancelling before or during conversion discards the whole PNG archive', async () => {
	const before = new AbortController();
	before.abort();
	let requested = 0;
	await assert.rejects(
		exportPngs([entry('1')], {
			signal: before.signal,
			fetch: async () => {
				requested++;
				return response();
			}
		}),
		{ name: 'AbortError' }
	);
	assert.equal(requested, 0);
	const during = new AbortController();
	await assert.rejects(
		exportPngs([entry('1'), entry('2')], {
			signal: during.signal,
			fetch: async () => response(),
			convert: async () => {
				during.abort();
				return png();
			}
		}),
		{ name: 'AbortError' }
	);
});
