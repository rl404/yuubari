<script lang="ts">
	import type { ServerCollectionState } from './servers';
	import type { AssetActionState } from './actions';
	import LibraryIcon from '../icons/LibraryIcon.svelte';
	import './CollectionStatus.css';
	export let servers: ServerCollectionState;
	export let actions: AssetActionState;
	export let guildId: string;
	export let retrySeconds: number;
	export let retryFailed: () => void;
	export let cancelExport: () => void;
	$: ({ loading, failed, completed, reloadingId, retrying, retryTotal } = servers);
	$: ({ exporting, exportKind, exportProgress, exportTotal } = actions);
	$: availableGuilds = servers.guilds;
	$: guilds = servers.guilds;
	$: states = servers.states;
	$: selectedServerReady = Boolean(guildId && states[guildId]?.status === 'loaded');
	$: availabilitySummary = retrying
		? `Retrying ${retryTotal} server${retryTotal === 1 ? '' : 's'}…`
		: `${failed.length} ${selectedServerReady ? 'other ' : ''}server${failed.length === 1 ? '' : 's'} unavailable`;
</script>

{#if loading}<div class="loading-notice" role="status">
		<span class="loading-dot"></span>{retrySeconds > 0
			? `Discord rate limit · resuming in ${retrySeconds}s`
			: reloadingId
				? `Reloading ${guilds.find((guild) => guild.id === reloadingId)?.name || 'server'}…`
				: `Loading servers · ${completed}/${availableGuilds.length}`}
	</div>{/if}
{#if failed.length || retrying}
	<div
		class="availability-notice"
		class:current-unavailable={guildId && states[guildId]?.status === 'error'}
	>
		<p class="sr-only" role="status">{availabilitySummary}</p>
		<details class="availability-details">
			<summary
				><LibraryIcon name="info" size={16} /><span class="availability-summary"
					>{availabilitySummary}</span
				><span class="availability-disclosure"
					>Details <LibraryIcon name="chevron" size={14} /></span
				></summary
			>
			<ul aria-label="Unavailable servers">
				{#each failed as state (state.guildId)}<li>
						<strong
							>{guilds.find((guild) => guild.id === state.guildId)?.name || state.guildId}</strong
						><span>{state.error}</span>
					</li>{/each}
				{#if retrying && !failed.length}<li>Waiting for Discord’s response…</li>{/if}
			</ul>
		</details>
		<button
			class="availability-retry"
			class:is-retrying={retrying}
			onclick={retryFailed}
			disabled={loading || retrySeconds > 0}
			aria-label={retrying
				? 'Retrying unavailable servers'
				: retrySeconds > 0
					? `Retry unavailable servers in ${retrySeconds} seconds`
					: 'Retry unavailable servers'}
			><LibraryIcon name="retry" size={14} /><span
				>{retrying ? 'Retrying…' : retrySeconds > 0 ? `Retry in ${retrySeconds}s` : 'Retry'}</span
			></button
		>
	</div>
{/if}
{#if exporting}<div class="export-notice" role="status">
		<div>
			<span
				>{exportKind === 'png' ? 'Converting PNGs' : 'Embedding images'} · {exportProgress}/{exportTotal}</span
			><progress value={exportProgress} max={exportTotal}></progress>
		</div>
		<button onclick={() => cancelExport()}>Cancel export</button>
	</div>{/if}
