<script lang="ts">
	import './Nav.css';
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { DISCORD_CDN_HOST } from '$lib/const';
	import LibraryIcon from '$lib/icons/LibraryIcon.svelte';
	import GithubIcon from '$lib/icons/GithubIcon.svelte';
	import LogoutIcon from '$lib/icons/LogoutIcon.svelte';
	import { clickOutside, getDiscordImage, getDiscordTitle } from '$lib/utils';
	import type { User } from './+page.server';
	export let isLoggedIn: boolean;
	export let user: User;
	let showMenu = false;
	let appearance: 'light' | 'dark' | 'system' = 'dark';
	let colourPreference: MediaQueryList;
	let menuTrigger: HTMLButtonElement;
	function closeMenu(restoreFocus = false) {
		showMenu = false;
		if (restoreFocus) menuTrigger?.focus();
	}
	function toggleMenu(event: MouseEvent) {
		if (event.currentTarget instanceof HTMLButtonElement) menuTrigger = event.currentTarget;
		showMenu = !showMenu;
	}
	function applyAppearance() {
		document.documentElement.dataset.theme =
			appearance === 'system' ? (colourPreference.matches ? 'dark' : 'light') : appearance;
	}
	function changeAppearance() {
		applyAppearance();
		try {
			localStorage.setItem('yuubari:appearance', appearance);
		} catch {
			/* Keep the current appearance for this visit. */
		}
	}
	onMount(() => {
		colourPreference = window.matchMedia('(prefers-color-scheme: dark)');
		try {
			const saved = localStorage.getItem('yuubari:appearance');
			if (saved === 'light' || saved === 'dark' || saved === 'system') appearance = saved;
		} catch {
			/* Use the default appearance. */
		}
		applyAppearance();
		colourPreference.addEventListener('change', applyAppearance);
		return () => colourPreference.removeEventListener('change', applyAppearance);
	});
</script>

<svelte:window
	onkeydown={(event) => {
		if (event.key === 'Escape' && showMenu) closeMenu(true);
	}}
/>
<nav class="app-nav" class:logged-in={isLoggedIn} aria-label="Main navigation">
	<a class="nav-brand" href={resolve('/')} aria-label="Yuubari home"
		><img src="/logo.png" alt="" width="24" height="24" /><span>Yuubari</span></a
	>
	<div class="nav-account" use:clickOutside={() => closeMenu()}>
		{#if isLoggedIn}<div class="account-identity">
				<strong>{user.username}</strong><span>Emoji library</span>
			</div>{/if}
		<button
			class="settings-button"
			aria-label="Settings"
			aria-expanded={showMenu}
			aria-controls={showMenu ? 'account-popup' : undefined}
			onclick={toggleMenu}
			title="Settings"><LibraryIcon name="settings" size={18} /></button
		>
		{#if isLoggedIn}<button
				class="account-button"
				aria-label="Account menu"
				aria-expanded={showMenu}
				aria-controls={showMenu ? 'account-popup' : undefined}
				onclick={toggleMenu}
				>{#if user.avatar}<img
						src={`${DISCORD_CDN_HOST}/avatars/${user.id}/${getDiscordImage(user.avatar)}`}
						alt=""
						width="26"
						height="26"
					/>{:else}{getDiscordTitle(user.username)}{/if}</button
			>{/if}
		{#if showMenu}<div class="account-popup" id="account-popup">
				{#if isLoggedIn}<p class="account-name">{user.username}</p>{/if}
				<label class="appearance-control"
					><span>Appearance</span><select
						aria-label="Appearance"
						bind:value={appearance}
						onchange={changeAppearance}
						><option value="dark">Dark</option><option value="light">Light</option><option
							value="system">System</option
						></select
					></label
				>
				<a href="https://github.com/cmdr-chara/yuubari" target="_blank" rel="noopener noreferrer"
					><GithubIcon class="size-4" />Source code</a
				>
				{#if isLoggedIn}<a href={resolve('/auth/logout')}><LogoutIcon class="size-4" />Log out</a
					>{/if}
			</div>{/if}
	</div>
</nav>
