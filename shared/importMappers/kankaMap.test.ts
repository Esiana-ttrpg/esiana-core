import assert from 'node:assert/strict';
import test from 'node:test';
import { extractKankaMapId, mapKankaMapFields } from './kankaMap.js';

test('mapKankaMapFields extracts image, dimensions, groups, and markers', () => {
  const result = mapKankaMapFields({
    entity: {
      id: 6358560,
      name: 'Somerden',
      image_path: 'w/240487/map.jpg',
      width: 1200,
      height: 800,
    },
    width: 1200,
    height: 800,
    groups: [{ id: 10, name: 'Cities', position: 1 }],
    markers: [
      {
        id: 501,
        name: 'Capital',
        longitude: 400,
        latitude: 300,
        group_id: 10,
        entity: { entity_id: 6359027, name: 'Elderhelm' },
      },
    ],
  });

  assert.ok(result);
  assert.equal(result.kankaMapId, '6358560');
  assert.equal(result.kankaMapPlan.imagePath, 'w/240487/map.jpg');
  assert.equal(result.kankaMapPlan.width, 1200);
  assert.equal(result.kankaMapPlan.height, 800);
  assert.equal(result.kankaMapPlan.groups.length, 1);
  assert.equal(result.kankaMapPlan.markers.length, 1);
  assert.equal(result.kankaMapPlan.markers[0]?.kankaMarkerId, '501');
  assert.equal(result.kankaMapPlan.markers[0]?.targetKankaEntityId, '6359027');
  assert.equal(result.kankaMapPlan.markers[0]?.groupName, 'Cities');
});

test('extractKankaMapId returns null when no id is present', () => {
  assert.equal(extractKankaMapId({ entity: { name: 'No id' } }), null);
});
