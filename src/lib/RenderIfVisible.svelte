<script lang="ts">
	import { onMount } from 'svelte';
	import { blur } from 'svelte/transition';

	export let component: string = 'div';
	export let delay: number = 0;

	let done: boolean = false;
	let isVisible: boolean = false;
	let timer: number;
	let element: HTMLElement;

	onMount(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						timer = setTimeout(() => {
							isVisible = true;
							done = done || isVisible;
						}, delay);
					} else {
						clearTimeout(timer);
					}
				});
			},
			{ threshold: 0.1 }
		);

		observer && observer.observe(element);

		return () => {
			observer && observer.disconnect();
			clearTimeout(timer);
		};
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<svelte:element
	this={component}
	id={$$props.id}
	class={$$props.class}
	onclick={$$props.onclick}
	bind:this={element}
	transition:blur
>
	{#if isVisible || done}
		<slot />
	{/if}
</svelte:element>
