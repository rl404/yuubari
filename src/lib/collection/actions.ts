import { writable } from 'svelte/store';
import { copyValue, entryKey, type CatalogEntry, type CopyMode } from '../catalog.ts';
import { exportEmojis } from '../offline-export.ts';

export type AssetActionState = {
	copiedKey: string;
	status: string;
	statusIsError: boolean;
	manualCopy: string;
	exporting: boolean;
	exportKind: 'html' | 'png';
	exportProgress: number;
	exportTotal: number;
};

/** Owns clipboard feedback and export jobs. Browser APIs run only on user actions. */
export function createAssetActions() {
	const state: AssetActionState = {
		copiedKey: '',
		status: '',
		statusIsError: false,
		manualCopy: '',
		exporting: false,
		exportKind: 'html',
		exportProgress: 0,
		exportTotal: 0
	};
	const store = writable({ ...state });
	let copyTimer: ReturnType<typeof setTimeout>;
	let copyGeneration = 0;
	let exportController: AbortController | undefined;
	function update(values: Partial<AssetActionState>) {
		Object.assign(state, values);
		store.set({ ...state });
	}
	function clearCopy() {
		clearTimeout(copyTimer);
		update({ copiedKey: '' });
	}
	function error(message: string) {
		update({ status: message, statusIsError: true });
	}
	function dismiss() {
		update({ status: '', manualCopy: '' });
	}

	async function copy(entry: CatalogEntry, mode: CopyMode) {
		const value = copyValue(entry, mode);
		const generation = ++copyGeneration;
		clearCopy();
		try {
			if (!navigator.clipboard) throw new Error('Clipboard unavailable');
			await navigator.clipboard.writeText(value);
			if (generation !== copyGeneration) return;
			update({
				copiedKey: entryKey(entry),
				manualCopy: '',
				statusIsError: false,
				status: `${entry.name}: ${entry.kind === 'sticker' ? 'asset link' : mode === 'code' ? 'Discord code' : 'image link'} copied.`
			});
			copyTimer = setTimeout(() => update({ copiedKey: '' }), 1800);
		} catch {
			if (generation !== copyGeneration) return;
			update({
				manualCopy: value,
				statusIsError: true,
				status: 'Clipboard access is unavailable. Select the value below and copy it manually.'
			});
		}
	}

	function saveFile(blob: Blob, name: string) {
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = name;
		document.body.appendChild(link);
		link.click();
		link.remove();
		setTimeout(() => URL.revokeObjectURL(url), 10000);
	}

	async function download(kind: 'html' | 'png', entries: CatalogEntry[]) {
		if (state.exporting || !entries.length) return;
		const snapshot = [...entries];
		exportController = new AbortController();
		update({ exportKind: kind, exporting: true, exportProgress: 0, exportTotal: snapshot.length });
		const options = {
			signal: exportController.signal,
			onProgress: (done: number, total: number) =>
				update({ exportProgress: done, exportTotal: total })
		};
		const date = () => new Date().toISOString().slice(0, 10);
		try {
			if (kind === 'png') {
				const { exportPngs } = await import('../png-export.ts');
				saveFile(await exportPngs(snapshot, options), `yuubari-selected-emojis-${date()}.zip`);
				update({
					status: `Saved ${snapshot.length.toLocaleString()} PNGs and emoji-names.txt in a ZIP.`
				});
			} else {
				const html = await exportEmojis(snapshot, options);
				saveFile(
					new Blob([html], { type: 'text/html;charset=utf-8' }),
					`yuubari-emojis-${date()}.html`
				);
				update({
					status: `Saved ${snapshot.length.toLocaleString()} emojis with their images, names, and Discord codes.`
				});
			}
			update({ statusIsError: false, manualCopy: '' });
		} catch (error) {
			update({
				statusIsError: !(error instanceof DOMException && error.name === 'AbortError'),
				status:
					error instanceof Error
						? error.message
						: kind === 'png'
							? 'PNG export failed. Please retry.'
							: 'Export failed. Please retry.'
			});
		} finally {
			update({ exporting: false });
		}
	}

	function cancelExport() {
		exportController?.abort();
	}
	function destroy() {
		cancelExport();
		clearTimeout(copyTimer);
	}
	return {
		subscribe: store.subscribe,
		copy,
		clearCopy,
		error,
		dismiss,
		exportHtml: (entries: CatalogEntry[]) => download('html', entries),
		exportPngs: (entries: CatalogEntry[]) => download('png', entries),
		cancelExport,
		destroy
	};
}
