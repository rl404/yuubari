<script lang="ts">
	import { DISCORD_CDN_HOST } from '$lib/const';
	import RenderIfVisible from '$lib/RenderIfVisible.svelte';
	import { getDiscordImage, getDiscordTitle } from '$lib/utils';
	import type { Guild } from './+page.server';

	export let guild: Guild;

	const onClick = (id: string) => {
		const el = document.getElementById(id);
		if (el) {
			el.scrollIntoView({
				behavior: 'smooth',
				block: 'center'
			});
			const div = el.firstElementChild;
			if (div) {
				div.classList.add('outline-background-active');
				div.classList.remove('outline-transparent');
				setTimeout(() => {
					div.classList.remove('outline-background-active');
					div.classList.add('outline-transparent');
				}, 700);
			}
		}
	};
</script>

<RenderIfVisible
	component="button"
	class="group aspect-square w-full cursor-pointer"
	onclick={() => onClick(guild.id)}
>
	{#if guild.icon}
		<img
			src={`${DISCORD_CDN_HOST}/icons/${guild.id}/${guild.icon}.png`}
			alt={getDiscordTitle(guild.name)}
			class="bg-background-primary h3 hover:bg-background-active flex h-full w-full items-center justify-center rounded-2xl object-cover transition-colors group-hover:hidden"
		/>
		<img
			src={`${DISCORD_CDN_HOST}/icons/${guild.id}/${getDiscordImage(guild.icon)}`}
			alt={getDiscordTitle(guild.name)}
			class="bg-background-primary h3 hover:bg-background-active hidden h-full w-full items-center justify-center rounded-2xl object-cover transition-colors group-hover:flex"
		/>
	{:else}
		<div
			class="bg-background-primary h3 hover:bg-background-active flex h-full w-full items-center justify-center rounded-2xl transition-colors"
		>
			{getDiscordTitle(guild.name)}
		</div>
	{/if}
</RenderIfVisible>
