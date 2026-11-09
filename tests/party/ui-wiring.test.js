/* Every game UI declares its AI and imports it (the UIs need a DOM, so this checks the source). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const dir = new URL('../../explore/party/ui/', import.meta.url).pathname;
test('every game UI imports and declares its AI module', () => {
    for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.js'))) {
        const src = fs.readFileSync(path.join(dir, f), 'utf8');
        const id = f.replace('.js', '');
        assert.match(src, new RegExp(`import ai from '\\.\\./ai/${id}\\.js'`), `${f} imports its AI`);
        assert.match(src, /^\s{4}ai,$/m, `${f} declares ai`);
        assert.ok(fs.existsSync(new URL(`../../explore/party/ai/${id}.js`, import.meta.url)), `${id} AI exists`);
    }
});
