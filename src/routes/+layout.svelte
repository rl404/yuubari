<script lang="ts">
	import Analytics from '$lib/Analytics.svelte';
	import '../app.css';

	let { children } = $props();
</script>

<Analytics />

{@render children()}
