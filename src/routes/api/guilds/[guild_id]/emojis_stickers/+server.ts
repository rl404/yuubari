import { DISCORD_BOT_TOKEN } from '$env/static/private';
import { DISCORD_API_HOST } from '$lib/const';
import type { RequestHandler } from './$types';

export type EmojiStickerResponse = {
	status: number;
	message: string;
	data: {
		emojis: Emoji[];
		stickers: Sticker[];
	};
};

export type Emoji = {
	id: string;
	name: string;
	animated?: boolean;
};

export type Sticker = {
	id: string;
	name: string;
	format_type: number;
};

export const GET = (async ({ params }) => {
	const resp = await fetch(`${DISCORD_API_HOST}/guilds/${params.guild_id}/preview`, {
		headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` }
	});

	if (!resp.ok) {
		if (resp.status === 401) {
			return new Response(JSON.stringify({ status: 401, message: 'invalid token' }), {
				status: 401
			});
		}
		return new Response(JSON.stringify({ status: resp.status, message: 'internal error' }), {
			status: resp.status
		});
	}

	const data: { emojis: Emoji[]; stickers: Sticker[] } = await resp.json();

	return new Response(
		JSON.stringify({
			status: 200,
			message: 'ok',
			data: {
				emojis: data.emojis,
				stickers: data.stickers
			}
		}),
		{
			headers: {
				'cache-control': 'max-age=86400, s-maxage=86400, stale-while-revalidate=86400'
			}
		}
	);
}) satisfies RequestHandler;
