import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adminVersionFooterClass,
  formatProductVersionLabel,
} from './adminVersionUi.js';

test('formatProductVersionLabel normalizes tags without double v', () => {
  assert.equal(formatProductVersionLabel('v1.0.8'), 'v1.0.8');
  assert.equal(formatProductVersionLabel('1.0.8'), 'v1.0.8');
});

test('adminVersionFooterClass applies glow styles when update is available', () => {
  assert.match(adminVersionFooterClass(true), /ring-primary\/40/);
  assert.match(adminVersionFooterClass(true), /shadow-primary\/20/);
  assert.doesNotMatch(adminVersionFooterClass(false), /ring-primary/);
});
