"""영상·메타·화면 글의 숫자가 out/facts.json과 같은지, 내부 흔적이 0인지 검사. 실행: python3 scripts/check_numbers.py <제출 폴더>"""
import json, os, sys
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
D = sys.argv[1] if len(sys.argv) > 1 else '/Users/ryugi62/jarvis/handoff/drop/dna-logistics-hack/제출'
F = json.load(open(os.path.join(ROOT, 'out', 'facts.json'), encoding='utf-8'))
fu, P = F['first_run_unseen'], F['price']
srt = open(os.path.join(D, '자막.srt'), encoding='utf-8').read().replace('\n', ' ')
narr = json.load(open(os.path.join(D, 'narration.json'), encoding='utf-8'))
subs = ' '.join(l['sub'] for l in narr['lines'])
screen = ' '.join(json.load(open(os.path.join(ROOT, 'video', '_cache', 'screen_text.json'), encoding='utf-8')))
manifest = open(os.path.join(D, 'deliverable.json'), encoding='utf-8').read()
evalmd = open(os.path.join(D, '평가.md'), encoding='utf-8').read()
res = {'checks': [], 'forbidden': []}
def need(name, hay_name, hay, token):
    ok = token in hay
    res['checks'].append({'name': name, 'in': hay_name, 'token': token, 'ok': ok})
FL, MK = F['flow'], F['market']
for tok in [f"{fu['accuracy_pct']}", f"{fu['wrong']}칸", f"{F['liar']['cells']}칸", f"{FL['docs']}건", f"{MK['workers_per_firm']}명", f"{P['month_won']:,}원"]:
    need('영상 자막', 'subs', subs, tok)
for tok in [f"{P['breakeven_errors_per_month']}건", f"{F['liar']['rejected']} / {F['liar']['cells']}", f"{MK['freight_firms']:,}", f"{MK['freight_workers']:,}", f"{FL['manual_steps']}단계", f"{FL['blind_wrong_cells']}건 (맹목 승인 기준)", FL['manual_error']]:
    need('화면 글', 'screen', screen, tok)
for tok in [f"{fu['accuracy_pct']}", f"{F['liar']['cells']}", f"{P['month_won']:,}", f"{P['breakeven_errors_per_month']}", f"{FL['docs']}건", f"{MK['freight_firms']:,}"]:
    need('매니페스트 주장', 'deliverable.json', manifest, tok)
need('평가 파일 합성 표기', '평가.md', evalmd, '독립 채점이 아니다')
BAD = ['[[', 'projects/', '메인 판단', 'TODO', '발송 전 지울', '회신 대기', '다음 레인']
for name, hay in [('srt', srt), ('subs', subs), ('screen', screen)]:
    for b in BAD:
        if b in hay:
            res['forbidden'].append({'in': name, 'token': b})
res['pass'] = all(c['ok'] for c in res['checks']) and not res['forbidden']
json.dump(res, open(os.path.join(ROOT, 'out', 'check-numbers.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(json.dumps({'pass': res['pass'], 'failed': [c for c in res['checks'] if not c['ok']], 'forbidden': res['forbidden']}, ensure_ascii=False))
sys.exit(0 if res['pass'] else 1)
