"""실환경 확인(브라우저): 승인 관문·충돌 고르기·근거 없는 칸 직접 입력·내 요청 붙여넣기. 실행: python3 test/e2e.py"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'scripts'))
from pwserve import serve
from playwright.sync_api import sync_playwright

res = {}
with serve() as base, sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto(base + '/')
    pg.wait_for_selector('[data-testid=cell-pickup]')
    # 1 승인 전에는 올릴 수 없다
    res['confirm_disabled_at_start'] = pg.is_disabled('[data-testid=confirm]')
    for f in ['pickup', 'dropoff', 'pickupDate', 'pickupTime']:
        pg.click(f'[data-testid=approve-{f}]')
    res['confirm_disabled_after_4'] = pg.is_disabled('[data-testid=confirm]')
    pg.click('[data-testid=approve-tonnage]')
    res['confirm_enabled_after_5'] = not pg.is_disabled('[data-testid=confirm]')
    pg.click('[data-testid=confirm]')
    res['result_text'] = pg.inner_text('[data-testid=result]')
    # 2 충돌 후보 고르기
    pg.select_option('[data-testid=sample]', index=1)  # d05
    res['conflict_status'] = pg.get_attribute('[data-testid=cell-dropoff]', 'data-status')
    pg.click('[data-testid=choose-dropoff-1]')
    res['conflict_after_choose'] = pg.get_attribute('[data-testid=cell-dropoff]', 'data-status')
    # 3 근거 없는 칸은 직접 입력, 그 전에는 올릴 수 없다
    pg.select_option('[data-testid=sample]', index=4)  # d11
    res['empty_status'] = pg.get_attribute('[data-testid=cell-pickupTime]', 'data-status')
    pg.fill('[data-testid=in-pickupTime]', '10:00')
    pg.click('[data-testid=manual-pickupTime]')
    res['manual_text'] = pg.inner_text('[data-testid=cell-pickupTime]')
    # 4 내 요청 붙여넣기
    pg.click('summary')
    pg.fill('[data-testid=own-text]', '내일 오후 3시 양산 상차 울산 하차 2.5톤')
    pg.click('[data-testid=own-go]')
    res['own_pickup'] = pg.inner_text('[data-testid=cell-pickup]')
    res['own_tonnage'] = pg.inner_text('[data-testid=cell-tonnage]')
    # 5 390px 가로 스크롤 0
    pg.set_viewport_size({'width': 390, 'height': 800})
    res['no_hscroll_390'] = pg.evaluate('document.documentElement.scrollWidth <= 390')
    res['console_errors'] = errs
    b.close()

ok = (res['confirm_disabled_at_start'] and res['confirm_disabled_after_4'] and res['confirm_enabled_after_5']
      and '배차표에 올렸어요' in res['result_text'] and '품목' not in res['result_text'] and res['conflict_status'] == 'conflict' and res['conflict_after_choose'] == 'approved'
      and res['empty_status'] == 'empty' and '사람이 직접 입력' in res['manual_text'] and '양산' in res['own_pickup'] and '2.5' in res['own_tonnage']
      and res['no_hscroll_390'] and not res['console_errors'])
res['pass'] = bool(ok)
os.makedirs(os.path.join(HERE, '..', 'out'), exist_ok=True)
json.dump(res, open(os.path.join(HERE, '..', 'out', 'e2e.json'), 'w'), ensure_ascii=False, indent=1)
print(json.dumps(res, ensure_ascii=False, indent=1))
sys.exit(0 if ok else 1)
