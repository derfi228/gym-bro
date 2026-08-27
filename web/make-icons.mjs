/**
 * Собирает иконки из src/app/icon.svg.
 *
 * Запускается руками, когда меняется сам значок:
 *   node make-icons.mjs
 *
 * Формат .ico — это просто контейнер вокруг нескольких PNG: заголовок,
 * оглавление по 16 байт на размер, дальше сами картинки. sharp его не пишет,
 * поэтому складываем сами — так иконка работает и в старых браузерах.
 */
import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";

const svg = await readFile("src/app/icon.svg");

// Для экрана телефона: iOS не умеет svg и не скругляет сама
await sharp(svg).resize(180, 180).png().toFile("src/app/apple-icon.png");

const sizes = [16, 32, 48];
const pngs = [];
for (const s of sizes) pngs.push(await sharp(svg).resize(s, s).png().toBuffer());

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // зарезервировано
header.writeUInt16LE(1, 2); // тип: иконка
header.writeUInt16LE(sizes.length, 4);

const entries = [];
let offset = 6 + sizes.length * 16;
sizes.forEach((s, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(s === 256 ? 0 : s, 0);
  e.writeUInt8(s === 256 ? 0 : s, 1);
  e.writeUInt8(0, 2); // палитра не используется
  e.writeUInt8(0, 3);
  e.writeUInt16LE(1, 4); // плоскостей
  e.writeUInt16LE(32, 6); // бит на точку
  e.writeUInt32LE(pngs[i].length, 8);
  e.writeUInt32LE(offset, 12);
  offset += pngs[i].length;
  entries.push(e);
});

await writeFile(
  "src/app/favicon.ico",
  Buffer.concat([header, ...entries, ...pngs]),
);

console.log("иконки собраны: favicon.ico, apple-icon.png");
