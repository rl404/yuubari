import { env } from '$env/dynamic/private';
import { DISCORD_API_HOST } from '$lib/const';
import type { RequestHandler } from './$types';

export const GET = (() => {
	return new Response(null, {
		status: 302,
		headers: {
			Location: `${DISCORD_API_HOST}/oauth2/authorize?client_id=${env.DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(
				env.REDIRECT_URI
			)}&response_type=code&scope=identify+guilds`
		}
	});
}) satisfies RequestHandler;
