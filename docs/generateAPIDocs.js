// utils/generateApiDocs.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs   = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, '../src/routes');
const API_PREFIX = '/api/v1';

// map filename to prefix
const fileToPrefix = {
  'auth.js':         'auth',
  'jobs.js':         'jobs',
  'applications.js': 'applications',
  'profiles.js':     'profiles',
  'cv.js':           'cvs',
  'ranking.js':      'ranking',
};

const generateApiDocs = () => {
  let doc = `# API Documentation\n`;
  doc += `> Auto-generated on ${new Date().toISOString()}\n\n`;
  doc += `---\n\n`;

  const files = fs.readdirSync(ROUTES_DIR).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const prefix   = fileToPrefix[file] || file.replace('.js', '');
    const content  = fs.readFileSync(path.join(ROUTES_DIR, file), 'utf8');
    const routes   = [];

    // extract router.METHOD('path') calls
    const regex = /router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
    let match;
    while ((match = regex.exec(content)) !== null) {
      routes.push({
        method: match[1].toUpperCase(),
        path:   `${API_PREFIX}/${prefix}${match[2] === '/' ? '' : match[2]}`,
      });
    }

    if (routes.length === 0) continue;

    const pad         = (str, len) => String(str).padEnd(len, ' ');
    const methodWidth = Math.max(6,  ...routes.map(r => r.method.length));
    const pathWidth   = Math.max(4,  ...routes.map(r => r.path.length));

    doc += `## ${API_PREFIX}/${prefix}\n\n`;
    doc += `| ${pad('Method', methodWidth)} | ${pad('Path', pathWidth)} |\n`;
    doc += `| ${'-'.repeat(methodWidth)} | ${'-'.repeat(pathWidth)} |\n`;

    routes.forEach(({ method, path }) => {
      doc += `| ${pad(method, methodWidth)} | ${pad(path, pathWidth)} |\n`;
    });

    doc += `\n`;
  }

  fs.mkdirSync(path.join(__dirname, '../docs'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, '../docs/api.md'), doc);
  console.log('docs/api.md generated');
  process.exit(0);
};

generateApiDocs();