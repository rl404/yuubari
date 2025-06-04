<script lang="ts">
	import { DISCORD_CDN_HOST } from '$lib/const';
	import GithubIcon from '$lib/icons/GithubIcon.svelte';
	import LogoutIcon from '$lib/icons/LogoutIcon.svelte';
	import { clickOutside, getDiscordImage, getDiscordTitle } from '$lib/utils';
	import type { User } from './+page.server';

	export let isLoggedIn: boolean;
	export let user: User;

	let showMenu: boolean = false;

	const openMenu = () => (showMenu = true);
	const closeMenu = () => (showMenu = false);
</script>

<nav
	class="border-border bg-background-secondary fixed top-0 z-50 flex w-full items-center justify-between gap-2 border-b p-2"
>
	<div class="flex items-end gap-2 select-none">
		<img src="/logo.png" alt="logo" class="size-10 rounded-full" />
		<h1 class="h1">Yuubari</h1>
		<span class="hidden text-xs sm:block">— Discord Emojis & Stickers</span>
	</div>
	<div class="flex items-center gap-2">
		<a
			title="source code"
			href="https://github.com/rl404/yuubari"
			target="_blank"
			class="hover:text-primary transition-colors"
		>
			<GithubIcon class="size-7" />
		</a>
		{#if isLoggedIn}
			<div class="relative">
				<button
					class="flex cursor-pointer items-center"
					onclick={openMenu}
					use:clickOutside={closeMenu}
				>
					{#if user.avatar}
						<img
							src={`${DISCORD_CDN_HOST}/avatars/${user.id}/${getDiscordImage(user.avatar)}`}
							alt={getDiscordTitle(user.username)}
							class="bg-background-active text-primary flex size-10 items-center justify-center rounded-full transition-opacity hover:opacity-80"
						/>
					{:else}
						<div
							class="bg-background-active text-primary flex size-10 items-center justify-center rounded-full transition-opacity hover:opacity-80"
						>
							{getDiscordTitle(user.username)}
						</div>
					{/if}
				</button>
				{#if showMenu}
					<div
						class="bg-background-primary border-border absolute top-full right-0 grid gap-2 rounded-lg border p-2"
					>
						<div class="text-nowrap">
							Logged in as <span class="text-primary font-bold">{user.username}</span>
						</div>
						<div class="bg-border h-0.5 w-full"></div>
						<a
							class="hover:text-primary flex cursor-pointer items-center gap-2 transition-colors"
							href="/auth/logout"
						>
							<LogoutIcon class="size-5" />Logout
						</a>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</nav>
