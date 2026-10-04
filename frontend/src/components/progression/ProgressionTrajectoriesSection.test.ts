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
  assert.doesNotMatch(section, /WorldPressurePanel|DevelopmentReadinessPanel/);
  assert.doesNotMatch(section, /import.*Graph|dependency diagram|propagation/i);
});

test('trajectories table exposes primary columns and expansion for secondary fields', () => {
  assert.match(table, /Entity/);
  assert.match(table, /Trajectory/);
  assert.match(table, /From/);
  assert.match(table, /Target \/ Outcome/);
  assert.match(table, /By/);
  assert.match(table, /Development signal/);
  assert.match(table, /View entity/);
  assert.match(table, /Development history/);
});

test('create trajectory dialog collects minimum planning fields', () => {
  assert.match(create, /Search organizations/);
  assert.match(create, /Trajectory/);
  assert.match(create, /From/);
  assert.match(create, /Target \/ Outcome/);
  assert.match(create, /By/);
  assert.match(create, /createFactionEraTrajectory/);
  assert.match(create, /Open-ended/);
});

test('era management stays compact and collapsible on Trajectories', () => {
  assert.match(section, /Era: \{currentLabel\}/);
  assert.match(section, /Manage eras/);
  assert.match(section, /manageErasOpen/);
  assert.match(section, /CampaignEraEditor/);
});
