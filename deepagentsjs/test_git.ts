import { execFileSync } from 'child_process';
import { join } from 'path';

process.chdir(join(process.cwd(), '..'));
console.log('CWD:', process.cwd());

try {
  const out = execFileSync('git', ['status', '--porcelain'], { cwd: process.cwd(), encoding: 'utf8' });
  console.log('STDOUT:', out || '(empty)');
} catch(e) {
  console.error('ERROR:', e.message);
}
