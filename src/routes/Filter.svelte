<script lang="ts">
	import EyeIcon from '$lib/icons/EyeIcon.svelte';
	import EyeSlashIcon from '$lib/icons/EyeSlashIcon.svelte';
	import SearchIcon from '$lib/icons/SearchIcon.svelte';

	export let query: string;
	export let showNotDiscoverable: boolean;

	const toggleShowNotDiscoverable = () => (showNotDiscoverable = !showNotDiscoverable);
</script>

<div class="flex basis-full gap-2 sm:basis-auto">
	<div class="relative grow">
		<SearchIcon class="absolute top-2 left-2 size-5 " />
		<input
			type="text"
			placeholder="search server name..."
			class="bg-background-primary focus:text-primary focus:outline-border h-9 w-full rounded-lg px-2 py-0.5 pl-10 focus:outline sm:w-56"
			bind:value={query}
		/>
	</div>
	<button
		title="show/hide not discoverable servers"
		class="bg-background-primary hover:text-primary cursor-pointer rounded-lg px-2 py-0.5 transition-colors"
		onclick={toggleShowNotDiscoverable}
	>
		{#if showNotDiscoverable}
			<EyeIcon class="size-5" />
		{:else}
			<EyeSlashIcon class="size-5" />
		{/if}
	</button>
</div>
