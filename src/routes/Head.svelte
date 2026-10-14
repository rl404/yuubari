<script lang="ts">
	const title = 'Yuubari';
	const description =
		'Browse your Discord emojis and stickers. Search across servers, copy codes, save favourites, and export an offline emoji library.';
	const image = '/logo.png';
</script>

<svelte:head>
	<title>{`${title}`} - Discord Emojis & Stickers</title>
	<meta name="description" content={description} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={image} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={title} />
	<meta name="viewport" content="width=device-width,initial-scale=1" />
	<meta http-equiv="content-type" content="text/html charset=utf-8" />
	<meta name="theme-color" content="#1a1a1e" />
	<meta name="twitter:card" content="summary" />
</svelte:head>
