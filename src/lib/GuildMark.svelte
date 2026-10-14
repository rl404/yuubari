<script lang="ts">
	import type { CatalogGuild } from '$lib/catalog';
	import { DISCORD_CDN_HOST } from '$lib/const';
	import { getDiscordImage } from '$lib/utils';

	export let guild: CatalogGuild;
	let imageFailed = false;
	$: if (guild.id) imageFailed = false;
</script>

<span class="guild-mark" aria-hidden="true">
	{#if guild.icon && !imageFailed}
		<img
			src={`${DISCORD_CDN_HOST}/icons/${guild.id}/${getDiscordImage(guild.icon)}?size=64`}
			alt=""
			width="24"
			height="24"
			loading="lazy"
			onerror={() => (imageFailed = true)}
		/>
	{:else}
		{Array.from(guild.name).slice(0, 2).join('').toUpperCase()}
	{/if}
</span>
