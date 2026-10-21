# Yuubari

<p align="center">
    <img src="https://raw.githubusercontent.com/rl404/yuubari/master/static/images/home.png">
</p>

_Yuubari_ is a browser for the Discord emojis and stickers in your joined, discoverable servers.
Search the collection, save favourites, copy Discord codes or image links, and export an offline emoji library.

_\*only works for [discoverable](https://support.discord.com/hc/en-us/articles/360030843331-Enabling-Server-Discovery) discord servers_

## Requirement

- [NodeJS](https://nodejs.org/) 24 or later
- [Discord Application](https://discord.com/developers/applications)
  - Client id
  - Client secret
  - Bot token

## Installation

1. Clone the repo

```sh
git clone https://github.com/rl404/yuubari
```

2. Rename `.env.example` to `.env` and modify the value according to your setup.
3. Install dependencies.

```sh
npm ci
```

4. Start.

```sh
npm run dev
```

5. [http://localhost:5173](http://localhost:5173) is ready.

Register `http://localhost:5173/auth/callback` as an OAuth2 redirect in your Discord application. Keep the client secret and bot token in `.env`; do not commit them. `PUBLIC_GA_ID` is optional and analytics do not initialize when it is empty.

## Using the collection

- Search by emoji or sticker name, server name, or ID. Words can be combined, such as `brawl clock`. The search field is at the bottom of the collection. Press **Ctrl+K** or **Cmd+K** to focus search and **Escape** in the search field to clear it.
- Select a server from the left icon rail (or the server dropdown on mobile), static/animated format, or the Favourites filter. Mobile format and copy controls are behind **Filter options**. Servers load with bounded concurrency; results appear as they arrive. Unavailable servers appear in a compact notice with expandable per-server details. When Discord supplies a rate-limit delay, the request queue pauses. Short delays (up to 10 seconds) are retried automatically, with at most two retries per server. Longer delays and exhausted retries show a countdown before manual retry, which reloads only failed servers.
- To reload one server, select it and use the reload arrow beside its result count. Refresh bypasses the browser cache, leaves other servers alone, and keeps the previous collection visible if refreshing fails. Discord’s reported cooldown disables the reload action until it expires.
- Click an emoji to copy its Discord code. Static emojis use `<:name:id>` and animated emojis use `<a:name:id>`. Switch to **Image link** to copy a CDN URL instead. Discord's own Nitro, server-access, and external-emoji permission rules still apply; copying valid syntax does not grant access.
- Click an asset’s name for an enlarged preview, its server and ID, a selectable code, and the original asset link. On desktop screens at least 1200px wide, details open in the right pane; the header toggle hides or shows this pane. On smaller screens, details open in a keyboard-accessible dialog.
- Use the star to save an emoji or sticker. Favourites are stored in this browser, separately for each signed-in Discord user. They are not synced between browsers. The selected copy format is also remembered locally.
- Open **Settings** to choose **Light**, **Dark**, or **System** from Appearance. Dark is the default. The preference is saved in this browser; System follows changes to the operating system’s appearance.
- Stickers copy as asset links; Lottie stickers provide a JSON asset link instead of a raster preview.
- Copy success appears on the clicked emoji only after the clipboard accepts the value. If clipboard access is denied, a field appears so you can copy the value manually.

## Offline export

In the **Emojis** tab, **Export emojis** saves all matching emojis, including results beyond **Show more**, in a single HTML file. Use the search, server, animation, and favourites filters to choose what is exported.

Names, server names, Discord codes, and image bytes are embedded in the file. Animated images retain their animation. Open it in a browser to search, view, and copy codes without signing in; browsing requires no network access. Clipboard support for local files varies by browser, so the code fields can also be selected and copied manually.

Export waits for the server collection to finish loading and includes successfully loaded servers. Failed or non-discoverable servers are identified in the interface. Image downloads show progress and can be cancelled. A failed image download prevents saving an incomplete file; no partial file is silently created. Export is for emojis; stickers remain available in the online collection.

## Selected PNG export

In **Emojis**, click **Select**, then click previews or their checkboxes. Selection mode uses clicks to select; click **Done** to return to copying and clear the selection.

**Select results** adds every matching emoji, including results beyond **Show more**. Selections stay when you search, change servers, or filter favourites; the count identifies selections hidden by filters. **Clear** removes the entire selection.

The existing Export button changes to **PNG ZIP** in selection mode. It saves the selected emojis in one ZIP containing:

- PNG image files, such as `Badge11.png`, retaining the source dimensions and transparency.
- `emoji-names.txt`, one short name per line, such as `:Badge11:`.
- `emoji-manifest.json`, mapping each filename to its original name, short name, ID, server, and whether the source was animated.

Animated emojis become a still PNG using their default/first frame. Duplicate names receive an ID suffix so images are not overwritten; filenames are made portable. Images are converted in the browser with bounded concurrency. Failed downloads or conversions prevent a partial ZIP, and cancellation keeps the selection available for retry. PNG/ZIP support loads only when requested.

## Code layout

For a request walkthrough, file map, styling conventions, and the Svelte concepts used here, see [Maintaining Yuubari](docs/MAINTAINING.md). Collection request handling lives in `src/lib/collection/servers.ts`; clipboard and export jobs live in `src/lib/collection/actions.ts`. The UI components and their CSS are grouped in that directory.

## Development checks

```sh
npm test
npm run check
npm run lint
npm run build
```

The tests use Node's built-in runner and cover Discord syntax, search/favourites, loading failures and cancellation, offline image preservation, and escaping exported metadata. They need no Discord credentials or additional test dependencies.

To run the production build locally on the same OAuth origin:

```sh
HOST=127.0.0.1 PORT=5173 ORIGIN=http://localhost:5173 node --env-file=.env build
```

## Trivia

[Yuubari](https://en.wikipedia.org/wiki/Japanese_cruiser_Y%C5%ABbari)'s name is taken from one of japanese cruiser.
Also, [exists](https://en.kancollewiki.net/Yuubari) in Kantai Collection games and manga.

## License

MIT License

Copyright (c) 2025 Axel
