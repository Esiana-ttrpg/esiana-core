/**
 * Enrich OpenAPI with Character Portfolio schemas and hand-documented operations.
 * Uses custom operationIds (not get_api_*) so sync-openapi-routes.mjs will not overwrite them.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const specPath = path.join(backendRoot, 'openapi/openapi.yaml');
const spec = YAML.parse(fs.readFileSync(specPath, 'utf8'));

const standardErrors = {
  '400': { $ref: '#/components/responses/BadRequest' },
  '401': { $ref: '#/components/responses/Unauthorized' },
  '403': { $ref: '#/components/responses/Forbidden' },
  '404': { $ref: '#/components/responses/NotFound' },
  '429': { $ref: '#/components/responses/RateLimited' },
  '500': { $ref: '#/components/responses/InternalError' },
};

const ownerAuth = {
  'x-esiana-authorization': {
    boundary: 'own-user-account',
    requires: ['Authenticated application user session'],
  },
  security: [{ cookieAuth: [] }],
  description:
    'User-scoped portfolio resource owned by the authenticated user. Not campaign-scoped.\n\n'
    + 'Authorization: Authenticated application user session.',
};

function jsonBody(schemaRef, required = true) {
  return {
    required,
    content: {
      'application/json': {
        schema: { $ref: schemaRef },
      },
    },
  };
}

function jsonOk(schemaRef, description = 'Successful response', status = '200') {
  return {
    [status]: {
      description,
      content: {
        'application/json': {
          schema: { $ref: schemaRef },
        },
      },
    },
    ...standardErrors,
  };
}

spec.components ??= {};
spec.components.schemas ??= {};

Object.assign(spec.components.schemas, {
  PortfolioDerivedFilter: {
    type: 'string',
    description:
      'Mutually exclusive provenance-derived filter. Active = ≥1 CURRENT adventure; '
      + 'Past = no CURRENT but ≥1 historical adventure; Unassigned = never had a campaign incarnation. '
      + 'Staleness alone never yields Past. Orthogonal to favorite/showcase/archive.',
    enum: ['ACTIVE', 'PAST', 'UNASSIGNED'],
  },
  PortfolioAdventureStatus: {
    type: 'string',
    enum: ['CURRENT', 'PAST', 'DETACHED'],
  },
  PortfolioAdventureDirection: {
    type: 'string',
    enum: ['TO_CAMPAIGN', 'FROM_CAMPAIGN'],
    description: 'Transform direction that created this provenance row. Not a live sync link.',
  },
  PortfolioMediaKind: {
    type: 'string',
    enum: ['PORTRAIT', 'GALLERY'],
  },
  PortfolioAdventureSnapshot: {
    type: 'object',
    description:
      'Stable historical snapshot of a campaign incarnation. Survives even if the campaign page is later inaccessible.',
    properties: {
      campaignTitle: { type: 'string' },
      campaignHandle: { type: ['string', 'null'] },
      roleLabel: { type: ['string', 'null'] },
      levelStart: { type: ['string', 'null'] },
      levelEnd: { type: ['string', 'null'] },
      startedAt: { type: ['string', 'null'], format: 'date-time' },
      endedAt: { type: ['string', 'null'], format: 'date-time' },
      sessionCount: { type: ['integer', 'null'] },
      oneShot: { type: 'boolean' },
      visibilityHint: { type: ['string', 'null'] },
    },
  },
  PortfolioCharacterAdventure: {
    type: 'object',
    description:
      'Provenance/history of a portfolio character\'s campaign incarnation. Does not change portfolio ownership '
      + 'or grant campaign access. Independent of the campaign wiki page after transform.',
    properties: {
      id: { type: 'string' },
      status: { $ref: '#/components/schemas/PortfolioAdventureStatus' },
      direction: { $ref: '#/components/schemas/PortfolioAdventureDirection' },
      campaignId: { type: 'string' },
      campaignCharacterPageId: { type: ['string', 'null'] },
      snapshot: { $ref: '#/components/schemas/PortfolioAdventureSnapshot' },
      linkedAt: { type: 'string', format: 'date-time' },
      unlinkedAt: { type: ['string', 'null'], format: 'date-time' },
    },
  },
  PortfolioCharacterMedia: {
    type: 'object',
    description: 'First-class gallery/portrait association for a portfolio character.',
    properties: {
      id: { type: 'string' },
      kind: { $ref: '#/components/schemas/PortfolioMediaKind' },
      caption: { type: ['string', 'null'] },
      sortOrder: { type: 'integer' },
      occurredAt: { type: ['string', 'null'], format: 'date-time' },
      adventureId: { type: ['string', 'null'] },
      url: { type: 'string' },
      displayUrl: { type: 'string' },
      thumbnailUrl: { type: 'string' },
      assetId: { type: 'string' },
      displayName: { type: ['string', 'null'] },
    },
  },
  PortfolioCharacter: {
    type: 'object',
    description:
      'User-owned character identity across stories. Never a campaign WikiPage. May accumulate '
      + 'PortfolioCharacterAdventure provenance rows for campaign incarnations without synchronizing to them.',
    required: ['id', 'userId', 'name', 'isShowcased', 'derivedFilter'],
    properties: {
      id: { type: 'string' },
      userId: {
        type: 'string',
        description: 'Owning user. Portfolio characters belong to exactly one user and are not campaign-scoped.',
      },
      name: { type: 'string' },
      biography: { type: 'string' },
      metadata: {
        type: 'object',
        additionalProperties: true,
        description:
          'System-agnostic Core identity/physical-appearance JSON without campaign page IDs. '
          + 'Not a full public dump — owner management only.',
      },
      tagline: { type: ['string', 'null'] },
      roleLabel: {
        type: ['string', 'null'],
        description: 'Soft presentation class/role free text (not a rules engine).',
      },
      levelLabel: {
        type: ['string', 'null'],
        description: 'Soft presentation level free text (not a rules engine).',
      },
      favoritedAt: { type: ['string', 'null'], format: 'date-time' },
      archivedAt: { type: ['string', 'null'], format: 'date-time' },
      isShowcased: {
        type: 'boolean',
        description:
          'Explicit showcase membership. Public exposure requires true. Clearing showcaseOrder alone must not un-expose.',
      },
      showcaseOrder: {
        type: ['integer', 'null'],
        description: 'Order among showcased characters; meaningful only when isShowcased is true.',
      },
      portraitMediaId: { type: ['string', 'null'] },
      portraitUrl: { type: ['string', 'null'] },
      derivedFilter: { $ref: '#/components/schemas/PortfolioDerivedFilter' },
      isFavorite: { type: 'boolean' },
      isArchived: { type: 'boolean' },
      adventures: {
        type: 'array',
        items: { $ref: '#/components/schemas/PortfolioCharacterAdventure' },
      },
      media: {
        type: 'array',
        items: { $ref: '#/components/schemas/PortfolioCharacterMedia' },
      },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  PortfolioCharacterListCounts: {
    type: 'object',
    properties: {
      all: { type: 'integer' },
      active: { type: 'integer' },
      past: { type: 'integer' },
      unassigned: { type: 'integer' },
    },
  },
  PortfolioCharacterListResponse: {
    type: 'object',
    required: ['characters', 'counts'],
    properties: {
      characters: {
        type: 'array',
        items: { $ref: '#/components/schemas/PortfolioCharacter' },
      },
      counts: { $ref: '#/components/schemas/PortfolioCharacterListCounts' },
    },
  },
  PortfolioCharacterResponse: {
    type: 'object',
    required: ['character'],
    properties: {
      character: { $ref: '#/components/schemas/PortfolioCharacter' },
    },
  },
  PortfolioCharacterCreateRequest: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', maxLength: 200 },
      biography: { type: 'string' },
      tagline: { type: ['string', 'null'] },
      roleLabel: { type: ['string', 'null'] },
      levelLabel: { type: ['string', 'null'] },
      metadata: { type: 'object', additionalProperties: true },
    },
  },
  PortfolioCharacterUpdateRequest: {
    type: 'object',
    properties: {
      name: { type: 'string', maxLength: 200 },
      biography: { type: 'string' },
      tagline: { type: ['string', 'null'] },
      roleLabel: { type: ['string', 'null'] },
      levelLabel: { type: ['string', 'null'] },
      metadata: { type: 'object', additionalProperties: true },
    },
  },
  PortfolioFavoriteRequest: {
    type: 'object',
    properties: {
      favorite: { type: 'boolean' },
    },
  },
  PortfolioArchiveRequest: {
    type: 'object',
    properties: {
      archive: {
        type: 'boolean',
        description: 'When true (default), archive; when false, unarchive. Orthogonal to Past.',
      },
    },
  },
  PortfolioShowcaseRequest: {
    type: 'object',
    required: ['showcased'],
    properties: {
      showcased: {
        type: 'boolean',
        description: 'Explicit showcase membership change. false clears membership and order together.',
      },
    },
  },
  PortfolioShowcaseReorderRequest: {
    type: 'object',
    required: ['orderedIds'],
    properties: {
      orderedIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Complete ordered list of currently showcased character ids owned by the caller.',
      },
    },
  },
  PortfolioBulkActionRequest: {
    type: 'object',
    required: ['ids', 'action'],
    properties: {
      ids: { type: 'array', items: { type: 'string' } },
      action: {
        type: 'string',
        enum: ['favorite', 'unfavorite', 'archive', 'unarchive', 'showcase', 'unshowcase'],
      },
    },
  },
  PortfolioCharactersResponse: {
    type: 'object',
    required: ['characters'],
    properties: {
      characters: {
        type: 'array',
        items: { $ref: '#/components/schemas/PortfolioCharacter' },
      },
    },
  },
  PortfolioAddToCampaignRequest: {
    type: 'object',
    required: ['campaignId'],
    properties: {
      campaignId: {
        type: 'string',
        description: 'Target campaign id. Caller must be a member. Creates a new campaign wiki character (clone), not a sync link.',
      },
    },
  },
  PortfolioAddToCampaignResponse: {
    type: 'object',
    required: ['portfolioCharacter', 'campaignCharacterPageId', 'adventureId'],
    properties: {
      portfolioCharacter: { $ref: '#/components/schemas/PortfolioCharacter' },
      campaignCharacterPageId: {
        type: 'string',
        description: 'Newly created campaign-scoped WikiPage id. Independent of the portfolio record.',
      },
      adventureId: { type: 'string' },
    },
  },
  PortfolioAddFromCampaignResponse: {
    type: 'object',
    required: ['portfolioCharacter', 'adventureId'],
    properties: {
      portfolioCharacter: { $ref: '#/components/schemas/PortfolioCharacter' },
      adventureId: { type: 'string' },
    },
  },
  PortfolioEndAdventureRequest: {
    type: 'object',
    properties: {
      levelEnd: { type: ['string', 'null'] },
    },
  },
  PortfolioCharacterExportResponse: {
    type: 'object',
    properties: {
      format: { type: 'string', example: 'esiana-portfolio-character-v1' },
      exportedAt: { type: 'string', format: 'date-time' },
      character: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          biography: { type: 'string' },
          metadata: { type: 'object', additionalProperties: true },
          tagline: { type: ['string', 'null'] },
          roleLabel: { type: ['string', 'null'] },
          levelLabel: { type: ['string', 'null'] },
        },
      },
    },
  },
  PortfolioDuplicateRequest: {
    type: 'object',
    properties: {
      copyMedia: {
        type: 'boolean',
        description: 'When true, copy media associations (shared UserAsset refs). Adventures are never copied.',
      },
    },
  },
  PublicAdventureBlurb: {
    type: 'object',
    description:
      'Campaign-aware public blurb. Campaign title/handle appear only when the campaign is linkable to the viewer; '
      + 'otherwise a generic label is used. Never a route around campaign visibility.',
    properties: {
      campaignTitle: { type: ['string', 'null'] },
      campaignHandle: { type: ['string', 'null'] },
      currentlyAdventuring: { type: 'boolean' },
      genericLabel: { type: ['string', 'null'], example: 'Currently adventuring' },
    },
  },
  PublicPortfolioCharacterProjection: {
    type: 'object',
    description:
      'Allowlisted public projection for an explicitly showcased portfolio character. '
      + 'Showcase never means serialize the full character model.',
    required: ['id', 'name', 'ownerUserId'],
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      tagline: { type: ['string', 'null'] },
      roleLabel: { type: ['string', 'null'] },
      levelLabel: { type: ['string', 'null'] },
      pronouns: { type: ['string', 'null'] },
      ancestry: { type: ['string', 'null'] },
      appearanceSummary: { type: ['string', 'null'] },
      biographyExcerpt: { type: ['string', 'null'] },
      portraitUrl: { type: ['string', 'null'] },
      adventureBlurb: {
        oneOf: [
          { $ref: '#/components/schemas/PublicAdventureBlurb' },
          { type: 'null' },
        ],
      },
      ownerUserId: { type: 'string' },
    },
  },
  PublicPortfolioAdventure: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      status: { type: 'string', enum: ['CURRENT', 'PAST'] },
      campaignTitle: {
        type: ['string', 'null'],
        description: 'Present only when the campaign is linkable to the viewer.',
      },
      campaignHandle: { type: ['string', 'null'] },
      roleLabel: { type: ['string', 'null'] },
      levelStart: { type: ['string', 'null'] },
      levelEnd: { type: ['string', 'null'] },
      startedAt: { type: ['string', 'null'], format: 'date-time' },
      endedAt: { type: ['string', 'null'], format: 'date-time' },
      sessionCount: { type: ['integer', 'null'] },
      oneShot: { type: 'boolean' },
      genericLabel: { type: ['string', 'null'] },
    },
  },
  PublicPortfolioMedia: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      kind: { $ref: '#/components/schemas/PortfolioMediaKind' },
      caption: { type: ['string', 'null'] },
      sortOrder: { type: 'integer' },
      url: { type: 'string' },
      thumbnailUrl: { type: 'string' },
    },
  },
  PublicPortfolioCharacterPageResponse: {
    type: 'object',
    description: 'Public editorial payload for a showcased portfolio character (allowlisted fields only).',
    properties: {
      character: { $ref: '#/components/schemas/PublicPortfolioCharacterProjection' },
      biography: { type: 'string' },
      adventures: {
        type: 'array',
        items: { $ref: '#/components/schemas/PublicPortfolioAdventure' },
      },
      media: {
        type: 'array',
        items: { $ref: '#/components/schemas/PublicPortfolioMedia' },
      },
      public: { type: 'boolean' },
    },
  },
  PublicUserProfile: {
    type: 'object',
    description: 'Front-facing user profile. Showcased portfolio characters are included as public projections only.',
    properties: {
      id: { type: 'string' },
      label: { type: 'string' },
      displayName: { type: ['string', 'null'] },
      avatarUrl: { type: ['string', 'null'] },
      pronouns: { type: ['string', 'null'] },
      username: { type: 'string' },
      publicBio: { type: ['string', 'null'] },
      statusBlurb: { type: ['string', 'null'] },
      bluesky: { type: ['string', 'null'] },
      discord: { type: ['string', 'null'] },
      github: { type: ['string', 'null'] },
      reddit: { type: ['string', 'null'] },
      mastodon: { type: ['string', 'null'] },
      otherLink: { type: ['string', 'null'] },
      gmStyleTags: { type: 'array', items: { type: 'string' } },
      hostedCampaigns: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            handle: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            isLookingForGroup: { type: 'boolean' },
          },
        },
      },
      showcasedCharacters: {
        type: 'array',
        description:
          'Explicitly showcased portfolio characters as public projections, ordered by showcaseOrder. '
          + 'Campaign titles inside adventure blurbs respect viewer linkability.',
        items: { $ref: '#/components/schemas/PublicPortfolioCharacterProjection' },
      },
    },
  },
  PublicUserProfileResponse: {
    type: 'object',
    required: ['profile'],
    properties: {
      profile: { $ref: '#/components/schemas/PublicUserProfile' },
    },
  },
  OkResponse: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
    },
  },
});

const portfolioIdParam = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string' },
  description: 'Portfolio character id owned by the authenticated user.',
};

const portfolioPaths = {
  '/api/user/portfolio/characters': {
    get: {
      tags: ['Character Portfolio'],
      summary: 'List portfolio characters',
      operationId: 'listPortfolioCharacters',
      ...ownerAuth,
      parameters: [
        {
          name: 'filter',
          in: 'query',
          schema: { type: 'string', enum: ['all', 'active', 'past', 'unassigned'], default: 'all' },
          description: 'Provenance-derived filter (mutually exclusive Active/Past/Unassigned).',
        },
        { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Search name/tagline/role/biography.' },
        { name: 'includeArchived', in: 'query', schema: { type: 'boolean' } },
        { name: 'favorite', in: 'query', schema: { type: 'boolean' } },
        { name: 'showcased', in: 'query', schema: { type: 'boolean' } },
      ],
      responses: jsonOk('#/components/schemas/PortfolioCharacterListResponse'),
    },
    post: {
      tags: ['Character Portfolio'],
      summary: 'Create portfolio character',
      operationId: 'createPortfolioCharacter',
      ...ownerAuth,
      requestBody: jsonBody('#/components/schemas/PortfolioCharacterCreateRequest'),
      responses: jsonOk('#/components/schemas/PortfolioCharacterResponse', 'Created', '201'),
    },
  },
  '/api/user/portfolio/characters/bulk': {
    post: {
      tags: ['Character Portfolio'],
      summary: 'Bulk portfolio management actions',
      operationId: 'bulkPortfolioCharacterActions',
      ...ownerAuth,
      description:
        'Batch favorite/archive/showcase mutations for Manage Portfolio / Manage Showcase flows.\n\n'
        + 'Authorization: Authenticated application user session.',
      requestBody: jsonBody('#/components/schemas/PortfolioBulkActionRequest'),
      responses: jsonOk('#/components/schemas/PortfolioCharactersResponse'),
    },
  },
  '/api/user/portfolio/showcase/reorder': {
    patch: {
      tags: ['Character Portfolio'],
      summary: 'Reorder showcased portfolio characters',
      operationId: 'reorderPortfolioShowcase',
      ...ownerAuth,
      description:
        'Reorders an already-showcased set. Does not add/remove showcase membership; use the showcase endpoint for membership.\n\n'
        + 'Authorization: Authenticated application user session.',
      requestBody: jsonBody('#/components/schemas/PortfolioShowcaseReorderRequest'),
      responses: jsonOk('#/components/schemas/PortfolioCharactersResponse'),
    },
  },
  '/api/user/portfolio/characters/{id}': {
    get: {
      tags: ['Character Portfolio'],
      summary: 'Get portfolio character',
      operationId: 'getPortfolioCharacter',
      ...ownerAuth,
      parameters: [portfolioIdParam],
      responses: jsonOk('#/components/schemas/PortfolioCharacterResponse'),
    },
    patch: {
      tags: ['Character Portfolio'],
      summary: 'Update portfolio character',
      operationId: 'updatePortfolioCharacter',
      ...ownerAuth,
      parameters: [portfolioIdParam],
      requestBody: jsonBody('#/components/schemas/PortfolioCharacterUpdateRequest', false),
      responses: jsonOk('#/components/schemas/PortfolioCharacterResponse'),
    },
    delete: {
      tags: ['Character Portfolio'],
      summary: 'Delete portfolio character',
      operationId: 'deletePortfolioCharacter',
      ...ownerAuth,
      parameters: [portfolioIdParam],
      description:
        'Deletes the user-owned portfolio character. Related campaign wiki pages are not cascade-deleted; '
        + 'adventure provenance detaches instead.\n\n'
        + 'Authorization: Authenticated application user session.',
      responses: jsonOk('#/components/schemas/OkResponse'),
    },
  },
  '/api/user/portfolio/characters/{id}/duplicate': {
    post: {
      tags: ['Character Portfolio'],
      summary: 'Duplicate portfolio character',
      operationId: 'duplicatePortfolioCharacter',
      ...ownerAuth,
      parameters: [portfolioIdParam],
      description:
        'Creates another independent portfolio character. Adventures are not copied. Favorite/showcase/archive are reset.\n\n'
        + 'Authorization: Authenticated application user session.',
      requestBody: jsonBody('#/components/schemas/PortfolioDuplicateRequest', false),
      responses: jsonOk('#/components/schemas/PortfolioCharacterResponse', 'Created', '201'),
    },
  },
  '/api/user/portfolio/characters/{id}/favorite': {
    post: {
      tags: ['Character Portfolio'],
      summary: 'Toggle portfolio character favorite',
      operationId: 'setPortfolioCharacterFavorite',
      ...ownerAuth,
      parameters: [portfolioIdParam],
      requestBody: jsonBody('#/components/schemas/PortfolioFavoriteRequest', false),
      responses: jsonOk('#/components/schemas/PortfolioCharacterResponse'),
    },
  },
  '/api/user/portfolio/characters/{id}/archive': {
    post: {
      tags: ['Character Portfolio'],
      summary: 'Archive or unarchive portfolio character',
      operationId: 'setPortfolioCharacterArchived',
      ...ownerAuth,
      parameters: [portfolioIdParam],
      description:
        'Personal organization only. Archive is orthogonal to provenance-derived Past.\n\n'
        + 'Authorization: Authenticated application user session.',
      requestBody: jsonBody('#/components/schemas/PortfolioArchiveRequest', false),
      responses: jsonOk('#/components/schemas/PortfolioCharacterResponse'),
    },
  },
  '/api/user/portfolio/characters/{id}/showcase': {
    post: {
      tags: ['Character Portfolio'],
      summary: 'Set portfolio character showcase membership',
      operationId: 'setPortfolioCharacterShowcase',
      ...ownerAuth,
      parameters: [portfolioIdParam],
      description:
        'Explicit showcase membership change. Public profile exposure requires isShowcased=true. '
        + 'Removing from showcase clears membership and order together — not an ordering-only mutation.\n\n'
        + 'Authorization: Authenticated application user session.',
      requestBody: jsonBody('#/components/schemas/PortfolioShowcaseRequest'),
      responses: jsonOk('#/components/schemas/PortfolioCharacterResponse'),
    },
  },
  '/api/user/portfolio/characters/{id}/add-to-campaign': {
    post: {
      tags: ['Character Portfolio'],
      summary: 'Clone portfolio character into a campaign',
      operationId: 'addPortfolioCharacterToCampaign',
      ...ownerAuth,
      parameters: [portfolioIdParam],
      description:
        'Explicit clone/transform: creates a new campaign-scoped WikiPage character and a CURRENT '
        + 'PortfolioCharacterAdventure provenance row. The portfolio and campaign records remain independently owned '
        + 'and are never synchronized afterward. Favorite/showcase/archive are not copied.\n\n'
        + 'Authorization: Authenticated application user session; caller must be a member of the target campaign.',
      requestBody: jsonBody('#/components/schemas/PortfolioAddToCampaignRequest'),
      responses: {
        '201': {
          description: 'Campaign character created; provenance adventure recorded',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PortfolioAddToCampaignResponse' },
            },
          },
        },
        ...standardErrors,
      },
    },
  },
  '/api/user/portfolio/characters/{id}/export': {
    post: {
      tags: ['Character Portfolio'],
      summary: 'Export portfolio character',
      operationId: 'exportPortfolioCharacter',
      ...ownerAuth,
      parameters: [portfolioIdParam],
      requestBody: {
        required: false,
        content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } },
      },
      responses: jsonOk('#/components/schemas/PortfolioCharacterExportResponse'),
    },
  },
  '/api/user/portfolio/characters/{id}/media': {
    post: {
      tags: ['Character Portfolio'],
      summary: 'Upload portfolio character media',
      operationId: 'uploadPortfolioCharacterMedia',
      ...ownerAuth,
      parameters: [portfolioIdParam],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['file', 'kind'],
              properties: {
                file: { type: 'string', format: 'binary' },
                kind: { $ref: '#/components/schemas/PortfolioMediaKind' },
                caption: { type: 'string' },
                displayName: { type: 'string' },
              },
            },
          },
        },
      },
      responses: jsonOk('#/components/schemas/PortfolioCharacterResponse', 'Created', '201'),
    },
  },
  '/api/user/portfolio/characters/{id}/media/{mediaId}': {
    delete: {
      tags: ['Character Portfolio'],
      summary: 'Delete portfolio character media',
      operationId: 'deletePortfolioCharacterMedia',
      ...ownerAuth,
      parameters: [
        portfolioIdParam,
        {
          name: 'mediaId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
      ],
      responses: jsonOk('#/components/schemas/PortfolioCharacterResponse'),
    },
  },
  '/api/user/portfolio/adventures/{adventureId}/end': {
    post: {
      tags: ['Character Portfolio'],
      summary: 'Mark portfolio adventure as past',
      operationId: 'endPortfolioAdventure',
      ...ownerAuth,
      parameters: [
        {
          name: 'adventureId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
      ],
      description:
        'Explicit lifecycle transition from CURRENT to PAST (meaningful history — not staleness).\n\n'
        + 'Authorization: Authenticated application user session.',
      requestBody: jsonBody('#/components/schemas/PortfolioEndAdventureRequest', false),
      responses: jsonOk('#/components/schemas/PortfolioCharacterResponse'),
    },
  },
  '/api/campaigns/{campaignHandle}/wiki/{pageId}/add-to-portfolio': {
    post: {
      tags: ['Character Portfolio'],
      summary: 'Clone campaign character into portfolio',
      operationId: 'addCampaignCharacterToPortfolio',
      'x-esiana-authorization': {
        boundary: 'campaign',
        requires: [
          'Authenticated application user or API token',
          'Membership in the addressed campaign',
          'Non-observer campaign membership',
          'Resource-level visibility and ownership checks performed by the controller/service',
        ],
      },
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/campaignHandle' },
        {
          name: 'pageId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'Campaign wiki character page id (entityCategory=characters).',
        },
      ],
      description:
        'Campaign Characters → Portfolio transform. Creates an independent user-owned PortfolioCharacter '
        + 'plus PortfolioCharacterAdventure provenance. Campaign path and membership authorization apply; '
        + 'the resulting portfolio record is user-owned and not campaign-scoped. Not synchronization.\n\n'
        + 'Authorization: Authenticated application user or API token; Membership in the addressed campaign; '
        + 'Non-observer campaign membership; Resource-level visibility and ownership checks performed by the controller/service.',
      requestBody: {
        required: false,
        content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } },
      },
      responses: {
        '201': {
          description: 'Portfolio character created with adventure provenance',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PortfolioAddFromCampaignResponse' },
            },
          },
        },
        ...standardErrors,
      },
    },
  },
  '/api/users/{id}/characters/{characterId}': {
    get: {
      tags: ['Public Profiles'],
      summary: 'Get public showcased portfolio character',
      operationId: 'getPublicPortfolioCharacter',
      'x-esiana-authorization': {
        boundary: 'public-or-resource-conditional',
        requires: [],
      },
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'Profile user id (portfolio owner).',
        },
        {
          name: 'characterId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'Portfolio character id. Must be showcased unless the caller is the owner.',
        },
      ],
      description:
        'Returns the allowlisted public projection (and editorial public fields) for an explicitly showcased '
        + 'portfolio character. Private/non-showcased characters return 404 to non-owners. Campaign titles in '
        + 'adventures remain subject to campaign visibility/linkability for the viewer.',
      responses: jsonOk('#/components/schemas/PublicPortfolioCharacterPageResponse'),
    },
  },
  '/api/users/assets/{assetId}': {
    get: {
      tags: ['Public Profiles'],
      summary: 'Stream user portfolio asset',
      operationId: 'getPublicUserPortfolioAsset',
      'x-esiana-authorization': {
        boundary: 'public-or-resource-conditional',
        requires: [],
      },
      security: [{}, { cookieAuth: [] }],
      parameters: [
        {
          name: 'assetId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
      ],
      description:
        'Streams a UserAsset when the caller owns it, or when it is referenced by a showcased portfolio character.',
      responses: {
        '200': {
          description: 'Binary image/asset stream',
          content: {
            'application/octet-stream': {
              schema: { type: 'string', format: 'binary' },
            },
          },
        },
        ...standardErrors,
      },
    },
  },
};

spec.paths ??= {};
for (const [routePath, pathItem] of Object.entries(portfolioPaths)) {
  spec.paths[routePath] = { ...(spec.paths[routePath] ?? {}), ...pathItem };
}

// Enrich public profile response schema reference when present.
const publicProfile = spec.paths?.['/api/users/{id}/public-profile']?.get;
if (publicProfile) {
  publicProfile.summary = 'Get public user profile';
  publicProfile.operationId = 'getPublicUserProfile';
  publicProfile.description =
    'Front-facing profile. Includes showcasedCharacters as allowlisted PublicPortfolioCharacterProjection entries '
    + '(ordered by showcaseOrder). Campaign information inside those projections respects viewer linkability.\n\n'
    + (String(publicProfile.description ?? '').includes('Authorization:')
      ? ''
      : 'Optional authentication improves campaign linkability for shared memberships.');
  publicProfile.responses = {
    ...(publicProfile.responses ?? {}),
    '200': {
      description: 'Public profile including showcased portfolio characters',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/PublicUserProfileResponse' },
        },
      },
    },
  };
}

// Preserve Character Portfolio tag description if sync previously stripped it.
const portfolioTagDescription =
  'User-owned characters that exist independently of campaigns. Portfolio characters may be '
  + 'cloned into or created from campaign characters, but remain separate records and are never '
  + 'synchronized with campaign wiki pages. Portfolio resources are owned by the authenticated '
  + 'user (not campaign-scoped). PortfolioCharacterAdventure rows record provenance/history for '
  + 'campaign incarnations without changing ownership or granting campaign access. Public '
  + 'endpoints expose only the allowlisted projection for explicitly showcased characters; '
  + 'campaign titles in those projections remain subject to campaign visibility/linkability rules.';
spec.tags = Array.isArray(spec.tags) ? spec.tags : [];
const tagIndex = spec.tags.findIndex((t) => t?.name === 'Character Portfolio');
if (tagIndex >= 0) {
  spec.tags[tagIndex] = { name: 'Character Portfolio', description: portfolioTagDescription };
} else {
  const insertAt = spec.tags.findIndex((t) => t?.name === 'User Account');
  const entry = { name: 'Character Portfolio', description: portfolioTagDescription };
  if (insertAt >= 0) spec.tags.splice(insertAt + 1, 0, entry);
  else spec.tags.push(entry);
}

fs.writeFileSync(specPath, YAML.stringify(spec, { lineWidth: 120 }));
console.log(`Enriched Character Portfolio OpenAPI paths/schemas in ${specPath}`);
