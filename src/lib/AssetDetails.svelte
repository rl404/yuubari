<script lang="ts">
	import { copyValue, type CatalogEntry, type CopyMode } from '$lib/catalog';
	import LibraryIcon from '$lib/icons/LibraryIcon.svelte';

	export let entry: CatalogEntry;
	export let mode: CopyMode;
	export let idPrefix = 'detail';
	export let favourite = false;
	export let copied = false;
	export let oncopy: (entry: CatalogEntry) => void;
	export let onfavourite: (entry: CatalogEntry) => void;
	let imageFailed = false;
	$: if (entry.id) imageFailed = false;
	$: format =
		entry.kind === 'sticker' ? 'Asset link' : mode === 'code' ? 'Discord code' : 'Image link';
	$: copyLabel =
		entry.kind === 'sticker'
			? 'Copy asset link'
			: mode === 'code'
				? 'Copy Discord code'
				: 'Copy image link';
</script>

<div class="detail-content">
	<div class="detail-preview">
		{#if entry.imageUrl && !imageFailed}
			<img
				src={entry.imageUrl}
				alt={`${entry.name} enlarged preview`}
				width="128"
				height="128"
				onerror={() => (imageFailed = true)}
			/>
		{:else}
			<span class="asset-placeholder"
				>{entry.imageUrl ? 'Image unavailable' : 'Lottie sticker'}<br />Open the asset link to view
				it.</span
			>
		{/if}
	</div>
	<div class="detail-heading">
		<div>
			<p class="detail-type">{entry.animated ? 'Animated' : 'Static'} {entry.kind}</p>
			<h2>{entry.name}</h2>
		</div>
		<button
			class="detail-favourite"
			class:is-active={favourite}
			aria-label={favourite
				? 'Remove selected asset from favourites'
				: 'Save selected asset to favourites'}
			aria-pressed={favourite}
			onclick={() => onfavourite(entry)}
			><LibraryIcon name="star" size={20} filled={favourite} /></button
		>
	</div>
	<dl class="detail-metadata">
		<div>
			<dt>Server</dt>
			<dd>{entry.guildName}</dd>
		</div>
		<div>
			<dt>Asset ID</dt>
			<dd class="asset-id">{entry.id}</dd>
		</div>
	</dl>
	<label class="detail-code-label" for={`${idPrefix}-code-${entry.id}`}>{format}</label>
	<textarea
		id={`${idPrefix}-code-${entry.id}`}
		class="detail-code"
		aria-label={`${format} for selected asset`}
		readonly
		rows="2"
		value={copyValue(entry, mode)}
		onfocus={(event) => event.currentTarget.select()}
	></textarea>
	<button class="primary-action detail-copy" aria-label={copyLabel} onclick={() => oncopy(entry)}>
		<LibraryIcon name={copied ? 'check' : 'copy'} size={18} />
		{copied ? 'Copied to clipboard' : copyLabel}
	</button>
	<!-- Discord CDN asset URLs are external destinations, not application routes. -->
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
	<a class="detail-original" href={entry.assetUrl} target="_blank" rel="noopener noreferrer">
		Open original asset <LibraryIcon name="arrow" size={15} />
	</a>
</div>
