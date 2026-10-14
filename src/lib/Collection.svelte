<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import {
		copyValue,
		entryKey,
		filterEntries,
		loadGuilds,
		readFavourites,
		type AssetKind,
		type CatalogEntry,
		type CatalogGuild,
		type CopyMode,
		type GuildState
	} from '$lib/catalog';
	import { exportEmojis } from '$lib/offline-export';
	import LibraryIcon from '$lib/icons/LibraryIcon.svelte';
	import AssetCard from '../routes/AssetCard.svelte';
	import AssetDetails from '$lib/AssetDetails.svelte';
	import GuildMark from '$lib/GuildMark.svelte';

	export let guilds: CatalogGuild[];
	export let userId: string;

	let query = '';
	let kind: AssetKind = 'emoji';
	let guildId = '';
	let animation: 'all' | 'static' | 'animated' = 'all';
	let favouritesOnly = false;
	let favourites = new Set<string>();
	let mode: CopyMode = 'code';
	let states: Record<string, GuildState> = {};
	let loading = true;
	let visibleCount = 120;
	let copiedKey = '';
	let status = '';
	let statusIsError = false;
	let manualCopy = '';
	let searchInput: HTMLInputElement;
	let detailDialog: HTMLDialogElement;
	let selectedKey = '';
	let filtersOpen = false;
	let selecting = false;
	let selectedEmojis = new Set<string>();
	let copyTimer: ReturnType<typeof setTimeout>;
	let copyGeneration = 0;
	let exporting = false;
	let exportKind: 'html' | 'png' = 'html';
	let exportProgress = 0;
	let exportTotal = 0;
	let exportController: AbortController | undefined;
	const collectionController = new AbortController();
	$: storageKey = `yuubari:favourites:${userId}`;
	$: availableGuilds = guilds.filter((guild) => guild.features.includes('DISCOVERABLE'));
	$: loaded = Object.values(states).filter((state) => state.status === 'loaded');
	$: failed = Object.values(states).filter((state) => state.status === 'error');
	$: completed = loaded.length + failed.length;
	$: entries = loaded
		.flatMap((state) => state.entries)
		.sort((a, b) => a.name.localeCompare(b.name));
	$: emojiCount = entries.filter((entry) => entry.kind === 'emoji').length;
	$: stickerCount = entries.length - emojiCount;
	$: favouriteCount = entries.filter((entry) => favourites.has(entryKey(entry))).length;
	$: matches = filterEntries(entries, {
		query,
		kind,
		guildId,
		animation,
		favouritesOnly,
		favourites
	});
	$: filterKey = JSON.stringify([query, kind, guildId, animation, favouritesOnly]);
	$: if (filterKey) visibleCount = 120;
	$: selectedGuild = guilds.find((guild) => guild.id === guildId);
	$: selectedForExport = entries.filter(
		(entry) => entry.kind === 'emoji' && selectedEmojis.has(entryKey(entry))
	);
	$: selectedInView = matches.filter((entry) => selectedEmojis.has(entryKey(entry))).length;
	$: hiddenSelectedCount = selectedForExport.length - selectedInView;
	$: pngMode = selecting && kind === 'emoji';
	$: inspected = matches.find((entry) => entryKey(entry) === selectedKey);
	$: guildCounts = Object.fromEntries(
		loaded.map((state) => [
			state.guildId,
			state.entries.filter((entry) => entry.kind === kind).length
		])
	);

	onMount(() => {
		try {
			favourites = readFavourites(localStorage, storageKey);
			mode = localStorage.getItem('yuubari:copy-mode') === 'link' ? 'link' : 'code';
		} catch {
			// Browsing and copying remain available when storage is blocked.
		}
		void load(availableGuilds);
	});

	onDestroy(() => {
		collectionController.abort();
		exportController?.abort();
		clearTimeout(copyTimer);
	});

	async function load(targets: CatalogGuild[]) {
		loading = true;
		try {
			await loadGuilds(
				targets,
				(state) => {
					states = { ...states, [state.guildId]: state };
				},
				{ signal: collectionController.signal }
			);
		} finally {
			if (!collectionController.signal.aborted) loading = false;
		}
	}

	function retryFailed() {
		const ids = new Set(failed.map((state) => state.guildId));
		void load(availableGuilds.filter((guild) => ids.has(guild.id)));
	}

	function chooseFavourites() {
		favouritesOnly = !favouritesOnly;
	}

	function toggleSelectionMode() {
		copiedKey = '';
		clearTimeout(copyTimer);
		selecting = !selecting;
		if (!selecting) selectedEmojis = new Set();
	}

	function toggleSelection(entry: CatalogEntry) {
		if (entry.kind !== 'emoji' || exporting) return;
		const key = entryKey(entry);
		selectedEmojis = selectedEmojis.has(key)
			? new Set([...selectedEmojis].filter((value) => value !== key))
			: new Set([...selectedEmojis, key]);
	}

	function selectResults() {
		selectedEmojis = new Set([
			...selectedEmojis,
			...matches.filter((entry) => entry.kind === 'emoji').map(entryKey)
		]);
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

	async function downloadPngs() {
		if (exporting || !selectedForExport.length) return;
		const snapshot = [...selectedForExport];
		exportKind = 'png';
		exporting = true;
		exportProgress = 0;
		exportTotal = snapshot.length;
		exportController = new AbortController();
		try {
			const { exportPngs } = await import('$lib/png-export');
			const zip = await exportPngs(snapshot, {
				signal: exportController.signal,
				onProgress: (done, total) => {
					exportProgress = done;
					exportTotal = total;
				}
			});
			saveFile(zip, `yuubari-selected-emojis-${new Date().toISOString().slice(0, 10)}.zip`);
			manualCopy = '';
			statusIsError = false;
			status = `Saved ${snapshot.length.toLocaleString()} PNGs and emoji-names.txt in a ZIP.`;
		} catch (error) {
			statusIsError = !(error instanceof DOMException && error.name === 'AbortError');
			status = error instanceof Error ? error.message : 'PNG export failed. Please retry.';
		} finally {
			exporting = false;
		}
	}

	async function inspect(entry: CatalogEntry) {
		selectedKey = entryKey(entry);
		await tick();
		detailDialog.showModal();
	}

	function toggleFavourite(entry: CatalogEntry) {
		const key = entryKey(entry);
		favourites = favourites.has(key)
			? new Set([...favourites].filter((value) => value !== key))
			: new Set([...favourites, key]);
		try {
			localStorage.setItem(storageKey, JSON.stringify([...favourites]));
		} catch {
			status = 'This browser could not save favourites. They are available for this visit.';
			statusIsError = true;
		}
	}

	function chooseMode(value: CopyMode) {
		mode = value;
		copiedKey = '';
		clearTimeout(copyTimer);
		try {
			localStorage.setItem('yuubari:copy-mode', value);
		} catch {
			// A copy preference is optional; the selected mode still works for this visit.
		}
	}

	async function copy(entry: CatalogEntry) {
		selectedKey = entryKey(entry);
		const copiedMode = mode;
		const value = copyValue(entry, copiedMode);
		const generation = ++copyGeneration;
		clearTimeout(copyTimer);
		copiedKey = '';
		try {
			if (!navigator.clipboard) throw new Error('Clipboard unavailable');
			await navigator.clipboard.writeText(value);
			if (generation !== copyGeneration) return;
			copiedKey = entryKey(entry);
			manualCopy = '';
			statusIsError = false;
			status = `${entry.name}: ${entry.kind === 'sticker' ? 'asset link' : copiedMode === 'code' ? 'Discord code' : 'image link'} copied.`;
			copyTimer = setTimeout(() => (copiedKey = ''), 1800);
		} catch {
			if (generation !== copyGeneration) return;
			manualCopy = value;
			statusIsError = true;
			status = 'Clipboard access is unavailable. Select the value below and copy it manually.';
		}
	}

	async function download() {
		if (exporting || loading || kind !== 'emoji' || !matches.length) return;
		exportKind = 'html';
		exporting = true;
		exportProgress = 0;
		exportTotal = matches.length;
		const snapshot = [...matches];
		exportController = new AbortController();
		try {
			const html = await exportEmojis(snapshot, {
				signal: exportController.signal,
				onProgress: (done, total) => {
					exportProgress = done;
					exportTotal = total;
				}
			});
			saveFile(
				new Blob([html], { type: 'text/html;charset=utf-8' }),
				`yuubari-emojis-${new Date().toISOString().slice(0, 10)}.html`
			);
			statusIsError = false;
			status = `Saved ${snapshot.length.toLocaleString()} emojis with their images, names, and Discord codes.`;
			manualCopy = '';
		} catch (error) {
			statusIsError = !(error instanceof DOMException && error.name === 'AbortError');
			status = error instanceof Error ? error.message : 'Export failed. Please retry.';
		} finally {
			exporting = false;
		}
	}

	function handleShortcut(event: KeyboardEvent) {
		if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
			event.preventDefault();
			if (detailDialog.open) detailDialog.close();
			searchInput?.focus();
		}
	}
</script>

<svelte:window onkeydown={handleShortcut} />
<a class="skip-link" href="#collection">Skip to collection</a>
<div class="library-shell">
	<aside class="server-sidebar" aria-label="Server navigation">
		<header class="sidebar-header">
			<span>Servers</span><span>{availableGuilds.length}</span>
		</header>
		<nav class="server-list" aria-label="Filter collection by server">
			<button
				class="server-row all-servers"
				class:active={!guildId}
				aria-pressed={!guildId}
				onclick={() => (guildId = '')}
				><LibraryIcon name="grid" size={20} /><span>All servers</span></button
			>
			<div class="sidebar-divider"></div>
			{#each availableGuilds as guild (guild.id)}
				<button
					class="server-row"
					class:active={guildId === guild.id}
					aria-label={guild.name}
					aria-pressed={guildId === guild.id}
					title={guild.name}
					onclick={() => (guildId = guild.id)}
				>
					<GuildMark {guild} /><span class="server-name">{guild.name}</span>
					{#if states[guild.id]?.status === 'error'}<span
							class="server-error"
							title="Could not load">!</span
						>{:else}<span class="server-count" aria-hidden="true"
							>{guildCounts[guild.id]?.toLocaleString() ?? '–'}</span
						>{/if}
				</button>
			{/each}
		</nav>
		<p class="sidebar-footer">Discoverable servers only</p>
	</aside>
	<main id="collection" class="library-main" tabindex="-1">
		<header class="collection-header">
			<h1 class="sr-only">{kind === 'emoji' ? 'Emoji library' : 'Sticker library'}</h1>
			<div class="collection-tabs" role="group" aria-label="Collection views">
				<button
					class:active={kind === 'emoji'}
					aria-pressed={kind === 'emoji'}
					onclick={() => (kind = 'emoji')}
					><span class="tab-label">Emojis</span><span class="tab-count"
						>{emojiCount.toLocaleString()}</span
					></button
				>
				<button
					class:active={kind === 'sticker'}
					aria-pressed={kind === 'sticker'}
					onclick={() => (kind = 'sticker')}
					><span class="tab-label">Stickers</span><span class="tab-count"
						>{stickerCount.toLocaleString()}</span
					></button
				>
				<span class="tab-divider"></span>
				<button
					class="favourites-filter"
					class:active={favouritesOnly}
					aria-pressed={favouritesOnly}
					onclick={chooseFavourites}
					><LibraryIcon name="star" size={16} filled={favouritesOnly} /><span class="tab-label"
						>Favourites</span
					><span class="tab-count">{favouriteCount}</span></button
				>
			</div>
			<div class="collection-header-actions">
				<span class="collection-scope" title={selectedGuild?.name || 'All servers'}
					>{selectedGuild?.name || 'All servers'}</span
				>
				{#if kind === 'emoji'}<button
						class="selection-toggle"
						class:active={selecting}
						aria-label={selecting ? 'Exit selection' : 'Select emojis'}
						aria-pressed={selecting}
						onclick={toggleSelectionMode}
						disabled={exporting}
						title={selecting
							? 'Exit selection and clear selected emojis'
							: 'Select multiple emojis for PNG export'}
						><LibraryIcon name="select" size={16} /><span>{selecting ? 'Done' : 'Select'}</span
						></button
					>{/if}
			</div>
		</header>
		<div class="collection-toolbar">
			<div class="collection-search">
				<LibraryIcon name="search" size={18} /><label class="sr-only" for="library-search"
					>Search emojis, stickers, servers, or IDs</label
				><input
					id="library-search"
					type="search"
					placeholder="Search emojis, servers, or IDs"
					bind:value={query}
					bind:this={searchInput}
					onkeydown={(event) => {
						if (event.key === 'Escape') query = '';
					}}
				/><kbd>Ctrl K</kbd>
			</div>
			<label class="toolbar-select mobile-server-select"
				><span class="sr-only">Filter by server</span><select
					aria-label="Filter by server"
					bind:value={guildId}
					><option value="">All servers</option>{#each availableGuilds as guild (guild.id)}<option
							value={guild.id}>{guild.name}</option
						>{/each}</select
				><LibraryIcon name="chevron" size={16} /></label
			>
			<button
				class="filter-toggle"
				class:active={animation !== 'all' || mode !== 'code'}
				aria-label="Filter options"
				aria-expanded={filtersOpen}
				aria-controls="filter-options"
				onclick={() => (filtersOpen = !filtersOpen)}><LibraryIcon name="filter" size={18} /></button
			>
			<div class="filter-options" class:filters-open={filtersOpen} id="filter-options">
				<label class="toolbar-select"
					><span class="sr-only">Filter by animation</span><select
						aria-label="Filter by animation"
						bind:value={animation}
						><option value="all">All formats</option><option value="static">Static</option><option
							value="animated">Animated</option
						></select
					><LibraryIcon name="chevron" size={16} /></label
				>
				<label class="toolbar-select"
					><span class="sr-only">Copy format</span><select
						aria-label="Copy format"
						bind:value={mode}
						onchange={() => chooseMode(mode)}
						><option value="code">Discord code</option><option value="link">Image link</option
						></select
					><LibraryIcon name="chevron" size={16} /></label
				>
			</div>
			<button
				class="export-button"
				class:png-export={pngMode}
				aria-label={pngMode
					? 'Download selected PNGs'
					: exporting && exportKind === 'html'
						? `Exporting ${exportProgress}/${exportTotal}`
						: 'Export emojis'}
				onclick={() => (pngMode ? downloadPngs() : download())}
				disabled={exporting ||
					kind !== 'emoji' ||
					(pngMode ? !selectedForExport.length : loading || !matches.length)}
				title={pngMode
					? 'ZIP of selected PNGs and :emoji: names. Animated emojis become still images.'
					: 'Export matching emojis, images, and codes as an offline HTML file'}
				><LibraryIcon name="download" size={16} /><span
					>{exporting ? 'Saving' : pngMode ? 'PNG ZIP' : 'Export'}</span
				></button
			>
		</div>
		{#if selecting && kind === 'emoji'}
			<div class="selection-bar" aria-label="Emoji selection">
				<span class="selection-count" role="status" aria-live="polite"
					>{selectedForExport.length.toLocaleString()} selected{hiddenSelectedCount
						? ` · ${hiddenSelectedCount.toLocaleString()} hidden`
						: ''}</span
				>
				<div class="selection-actions">
					<button
						onclick={selectResults}
						disabled={loading || exporting || !matches.length}
						title="Select every matching emoji, including results beyond Show more"
						>Select results</button
					>
					<button
						onclick={() => (selectedEmojis = new Set())}
						disabled={exporting || !selectedForExport.length}>Clear</button
					>
				</div>
			</div>
		{/if}
		{#if loading}<div class="loading-notice" role="status">
				<span class="loading-dot"></span>Loading servers · {completed}/{availableGuilds.length}
			</div>{/if}
		{#if failed.length}<div class="error-notice" role="alert">
				<div>
					<strong
						>{failed.length} server{failed.length === 1 ? '' : 's'} could not be loaded.</strong
					><span>{failed[0].error}</span>
				</div>
				<button onclick={retryFailed} disabled={loading}
					><LibraryIcon name="retry" size={14} />Retry failed</button
				>
			</div>{/if}
		{#if exporting}<div class="export-notice" role="status">
				<div>
					<span
						>{exportKind === 'png' ? 'Converting PNGs' : 'Embedding images'} · {exportProgress}/{exportTotal}</span
					><progress value={exportProgress} max={exportTotal}></progress>
				</div>
				<button onclick={() => exportController?.abort()}>Cancel export</button>
			</div>{/if}
		<div class="gallery-heading">
			<p class="results-count">
				{matches.length.toLocaleString()}
				{favouritesOnly ? 'favourites' : 'results'}{selectedGuild
					? ` · ${selectedGuild.name}`
					: ''}{loading ? ' · loading more' : ''}
			</p>
			<span
				>{selecting && kind === 'emoji'
					? 'Click to select · Selections stay across filters'
					: 'Click to copy · Click a name for details'}</span
			>
		</div>
		<div class="gallery-scroll">
			{#if kind === 'sticker'}<p class="collection-footnote">
					Stickers copy as asset links. Offline export is available in Emojis.
				</p>{/if}
			{#if matches.length}
				<section
					class="asset-grid"
					aria-label={kind === 'emoji' ? 'Emoji collection' : 'Sticker collection'}
				>
					{#each matches.slice(0, visibleCount) as entry (entryKey(entry))}<AssetCard
							{entry}
							{mode}
							favourite={favourites.has(entryKey(entry))}
							copied={copiedKey === entryKey(entry)}
							selecting={selecting && kind === 'emoji'}
							selected={selectedEmojis.has(entryKey(entry))}
							selectionDisabled={exporting}
							onselect={toggleSelection}
							oncopy={copy}
							onfavourite={toggleFavourite}
							oninspect={inspect}
						/>{/each}
				</section>
				{#if matches.length > visibleCount}<button
						class="load-more"
						onclick={() => (visibleCount += 120)}
						>Show more · {(matches.length - visibleCount).toLocaleString()} remaining</button
					>{/if}
			{:else if !loading}
				<div class="collection-empty">
					<LibraryIcon name={favouritesOnly ? 'star' : 'search'} size={28} />
					<h2>{favouritesOnly ? 'No favourites here yet' : 'No matching emojis'}</h2>
					<p>
						{favouritesOnly
							? 'Star an emoji or sticker to save it, or change your filters.'
							: availableGuilds.length
								? 'Try a different name, server, or format.'
								: 'Your servers do not have publicly discoverable collections.'}
					</p>
					{#if query || guildId || animation !== 'all' || favouritesOnly}<button
							onclick={() => {
								query = '';
								guildId = '';
								animation = 'all';
								favouritesOnly = false;
							}}>Clear filters</button
						>{/if}
				</div>
			{:else}<div class="asset-grid" aria-hidden="true">
					{#each Array(30).keys() as index (index)}<div class="asset-skeleton"></div>{/each}
				</div>{/if}
			{#if guilds.length > availableGuilds.length && !loading}<p
					class="collection-footnote availability-note"
				>
					{guilds.length - availableGuilds.length} non-discoverable server{guilds.length -
						availableGuilds.length ===
					1
						? ' is'
						: 's are'} unavailable through Discord’s public previews.
				</p>{/if}
		</div>
	</main>
</div>

<dialog class="asset-dialog" bind:this={detailDialog} aria-label="Asset details">
	<div class="dialog-heading">
		<span>Asset details</span><button
			aria-label="Close asset details"
			onclick={() => detailDialog.close()}><LibraryIcon name="close" size={18} /></button
		>
	</div>
	{#if inspected}<AssetDetails
			entry={inspected}
			{mode}
			favourite={favourites.has(entryKey(inspected))}
			copied={copiedKey === entryKey(inspected)}
			oncopy={copy}
			onfavourite={toggleFavourite}
			idPrefix="sheet"
		/>{/if}
	{#if manualCopy && inspected && manualCopy === copyValue(inspected, mode)}<p
			class="detail-copy-feedback"
			role="alert"
		>
			Clipboard access is unavailable. Select the value above and copy it manually.
		</p>{/if}
</dialog>
{#if status}
	{#if statusIsError || manualCopy}
		<div class="collection-feedback" role="alert">
			<div>
				<span>{status}</span>{#if manualCopy}<label class="sr-only" for="manual-copy"
						>Value to copy</label
					><textarea
						id="manual-copy"
						readonly
						value={manualCopy}
						onfocus={(event) => event.currentTarget.select()}
					></textarea>{/if}
			</div>
			<button
				aria-label="Dismiss notification"
				onclick={() => {
					status = '';
					manualCopy = '';
				}}><LibraryIcon name="close" size={16} /></button
			>
		</div>
	{:else}<p class="sr-only" role="status" aria-live="polite">{status}</p>{/if}
{/if}
