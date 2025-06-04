<script lang="ts">
	import { DISCORD_CDN_HOST } from '$lib/const';
	import CheckIcon from '$lib/icons/CheckIcon.svelte';
	import { blur } from 'svelte/transition';
	import type { Emoji } from './api/guilds/[guild_id]/emojis_stickers/+server';

	export let emoji: Emoji;

	let showCopied: boolean = false;

	const onClick = () => {
		navigator.clipboard.writeText(
			`${DISCORD_CDN_HOST}/emojis/${emoji.id}.webp?animated=${emoji.animated}&size=56`
		);
		showCopied = true;
		setTimeout(() => {
			showCopied = false;
		}, 600);
	};
</script>

<div class="relative">
	<img
		src={`${DISCORD_CDN_HOST}/emojis/${emoji.id}.webp?animated=${emoji.animated}`}
		alt={emoji.name}
		title={emoji.name}
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
