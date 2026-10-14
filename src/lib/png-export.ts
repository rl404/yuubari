import { Zip, ZipPassThrough } from 'fflate';
import type { CatalogEntry } from './catalog.ts';

const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];

function checkCancelled(signal?: AbortSignal) {
	if (signal?.aborted) throw new DOMException('Export cancelled.', 'AbortError');
}

export function isPng(bytes: Uint8Array): boolean {
	return pngSignature.every((byte, index) => bytes[index] === byte);
}

export type PngExportFile = {
	entry: CatalogEntry;
	filename: string;
	shortcode: string;
};

export function planPngFiles(entries: CatalogEntry[]): PngExportFile[] {
	const seenIds = new Set<string>();
	const usedNames = new Set<string>();
	const result: PngExportFile[] = [];
	for (const entry of entries) {
		if (entry.kind !== 'emoji' || seenIds.has(entry.id)) continue;
		seenIds.add(entry.id);
		let stem = entry.name.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80) || 'emoji';
		if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(stem)) stem = `emoji_${stem}`;
		const suffix =
			entry.id.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 40) || String(result.length + 1);
		let filename = `${stem}.png`;
		let collision = 0;
		while (usedNames.has(filename.toLowerCase())) {
			filename = `${stem}_${suffix}${collision ? `_${collision}` : ''}.png`;
			collision++;
		}
		usedNames.add(filename.toLowerCase());
		result.push({
			entry,
			filename,
			shortcode: `:${entry.name.replace(/\p{Cc}/gu, ' ')}:`
		});
	}
	return result;
}

export async function imageToPng(blob: Blob, signal?: AbortSignal): Promise<Blob> {
	checkCancelled(signal);
	if (!blob.type.startsWith('image/')) throw new Error('The download is not an image.');
	// A bitmap uses an animated image's default or first frame, instead of a moving preview.
	const bitmap = await createImageBitmap(blob);
	try {
		checkCancelled(signal);
		if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 16777216) {
			throw new Error('Image dimensions are unsupported.');
		}
		const canvas = document.createElement('canvas');
		canvas.width = bitmap.width;
		canvas.height = bitmap.height;
		const context = canvas.getContext('2d');
		if (!context) throw new Error('This browser cannot convert images to PNG.');
		context.drawImage(bitmap, 0, 0);
		const png = await new Promise<Blob>((resolve, reject) => {
			canvas.toBlob(
				(value) => (value ? resolve(value) : reject(new Error('PNG conversion failed.'))),
				'image/png'
			);
		});
		checkCancelled(signal);
		return png;
	} finally {
		bitmap.close();
	}
}

export async function exportPngs(
	entries: CatalogEntry[],
	options: {
		signal?: AbortSignal;
		fetch?: typeof fetch;
		convert?: (blob: Blob, signal?: AbortSignal) => Promise<Blob>;
		onProgress?: (completed: number, total: number) => void;
	} = {}
): Promise<Blob> {
	checkCancelled(options.signal);
	const files = planPngFiles(entries);
	if (!files.length) throw new Error('No emojis selected.');
	const request = options.fetch || fetch;
	const convert = options.convert || imageToPng;
	const chunks: BlobPart[] = [];
	let archiveError: Error | undefined;
	let finished = false;
	const archive = new Zip((error, chunk, final) => {
		if (error) archiveError = error;
		else chunks.push(new Uint8Array(chunk));
		if (final) finished = true;
	});
	const stop = () => archive.terminate();
	options.signal?.addEventListener('abort', stop, { once: true });
	function addFile(name: string, bytes: Uint8Array) {
		checkCancelled(options.signal);
		if (archiveError) throw archiveError;
		const file = new ZipPassThrough(name);
		archive.add(file);
		file.push(bytes, true);
		if (archiveError) throw archiveError;
	}
	let cursor = 0;
	let completed = 0;
	const failed: string[] = [];
	options.onProgress?.(0, files.length);
	async function worker() {
		while (cursor < files.length && !options.signal?.aborted) {
			const file = files[cursor++];
			try {
				if (!file.entry.imageUrl) throw new Error('No image available.');
				const response = await request(file.entry.imageUrl, { signal: options.signal });
				if (!response.ok) throw new Error('Image download failed.');
				const png = await convert(await response.blob(), options.signal);
				const bytes = new Uint8Array(await png.arrayBuffer());
				if (!isPng(bytes)) throw new Error('PNG conversion returned an invalid image.');
				addFile(file.filename, bytes);
			} catch {
				if (options.signal?.aborted) return;
				failed.push(file.entry.name);
			}
			options.onProgress?.(++completed, files.length);
		}
	}
	try {
		await Promise.all(Array.from({ length: Math.min(files.length, 4) }, worker));
		checkCancelled(options.signal);
		if (failed.length) {
			throw new Error(
				`Could not export ${failed.length} emoji${failed.length === 1 ? '' : 's'} (${failed.slice(0, 3).join(', ')}). No ZIP was saved. Please retry.`
			);
		}
		const encoder = new TextEncoder();
		addFile(
			'emoji-names.txt',
			encoder.encode(files.map((file) => file.shortcode).join('\n') + '\n')
		);
		addFile(
			'emoji-manifest.json',
			encoder.encode(
				JSON.stringify(
					files.map(({ entry, filename, shortcode }) => ({
						file: filename,
						name: entry.name,
						shortcode,
						id: entry.id,
						server: entry.guildName,
						animatedSource: entry.animated
					})),
					null,
					2
				) + '\n'
			)
		);
		archive.end();
		if (archiveError) throw archiveError;
		if (!finished) throw new Error('ZIP creation failed. No file was saved.');
		checkCancelled(options.signal);
		return new Blob(chunks, { type: 'application/zip' });
	} finally {
		options.signal?.removeEventListener('abort', stop);
		if (!finished) archive.terminate();
	}
}
