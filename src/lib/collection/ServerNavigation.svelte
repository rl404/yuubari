<script lang="ts">
	import type { AssetKind, CatalogGuild } from '../catalog';
	import type { ServerCollectionState } from './servers';
	import GuildMark from '../GuildMark.svelte';
	import LibraryIcon from '../icons/LibraryIcon.svelte';
	import './ServerNavigation.css';
	export let servers: ServerCollectionState;
	export let guildId: string;
	export let kind: AssetKind;
	export let favouritesOnly: boolean;
	export let counts: { emojis: number; stickers: number; favourites: number };
	$: ({ emojis: emojiCount, stickers: stickerCount, favourites: favouriteCount } = counts);
	export let selectedGuild: CatalogGuild | undefined;
	$: availableGuilds = servers.guilds;
	$: states = servers.states;
	function chooseFavourites() {
		favouritesOnly = !favouritesOnly;
	}
</script>

<nav class="server-rail" aria-label="Servers">
	<button
		class="rail-home"
		class:active={!guildId}
		aria-label="All servers"
		aria-pressed={!guildId}
		title="All servers"
		onclick={() => (guildId = '')}><img src="/logo.png" width="48" height="48" alt="" /></button
	>
	<div class="rail-divider"></div>
	{#each availableGuilds as guild (guild.id)}
		<button
			class="rail-server"
			class:active={guildId === guild.id}
			aria-label={guild.name}
			aria-pressed={guildId === guild.id}
			title={guild.name}
			onclick={() => (guildId = guild.id)}
		>
			<GuildMark {guild} />
			{#if states[guild.id]?.status === 'error'}<span class="rail-error" title="Could not load"
					>!</span
				>{/if}
		</button>
	{/each}
</nav>
<aside class="channel-sidebar" aria-label="Collection navigation">
	<header class="sidebar-header">
		<span class="sidebar-title" title={selectedGuild?.name || 'Yuubari'}
			>{selectedGuild?.name || 'Yuubari'}</span
		>
	</header>
	<div class="channel-scroll">
		<h2 class="channel-category">Collections</h2>
		<button
			class="channel-row"
			class:active={kind === 'emoji' && !favouritesOnly}
			aria-pressed={kind === 'emoji' && !favouritesOnly}
			onclick={() => {
				kind = 'emoji';
				favouritesOnly = false;
			}}
			><span class="channel-hash" aria-hidden="true">#</span><span>emojis</span><span
				class="channel-count">{emojiCount.toLocaleString()}</span
			></button
		>
		<button
			class="channel-row"
			class:active={kind === 'sticker' && !favouritesOnly}
			aria-pressed={kind === 'sticker' && !favouritesOnly}
			onclick={() => {
				kind = 'sticker';
				favouritesOnly = false;
			}}
			><span class="channel-hash" aria-hidden="true">#</span><span>stickers</span><span
				class="channel-count">{stickerCount.toLocaleString()}</span
			></button
		>
		<button
			class="channel-row"
			class:active={favouritesOnly}
			aria-pressed={favouritesOnly}
			onclick={chooseFavourites}
			><LibraryIcon name="star" size={22} /><span>favourites</span><span class="channel-count"
				>{favouriteCount}</span
			></button
		>
	</div>
</aside>
