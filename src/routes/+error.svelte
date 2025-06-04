<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="flex h-screen w-screen flex-col items-center justify-center">
	<div class="h1">{page.status}</div>
	<div>{page.error?.message}</div>
</div>
