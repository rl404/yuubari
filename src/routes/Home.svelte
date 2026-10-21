<script>
	import './Home.css';
	import { resolve } from '$app/paths';
</script>

<main class="home-main">
	<section class="home-login">
		<img src="/logo.png" alt="" width="48" height="48" />
		<h1>Yuubari</h1>
		<p>
			Browse your Discord emojis and stickers, copy their codes, and save an offline collection.
		</p>
		<a class="primary-action" href={resolve('/auth/login')}>Login with Discord</a>
		<p class="home-note">Available for discoverable servers you’ve joined.</p>
	</section>
</main>
