import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

test('첫 실행 기록(first-run.json)은 세 세트 37건·185칸·정답 159이고 FIRST-RUN.md와 같다', () => {
  const fr = JSON.parse(readFileSync(new URL('../samples/first-run.json', import.meta.url), 'utf8'));
  const sum = (k) => fr.sets.reduce((a, s) => a + s[k], 0);
  assert.equal(sum('docs'), 37);
  assert.equal(sum('cells'), 185);
  assert.equal(sum('correct'), 159);
  for (const s of fr.sets) assert.equal(s.correct + s.handoff + s.blank + s.wrong, s.cells);
  const md = readFileSync(new URL('../samples/FIRST-RUN.md', import.meta.url), 'utf8');
  assert.match(md, /80\.0%/);
  assert.match(md, /85\.0%/);
  assert.match(md, /96\.0%/);
});

test('measure.js 실행 결과: 거짓 추출기 100% 거부 · 현재 조용한 오기 0 · 인용 일치 100%', () => {
  const out = execFileSync('node', [new URL('../scripts/measure.js', import.meta.url).pathname], { encoding: 'utf8' });
  const f = JSON.parse(out);
  assert.equal(f.liar.rejected, f.liar.cells);
  assert.equal(f.liar.filled, 0);
  assert.equal(f.current.wrong, 0);
  assert.equal(f.current.quotes_ok, f.current.quotes_checked);
  assert.equal(f.first_run_unseen.wrong, 4);
});

test('facts.json에 처리 흐름 실측과 공식 통계(1.9명)가 들어간다', () => {
  const f = JSON.parse(execFileSync('node', [new URL('../scripts/measure.js', import.meta.url).pathname], { encoding: 'utf8' }));
  assert.equal(f.flow.docs, 57);
  assert.equal(f.flow.blind_wrong_cells, 0);
  assert.equal(f.flow.manual_error, '미측정');
  assert.equal(f.market.freight_firms, 414344);
  assert.equal(f.market.workers_per_firm, 1.9);
  assert.match(f.market.url, /^https:\/\/mods\.go\.kr\//);
});
