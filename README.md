# Esiana

> Your world. Your stories.

Esiana is a self-hosted TTRPG campaign manager for worlds that grow and change over time.

Build a world together and keep the characters, locations, organizations, maps, history, and lore that connect it all in one place. Plan adventures, follow what the party discovers, and add to the world as the story changes it.

Keep your characters between campaigns, join other tables, or open your own game to new players. Esiana is built for the whole table to contribute, not just the GM.

![Release](https://img.shields.io/github/v/release/Esiana-ttrpg/esiana-core?color=5BCEFA&cacheSeconds=14400)
![Discussions](https://img.shields.io/github/discussions/esiana-ttrpg/esiana-core?color=F5A9B8&cacheSeconds=14400)
![Docker Pulls](https://img.shields.io/docker/pulls/esiana/esiana?color=FFFFFF&cacheSeconds=14400)
![License](https://img.shields.io/github/license/esiana-ttrpg/esiana-core?color=F5A9B8&cacheSeconds=14400)
[![Discord](https://img.shields.io/discord/1516532775132463194?logo=discord&label=Discord&color=5BCEFA&cacheSeconds=14400)](https://discord.gg/2K4bQVNbUZ)


## Features

| **World Wiki** | Characters, locations, organizations, families, bestiary entries, ancestries, objects, and custom pages all live in the same connected wiki. Custom fields cover the things that don't fit neatly into a template. |
| --- | --- |
| **Relationships** | Connect characters, families, factions, and places with custom relationships, then explore them through relationship webs and family trees. |
| **Timelines & Calendars** | Multiple timelines and fully custom calendars, with events, eras, seasons, moons, and enough flexibility for worlds where a year definitely isn't 365 days. |
| **Discoveries & Secrets** | Track what the party has discovered, what individual characters know, and what is still firmly GM-only. |
| **Maps** | Layer locations, regions, borders, routes, and overlays onto maps, with everything linked back into the rest of the wiki. |
| **Adventures** | Keep quests, storyboards, scenes, beats, and GM planning together. Adventures can be available, active, completed, failed, or whatever the campaign turns them into. |
| **Downtime & Havens** | Track what the party gets up to between adventures: long-term projects, hirelings, and the homes, headquarters, spaceships, shops, or suspicious cult basements they call home. |
| **Development Engine** | Set trajectories for characters, factions, and locations over a period of time and generate suggestions for what happens along the way. Useful when the rest of the world shouldn't stand still just because the party went somewhere else. |
| **Journal Planner** | Prepare newspapers, notices, bounty handouts, and recurring publications ahead of time, then publish them when the right events happen. |
| **Sessions** | Schedule sessions, collect RSVPs, keep session notes together with combined views, and subscribe to upcoming games through an external calendar. |
| **Campaigns** | Run more than one campaign in the same world. Characters, discoveries, adventures, and events can become part of the setting's history instead of disappearing when a campaign ends. |
| **Find a Game** | Post an open game or browse games looking for players. Recruitment is built into the same place the campaign will actually live. |
| **Plugins & API** | Esiana is system-agnostic, with a plugin system and API for adding integrations, themes, game-specific features, or things core has no business knowing about. |
| **Import & Export** | Import from Kanka, Fantasy Calendar, Markdown, plugins, or an Esiana backup. Clone or export to Markdown or take a complete backup whenever you want. |
| **Self-Hosted & Open Source** | Multi-tenant, OIDC-capable, Localization, and designed to be self-hosted. Esiana core is AGPLv2 and plugins are MIT licensed. |

## Own Your World

Esiana is self-hosted, but your world shouldn't be trapped in one installation.

Create complete Esiana backups to move or restore a world, or export your wiki to Markdown when you want something simple and portable.

Your world should outlive any single application.


## Quick Start
Requirements: Docker and .env file

<details>
<summary><strong>Image Repositories</strong></summary>

| Registry | Image |
| --- | --- |
| Docker Hub | `esiana/esiana` |
| GitHub Container Registry | `ghcr.io/esiana-ttrpg/esiana` |

</details>
1. Download the Docker Compose template and environment file:

- [`docker-compose.yml`](https://github.com/Esiana-ttrpg/docs/blob/main/options/compose.docker.example.yml)
- [`.env.example`](https://github.com/Esiana-ttrpg/docs/blob/main/options/compose.env.example)

2. Copy the environment file:

```bash
cp .env.example .env
```

3. Edit the required values:

```env
POSTGRES_PASSWORD=change-me
JWT_SECRET=generate-with-openssl-rand-hex-32
```

4. Start Esiana:

```bash
docker compose up -d
```

5. Open:

```
http://localhost:8080
```

The first registered user becomes the system administrator.
For production deployments, reverse proxies, HTTPS, OIDC, object storage, and plugins, see the documentation.

## Documentation

- [Documentation wiki](https://github.com/Esiana-ttrpg/docs) — operators, GMs, integrators, plugin authors
- [Self-hosting installation](https://github.com/Esiana-ttrpg/docs/blob/main/self-hosting/installation.md)
- [Plugin development](https://github.com/Esiana-ttrpg/docs/blob/main/plugin-development/getting-started.md)
- [API guides](https://github.com/Esiana-ttrpg/docs/blob/main/api/overview.md) — live reference at `/api/docs` on your instance
- [Roadmap](https://github.com/Esiana-ttrpg/esiana-core/issues) · [Discussions](https://github.com/Esiana-ttrpg/esiana-core/discussions)
