<script lang="ts">
	import type { Guild } from './+page.server';
	import GuildIcon from './GuildIcon.svelte';

	export let guilds: Guild[];
</script>

<div
	class="border-border fixed top-0 left-0 flex h-full w-16 flex-col gap-2 overflow-y-scroll border-r p-2 pt-16 transition-all sm:w-20"
>
	{#each guilds as guild (guild.id)}
		<GuildIcon {guild} />
	{/each}
</div>
