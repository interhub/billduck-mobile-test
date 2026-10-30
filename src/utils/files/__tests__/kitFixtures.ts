import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const FIXTURES = join(__dirname, '../../../../mobile-engineer-candidate-kit/fixtures');

/** The bytes of a file from the fixtures of the candidate kit. */
export const readFixture = (name: string): Uint8Array =>
  new Uint8Array(readFileSync(join(FIXTURES, name)));
