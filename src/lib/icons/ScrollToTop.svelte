<script lang="ts">
	import { twMerge } from 'tailwind-merge';
	import ChevronUpIcon from './ChevronUpIcon.svelte';

	let hidden: boolean = true;

	const onScroll = () => {
		const container = document.documentElement || document.body;
		if (!container) return;
		hidden = container.scrollTop <= 150;
	};

	const onClick = () => {
		const container = document.documentElement || document.body;
		container.scroll({
			top: 0,
			behavior: 'smooth'
		});
	};
</script>

<svelte:window onscroll={onScroll} />

<div
	class={twMerge(
		'fixed right-0 bottom-0 z-10 p-8 transition',
		hidden ? 'opacity-0' : 'opacity-70 hover:opacity-100'
	)}
>
	<button
		title="scroll to top"
		class="bg-background-primary border-border hover:bg-background-active hover:text-primary cursor-pointer rounded-full border-2 p-4 transition"
		onclick={onClick}
	>
		<ChevronUpIcon class="size-5" />
	</button>
</div>
