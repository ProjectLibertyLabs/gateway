// fix-announcement-types.ts
import fs from 'fs';

/**
 * Script to replace numeric values with enum values in type files generated from OpenAPI specs.
 *   example: replaces `announcementType: 0` with `announcementType: AnnouncementType.Tombstone`
 *
 * @param targetFile - Filename of generated types file in which to fix enum values (ex: 'libs/types/src/content-announcement/types.gen.ts)
 * @param moduleName - module name (ie, import path) containing enum definition (ex: '#types/content-announcment')
 * @param enumTypeName  - name of enum type to use (ex: 'AnnouncementType')
 * @param varnameToFix  - name of variable for which to replace integer values with corresponding enum value (ie, 'announcementType')
 */
async function doIt(targetFile: string, moduleName: string, enumTypeName: string, varnameToFix: string) {
  let code = fs.readFileSync(targetFile, 'utf8');

  const enumModule = await import(moduleName);
  const myEnum = enumModule[enumTypeName];

  const enumMap = Object.entries(myEnum).filter(([_, v]) => typeof v !== 'number');
  Object.entries(enumMap).forEach(([_, [value, name]]) => {
    const regex = new RegExp(`(${varnameToFix}[?!]?): ${value}\\b`, 'g');
    code = code.replace(regex, `$1: ${enumTypeName}.${name}`);
  });

  fs.writeFileSync(targetFile, code);
  console.log(`Replaced literal values with ${enumTypeName} enum references.`);
}

if (process.argv.length < 6) {
  console.error('Invalid arguments supplied.');
  process.exit(1);
}
doIt(process.argv[2], process.argv[3], process.argv[4], process.argv[5]).catch((err) => console.error(err));
