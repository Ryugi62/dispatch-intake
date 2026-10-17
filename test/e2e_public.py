"""공개 URL 비로그인 확인: 새 브라우저 컨텍스트(쿠키 없음)로 열어 입력→결과까지. 실행: python3 test/e2e_public.py [URL]"""
import json, os, sys
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'https://ryugi62.github.io/dispatch-intake/'
HERE = os.path.dirname(os.path.abspath(__file__))
res = {'url': URL}
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1280, 'height': 720})
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    resp = pg.goto(URL)
    res['status'] = resp.status
    pg.wait_for_selector('[data-testid=cell-pickup]')
    pg.click('summary')
    pg.fill('[data-testid=own-text]', '모레 오후 3시 양산 상차 울산 하차 2.5톤')
    pg.click('[data-testid=own-go]')
    res['own_cells'] = {f: pg.inner_text(f'[data-testid=cell-{f}]').split('\n')[1] for f in ['pickup', 'dropoff', 'pickupDate', 'pickupTime', 'tonnage']}
    res['confirm_disabled_before'] = pg.is_disabled('[data-testid=confirm]')
    for f in ['pickup', 'dropoff', 'pickupDate', 'pickupTime', 'tonnage']:
        pg.click(f'[data-testid=approve-{f}]')
    pg.click('[data-testid=confirm]')
    res['result'] = pg.inner_text('[data-testid=result]')
    res['console_errors'] = errs
    pg.screenshot(path=os.path.join(HERE, '..', 'out', 'public-open.png'))
    b.close()
res['pass'] = res['status'] == 200 and res['confirm_disabled_before'] and '배차표에 올렸어요' in res['result'] and '양산' in res['result'] and not errs
json.dump(res, open(os.path.join(HERE, '..', 'out', 'e2e-public.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(json.dumps(res, ensure_ascii=False, indent=1))
sys.exit(0 if res['pass'] else 1)
