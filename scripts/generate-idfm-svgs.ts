import fs from 'fs';
import path from 'path';

const idfmDir = path.join(process.cwd(), 'assets', 'idfm');
const outputFile = path.join(process.cwd(), 'constants', 'idfmSvg.ts');

const files = fs.readdirSync(idfmDir).filter((f) => f.endsWith('.svg'));

let code = `// Auto-generated IDFM SVG dictionary\n\n`;
const rerMap: Record<string, string> = {};
const sncfMap: Record<string, string> = {};
const metroMap: Record<string, string> = {};
const tramMap: Record<string, string> = {};

let busModeSvg = '';
let rerModeSvg = '';
let metroModeSvg = '';
let transilienModeSvg = '';
let tramModeSvg = '';

files.forEach((filename) => {
  const filePath = path.join(idfmDir, filename);
  const content = fs.readFileSync(filePath, 'utf-8').trim();

  if (filename === 'symbole.1634824971 (3).svg') {
    busModeSvg = content;
  } else if (filename === 'symbole.1634824971 (1).svg') {
    tramModeSvg = content;
  } else if (filename === 'symbole.1634824971.svg') {
    rerModeSvg = content;
  } else if (filename === 'symbole.1686818037.svg') {
    metroModeSvg = content;
  } else if (filename === 'symbole.1634824971 (2).svg') {
    transilienModeSvg = content;
  } else if (filename.startsWith('picto_rer_ligne-')) {
    const lineKey = filename.replace('picto_rer_ligne-', '').split('.')[0].toLowerCase();
    rerMap[lineKey] = content;
  } else if (filename.startsWith('picto_sncf_ligne-')) {
    const lineKey = filename.replace('picto_sncf_ligne-', '').split('.')[0].toLowerCase();
    sncfMap[lineKey] = content;
  } else if (filename.startsWith('picto_metro_ligne-')) {
    const lineKey = filename.replace('picto_metro_ligne-', '').split('.')[0].toLowerCase();
    metroMap[lineKey] = content;
  } else if (filename.startsWith('picto_tram_ligne-')) {
    const lineKey = filename.replace('picto_tram_ligne-', '').split('.')[0].toLowerCase();
    tramMap[lineKey] = content;
  }
});

code += `export const BUS_MODE_SVG = ${JSON.stringify(busModeSvg)};\n`;
code += `export const RER_MODE_SVG = ${JSON.stringify(rerModeSvg)};\n`;
code += `export const METRO_MODE_SVG = ${JSON.stringify(metroModeSvg)};\n`;
code += `export const TRANSILIEN_MODE_SVG = ${JSON.stringify(transilienModeSvg)};\n`;
code += `export const TRAM_MODE_SVG = ${JSON.stringify(tramModeSvg)};\n\n`;

code += `export const RER_PICTOS: Record<string, string> = ${JSON.stringify(rerMap, null, 2)};\n\n`;
code += `export const SNCF_PICTOS: Record<string, string> = ${JSON.stringify(sncfMap, null, 2)};\n\n`;
code += `export const METRO_PICTOS: Record<string, string> = ${JSON.stringify(metroMap, null, 2)};\n\n`;
code += `export const TRAM_PICTOS: Record<string, string> = ${JSON.stringify(tramMap, null, 2)};\n`;

fs.writeFileSync(outputFile, code);
console.log('Generated idfmSvg.ts successfully!');
