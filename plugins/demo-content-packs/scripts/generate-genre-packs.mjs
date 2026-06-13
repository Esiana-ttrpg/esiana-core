#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packs = path.join(__dirname, '../packs');

function page(pack, rel, fm, body) {
  const lines = ['---'];
  for (const [k, v] of Object.entries(fm)) {
    if (v == null || v === '') continue;
    if (typeof v === 'object') {
      lines.push(`${k}: '${JSON.stringify(v).replace(/'/g, "''")}'`);
    } else {
      lines.push(`${k}: ${JSON.stringify(String(v))}`);
    }
  }
  lines.push('---', '', body, '');
  const full = path.join(packs, pack, 'pages', rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, lines.join('\n'));
}

// Daggerheart demo
const dh = 'daggerheart-demo';
page(dh, 'party/pc-kael.md', {
  title: 'Kael Brightshield', slug: 'pc-kael', parentKey: 'skeleton:World/Party',
  templateType: 'CHARACTER', entityCategory: 'characters', profession: 'Warrior',
  activeArc: 'Defend the valley', motivation: 'Honor the oath',
  partyParticipation: { active: true, role: 'PLAYER_CHARACTER' },
}, '# Kael Brightshield');
page(dh, 'organizations/org-circle.md', {
  title: 'Circle of Ash', slug: 'org-circle', parentKey: 'skeleton:World/Organizations',
  entityCategory: 'organizations', orgType: 'order', leaderId: 'slug:pc-kael',
}, '# Circle of Ash');
page(dh, 'quests/quest-defend-valley.md', {
  title: 'Defend the Valley', slug: 'quest-defend-valley', parentKey: 'skeleton:Game/Adventure',
  templateType: 'QUEST', questStatus: 'ACTIVE', questGiverId: 'slug:pc-kael',
}, '# Defend the Valley');
fs.writeFileSync(path.join(packs, dh, 'campaign.json'), JSON.stringify({
  formatVersion: 1,
  recruitmentTagline: 'Hope is a blade forged in community.',
  description: 'A Daggerheart-flavored demo of character metadata, orgs, and adventure quests.',
}, null, 2));

// Starfinder demo
const sf = 'starfinder-demo';
const tiny = Buffer.from('UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAQAcJaQAA3AA/vuUAAA=', 'base64');
fs.mkdirSync(path.join(packs, sf, 'assets/maps'), { recursive: true });
fs.writeFileSync(path.join(packs, sf, 'assets/maps/station.webp'), tiny);
page(sf, 'locations/loc-absalom-station.md', {
  title: 'Absalom Station', slug: 'loc-absalom-station', parentKey: 'skeleton:World/Locations',
  entityCategory: 'locations', locationType: 'station', knownFor: 'Hub of the Pact Worlds',
}, '# Absalom Station');
page(sf, 'organizations/org-corporate.md', {
  title: 'Horizon Dynamics', slug: 'org-corporate', parentKey: 'skeleton:World/Organizations',
  entityCategory: 'organizations', orgType: 'corporation',
}, '# Horizon Dynamics');
page(sf, 'maps/map-station.md', {
  title: 'Station Deck Plan', slug: 'map-station', parentKey: 'skeleton:World/Maps',
  entityCategory: 'maps', mapAssetPath: 'asset:assets/maps/station.webp',
}, '# Station map');
fs.writeFileSync(path.join(packs, sf, 'relations.json'), JSON.stringify({
  links: [{ sourceSlug: 'loc-absalom-station', targetSlug: 'org-corporate' }],
  tags: [],
  mapPins: [{
    id: 'sf-pin-dock', assetPath: 'assets/maps/station.webp', targetSlug: 'loc-absalom-station',
    label: 'Docking Ring', pinType: 'Location', x_coordinate: 100, y_coordinate: 100,
  }],
}, null, 2));
fs.writeFileSync(path.join(packs, sf, 'campaign.json'), JSON.stringify({
  formatVersion: 1,
  recruitmentTagline: 'The drift between stars is where secrets thrive.',
  description: 'Sci-fi validation: maps, locations, organizations, and map pins.',
}, null, 2));

console.log('Generated daggerheart-demo and starfinder-demo');
