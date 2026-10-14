<script lang="ts">
	import Collection from '$lib/Collection.svelte';
	import type { HomeResponse, User } from './+page.server';
	import Head from './Head.svelte';
	import Home from './Home.svelte';
	import Nav from './Nav.svelte';

	export let data: HomeResponse;

	const isLoggedIn: boolean = data.user !== undefined;
	const user: User = data.user || { id: '', username: '' };
</script>

<Head />

<Nav {isLoggedIn} {user} />

{#if !isLoggedIn}
	<Home />
{:else}
	<Collection guilds={data.guilds || []} userId={user.id} />
{/if}
