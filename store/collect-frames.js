#!/usr/bin/env node
/**
 * Copy raw device/simulator frames into store/ slots using frames.json names.
 * Does not generate app UI. Feature graphic is left alone.
 *
 *   node store/collect-frames.js --from store/inbox --slot all --check
 *   node store/collect-frames.js --from ~/Desktop/shots --slot apple/iphone-6.7
 */
const fs = require('fs');
const path = require('path');

const STORE_ROOT = __dirname;
const spec = JSON.parse(fs.readFileSync(path.join(STORE_ROOT, 'frames.json'), 'utf8'));

function parseArgs(argv) {
  const out = { from: null, slot: 'all', check: false, dryRun: false, help: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--from') out.from = argv[++i];
    else if (arg === '--slot') out.slot = argv[++i];
    else if (arg === '--check') out.check = true;
    else if (arg === '--dry-run') out.dryRun = true;
    else if (arg === '--help' || arg === '-h') out.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return out;
}

function usage() {
  console.log(`Usage: node store/collect-frames.js --from <dir> [--slot all|apple/iphone-6.7|apple/iphone-6.1|play/phone] [--check] [--dry-run]

Map 01-*.png … 06-*.png (or alias keywords from frames.json) into the store folders.
Numbered camera dumps (IMG_0001.png …) are assigned in story order when prefixes are missing.
`);
}

function listImages(dir) {
  if (!dir || !fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => /\.(png|jpe?g)$/i.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((name) => path.join(dir, name));
}

function frameIndexPrefix(base, index) {
  const padded = String(index).padStart(2, '0');
  return (
    base.startsWith(`${padded}-`) ||
    base.startsWith(`${padded}_`) ||
    base.startsWith(`${padded}.`) ||
    base.startsWith(`${index}-`)
  );
}

function matchFrame(filename) {
  const base = path.basename(filename).toLowerCase();
  for (const frame of spec.frames) {
    if (base === frame.filename.toLowerCase()) return frame;
    if (base.startsWith(`${frame.id.toLowerCase()}.`)) return frame;
  }
  for (const frame of spec.frames) {
    const index = spec.frames.indexOf(frame) + 1;
    if (frameIndexPrefix(base, index)) return frame;
  }
  for (const frame of spec.frames) {
    const aliases = frame.aliases.filter((alias) => alias.length > 2);
    if (aliases.some((alias) => base.includes(alias.toLowerCase()))) return frame;
  }
  return null;
}

function assignSources(files) {
  const assigned = new Map();
  const leftover = [];

  for (const file of files) {
    const frame = matchFrame(file);
    if (frame && !assigned.has(frame.id)) {
      assigned.set(frame.id, file);
    } else {
      leftover.push(file);
    }
  }

  const missing = spec.frames.filter((frame) => !assigned.has(frame.id));
  const cameraLike = leftover.filter((file) => /img_|image_|screenshot|screen ?shot/i.test(path.basename(file)));
  missing.forEach((frame, index) => {
    if (cameraLike[index]) assigned.set(frame.id, cameraLike[index]);
  });

  return assigned;
}

function slotsFor(slotId) {
  if (slotId === 'all') return spec.slots;
  const slot = spec.slots.find((item) => item.id === slotId);
  if (!slot) throw new Error(`Unknown slot: ${slotId}`);
  return [slot];
}

function pngSize(file) {
  const fd = fs.openSync(file, 'r');
  const buf = Buffer.alloc(24);
  try {
    fs.readSync(fd, buf, 0, 24, 0);
  } finally {
    fs.closeSync(fd);
  }
  if (buf.toString('ascii', 1, 4) !== 'PNG') return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function sizeOk(slot, file) {
  const size = pngSize(file);
  if (!size) return { ok: true, reason: 'skipped (not PNG or unreadable header)' };
  const accepted = slot.accepted ?? [[slot.width, slot.height]];
  const ok = accepted.some(([w, h]) => size.width === w && size.height === h);
  return {
    ok,
    reason: ok
      ? `${size.width}×${size.height}`
      : `${size.width}×${size.height} (expected ${accepted.map(([w, h]) => `${w}×${h}`).join(' or ')})`,
  };
}

function copyFile(src, dest, dryRun) {
  if (dryRun) {
    console.log(`  would copy ${path.relative(process.cwd(), src)} → ${path.relative(process.cwd(), dest)}`);
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`  copied ${path.relative(process.cwd(), dest)}`);
}

function checkSlot(slot) {
  const dir = path.join(STORE_ROOT, slot.dir);
  let missing = 0;
  let offSpec = 0;
  for (const frame of spec.frames) {
    const file = path.join(dir, frame.filename);
    if (!fs.existsSync(file)) {
      console.log(`  missing ${slot.dir}/${frame.filename}`);
      missing += 1;
      continue;
    }
    const result = sizeOk(slot, file);
    if (!result.ok) {
      console.log(`  off-spec ${slot.dir}/${frame.filename}: ${result.reason}`);
      offSpec += 1;
    } else {
      console.log(`  ok ${slot.dir}/${frame.filename} ${result.reason}`);
    }
  }
  return { missing, offSpec };
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    usage();
    return;
  }

  const slots = slotsFor(args.slot);

  if (args.from) {
    const fromDir = path.resolve(args.from);
    const files = listImages(fromDir);
    if (files.length === 0) {
      console.log(`No PNG/JPEG files in ${fromDir} — skip copy. Capture the six-frame story, then re-run.`);
    } else {
      const assigned = assignSources(files);
      console.log(`Collecting from ${fromDir}`);
      for (const frame of spec.frames) {
        const src = assigned.get(frame.id);
        if (!src) {
          console.log(`  skip ${frame.filename} (no source)`);
          continue;
        }
        for (const slot of slots) {
          copyFile(src, path.join(STORE_ROOT, slot.dir, frame.filename), args.dryRun);
        }
      }
    }
  } else if (!args.check) {
    usage();
    process.exitCode = 1;
    return;
  }

  if (args.check) {
    console.log('Check');
    let missing = 0;
    let offSpec = 0;
    for (const slot of slots) {
      console.log(slot.id);
      const result = checkSlot(slot);
      missing += result.missing;
      offSpec += result.offSpec;
    }
    const graphic = path.join(STORE_ROOT, spec.featureGraphic.dir, spec.featureGraphic.filename);
    if (fs.existsSync(graphic)) {
      const size = pngSize(graphic);
      const ok = size && size.width === spec.featureGraphic.width && size.height === spec.featureGraphic.height;
      console.log(
        ok
          ? `  ok ${spec.featureGraphic.dir}/${spec.featureGraphic.filename} ${size.width}×${size.height}`
          : `  off-spec ${spec.featureGraphic.filename}: ${size ? `${size.width}×${size.height}` : 'unreadable'}`
      );
      if (!ok) offSpec += 1;
    } else {
      console.log(`  missing ${spec.featureGraphic.dir}/${spec.featureGraphic.filename}`);
      missing += 1;
    }
    if (missing || offSpec) {
      console.log(`Done: ${missing} missing, ${offSpec} off-spec`);
      process.exitCode = 1;
    } else {
      console.log('Done: all required frames present');
    }
  }
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
}
