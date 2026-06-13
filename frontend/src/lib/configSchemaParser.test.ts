import assert from 'node:assert/strict';
import test from 'node:test';
import { configSchemaToTemplate, mergePluginConfigFields } from './configSchemaParser.js';

test('configSchemaToTemplate maps JSON Schema properties to form fields', () => {
  const fields = configSchemaToTemplate({
    type: 'object',
    required: ['greeting'],
    properties: {
      greeting: {
        type: 'string',
        title: 'Greeting message',
        default: 'Hello',
      },
      enableDebugRoute: {
        type: 'boolean',
        title: 'Expose debug route',
        default: true,
      },
      docsUrl: {
        type: 'string',
        format: 'uri',
        title: 'Docs URL',
      },
    },
  });

  assert.equal(fields.length, 3);
  assert.deepEqual(fields[0], {
    key: 'greeting',
    label: 'Greeting message',
    type: 'text',
    required: true,
    defaultValue: 'Hello',
  });
  assert.equal(fields[1]?.type, 'checkbox');
  assert.equal(fields[2]?.type, 'url');
});

test('mergePluginConfigFields prefers manual template keys over schema duplicates', () => {
  const merged = mergePluginConfigFields({
    configTemplate: [{ key: 'greeting', label: 'Manual label', type: 'text' }],
    configSchema: {
      type: 'object',
      properties: {
        greeting: { type: 'string', title: 'Schema label' },
        extra: { type: 'number', title: 'Extra field' },
      },
    },
  });

  assert.equal(merged.length, 2);
  assert.equal(merged[0]?.label, 'Manual label');
  assert.equal(merged[1]?.key, 'extra');
});
