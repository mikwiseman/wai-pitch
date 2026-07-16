import test from 'node:test';
import assert from 'node:assert/strict';

import { workspaceClaimDecision } from '../src/lib/workspace-scope.mjs';

test('only the configured legacy owner can claim the existing workspace', () => {
  assert.equal(workspaceClaimDecision({
    userId: 'user-mik',
    email: 'hi@mikwiseman.com',
    legacyOwnerEmail: 'hi@mikwiseman.com',
    currentOwnerId: null,
  }), 'claim-legacy');

  assert.equal(workspaceClaimDecision({
    userId: 'attacker',
    email: 'other@example.com',
    legacyOwnerEmail: 'hi@mikwiseman.com',
    currentOwnerId: null,
  }), 'create-isolated');
});

test('an already claimed workspace is never reassigned', () => {
  assert.equal(workspaceClaimDecision({
    userId: 'user-two',
    email: 'hi@mikwiseman.com',
    legacyOwnerEmail: 'hi@mikwiseman.com',
    currentOwnerId: 'user-one',
  }), 'create-isolated');
});
