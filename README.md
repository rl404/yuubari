# Yuubari

<p align="center">
    <img src="https://raw.githubusercontent.com/rl404/yuubari/master/static/home.png">
</p>

_Yuubari_ is a simple website to list your Discord Emojis & Stickers from all your joined Discord servers.
You can click the emoji/sticker to copy the link to your clipboard and use it somewhere easily.

_\*only works for [discoverable](https://support.discord.com/hc/en-us/articles/360030843331-Enabling-Server-Discovery) discord servers_

## Requirement

- [NodeJS](https://nodejs.org/)
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

## Trivia

[Yuubari](https://en.wikipedia.org/wiki/Japanese_cruiser_Y%C5%ABbari)'s name is taken from one of japanese cruiser.
Also, [exists](https://en.kancollewiki.net/Yuubari) in Kantai Collection games and manga.

## License

MIT License

Copyright (c) 2025 Axel
