# Esiana

> Your world. Your stories.

Esiana is a self-hosted TTRPG campaign manager built for long-running worlds, evolving narratives, and interconnected lore.

Unlike traditional worldbuilding wikis, Esiana focuses on continuity, historical state, knowledge discovery, and the relationships between the people, places, and events that shape your world.

![Release](https://img.shields.io/github/v/release/Esiana-ttrpg/esiana-core?style=for-the-badge&color=5BCEFA&cacheSeconds=14400)
![Discussions](https://img.shields.io/github/discussions/esiana-ttrpg/esiana-core?style=for-the-badge&color=F5A9B8&cacheSeconds=14400)
![Docker Pulls](https://img.shields.io/docker/pulls/esiana/esiana?style=for-the-badge&color=FFFFFF&cacheSeconds=14400)
![License](https://img.shields.io/github/license/esiana-ttrpg/esiana-core?style=for-the-badge&color=F5A9B8&cacheSeconds=14400)]
![Discord](https://img.shields.io/discord/1516532775132463194?style=for-the-badge&logo=discord&label=Discord&color=F5A9B8&cacheSeconds=14400)



## Features

| Domain | Capability |
| :--- | :--- |
| **Worldbuilding Core** | Characters, locations, organizations, families, objects, and custom entity types with full relational modeling |
| **Relationship Networks** | Character relationships, family trees, political hierarchies, faction structures, and custom graph links |
| **Narrative Continuity** | Historical state tracking, entity evolution, timeline-linked events, and lore provenance |
| **Knowledge System** | Player vs GM knowledge separation, discovery-based lore, rumors, and visibility controls |
| **Time & Calendars** | Custom fantasy calendars, moons, seasons, world clocks, and timeline synchronization |
| **Maps & Geography** | Regions, borders, trade routes, travel paths, layered overlays, and pinned world entities |
| **Campaign Operations** | Multi-campaign worlds, unified campaign history, character perspective switching, and narrative dashboards |
| **Collaboration** | Multi-user editing, role-based permissions, shared worldbuilding, and co-GM workflows |
| **Self Hosting** | Docker deployment, Postgres/SQLite support, plugin architecture, full data ownership |

## Own Your World

Esiana stores your campaign data in open, portable formats.

- Export complete campaign archives
- Import existing worlds and datasets
- Preserve relationships and historical continuity
- Create full backups for long-term preservation

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

- User Guide
- Self-Hosting Guide
- Plugin Development
- API Documentation (`/api/docs`)
- Roadmap
- Discussions
