<script lang="ts">
	export let name:
		| 'search'
		| 'star'
		| 'download'
		| 'copy'
		| 'check'
		| 'grid'
		| 'close'
		| 'retry'
		| 'expand'
		| 'arrow'
		| 'chevron'
		| 'settings'
		| 'filter'
		| 'select';
	export let filled = false;
	export let size = 20;
	const paths = {
		search: 'm21 21-4.4-4.4M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
		star: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z',
		download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
		copy: 'M9 9h12v12H9zM15 9V3H3v12h6',
		check: 'm5 12 4 4L19 6',
		grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
		close: 'm6 6 12 12M6 18 18 6',
		retry: 'M20 7v5h-5M4 17v-5h5M6.1 6a8 8 0 0 1 13.3 3M4.6 15a8 8 0 0 0 13.3 3',
		expand: 'M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7',
		arrow: 'M5 19 19 5M5 5h14v14',
		chevron: 'm6 9 6 6 6-6',
		settings:
			'M10 3h4l.5 2.5 2 .9 2.3-.8 2 3.4-1.8 1.7v2.6l1.8 1.7-2 3.4-2.3-.8-2 .9L14 21h-4l-.5-2.5-2-.9-2.3.8-2-3.4L5 13.3v-2.6L3.2 9l2-3.4 2.3.8 2-.9L10 3Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
		filter: 'M4 7h16M4 17h16M8 4v6M16 14v6',
		select: 'M4 4h16v16H4zM7 12l3 3 7-7'
	};
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill={filled ? 'currentColor' : 'none'}
	stroke="currentColor"
	stroke-width="1.7"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	<path d={paths[name]} />
</svg>
