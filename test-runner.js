const cp = require('child_process');
const v = String(cp.execSync('node -v'));

if (v.startsWith('v4.')) {
  cp.execSync('npm run build');
  require('./test/node4');
} else {
  require('jest').run();
}
