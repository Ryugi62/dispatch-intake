// 실제 내보내기 파일 한 벌(영상 화면 재료): 합성 요청 3건을 도구 경로로 처리해 CSV로 만든다.
import { writeFileSync } from 'node:fs';
import { DEV } from '../samples/dev.js';
import { ruleExtract } from '../src/adapters/ruleExtractor.js';
import { simulateTool } from '../src/application/flow.js';
import { toCsv } from '../src/domain/export.js';

const ids = ['d01', 'd07', 'd04'];
const results = ids.map((id) => simulateTool(DEV.find((d) => d.id === id), ruleExtract).result);
const csv = toCsv(results);
writeFileSync(new URL('../out/sample-export.csv', import.meta.url), '\uFEFF' + csv);
console.log(csv);
