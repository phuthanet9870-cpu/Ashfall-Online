import {writeFileSync} from 'node:fs';
const release=process.env.RELEASE_SHA||process.env.GITHUB_SHA||'local';
if(release!=='local'&&!/^[a-f0-9]{40}$/i.test(release))throw new Error('Release must be a Git commit SHA');
writeFileSync(new URL('../worker/release.mjs',import.meta.url),'// Generated build identity.\nexport default '+JSON.stringify(release)+';\n');
console.log('Worker build identity:',release);
