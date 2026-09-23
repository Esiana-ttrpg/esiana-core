# Esiana

> Your world. Your stories.

Esiana is a self-hosted TTRPG campaign manager for worlds that grow and change over time.

Build your world, run your campaigns, and keep the people, places, factions, maps, history, and lore that connect them all in one place. Esiana remembers what changes along the way — and what your players have discovered — so the world can keep growing from one adventure or campaign to the next.

![Release](https://img.shields.io/github/v/release/Esiana-ttrpg/esiana-core?color=5BCEFA&cacheSeconds=14400)
![Discussions](https://img.shields.io/github/discussions/esiana-ttrpg/esiana-core?color=F5A9B8&cacheSeconds=14400)
![Docker Pulls](https://img.shields.io/docker/pulls/esiana/esiana?color=FFFFFF&cacheSeconds=14400)
![License](https://img.shields.io/github/license/esiana-ttrpg/esiana-core?color=F5A9B8&cacheSeconds=14400)
[![Discord](https://img.shields.io/discord/1516532775132463194?logo=discord&label=Discord&color=5BCEFA&cacheSeconds=14400)](https://discord.gg/2K4bQVNbUZ)


## Features

|                           | What you can do                                                                                                                                          |
| :------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **World Wiki**            | Build a connected wiki for your characters, locations, organizations, families, items, lore, and anything else that belongs in your world.               |
| **Relationship Webs**     | See how people, families, factions, and places connect through visual relationship webs, family trees, and custom relationships.                         |
| **Timelines & Calendars** | Create multiple timelines, build your own calendars, and follow your world through events, eras, seasons, moons, and the passage of time.                |
| **Discoveries & Secrets** | Reveal lore as it's discovered, track what individual characters have learned, and keep undiscovered knowledge with the GM.                              |
| **Maps & Geography**      | Build layered maps with locations, regions, borders, routes, overlays, and other geography connected directly to your world wiki.                        |
| **Journal Planner**       | Prepare newspapers, notices, bounty handouts, recurring publications, and other in-world material ahead of time, then have them appear as events happen. |
| **Campaigns**             | Run multiple campaigns in the same world, each leaving its characters, adventures, discoveries, and history behind for the next.                         |
| **Find a Game**           | Recruit players, discover open games, and bring a new group together without leaving Esiana.                                                             |
| **Plugins**               | Add new tools, themes, integrations, and game-specific features while keeping Esiana itself system-agnostic.                                             |
| **Import & Export**       | Bring in existing worlds from Kanka, World Anvil, Obsidian, and Fantasy Calendar, export to Markdown, or create a complete backup you can take with you. |

## Own Your World

Esiana keeps your campaign data in your hands.

Your worlds can be backed up, moved between installations, and exported into formats that don't depend on Esiana continuing to exist.

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
