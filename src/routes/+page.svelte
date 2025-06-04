<script lang="ts">
	import ScrollToTop from '$lib/icons/ScrollToTop.svelte';
	import RenderIfVisible from '$lib/RenderIfVisible.svelte';
	import type { Guild as _Guild, HomeResponse, User } from './+page.server';
	import Filter from './Filter.svelte';
	import Guild from './Guild.svelte';
	import Head from './Head.svelte';
	import Home from './Home.svelte';
	import Nav from './Nav.svelte';
	import Sidebar from './Sidebar.svelte';

	export let data: HomeResponse;

	const isLoggedIn: boolean = data.user !== undefined;
	const user: User = data.user || { id: '', username: '' };
	const guilds: _Guild[] = data.guilds || [];

	let query: string = '';
	let showNotDiscoverable: boolean = true;

	$: filteredGuilds = guilds
		.filter((g) => g.name.toLowerCase().includes(query.toLowerCase()))
		.filter((g) => showNotDiscoverable || g.features.includes('DISCOVERABLE'));
</script>

<Head />

<Nav {isLoggedIn} {user} />

{#if !isLoggedIn}
	<Home />
{:else}
	<Sidebar guilds={filteredGuilds} />
	<main class="mt-14 ml-16 flex flex-col gap-2 p-4 transition-all sm:ml-20">
		<div class="relative flex flex-wrap items-center justify-between gap-2">
			<div class="flex basis-full items-center gap-2 sm:basis-auto">
				<h2 class="h2">Server List</h2>
				<span>— {filteredGuilds.length.toLocaleString()}</span>
			</div>
			<Filter bind:query bind:showNotDiscoverable />
		</div>
		{#each filteredGuilds as guild (guild.id)}
			<RenderIfVisible id={guild.id} class="min-h-28" delay={300}>
				<Guild {guild} />
			</RenderIfVisible>
		{/each}
	</main>
{/if}

<ScrollToTop />
