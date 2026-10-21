<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import {
		entryKey,
		filterEntries,
		readFavourites,
		type AssetKind,
		type CatalogEntry,
		type CatalogGuild,
		type CopyMode
	} from './catalog';
	import { createServerCollection } from './collection/servers';
	import { createAssetActions } from './collection/actions';
	import ServerNavigation from './collection/ServerNavigation.svelte';
	import CollectionHeader from './collection/CollectionHeader.svelte';
	import CollectionStatus from './collection/CollectionStatus.svelte';
	import CollectionDetails from './collection/CollectionDetails.svelte';
	import AssetCard from '../routes/AssetCard.svelte';
	import LibraryIcon from './icons/LibraryIcon.svelte';
	import './collection/Collection.css';

	export let guilds: CatalogGuild[];
	export let userId: string;
	const servers = createServerCollection(guilds);
	const cooldown = servers.cooldown;
	const actions = createAssetActions();
	let query = '';
	let kind: AssetKind = 'emoji';
	let guildId = '';
	let animation: 'all' | 'static' | 'animated' = 'all';
	let favouritesOnly = false;
	let favourites = new Set<string>();
	let mode: CopyMode = 'code';
	let selecting = false;
	let selectedEmojis = new Set<string>();
	let selectedKey = '';
	let detailsVisible = true;
	let visibleCount = 120;
	let searchInput: HTMLInputElement;
	let detailDialog: HTMLDialogElement;
	$: storageKey = `yuubari:favourites:${userId}`;
	$: availableGuilds = $servers.guilds;
	$: entries = $servers.entries;
	$: loading = $servers.loading;
	$: reloadingId = $servers.reloadingId;
	$: retrySeconds = $cooldown;
	$: ({ copiedKey, status, statusIsError, manualCopy, exporting } = $actions);
	$: emojiCount = entries.filter((entry) => entry.kind === 'emoji').length;
	$: stickerCount = entries.length - emojiCount;
	$: favouriteCount = entries.filter((entry) => favourites.has(entryKey(entry))).length;
	$: counts = { emojis: emojiCount, stickers: stickerCount, favourites: favouriteCount };
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
	$: selection = {
		active: selecting,
		png: pngMode,
		count: selectedForExport.length,
		hidden: hiddenSelectedCount
	};
	$: inspected = matches.find((entry) => entryKey(entry) === selectedKey);

	onMount(() => {
		try {
			favourites = readFavourites(localStorage, storageKey);
			mode = localStorage.getItem('yuubari:copy-mode') === 'link' ? 'link' : 'code';
		} catch {
			/* Browsing remains available when storage is blocked. */
		}
		void servers.start();
	});
	onDestroy(() => {
		servers.destroy();
		actions.destroy();
	});

	function toggleSelectionMode() {
		actions.clearCopy();
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
	async function inspect(entry: CatalogEntry) {
		selectedKey = entryKey(entry);
		await tick();
		detailsVisible = true;
		if (!window.matchMedia('(min-width: 1200px)').matches) detailDialog.showModal();
	}
	function toggleFavourite(entry: CatalogEntry) {
		const key = entryKey(entry);
		favourites = favourites.has(key)
			? new Set([...favourites].filter((value) => value !== key))
			: new Set([...favourites, key]);
		try {
			localStorage.setItem(storageKey, JSON.stringify([...favourites]));
		} catch {
			actions.error('This browser could not save favourites. They are available for this visit.');
		}
	}
	function chooseMode(value: CopyMode) {
		mode = value;
		actions.clearCopy();
		try {
			localStorage.setItem('yuubari:copy-mode', value);
		} catch {
			/* Preference is optional. */
		}
	}
	function copy(entry: CatalogEntry) {
		selectedKey = entryKey(entry);
		void actions.copy(entry, mode);
	}
	function download() {
		if (!loading && kind === 'emoji') void actions.exportHtml(matches);
	}
	function downloadPngs() {
		void actions.exportPngs(selectedForExport);
	}
	function reloadServer() {
		if (selectedGuild && !exporting) void servers.reload(selectedGuild);
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
<div class="library-shell" class:details-hidden={!detailsVisible}>
	<ServerNavigation
		servers={$servers}
		bind:guildId
		bind:kind
		bind:favouritesOnly
		{counts}
		{selectedGuild}
	/>
	<main id="collection" class="library-main" tabindex="-1">
		<CollectionHeader
			{availableGuilds}
			{selectedGuild}
			bind:kind
			bind:guildId
			bind:animation
			bind:mode
			bind:favouritesOnly
			bind:detailsVisible
			{counts}
			{selection}
			matchCount={matches.length}
			{loading}
			transfers={$actions}
			{chooseMode}
			{toggleSelectionMode}
			{selectResults}
			clearSelection={() => (selectedEmojis = new Set())}
			{downloadPngs}
			{download}
		/>
		<CollectionStatus
			servers={$servers}
			actions={$actions}
			{guildId}
			{retrySeconds}
			retryFailed={servers.retryFailed}
			cancelExport={actions.cancelExport}
		/>
		<div class="gallery-heading">
			<div class="results-summary">
				<p class="results-count">
					{matches.length.toLocaleString()}
					{favouritesOnly ? 'favourites' : 'results'}{selectedGuild
						? ` · ${selectedGuild.name}`
						: ''}{loading ? ' · loading more' : ''}
				</p>
				{#if selectedGuild}<button
						class="server-reload"
						class:is-reloading={reloadingId === selectedGuild.id}
						onclick={reloadServer}
						disabled={loading || exporting || retrySeconds > 0}
						aria-label={`Reload ${selectedGuild.name}`}
						title={retrySeconds > 0
							? `Retry ${selectedGuild.name} in ${retrySeconds}s`
							: reloadingId === selectedGuild.id
								? `Reloading ${selectedGuild.name}…`
								: `Reload ${selectedGuild.name}`}
						><LibraryIcon name="retry" size={15} />{#if retrySeconds > 0}<span>{retrySeconds}s</span
							>{/if}</button
					>{/if}
			</div>
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
		<footer class="collection-composer">
			<div class="collection-search">
				<LibraryIcon name="search" size={18} /><label class="sr-only" for="library-search"
					>Search emojis, stickers, servers, or IDs</label
				><input
					id="library-search"
					type="search"
					placeholder={favouritesOnly
						? 'Search favourites'
						: `Search ${kind === 'emoji' ? 'emojis' : 'stickers'}`}
					bind:value={query}
					bind:this={searchInput}
					onkeydown={(event) => {
						if (event.key === 'Escape') query = '';
					}}
				/><kbd>Ctrl K</kbd>
			</div>
			<LibraryIcon name="search" size={22} />
		</footer>
	</main>
	<CollectionDetails
		{inspected}
		{mode}
		favourite={Boolean(inspected && favourites.has(entryKey(inspected)))}
		copied={Boolean(inspected && copiedKey === entryKey(inspected))}
		{manualCopy}
		bind:dialog={detailDialog}
		{copy}
		{toggleFavourite}
	/>
</div>

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
			<button aria-label="Dismiss notification" onclick={actions.dismiss}
				><LibraryIcon name="close" size={16} /></button
			>
		</div>
	{:else}<p class="sr-only" role="status" aria-live="polite">{status}</p>{/if}
{/if}
