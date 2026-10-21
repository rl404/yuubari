# Maintaining Yuubari

Start with the TypeScript modules for behavior changes. The Svelte files render their state and connect user actions to those modules. There is no application-wide state container, custom event bus, or new dependency.

## Follow one request

1. `src/routes/+page.server.ts` reads the OAuth cookies and retrieves the user and their guild list on the server.
2. `src/routes/+page.svelte` chooses the login screen or `Collection.svelte`.
3. `Collection.svelte` creates a server collection for that page instance. On mount it calls `servers.start()`; on teardown it calls `servers.destroy()`.
4. `collection/servers.ts` calls `catalog.ts`'s `loadGuilds()`. The catalog fetches the local `/api/guilds/{id}/emojis_stickers` route, validates the response, and constructs display/copy URLs.
5. The API route calls Discord using the bot token on the server. It forwards a rate-limit delay without exposing credentials.
6. The server collection publishes the new results. The page applies the current filters and renders the matching cards.

Reloading a server follows the same path with `refresh: true`, which bypasses the browser cache. The service preserves its previous entries until the new request succeeds, and retains them with an error explanation if the request fails. Requests are serialized at the page action level and bounded inside `loadGuilds()`. Retry targets only failures. On HTTP 429, `loadGuilds()` pauses its shared queue using Discord’s reported delay. Delays up to 10 seconds allow two automatic retries per server; longer delays stop queued requests and expose the remaining cooldown for manual retry. Other HTTP errors are not automatically retried. The automatic wait is abortable on page teardown. A separate numeric cooldown subscription updates the countdown without rebuilding collection data every second.

## Where to make a change

| Change                                                                          | File                                                          |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Discord request, bot authorization, upstream response status or retry headers   | `src/routes/api/guilds/[guild_id]/emojis_stickers/+server.ts` |
| Response validation, Discord IDs, asset URLs, search rules, request concurrency | `src/lib/catalog.ts`                                          |
| Loading, individual reload, retry, cooldown, retained results, cancellation     | `src/lib/collection/servers.ts`                               |
| Clipboard feedback or export job lifecycle                                      | `src/lib/collection/actions.ts`                               |
| Offline HTML generation                                                         | `src/lib/offline-export.ts`                                   |
| PNG conversion, portable filenames, ZIP contents                                | `src/lib/png-export.ts`                                       |
| Filters, selection, favourites, preference persistence, page composition        | `src/lib/Collection.svelte`                                   |
| Server rail and collection sidebar                                              | `src/lib/collection/ServerNavigation.svelte`                  |
| Toolbar, mobile collection tabs, selection controls                             | `src/lib/collection/CollectionHeader.svelte`                  |
| Loading, failure details, retry button, export progress                         | `src/lib/collection/CollectionStatus.svelte`                  |
| Desktop inspector and mobile dialog                                             | `src/lib/collection/CollectionDetails.svelte`                 |
| Contents of one asset's details                                                 | `src/lib/AssetDetails.svelte`                                 |
| A gallery card's preview and actions                                            | `src/routes/AssetCard.svelte`                                 |
| Account menu and appearance preference                                          | `src/routes/Nav.svelte`                                       |

## The Svelte concepts used here

- `export let` declares a component input. Callbacks are ordinary typed functions passed by the parent.
- `$: value = ...` recalculates a value when its inputs change. These are used for filters, counts, and display labels.
- `bind:value` connects an input to a local variable. `bind:kind`, `bind:guildId`, and similar component bindings let a child update the page's selection.
- `$servers` and `$actions` read built-in Svelte subscriptions. Their factories expose `subscribe` and named methods, with no public `set` or `update`. Use those methods rather than mutating a published snapshot. `servers.cooldown` is the separate countdown subscription. Each page owns and destroys its own instances.

The page keeps UI choices local. The services own asynchronous work. Avoid putting DOM operations in the server collection or network requests in a presentation component. The clipboard/export service uses browser APIs only when an action is invoked, so importing it during server rendering is safe.

## Styles

`src/app.css` contains fonts, shared color/size variables, base accessibility rules, and a few shared primitives. For a theme or shared sizing change, start there.

Each extracted component imports a same-name CSS file. These are regular CSS files using the existing descriptive classes, not a new styling abstraction. `Nav.css`, `Home.css`, and `GuildMark.css` follow the same convention. The existing card uses `collection/AssetCard.css`; the details wrapper owns the styles for its `AssetDetails` child. Keep component-specific breakpoints in the same file as the corresponding desktop rules.

The file split preserves the existing CSS selectors and declarations. A component stylesheet can intentionally style a child, such as the guild mark inside the server rail; check those composed states when changing it.

## Verify a change

Run from the repository root:

```sh
npm test
npm run check
npm run lint
npm run build
```

Node tests do not need Discord credentials. Catalog/export tests cover data and generated artifacts. `tests/collection.test.mjs` tests the server service through its public methods and subscription, using controlled HTTP responses for refresh failure, cooldown, and cancellation.

For a UI or action change, also exercise the affected browser flow in the production build. Check desktop and mobile, keyboard focus, theme changes, failed requests, and denied clipboard access as relevant. For exports, verify the downloaded file, not just the button state. Fixture tests can establish UI and request behavior; they do not establish live Discord availability.
