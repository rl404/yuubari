<script lang="ts">
	import { DISCORD_CDN_HOST } from '$lib/const';
	import CheckIcon from '$lib/icons/CheckIcon.svelte';
	import { blur } from 'svelte/transition';
	import type { Sticker } from './api/guilds/[guild_id]/emojis_stickers/+server';

	export let sticker: Sticker;

	let showCopied: boolean = false;

	const onClick = () => {
		navigator.clipboard.writeText(`${DISCORD_CDN_HOST}/stickers/${sticker.id}.png`);
		showCopied = true;
		setTimeout(() => {
			showCopied = false;
		}, 600);
	};
</script>

<div class="relative">
	<img
		src={`${DISCORD_CDN_HOST}/stickers/${sticker.id}.png`}
		alt={sticker.name}
		title={sticker.name}
		class="aspect-square h-full w-full cursor-pointer object-contain transition-opacity hover:opacity-70"
		onclick={onClick}
	/>
	{#if showCopied}
		<div
			class="bg-background-primary absolute top-0 right-0 flex h-full w-full flex-col items-center justify-center"
			transition:blur={{ duration: 150 }}
		>
			<CheckIcon class="size-5 text-green-500" />
			<div class="text-center text-xs">Link Copied</div>
		</div>
	{/if}
</div>
