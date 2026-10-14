import type { CatalogEntry } from './catalog.ts';

export function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, (character) => {
		return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] || '';
	});
}

export type OfflineEmoji = { entry: CatalogEntry; image: string };

export function buildOfflineHtml(emojis: OfflineEmoji[]): string {
	const cards = emojis
		.map(({ entry, image }) => {
			if (
				entry.kind !== 'emoji' ||
				!/^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=]*$/i.test(image)
			) {
				throw new Error('Only embedded emoji images can be exported.');
			}
			return `<article class="card" data-search="${escapeHtml(`${entry.name} ${entry.guildName} ${entry.id}`.toLowerCase())}">
<img src="${image}" alt="${escapeHtml(entry.name)}" width="64" height="64" loading="lazy">
<h2>${escapeHtml(entry.name)}</h2><p>${escapeHtml(entry.guildName)}${entry.animated ? ' · Animated' : ''}</p>
<input aria-label="Discord code for ${escapeHtml(entry.name)}" readonly value="${escapeHtml(entry.code || '')}">
<button type="button" data-copy="${escapeHtml(entry.code || '')}">Copy Discord code</button></article>`;
		})
		.join('\n');
	return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>Yuubari · Offline emoji collection</title>
<style>
*{box-sizing:border-box}body{color-scheme:dark;margin:0;background:#1a1a1e;color:#f2f3f5;font:16px system-ui,sans-serif;-webkit-font-smoothing:antialiased}main{max-width:1280px;margin:auto;padding:24px 20px}h1{font-size:24px;font-weight:600;letter-spacing:0;line-height:1.1;margin:0 0 16px}p{color:#b5b5bf}header>p{max-width:600px;line-height:1.7;font-size:14px}label{display:block;margin:28px 0 10px;font-size:13px;font-weight:500}#search{width:100%;min-height:52px;padding:14px 16px;border:1px solid #34343a;border-radius:5px;background:#111113;color:inherit;font:inherit}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin-top:24px}.card{min-width:0;padding:12px;background:#232327;border-radius:5px}.card[hidden]{display:none}.card img{object-fit:contain;display:block;width:48px;height:48px;margin:8px auto 16px}.card h2{font-size:15px;font-weight:600;overflow-wrap:anywhere;margin:0}.card p{font-size:12px;line-height:1.6;overflow-wrap:anywhere;min-height:32px;margin:6px 0 14px}.card input{width:100%;min-height:38px;padding:8px;background:#111113;color:#b5b5bf;border:1px solid #34343a;border-radius:6px;font:11px monospace}.card button{margin-top:10px;width:100%;min-height:44px;padding:10px;background:#5865f2;color:white;border:0;border-radius:4px;cursor:pointer;font:inherit;font-size:12px;transition:background 180ms}.card button:hover{background:#4752c4}:focus-visible{outline:2px solid #5865f2;outline-offset:4px}#status{min-height:24px;font-size:13px}#empty{padding:40px;text-align:center}@media(max-width:480px){main{padding:32px 20px}.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 12px}.card{padding:14px}.card img{width:72px;height:72px}.card h2{font-size:14px}.card button{font-size:11px}}@media(prefers-reduced-motion:reduce){*{transition:none;scroll-behavior:auto}}
</style></head><body><main><header><h1>Your offline library.</h1><p>${emojis.length.toLocaleString('en-US')} emojis. Names, images, animation, and Discord codes are saved in this file. No login or internet connection is needed to browse it.</p></header>
<label for="search">Search by emoji, server, or ID</label><input id="search" type="search" placeholder="Find an emoji…" autocomplete="off"><p id="status" role="status" aria-live="polite"></p>
<section class="grid" aria-label="Emojis">${cards}</section><p id="empty" hidden>No matching emojis.</p></main>
<script>
const cards = Array.from(document.querySelectorAll('.card'));
document.getElementById('search').addEventListener('input', event => {
 const words = event.target.value.trim().toLowerCase().split(/\\s+/).filter(Boolean);
 let visible = 0;
 for (const card of cards) { card.hidden = !words.every(word => card.dataset.search.includes(word)); if (!card.hidden) visible++; }
 document.getElementById('empty').hidden = visible > 0;
});
document.addEventListener('click', async event => {
 const button = event.target.closest('button[data-copy]');
 if (!button) return;
 const input = button.parentElement.querySelector('input');
 input.focus(); input.select();
 try {
  if (!navigator.clipboard) throw new Error('Clipboard unavailable');
  await navigator.clipboard.writeText(button.dataset.copy);
  document.getElementById('status').textContent = 'Discord code copied.';
 } catch {
  document.getElementById('status').textContent = 'Code selected. Press Ctrl+C or Cmd+C to copy.';
 }
});
</script></body></html>`;
}

export async function imageDataUrl(blob: Blob): Promise<string> {
	if (!blob.type.startsWith('image/')) throw new Error('The download is not an image.');
	const bytes = new Uint8Array(await blob.arrayBuffer());
	let binary = '';
	for (let index = 0; index < bytes.length; index += 32768) {
		binary += String.fromCharCode(...bytes.subarray(index, index + 32768));
	}
	return `data:${blob.type};base64,${btoa(binary)}`;
}

export async function exportEmojis(
	entries: CatalogEntry[],
	options: {
		signal?: AbortSignal;
		fetch?: typeof fetch;
		onProgress?: (completed: number, total: number) => void;
	} = {}
): Promise<string> {
	const emojis = entries.filter((entry) => entry.kind === 'emoji');
	if (!emojis.length) throw new Error('No emojis to export.');
	const request = options.fetch || fetch;
	const embedded: OfflineEmoji[] = new Array(emojis.length);
	const failed: string[] = [];
	let cursor = 0;
	let completed = 0;
	options.onProgress?.(0, emojis.length);
	async function worker() {
		while (cursor < emojis.length && !options.signal?.aborted) {
			const index = cursor++;
			const entry = emojis[index];
			try {
				if (!entry.imageUrl) throw new Error('No image available.');
				const response = await request(entry.imageUrl, { signal: options.signal });
				if (!response.ok) throw new Error('Image download failed.');
				embedded[index] = { entry, image: await imageDataUrl(await response.blob()) };
			} catch {
				if (options.signal?.aborted) return;
				failed.push(entry.name);
			}
			options.onProgress?.(++completed, emojis.length);
		}
	}
	await Promise.all(Array.from({ length: Math.min(emojis.length, 4) }, worker));
	if (options.signal?.aborted) throw new DOMException('Export cancelled.', 'AbortError');
	if (failed.length) {
		throw new Error(
			`Could not download ${failed.length} image${failed.length === 1 ? '' : 's'} (${failed.slice(0, 3).join(', ')}). No file was saved. Please retry when the images are available.`
		);
	}
	return buildOfflineHtml(embedded);
}
