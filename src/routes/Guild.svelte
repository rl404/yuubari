<script lang="ts">
	import { DISCORD_CDN_HOST } from '$lib/const';
	import RenderIfVisible from '$lib/RenderIfVisible.svelte';
	import { getDiscordImage, getDiscordTitle } from '$lib/utils';
	import { onMount } from 'svelte';
	import { twMerge } from 'tailwind-merge';
	import type { Guild } from './+page.server';
	import type {
		Emoji as _Emoji,
		Sticker as _Sticker,
		EmojiStickerResponse
	} from './api/guilds/[guild_id]/emojis_stickers/+server';
	import Emoji from './Emoji.svelte';
	import Sticker from './Sticker.svelte';

	export let guild: Guild;

	let isDiscoverable: boolean = guild.features.includes('DISCOVERABLE');
	let emojis: _Emoji[] = [];
	let stickers: _Sticker[] = [];
	let showMoreEmoji: boolean = false;
	let showMoreSticker: boolean = false;
	let loading: boolean = true;
	let error: boolean = false;
	let tab: number = 0;

	const onTabChange = (v: number) => (tab = v);

	onMount(async () => {
		if (!isDiscoverable) {
			loading = false;
			return;
		}
		callAPI();
	});

	const callAPI = async () => {
		loading = true;
		error = false;

		const resp = await fetch(`/api/guilds/${guild.id}/emojis_stickers`);
		if (!resp.ok) {
			loading = false;
			error = true;
			return;
		}

		const body: EmojiStickerResponse = await resp.json();

		emojis = body.data.emojis.sort((a, b) => {
			if ((a.animated ?? false) !== (b.animated ?? false)) {
				return (a.animated ?? false) ? 1 : -1;
			}
			return a.name.localeCompare(b.name);
		});
		stickers = body.data.stickers.sort((a, b) => {
			if (a.format_type === b.format_type) {
				return a.name.localeCompare(b.name);
			}
			return a.format_type < b.format_type ? -1 : 1;
		});
		loading = false;
		error = false;
	};

	const toggleShowMoreEmoji = () => {
		showMoreEmoji = !showMoreEmoji;
		if (!showMoreEmoji) {
			setTimeout(() => {
				scrollToID(guild.id);
			}, 450);
		}
	};

	const toggleShowMoreSticker = () => {
		showMoreSticker = !showMoreSticker;
		if (!showMoreSticker) {
			setTimeout(() => {
				scrollToID(guild.id);
			}, 450);
		}
	};

	const scrollToID = (id: string) => {
		const el = document.getElementById(id);
		if (el) {
			el.scrollIntoView({
				behavior: 'smooth',
				block: 'center'
			});
		}
	};
</script>

<div
	class="bg-background-primary grid gap-2 rounded-lg p-4 outline outline-transparent transition-colors duration-700 ease-linear"
>
	<div class="col-span-full flex flex-wrap items-center justify-between gap-2 sm:flex-nowrap">
		<div class="flex basis-full items-center gap-2 sm:basis-auto">
			<div class="aspect-square size-10">
				{#if guild.icon}
					<img
						src={`${DISCORD_CDN_HOST}/icons/${guild.id}/${getDiscordImage(guild.icon)}`}
						alt={getDiscordTitle(guild.name)}
						class="bg-background-primary h3 flex h-full w-full items-center justify-center rounded-lg"
					/>
				{:else}
					<div
						class="h5 bg-background-active flex h-full w-full items-center justify-center rounded-lg"
					>
						{getDiscordTitle(guild.name)}
					</div>
				{/if}
			</div>
			<h3 class="h3 line-clamp-2" title={guild.name}>{guild.name}</h3>
		</div>
		{#if isDiscoverable}
			<div class="flex basis-full items-center justify-center gap-2 sm:basis-auto sm:justify-end">
				<button
					class={twMerge(
						'bg-background-active text-primary cursor-pointer rounded-lg px-2 py-0.5 opacity-50 transition-opacity hover:opacity-100',
						tab === 0 && 'opacity-100'
					)}
					onclick={() => onTabChange(0)}
				>
					Emoji ({emojis.length.toLocaleString()})
				</button>
				<button
					class={twMerge(
						'bg-background-active text-primary cursor-pointer rounded-lg px-2 py-0.5 opacity-50 transition-opacity hover:opacity-100',
						tab === 1 && 'opacity-100'
					)}
					onclick={() => onTabChange(1)}
				>
					Sticker ({stickers.length.toLocaleString()})
				</button>
			</div>
		{/if}
	</div>
	<div class="bg-border col-span-full h-0.5 w-full"></div>
	<div
		class="grid grid-cols-4 gap-2 sm:grid-cols-8 md:grid-cols-12 lg:grid-cols-16 xl:grid-cols-20 2xl:grid-cols-24"
	>
		{#if !isDiscoverable}
			<div class="col-span-full text-center">
				Server is not <a
					href="https://support.discord.com/hc/en-us/articles/360030843331-Enabling-Server-Discovery"
					target="_blank"
					referrerpolicy="no-referrer"
					class="text-background-active">discoverable</a
				>.
			</div>
		{:else if loading}
			{#each Array(24 * 4), i}
				<div
					class={twMerge(
						'bg-background-secondary aspect-square animate-pulse rounded-lg',
						i > 39
							? 'hidden 2xl:block'
							: i > 31
								? 'hidden xl:block'
								: i > 23
									? 'hidden lg:block'
									: i > 15
										? 'hidden md:block'
										: ''
					)}
				></div>
			{/each}
		{:else if error}
			<div class="col-span-full text-center">
				Something wrong.
				<button
					class="text-background-active cursor-pointer transition-opacity hover:opacity-70"
					onclick={callAPI}
				>
					Retry.
				</button>
			</div>
		{:else if tab === 0}
			{#if emojis.length === 0}
				<div class="col-span-full text-center">No custom emojis in this server.</div>
			{:else}
				{#each showMoreEmoji ? emojis : emojis.slice(0, 24 * 4) as emoji, i}
					<RenderIfVisible
						class={twMerge(
							'aspect-square h-full w-full',
							!showMoreEmoji &&
								(i > 39
									? 'hidden 2xl:block'
									: i > 31
										? 'hidden xl:block'
										: i > 23
											? 'hidden lg:block'
											: i > 15
												? 'hidden md:block'
												: '')
						)}
					>
						<Emoji {emoji} />
					</RenderIfVisible>
				{/each}
				{#if emojis.length > 24 * 4}
					<div class="sticky bottom-2 col-span-full text-center">
						<button
							class="bg-background-active text-primary cursor-pointer rounded-lg px-2 py-0.5 transition-opacity hover:opacity-70"
							onclick={toggleShowMoreEmoji}>show {showMoreEmoji ? 'less' : 'more'}</button
						>
					</div>
				{/if}
			{/if}
		{:else if tab === 1}
			{#if stickers.length === 0}
				<div class="col-span-full text-center">No custom stickers in this server.</div>
			{:else}
				{#each showMoreSticker ? stickers : stickers.slice(0, 24) as sticker, i}
					<RenderIfVisible
						class={twMerge(
							'col-span-2 aspect-square h-full w-full',
							!showMoreSticker &&
								(i > 9
									? 'hidden 2xl:block'
									: i > 7
										? 'hidden xl:block'
										: i > 5
											? 'hidden lg:block'
											: i > 3
												? 'hidden md:block'
												: '')
						)}
					>
						<Sticker {sticker} />
					</RenderIfVisible>
				{/each}
				{#if stickers.length > 24}
					<div class="sticky bottom-2 col-span-full text-center">
						<button
							class="bg-background-active text-primary cursor-pointer rounded-lg px-2 py-0.5 transition-opacity hover:opacity-70"
							onclick={toggleShowMoreSticker}>show {showMoreSticker ? 'less' : 'more'}</button
						>
					</div>
				{/if}
			{/if}
		{/if}
	</div>
</div>
