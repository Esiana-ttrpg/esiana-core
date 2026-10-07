import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const section = fs.readFileSync(path.join(dir, 'ProgressionTrajectoriesSection.tsx'), 'utf8');
const table = fs.readFileSync(path.join(dir, 'TrajectoryTable.tsx'), 'utf8');
const create = fs.readFileSync(path.join(dir, 'CreateTrajectoryDialog.tsx'), 'utf8');

test('trajectories section is an opt-in table surface with create CTA', () => {
  assert.match(section, /Where is the world going\?/);
  assert.match(section, /TrajectoryTable/);
  assert.match(section, /CreateTrajectoryDialog/);
  assert.match(section, /setCreateOpen\(true\)/);
  assert.doesNotMatch(section, /Missing trajectories/);
  assert.doesNotMatch(section, /missingTrajectoryOrgs/);
  assert.doesNotMatch(section, /completeness/i);
  assert.doesNotMatch(section, /WorldPressurePanel|DevelopmentReadinessPanel/);
  assert.doesNotMatch(section, /import.*Graph|dependency diagram|propagation/i);
});

test('trajectories section supports multi-subject filter and search', () => {
  assert.match(section, /Organizations/);
  assert.match(section, /Characters/);
  assert.match(section, /Locations/);
  assert.match(section, /categoryFilter/);
  assert.match(section, /updateCharacterMetadata/);
  assert.match(section, /updateLocationMetadata/);
});

test('trajectories table exposes primary columns and expansion for secondary fields', () => {
  assert.match(table, /Entity/);
  assert.match(table, /Trajectory/);
  assert.match(table, /From/);
  assert.match(table, /Target \/ Outcome/);
  assert.match(table, /By/);
  assert.match(table, /Development signal/);
  assert.match(table, /showFactionControls/);
  assert.match(table, /View entity/);
  assert.match(table, /Development history/);
  assert.doesNotMatch(table, /not supported/i);
});

test('create trajectory dialog searches all subject types with character life-state filter', () => {
  assert.match(create, /Who or what is changing\?/);
  assert.match(create, /Search characters, locations, organizations/);
  assert.match(create, /Include inactive\/deceased/);
  assert.match(create, /DECEASED/);
  assert.match(create, /EXILED/);
  assert.match(create, /Trajectory/);
  assert.match(create, /From/);
  assert.match(create, /Target \/ Outcome/);
  assert.match(create, /By/);
  assert.match(create, /createEraTrajectory/);
  assert.match(create, /createFactionEraTrajectory/);
  assert.match(create, /Open-ended/);
  assert.match(create, /Add trajectory/);
});

test('era management links to the canonical Chronology surface', () => {
  assert.match(section, /Era: \{currentLabel\}/);
  assert.match(section, /Manage eras/);
  assert.match(section, /chronology\?view=eras/);
  assert.doesNotMatch(section, /manageErasOpen|CampaignEraEditor|handleSaveEras/);
});
