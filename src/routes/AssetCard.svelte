<script lang="ts">
	import '$lib/collection/AssetCard.css';
	import { copyValue, type CatalogEntry, type CopyMode } from '$lib/catalog';
	import LibraryIcon from '$lib/icons/LibraryIcon.svelte';
	export let entry: CatalogEntry;
	export let mode: CopyMode;
	export let favourite = false;
	export let copied = false;
	export let selecting = false;
	export let selected = false;
	export let selectionDisabled = false;
	export let onselect: (entry: CatalogEntry) => void;
	export let oncopy: (entry: CatalogEntry) => void;
	export let onfavourite: (entry: CatalogEntry) => void;
	export let oninspect: (entry: CatalogEntry) => void;
	let imageFailed = false;
	$: copiedFormat =
		entry.kind === 'sticker' ? 'asset link' : mode === 'code' ? 'Discord code' : 'image link';
</script>

<article
	class="asset-card"
	class:is-favourite={favourite}
	class:is-copied={copied}
	class:is-selected={selecting && selected}
>
	<div class="asset-surface">
		<button
			type="button"
			class="asset-copy"
			title={selecting
				? `${selected ? 'Deselect' : 'Select'} ${entry.name} for PNG export`
				: `${entry.name} · ${entry.guildName}\nCopy ${copiedFormat}: ${copyValue(entry, mode)}`}
			aria-label={selecting
				? `${selected ? 'Deselect' : 'Select'} ${entry.name} for export`
				: `Copy ${copiedFormat} for ${entry.name}`}
			aria-pressed={selecting ? selected : undefined}
			disabled={selecting && selectionDisabled}
			onclick={() => (selecting ? onselect(entry) : oncopy(entry))}
		>
			{#if entry.imageUrl && !imageFailed}<img
					src={entry.imageUrl}
					alt={entry.name}
					width="48"
					height="48"
					loading="lazy"
					decoding="async"
					onerror={() => (imageFailed = true)}
				/>{:else}<span class="asset-placeholder">{entry.imageUrl ? 'Unavailable' : 'Lottie'}</span
				>{/if}
			{#if copied}<span class="asset-action copied"
					><LibraryIcon name="check" size={14} />Copied</span
				>{/if}
		</button>
		{#if selecting}
			<label class="asset-select-control"
				><input
					type="checkbox"
					aria-label={`${selected ? 'Deselect' : 'Select'} ${entry.name} for export`}
					checked={selected}
					disabled={selectionDisabled}
					onchange={() => onselect(entry)}
				/></label
			>
		{:else}<button
				type="button"
				class="favourite-button"
				class:is-active={favourite}
				title={favourite ? 'Remove favourite' : 'Save favourite'}
				aria-label={`${favourite ? 'Remove' : 'Save'} ${entry.name} ${favourite ? 'from' : 'to'} favourites`}
				aria-pressed={favourite}
				onclick={() => onfavourite(entry)}
				><LibraryIcon name="star" filled={favourite} size={14} /></button
			>{/if}
	</div>
	<button
		type="button"
		class="asset-name"
		aria-label={`Inspect ${entry.name}`}
		title={`${entry.name} · ${entry.guildName}`}
		onclick={() => oninspect(entry)}><span>{entry.name}</span></button
	>
</article>
