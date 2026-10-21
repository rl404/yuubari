<script lang="ts">
	import type { AssetKind, CatalogGuild, CopyMode } from '../catalog';
	import type { AssetActionState } from './actions';
	import LibraryIcon from '../icons/LibraryIcon.svelte';
	import './CollectionHeader.css';
	export let availableGuilds: CatalogGuild[];
	export let selectedGuild: CatalogGuild | undefined;
	export let kind: AssetKind;
	export let guildId: string;
	export let animation: 'all' | 'static' | 'animated';
	export let mode: CopyMode;
	export let favouritesOnly: boolean;
	export let detailsVisible: boolean;
	export let counts: { emojis: number; stickers: number; favourites: number };
	export let selection: { active: boolean; png: boolean; count: number; hidden: number };
	export let matchCount: number;
	export let loading: boolean;
	export let transfers: AssetActionState;
	export let chooseMode: (mode: CopyMode) => void;
	export let toggleSelectionMode: () => void;
	export let selectResults: () => void;
	export let clearSelection: () => void;
	export let downloadPngs: () => void;
	export let download: () => void;
	let filtersOpen = false;
	$: ({ emojis: emojiCount, stickers: stickerCount, favourites: favouriteCount } = counts);
	$: ({
		active: selecting,
		png: pngMode,
		count: selectedCount,
		hidden: hiddenSelectedCount
	} = selection);
	$: ({ exporting, exportKind, exportProgress, exportTotal } = transfers);
	function chooseFavourites() {
		favouritesOnly = !favouritesOnly;
	}
</script>

<header class="collection-header">
	<div class="channel-heading">
		<span class="channel-hash" aria-hidden="true">#</span>
		<h1>{favouritesOnly ? 'favourites' : kind === 'emoji' ? 'emojis' : 'stickers'}</h1>
		<span class="heading-divider"></span><span class="channel-topic"
			>{selectedGuild?.name || 'Browse emojis and stickers from your servers.'}</span
		>
	</div>
	<div class="collection-tabs mobile-tabs" role="group" aria-label="Collection views">
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

	<div class="collection-toolbar" role="group" aria-label="Collection tools">
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
			<label class="toolbar-select copy-format-select"
				><span class="sr-only">Copy format</span><select
					aria-label="Copy format"
					bind:value={mode}
					onchange={() => chooseMode(mode)}
					><option value="code">Discord code</option><option value="link">Image link</option
					></select
				><LibraryIcon name="chevron" size={16} /></label
			>
		</div>
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
				><LibraryIcon name="select" size={16} /><span>{selecting ? 'Done' : 'Select'}</span></button
			>{/if}

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
				(pngMode ? !selectedCount : loading || !matchCount)}
			title={pngMode
				? 'ZIP of selected PNGs and :emoji: names. Animated emojis become still images.'
				: 'Export matching emojis, images, and codes as an offline HTML file'}
			><LibraryIcon name="download" size={16} /><span
				>{exporting ? 'Saving' : pngMode ? 'PNG ZIP' : 'Export'}</span
			></button
		>
		<button
			class="details-toggle"
			aria-label="Toggle asset details"
			aria-pressed={detailsVisible}
			title={detailsVisible ? 'Hide asset details' : 'Show asset details'}
			onclick={() => (detailsVisible = !detailsVisible)}
			><LibraryIcon name="panel" size={18} /><span>Details</span></button
		>
	</div>
</header>
{#if selecting && kind === 'emoji'}
	<div class="selection-bar" aria-label="Emoji selection">
		<span class="selection-count" role="status" aria-live="polite"
			>{selectedCount.toLocaleString()} selected{hiddenSelectedCount
				? ` · ${hiddenSelectedCount.toLocaleString()} hidden`
				: ''}</span
		>
		<div class="selection-actions">
			<button
				onclick={selectResults}
				disabled={loading || exporting || !matchCount}
				title="Select every matching emoji, including results beyond Show more"
				>Select results</button
			>
			<button onclick={clearSelection} disabled={exporting || !selectedCount}>Clear</button>
		</div>
	</div>
{/if}
