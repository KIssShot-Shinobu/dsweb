const fs = require('fs');
const path = require('path');

const outPath = path.resolve('output/pdf/dsweb-summary.pdf');
fs.mkdirSync(path.dirname(outPath), { recursive: true });

const page = { width: 612, height: 792, margin: 36 };
const bodySize = 10;
const bodyLeading = 12;
const headingSize = 11.5;
const headingLeading = 14;
const titleSize = 16;
const titleLeading = 20;

const maxCharsParagraph = 95;
const maxCharsBullet = 90;

const content = {
  title: 'DSWeb (DuelStandby Web) - One Page Summary',
  whatItIs:
    'DSWeb is a Next.js web app for the DuelStandby community that combines a public site with tournament listings and an internal operations dashboard. The repo documents a Prisma + MySQL/MariaDB backend with Auth.js based authentication.',
  whoItsFor:
    'Community players who register and join tournaments, plus internal staff roles (officer, admin, founder) who manage users, teams, tournaments, treasury, and audit logs.',
  features: [
    'Public website with community branding and tournament list/detail synced from the database.',
    'Auth.js login (Google and credentials), registration, session checks, and role hierarchy.',
    'Admin dashboard for users, teams, tournaments, treasury, audit logs, and operational summary.',
    'Team self-management: invites, join requests, roster management, and role badges.',
    'Tournament CRUD plus participant registration and image upload via internal API.',
    'In-app notifications with realtime SSE stream and unread counts.'
  ],
  architecture: [
    'Next.js App Router pages and layouts live in app/ with UI pieces in components/.',
    'Server endpoints are Next.js API routes in app/api/*, with input validation via lib/validators.ts.',
    'Business logic and utilities sit in lib/ (auth helpers, audit logging, uploads, notifications, regions), plus lib/services and lib/repositories.',
    'Data layer uses Prisma (lib/prisma.ts) against MySQL/MariaDB with schema in prisma/schema.prisma; Auth.js config is in auth.ts and session helpers in lib/auth.ts.'
  ],
  howToRun: [
    'Install prerequisites: Node.js 20+ and a running MySQL/MariaDB server.',
    'Copy .env.example to .env and set at least DATABASE_URL, AUTH_SECRET, and NEXT_PUBLIC_APP_URL.',
    'Install dependencies: npm install.',
    'Initialize Prisma: npx prisma generate then npx prisma db push.',
    'Start the dev server: npm run dev and open http://localhost:3000.'
  ]
};

function wrapText(text, maxChars) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? line + ' ' + word : word;
    if (next.length > maxChars) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const lines = [];
let cursorY = page.height - page.margin;
const leftX = page.margin;

function addLine(text, font, size, leading) {
  lines.push({ text, font, size, x: leftX, y: cursorY });
  cursorY -= leading;
}

function addGap(points) {
  cursorY -= points;
}

function addTitle(text) {
  addLine(text, 'F2', titleSize, titleLeading);
  addGap(4);
}

function addHeading(text) {
  addGap(4);
  addLine(text, 'F2', headingSize, headingLeading);
  addGap(2);
}

function addParagraph(text) {
  const wrapped = wrapText(text, maxCharsParagraph);
  wrapped.forEach((line) => addLine(line, 'F1', bodySize, bodyLeading));
}

function addBullets(items) {
  items.forEach((item) => {
    const wrapped = wrapText(item, maxCharsBullet);
    wrapped.forEach((line, index) => {
      const prefix = index === 0 ? '- ' : '  ';
      addLine(prefix + line, 'F1', bodySize, bodyLeading);
    });
  });
}

addTitle(content.title);

addHeading('What it is');
addParagraph(content.whatItIs);

addHeading('Who it is for');
addParagraph(content.whoItsFor);

addHeading('What it does');
addBullets(content.features);

addHeading('How it works');
addBullets(content.architecture);

addHeading('How to run');
addBullets(content.howToRun);

if (cursorY < page.margin) {
  throw new Error('Content overflowed the page. Reduce text or font size.');
}

function escapePdfText(text) {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

let contentStream = 'BT\n';
let lastFont = '';
let lastSize = '';
for (const line of lines) {
  if (line.font !== lastFont || line.size !== lastSize) {
    contentStream += `/${line.font} ${line.size} Tf\n`;
    lastFont = line.font;
    lastSize = line.size;
  }
  contentStream += `1 0 0 1 ${line.x} ${line.y} Tm (${escapePdfText(line.text)}) Tj\n`;
}
contentStream += 'ET\n';

const objects = [];
const offsets = [];
let currentOffset = 0;

function addObject(str) {
  offsets.push(currentOffset);
  objects.push(str);
  currentOffset += Buffer.byteLength(str, 'utf8');
}

let pdf = '';

function append(str) {
  pdf += str;
}

append('%PDF-1.4\n');
currentOffset = Buffer.byteLength(pdf, 'utf8');

addObject('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
addObject('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
addObject('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n');
const streamLength = Buffer.byteLength(contentStream, 'utf8');
addObject(`4 0 obj\n<< /Length ${streamLength} >>\nstream\n${contentStream}endstream\nendobj\n`);
addObject('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');
addObject('6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n');

for (const obj of objects) {
  append(obj);
}

const xrefOffset = Buffer.byteLength(pdf, 'utf8');
append('xref\n');
append(`0 ${objects.length + 1}\n`);
append('0000000000 65535 f \n');
for (const offset of offsets) {
  const padded = String(offset).padStart(10, '0');
  append(`${padded} 00000 n \n`);
}
append('trailer\n');
append(`<< /Size ${objects.length + 1} /Root 1 0 R >>\n`);
append('startxref\n');
append(`${xrefOffset}\n`);
append('%%EOF\n');

fs.writeFileSync(outPath, pdf, 'utf8');
