<script lang="ts">
	import { copyValue, type CatalogEntry, type CopyMode } from '../catalog';
	import AssetDetails from '../AssetDetails.svelte';
	import LibraryIcon from '../icons/LibraryIcon.svelte';
	import './CollectionDetails.css';
	export let inspected: CatalogEntry | undefined;
	export let mode: CopyMode;
	export let favourite: boolean;
	export let copied: boolean;
	export let manualCopy: string;
	export let dialog: HTMLDialogElement;
	export let copy: (entry: CatalogEntry) => void;
	export let toggleFavourite: (entry: CatalogEntry) => void;
</script>

<aside class="asset-inspector" aria-label="Asset details">
	<header class="inspector-header">Asset details</header>
	<div class="inspector-scroll">
		{#if inspected}<AssetDetails
				entry={inspected}
				{mode}
				{favourite}
				{copied}
				oncopy={copy}
				onfavourite={toggleFavourite}
				idPrefix="inspector"
			/>
			{#if manualCopy && manualCopy === copyValue(inspected, mode)}<p
					class="detail-copy-feedback"
					role="alert"
				>
					Clipboard access is unavailable. Select the value above and copy it manually.
				</p>{/if}
		{:else}
			<div class="inspector-welcome">
				<div class="inspector-symbol"><LibraryIcon name="grid" size={32} /></div>
				<h2>Select an asset</h2>
				<p>Click an emoji’s name to see its preview, details, and Discord code.</p>
			</div>
		{/if}
	</div>
</aside>

<dialog class="asset-dialog" bind:this={dialog} aria-label="Asset details">
	<div class="dialog-heading">
		<span>Asset details</span><button
			aria-label="Close asset details"
			onclick={() => dialog.close()}><LibraryIcon name="close" size={18} /></button
		>
	</div>
	{#if inspected}<AssetDetails
			entry={inspected}
			{mode}
			{favourite}
			{copied}
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
