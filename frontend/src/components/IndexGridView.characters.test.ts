import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const frontendSrc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('IndexGridView characters operator table', () => {
  it('uses identity-biased layout without table-fixed', () => {
    const source = fs.readFileSync(
      path.join(frontendSrc, 'components/IndexGridView.tsx'),
      'utf8',
    );
    assert.match(source, /operator-index-table/);
    assert.match(source, /operator-index-table__col-name/);
    assert.doesNotMatch(source, /table-fixed/);
  });

  it('uses CharacterIndexTitleCell without badge in title column', () => {
    const gridSource = fs.readFileSync(
      path.join(frontendSrc, 'components/IndexGridView.tsx'),
      'utf8',
    );
    const titleSource = fs.readFileSync(
      path.join(frontendSrc, 'components/wiki/indexBrowse/CharacterIndexTitleCell.tsx'),
      'utf8',
    );
    assert.match(gridSource, /CharacterIndexTitleCell/);
    assert.match(gridSource, /isCharactersCategory \? 'Name'/);
    assert.doesNotMatch(titleSource, /CharacterLifeStatusBadge/);
  });

  it('normalizes sentinel index values for display', () => {
    const source = fs.readFileSync(
      path.join(frontendSrc, 'components/IndexGridView.tsx'),
      'utf8',
    );
    assert.match(source, /formatIndexCellDisplay/);
  });
});
