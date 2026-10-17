"""영상 화면 재료 생성 — 카드(HTML→PNG)와 실제 시연 화면(웹앱 촬영). 숫자는 전부 out/facts.json에서 온다."""
import json, os, sys, html
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
from pwserve import serve
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw

F = json.load(open(os.path.join(ROOT, 'out', 'facts.json'), encoding='utf-8'))
fu, P = F['first_run_unseen'], F['price']
OUT = os.path.join(HERE, 'frames')
os.makedirs(OUT, exist_ok=True)
FONT_DIR = os.path.expanduser('~/Library/Fonts')
esc = html.escape

CSS = f"""
@font-face{{font-family:P;src:url('file://{FONT_DIR}/Pretendard-Regular.otf');font-weight:400}}
@font-face{{font-family:P;src:url('file://{FONT_DIR}/Pretendard-Bold.otf');font-weight:700}}
@font-face{{font-family:P;src:url('file://{FONT_DIR}/Pretendard-ExtraBold.otf');font-weight:800}}
*{{box-sizing:border-box}}
html,body{{margin:0;width:1920px;height:1080px;background:#fff;color:#191F28;font-family:P,'Apple SD Gothic Neo',sans-serif;overflow:hidden}}
.wrap{{position:absolute;left:112px;right:112px;top:104px;bottom:236px;display:flex;flex-direction:column;justify-content:center}}
.eyebrow{{color:#1B64DA;font-weight:700;font-size:38px}}
h1{{font-size:68px;font-weight:800;margin:8px 0 0;letter-spacing:-1px;line-height:1.2}}
.chip{{position:absolute;right:48px;top:32px;background:#FFF4E6;color:#9C4F00;border-radius:20px;padding:8px 20px;font-size:26px;font-weight:700}}
.chip.stage{{top:32px;right:48px;background:#F2F4F6;color:#4E5968}}
.sub{{color:#4E5968;font-size:34px;margin-top:12px}}
.src{{color:#4E5968;font-size:30px;margin-top:20px;line-height:1.5}}
.row{{display:flex;gap:32px;margin-top:36px}}
.card{{border:2px solid #E5E8EB;border-radius:24px;padding:28px 36px;background:#fff}}
.card.fill{{background:#F4F5F7;border-color:#F4F5F7}}
.bubble{{background:#F2F4F6;border-radius:28px;padding:28px 36px;font-size:46px;font-weight:700;line-height:1.5}}
table{{border-collapse:collapse;width:100%;font-size:34px}}
th{{text-align:left;color:#4E5968;font-weight:700;padding:14px 20px;border-bottom:2px solid #E5E8EB;font-size:28px}}
td{{padding:18px 20px;border-bottom:1px solid #E5E8EB;vertical-align:top;line-height:1.35}}
td.n{{font-weight:800;white-space:nowrap}}
.mut{{color:#58616E}}
.bt table{{font-size:30px}}
.bt td{{padding:12px 16px}}
.bt th{{white-space:nowrap}}
.hl{{background:#E8F3FF;color:#1B64DA;font-weight:700;border-radius:12px}}
.warn{{background:#FFF4E6;color:#9C4F00;font-weight:700;border-radius:12px}}
.ok{{background:#E6FCF5;color:#087F5B;font-weight:700;border-radius:12px}}
.big{{font-size:150px;font-weight:800;letter-spacing:-4px;line-height:1.1}}
.mid{{font-size:52px;font-weight:800}}
.pill{{display:inline-block;border-radius:16px;padding:6px 20px;font-size:32px;font-weight:700}}
.box{{border:3px solid #E5E8EB;border-radius:24px;padding:20px 24px;text-align:center;font-size:38px;font-weight:800;min-height:190px;display:flex;flex-direction:column;justify-content:center;gap:8px}}
.box small{{font-size:28px;font-weight:400;color:#4E5968}}
.box.on{{border-color:#1B64DA;background:#E8F3FF}}
.arrow{{align-self:center;font-size:48px;color:#8B95A1}}
.hide{{visibility:hidden}}
ul.l{{margin:28px 0 0;padding:0;list-style:none;font-size:50px;font-weight:700;line-height:1.7}}
ul.l li::before{{content:'';display:inline-block;width:14px;height:14px;background:#1B64DA;border-radius:50%;margin-right:20px;vertical-align:middle}}
.bar{{display:flex;height:96px;border-radius:20px;overflow:hidden;margin-top:28px;font-size:30px;font-weight:800;color:#fff}}
.bar div{{display:flex;align-items:center;justify-content:center;white-space:nowrap}}
"""

def page(body, chip="", extra_chip=""):
    chip_html = f"<div class='chip'>{chip}</div>" if chip else ""
    return f"<!doctype html><html><head><meta charset='utf-8'><style>{CSS}</style></head><body>{chip_html}{extra_chip}<div class='wrap'>{body}</div></body></html>"

def won(n): return f"{n:,}원"

CARDS = {}

# ───────── A 문제 장면 ─────────
KAKAO = "사장님 내일 오전 9시 마산 상차, 인천 하차 1톤 가능할까요? 팔레트 8개예요"
def sheet(rows, note=""):
    tr = ''.join(f"<tr>{''.join(c for c in r)}</tr>" for r in rows)
    return f"<div class='card' style='flex:1'><div class='sub' style='margin:0 0 8px'>배차표(엑셀)에 손으로 입력</div><table><tr><th>상차지</th><th>하차지</th><th>일시</th><th>톤수</th></tr>{tr}</table>{note}</div>"
CARDS['A1'] = page(f"<div class='eyebrow'>소형 운송사 사무실</div><h1>카톡 요청을 배차표에 손으로 옮겨 적습니다</h1><div class='row'><div class='card fill' style='flex:1'><div class='sub' style='margin:0 0 16px'>화주 카톡</div><div class='bubble'>{esc(KAKAO)}</div></div>{sheet([['<td class=mut>&nbsp;</td>']*4])}</div><div class='src' style='font-size:26px;margin-top:24px'>근거: 화물 주선사 채용공고(더팀스 · 동부전국화물, 8명 규모) 「화주로부터 전화 및 메세지를 통해 오더 접수 → 오더 입력 → 배차 진행」 · 2026-10-18 열람</div><div class='src' style='font-size:30px;margin-top:12px;color:#1B64DA;font-weight:700'>직접 열어 보기 · ryugi62.github.io/dispatch-intake (설치·로그인 없음)</div>", extra_chip="<div class='chip stage' style='top:96px'>연출 · 지어낸 장면</div>")
_k2 = esc(KAKAO).replace('인천', "<span class='hl'>인천</span>")
_note2 = "<div class='mid' style='color:#9C4F00;margin-top:24px'>카톡엔 인천, 배차표엔 부천</div>"
_row2 = [["<td>마산</td>", "<td class='warn'>부천</td>", "<td>10/20 09:00</td>", "<td>1톤</td>"]]
_sh2 = sheet(_row2, _note2)
CARDS['A2'] = page(f"<div class='eyebrow'>소형 운송사 사무실</div><h1>하차지 하나만 틀려도 차가 헛걸음을 합니다</h1><div class='row'><div class='card fill' style='flex:1'><div class='sub' style='margin:0 0 16px'>화주 카톡</div><div class='bubble'>{_k2}</div></div>{_sh2}</div>", extra_chip="<div class='chip stage' style='top:96px'>연출 · 지어낸 장면</div>")
cost = P['error_cost_won']
CARDS['A3'] = page(f"<div class='eyebrow'>오기 한 건의 값</div><h1>한 번 틀리면 운임 한 건이 날아간다고 보면</h1><div style='margin-top:30px'><span class='big' style='color:#1B64DA'>{won(cost)}</span> <span class='pill warn'>가정</span></div><div class='src'>가정: 오기 1건 = 1톤 용달 평균 견적 한 건 분량의 헛걸음(숨고 안내글 「용달견적 평균 11만원」). 현장에서 잰 값이 아닙니다.</div>")
CARDS['A5'] = page("<div class='eyebrow'>우리가 하는 일</div><h1>칸마다 원문 자리를 붙이고, 승인한 칸만 배차표로</h1><div class='row'><div class='card' style='flex:1'><div class='sub' style='margin:0'>하차지</div><div class='mid' style='font-size:64px;margin-top:8px'>인천 <span class='pill ok'>승인함</span></div><div class='src' style='font-size:30px'>원문 <b style='color:#1B64DA'>「인천」</b> (20~22번째 글자)</div></div></div>")

# ───────── B 유사 서비스 (③-b) ─────────
SRC_FOOT = "공개 자료 기준 2026-10-18 · Dashdoc 블로그 · parsers.vc · byline.network · App Store · 비공개 기능은 알 수 없음"
ROWS = [
 ("Dashdoc", "프랑스 · 운송관리(TMS)", "운송 주문서 문서 파일 → 주문 초안 채움", "있음 (검토 화면에서 승인)", "공개 글에서 확인 못 함"),
 ("Vectrix", "벨기에 · 주문 입력 자동화", "이메일·문서 파일·엑셀 → 운송 주문(50초 이내라고 밝힘)", "자료에 언급 없음", "확인 못 함"),
 ("로지스팟", "한국 · 화주·차주 배차", "화주 배차 요청 → 차주 배차", "해당 없음", "의뢰 문서 읽기 확인 못 함"),
 ("원콜", "한국 · 차주용 오더 앱", "오더 목록 · 자동 배차", "해당 없음", "의뢰 문서 읽기 확인 못 함"),
]
def tbl(n_rows, hl_cell=None, hl_col=None, show_us=False, dim=False):
    head = "<tr><th>서비스</th><th>하는 일</th><th>사람 승인</th><th>칸별 원문 위치 인용</th></tr>"
    trs = ""
    for i, r in enumerate(ROWS):
        vis = '' if i < n_rows else 'hide'
        c3 = f"<td class='{'hl' if hl_cell == i else ''}'>{r[3]}</td>"
        c4 = f"<td class='{'warn' if hl_col == 4 else 'mut'}'>{r[4]}</td>"
        dimc = ' style="opacity:.28"' if (dim and hl_cell is not None and i != hl_cell) else ''
        trs += f"<tr class='{vis}'{dimc}><td class='n'>{r[0]}<div class='mut' style='font-size:26px;font-weight:400'>{r[1]}</div></td><td>{r[2]}</td>{c3}{c4}</tr>"
    us = "<tr class='%s'><td class='n' style='color:#1B64DA'>우리<div class='mut' style='font-size:26px;font-weight:400'>합성 문서 시연</div></td><td>카톡·메일·의뢰서 → 배차표 칸 채움</td><td>칸마다 승인</td><td class='ok'>칸마다 원문 글자 위치 + 검증 통과한 값만</td></tr>" % ('' if show_us else 'hide')
    return f"<table>{head}{trs}{us}</table>"
def bpage(**kw):
    return page(f"<div class='eyebrow'>같은 문제를 푸는 서비스 4곳과 비교</div><h1>증거를 칸마다 보여 주는 곳은 못 찾았습니다</h1><div class='bt' style='margin-top:16px'>{tbl(**kw)}</div><div class='src' style='font-size:24px;margin-top:8px'>{SRC_FOOT}</div>")
CARDS['B1'] = bpage(n_rows=0)
CARDS['B2'] = bpage(n_rows=2)
CARDS['B3'] = bpage(n_rows=4)
CARDS['B4'] = bpage(n_rows=4, hl_cell=0, dim=True)
CARDS['B5'] = bpage(n_rows=4, hl_cell=0, hl_col=4)
CARDS['B6'] = bpage(n_rows=4, hl_col=4, show_us=True)

# ───────── D 작동 원리 (principle scene) ─────────
def pipe(on=None, detail=""):
    names = [("추출기", "값 + 원문 위치를 냄"), ("근거 검증", "위치·글자·값을 다시 확인"), ("칸", "채움 / 비움 / 충돌"), ("사람 승인", "칸마다 클릭"), ("배차표", "행 + 근거 장부")]
    out = ""
    for i, (n, s) in enumerate(names):
        out += f"<div class='box {'on' if on == i else ''}' style='flex:1'>{n}<small>{s}</small></div>"
        if i < len(names) - 1: out += "<div class='arrow'>→</div>"
    return f"<div class='eyebrow'>어떻게 믿을 수 있나</div><h1>증거가 안 맞는 값은 칸에 들어가지 못합니다</h1><div class='row' style='margin-top:40px'>{out}</div><div style='margin-top:36px'>{detail}</div>"
CARDS['D1'] = page(pipe())
CARDS['D2'] = page(pipe(0, "<div class='card fill'><div class='src' style='margin:0;font-size:34px'>추출기가 낸 것 &nbsp;<b>칸</b> 하차지 · <b>값</b> 인천 · <b>위치</b> 20~22번째 글자 · <b>인용</b> 「인천」</div></div>"))
CARDS['D3'] = page(pipe(1, "<div class='card fill'><ul class='l' style='font-size:32px;margin:0'><li>위치가 원문 안에 있다</li><li>그 위치의 글자가 인용과 같다</li><li>인용에서 값을 다시 계산하면 추출기가 낸 값과 같다</li></ul></div>"))
CARDS['D4'] = page(pipe(2, "<div class='row' style='margin-top:0'><div class='card' style='flex:1'><span class='pill ok'>통과</span><div class='src' style='font-size:32px'>인용 「인천」 → 값 인천 = 낸 값 인천 → 칸에 채움</div></div><div class='card' style='flex:1'><span class='pill warn'>거절</span><div class='src' style='font-size:32px'>인용 「부산」인데 원문 그 자리는 「마산」 → 칸은 빈 채로 사람에게</div></div></div>"))
CARDS['D5'] = page(f"<div class='eyebrow'>가짜 추출기로 시험</div><h1>값을 지어내는 추출기는 전부 거절됩니다</h1><div style='margin-top:36px'><span class='big' style='color:#087F5B'>{F['liar']['rejected']} / {F['liar']['cells']}</span><span class='mid'> 칸 거절</span></div><div class='src'>합성 문서 {F['docs_total']}건에 값을 지어내거나 인용 위치를 어긋나게 내는 가짜 추출기를 돌린 결과 · 채워진 칸 0</div>")
CARDS['D6'] = page("<div class='eyebrow'>한계를 먼저</div><h1>시연 추출기는 규칙 기반입니다</h1><ul class='l'><li>사진·손글씨 요청은 못 읽습니다 (글자로 복사되는 요청만)</li><li>언어모델 추출기는 이 레포에서 재지 않았습니다</li><li>바꿔 끼워도 같은 근거 검증을 통과해야 칸이 됩니다</li><li>실제 문서 일반화는 주장하지 않습니다</li></ul>")

# ───────── E 측정 (숫자 3개: 85.9% · 4칸 · 0칸) ─────────
CARDS['E1'] = page(f"<div class='eyebrow'>측정 두 가지</div><h1>칸 정확도와 조용한 오기</h1><div class='row'><div class='card' style='flex:1'><div class='sub' style='margin:0'>칸 정확도</div><div class='src' style='font-size:34px'>정답과 같게 채운 칸 ÷ 전체 칸<br>못 채운·넘긴 칸은 틀린 것으로 셈</div></div><div class='card' style='flex:1'><div class='sub' style='margin:0'>조용한 오기</div><div class='src' style='font-size:34px'>충돌 표시 없이 틀리게 채운 칸</div></div></div>")
CARDS['E2'] = page(f"<div class='eyebrow'>처음 보는 합성 문서 · 고치기 전 첫 실행</div><div style='margin-top:28px'><span class='big' style='color:#1B64DA'>{fu['accuracy_pct']}%</span></div><div class='src' style='font-size:34px'>칸 정확도 · 나머지는 사람에게 넘기거나 비운 칸과 틀린 칸</div>")
CARDS['E3'] = page(f"<div class='eyebrow'>조용한 오기</div><div style='margin-top:28px'><span class='big' style='color:#9C4F00'>{fu['wrong']}칸</span> <span class='big'>→</span> <span class='big' style='color:#087F5B'>0칸</span></div><div class='src' style='font-size:34px'>안전장치(장소에 시각·요일·톤수가 섞이면 비움)를 넣은 뒤 같은 문서 기준 · 새 문서 성능은 아님</div>")

# ───────── F 도입·흐름·가격 ─────────
FL = F['flow']
CARDS['F1'] = page("<div class='eyebrow'>현장 적용 가능성 · 도입</div><h1>웹 브라우저 하나로 시작합니다</h1><div class='row'><div class='card' style='flex:1'><div class='sub' style='margin:0'>도입 비용</div><div class='mid' style='font-size:84px'>0원</div><div class='src'>설치·서버 없음 · 문서는 브라우저 안에서만 처리</div></div></div>")
CARDS['F2'] = page("<div class='eyebrow'>도입 기간(가정)</div><h1>1주면 시작할 수 있다고 잡았습니다</h1><div class='row'><div class='card' style='flex:1'><div class='sub' style='margin:0'>서식 맞추기 → 시범 사용</div><div class='mid' style='font-size:72px'>1주</div><div class='src'>그 운송사가 받는 카톡·메일·서식에 맞춰 규칙을 조정하고, 사무직원이 승인하며 쓰면서 고친 칸을 모읍니다</div></div></div>")
def flow_tbl(hl=False):
    wr = "class='hl'" if hl else ""
    return f"<table style='margin-top:12px'><tr><th>한 건 처리</th><th>손입력</th><th>도구(합성 요청 {FL['docs']}건 실측)</th></tr><tr><td class='n'>단계 수</td><td>{FL['manual_steps']}단계 (5칸 입력 + 저장)</td><td>평균 {FL['tool_steps_mean']:g}단계 (승인·고르기·직접 입력·올리기)</td></tr><tr><td class='n'>오기</td><td class='mut'>{FL['manual_error']}</td><td {wr}>{FL['blind_wrong_cells']}건 (맹목 승인 기준)</td></tr><tr><td class='n'>걸리는 시간</td><td class='mut'>{FL['manual_time']}</td><td class='mut'>{FL['manual_time']}</td></tr></table>"
CARDS['F3'] = page(f"<div class='eyebrow'>같은 요청 {FL['docs']}건으로 재 보니</div><h1>단계 수는 줄지 않습니다</h1>{flow_tbl()}<div class='src' style='font-size:26px'>손입력 기준은 칸 수로 센 값 · 도구는 승인한 칸·고른 칸·직접 넣은 칸·올리기를 센 값 · 시간은 사람이 해 보지 않아 재지 않음</div>")
CARDS['F4'] = page(f"<div class='eyebrow'>대신 달라지는 것</div><h1>틀린 칸이 조용히 넘어가지 않습니다</h1>{flow_tbl(True)}<div class='src' style='font-size:26px'>맹목 승인 = 인용을 보지 않고 전부 누른 최악의 경우 · 손입력 오기는 사람이 해 보지 않아 미측정</div>")
CARDS['F5'] = page(f"<div class='eyebrow'>사업 모델</div><h1>사무직원 한 명당 월 구독</h1><div style='margin-top:32px'><span class='big' style='color:#1B64DA'>{won(P['month_won'])}</span> <span class='mid'>/ 월</span></div><div class='src' style='font-size:32px'>1석 · 월 {P['monthly_orders_cap']}건까지 · 도입비 0원 · 제안 가격(가정)</div>")
CARDS['F6'] = page(f"<div class='eyebrow'>본전 계산</div><h1>한 달에 한 건만 막아도 본전</h1><div class='card' style='margin-top:36px'><div class='mid' style='font-size:60px;line-height:1.5'>{won(P['month_won'])} ÷ {won(P['error_cost_won'])} = <span style='color:#1B64DA'>{P['breakeven_errors_per_month']}건</span> / 월</div><div class='src'>월 이용료 ÷ 오기 1건 손실(가정) = 본전이 되는 월 오기 방지 건수</div></div>")
CARDS['F7'] = page("<div class='eyebrow'>이 숫자들의 출처</div><h1>가정이고, 현장에서 잰 값이 아닙니다</h1><table style='margin-top:24px'><tr><th>숫자</th><th>근거</th></tr><tr><td class='n'>오기 1건 11만 원</td><td>숨고 안내글 「1톤 트럭 기준 10~50km 구간의 평균은 약 11만 원 수준」 — 소비자 견적, 가정으로만 사용</td></tr><tr><td class='n'>월 이용료·1주</td><td>우리 제안(가정) — 현장 협의 전</td></tr></table>")

# ───────── H 시장·사업화 한 장 (진행 공개) ─────────
MK = F['market']
def hpage(stage):
    firms = f"{MK['freight_firms']:,}"
    workers = f"{MK['freight_workers']:,}"
    top = f"<div class='eyebrow'>누구에게 파나 · 사업화</div><h1>작은 운송사가 많은 시장입니다</h1><div class='row' style='margin-top:20px'><div class='card' style='flex:1'><div class='sub' style='margin:0'>화물운송업 기업체 · {MK['year']}년</div><div class='mid' style='font-size:84px;color:#1B64DA'>{firms}개</div><div class='src' style='font-size:26px;margin-top:8px'>종사자 {workers}명 ÷ 기업체 = <b>한 곳에 평균 {MK['workers_per_firm']}명</b>(우리가 계산)</div></div></div><div class='src' style='font-size:24px;margin-top:10px'>출처: 운수업조사 결과(잠정) 보도자료 2025-12-11 · 「기업체수 41만 4천개, 종사자수 79만 2천명」 · mods.go.kr/boardDownload.es?bid=238&amp;list_no=442368&amp;seq=1 · 화물운송업 전체이며 우리 고객 수가 아님</div>"
    mid = "<div class='row' style='margin-top:20px'><div class='card' style='flex:1'><div class='sub' style='margin:0'>해외 서비스(공개 자료 기준)</div><div class='src' style='font-size:30px;margin-top:6px'>이메일 · 문서 파일 · 엑셀 입력<br><span class='warn pill'>카톡 요청: 공개 자료에서 못 찾음</span></div></div><div class='card' style='flex:1;border-color:#1B64DA'><div class='sub' style='margin:0'>우리</div><div class='src' style='font-size:30px;margin-top:6px'>카톡 · 메일 · 의뢰서 글자 입력<br><span class='ok pill'>국내 소형 운송사의 카톡 접수</span></div></div></div>"
    bot = "<div class='card' style='margin-top:20px'><div class='mid' style='font-size:44px'>카톡 접수 → 칸마다 승인 → <span style='color:#1B64DA'>엑셀 배차표(CSV)</span></div></div>"
    body = top
    if stage >= 2: body = top.replace("<div class='row' style='margin-top:20px'>", "<div class='row' style='margin-top:12px'>", 1) + ""
    if stage >= 3: body += mid
    if stage >= 4: body = top + mid.replace("margin-top:20px", "margin-top:12px") + bot
    return page(body)
CARDS['H1'] = hpage(1)
CARDS['H2'] = page(f"<div class='eyebrow'>누구에게 파나 · 사업화</div><h1>평균이 두 명이 안 되는 시장</h1><div class='row' style='margin-top:30px'><div class='card' style='flex:1'><div class='sub' style='margin:0'>종사자 {MK['freight_workers']:,}명</div><div class='src' style='font-size:34px'>÷ 기업체 {MK['freight_firms']:,}개</div></div><div class='arrow' style='font-size:64px'>=</div><div class='card' style='flex:1;border-color:#1B64DA'><div class='sub' style='margin:0'>한 곳에 평균</div><div class='mid' style='font-size:96px;color:#1B64DA'>{MK['workers_per_firm']}명</div></div></div><div class='src' style='font-size:28px'>아주 작은 곳이 많다는 뜻(우리가 계산한 평균 · 우리 고객 수 아님)</div>")
CARDS['H3'] = hpage(3)
CARDS['H4'] = hpage(4)

# ───────── G 일정·자원·목표 ─────────
def gtable(n):
    rows = [("2026-11-18", "본선 시연 (본선에 오르면)", "서울 여의도 · 1인"),
            ("2027-01-31", "소형 운송사 3곳 무료 시범 확정", "원격 · 서버 비용 0원"),
            ("2027-02-28", "실제 요청 100건으로 칸 정확도 재측정·공개", "1인 · 0원")]
    trs = ''.join(f"<tr class='{'' if i < n else 'hide'}'><td class='n'>{d}</td><td>{m}</td><td class='mut'>{r}</td></tr>" for i, (d, m, r) in enumerate(rows))
    tg = "<div class='row' style='margin-top:28px;gap:20px'>" + ''.join(f"<div class='card' style='flex:1;text-align:center;padding:20px'><div class='sub' style='margin:0;font-size:24px'>{k}</div><div class='mid' style='color:#1B64DA'>{v}</div></div>" for k, v in [("칸 정확도 목표", "95%"), ("조용한 오기", "0건"), ("시범 운송사", "3곳"), ("실제 요청", "100건")]) + "</div>"
    return f"<div class='eyebrow'>추진 일정 · 투입 자원 · 목표치</div><h1>다음 첫 숫자는 현장 실증입니다</h1><table style='margin-top:20px'><tr><th>날짜</th><th>할 일</th><th>자원</th></tr>{trs}</table>" + (tg if n >= 4 else "<div style='height:150px'></div>")
CARDS['G1'] = page(gtable(1))
CARDS['G2'] = page(gtable(2))
CARDS['G3'] = page(gtable(3))
CARDS['G4'] = page(gtable(4))
CARDS['G5'] = page(chip="합성 문서 시연 · 현장 실증 없음", body="<div style='position:absolute;left:0;right:0;top:120px;text-align:center'><div class='eyebrow'>지금</div><h1 style='font-size:80px'>합성 문서 시연까지</h1><div class='sub' style='font-size:44px;margin-top:28px'>다음 첫 숫자 = 현장 실증 (실제 요청 100건)</div><div class='src' style='margin-top:40px'>추출기 규칙 기반 · 합성 문서 57건 · 파일럿 운송사 없음</div><div class='src' style='font-size:36px;color:#1B64DA;font-weight:700'>직접 열어 보기 · ryugi62.github.io/dispatch-intake</div></div>")

import csv as _csv
def csv_card():
    rows = list(_csv.reader(open(os.path.join(ROOT, 'out', 'sample-export.csv'), encoding='utf-8-sig')))
    head = ''.join(f'<th>{esc(c)}</th>' for c in rows[0])
    body = ''.join('<tr>' + ''.join(f'<td>{esc(c)}</td>' for c in r) + '</tr>' for r in rows[1:])
    return page(f"<div class='eyebrow'>내려받은 배차표.csv</div><h1>칸마다 원문 근거가 같이 들어 있습니다</h1><div class='bt' style='margin-top:20px'><table style='font-size:26px'><tr>{head}</tr>{body}</table></div><div class='src' style='font-size:24px'>합성 요청 3건을 도구로 처리해 실제로 만든 파일(out/sample-export.csv) · UTF-8 BOM, 엑셀에서 바로 열림</div>")
CARDS['C15'] = csv_card()

def render_cards():
    import re as _re
    texts = []
    for k, h in CARDS.items():
        t = _re.sub(r'<style>.*?</style>', '', h, flags=_re.S)
        texts.append(_re.sub(r'\s+', ' ', html.unescape(_re.sub(r'<[^>]+>', ' ', t))).strip())
    os.makedirs(os.path.join(HERE, '_cache'), exist_ok=True)
    json.dump(texts, open(os.path.join(HERE, '_cache', 'screen_text.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': 1920, 'height': 1080})
        for k, h in CARDS.items():
            fp = os.path.join(HERE, '_cache'); os.makedirs(fp, exist_ok=True)
            hp = os.path.join(fp, f'{k}.html')
            open(hp, 'w', encoding='utf-8').write(h)
            pg.goto('file://' + hp)
            pg.wait_for_timeout(120)
            pg.screenshot(path=os.path.join(OUT, f'{k}.png'))
        b.close()

# ───────── C 실제 시연 화면 ─────────
DSF = 3
def _img(tmp):
    return Image.open(tmp).convert('RGB')

def _fit(im, box=None):
    """box=(x,y,w,h) css px 영역을 1920x864 안에 맞춰 키운다(레터박스). None이면 전체."""
    if box:
        x, y, w, h = [v * DSF for v in box]
        x0, y0 = max(0, int(x)), max(0, int(y))
        im = im.crop((x0, y0, min(im.width, int(x + w)), min(im.height, int(y + h))))
    r = min(1920 / im.width, 864 / im.height)
    im = im.resize((int(im.width * r), int(im.height * r)), Image.LANCZOS)
    bg = Image.new('RGB', (1920, 1080), (244, 245, 247))
    bg.paste(im, ((1920 - im.width) // 2, 0 if not box else (864 - im.height) // 2))
    return bg, r, ((1920 - im.width) // 2, 0 if not box else (864 - im.height) // 2)

def _mark_cursor(canvas, boxes_css, r, off, origin):
    d = ImageDraw.Draw(canvas, 'RGBA')
    for bb in boxes_css:
        cx = off[0] + (bb['x'] - origin[0] + bb['width'] * 0.5) * DSF * r
        cy = off[1] + (bb['y'] - origin[1] + bb['height'] * 0.5) * DSF * r
        d.ellipse([cx - 24, cy - 24, cx + 24, cy + 24], fill=(27, 100, 218, 70), outline=(27, 100, 218, 255), width=5)

def _spot(canvas, boxes_css, r, off, origin, pad=10):
    ov = Image.new('RGBA', canvas.size, (10, 16, 28, 120))
    hole = ImageDraw.Draw(ov)
    for bb in boxes_css:
        x0 = off[0] + (bb['x'] - origin[0]) * DSF * r - pad
        y0 = off[1] + (bb['y'] - origin[1]) * DSF * r - pad
        x1 = x0 + bb['width'] * DSF * r + 2 * pad
        y1 = y0 + bb['height'] * DSF * r + 2 * pad
        hole.rounded_rectangle([x0, y0, x1, y1], radius=20, fill=(0, 0, 0, 0))
    out = Image.alpha_composite(canvas.convert('RGBA'), ov)
    # 구멍 영역은 원본으로 복원
    mask = Image.new('L', canvas.size, 0)
    md = ImageDraw.Draw(mask)
    for bb in boxes_css:
        x0 = off[0] + (bb['x'] - origin[0]) * DSF * r - pad
        y0 = off[1] + (bb['y'] - origin[1]) * DSF * r - pad
        md.rounded_rectangle([x0, y0, x0 + bb['width'] * DSF * r + 2 * pad, y0 + bb['height'] * DSF * r + 2 * pad], radius=20, fill=255)
    return Image.composite(canvas.convert('RGBA'), out, mask).convert('RGB')

def render_app():
    with serve() as base, sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': 1280, 'height': 576}, device_scale_factor=DSF)
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(base + '/?compact=1'); pg.wait_for_selector('[data-testid=cell-pickup]')
        def bbox(sel):
            return pg.locator(sel).first.bounding_box()
        def snap(name, mode='full', cursor_on=None, spot=None, zoom=None):
            tmp = os.path.join(OUT, f'_{name}.png')
            pg.screenshot(path=tmp)
            im = _img(tmp); os.remove(tmp)
            box = None
            if zoom == 'left': bb = bbox('.pane.left'); box = (bb['x'] - 8, bb['y'] - 8, bb['width'] + 16, bb['height'] + 16)
            if zoom == 'right': bb = bbox('.pane.right'); box = (bb['x'] - 8, bb['y'] - 8, bb['width'] + 16, bb['height'] + 16)
            canvas, r, off = _fit(im, box)
            origin = (box[0], box[1]) if box else (0, 0)
            if spot:
                canvas = _spot(canvas, [bbox(x) for x in spot if pg.locator(x).count()], r, off, origin)
            if cursor_on:
                canvas_d = canvas
                _mark_cursor(canvas_d, [bbox(x) for x in cursor_on], r, off, origin)
            canvas.save(os.path.join(OUT, f'{name}.png'))
        cell = lambda f: f'[data-testid=cell-{f}]'
        snap('C1')
        snap('C2', zoom='left')
        snap('C3', zoom='right')
        pg.hover(cell('pickup')); snap('C4', spot=[cell('pickup'), 'mark.on'], cursor_on=[cell('pickup')])
        pg.hover(cell('pickupDate')); snap('C5', spot=[cell('pickupDate'), 'mark.on'], cursor_on=[cell('pickupDate')])
        for i, f in enumerate(['pickup', 'dropoff', 'pickupDate', 'pickupTime', 'tonnage']):
            pg.click(f'[data-testid=approve-{f}]'); snap(f'C6_{i}', cursor_on=[cell(f)])
        snap('C6_5', cursor_on=['[data-testid=confirm]'], spot=['[data-testid=confirm]'])
        pg.click('[data-testid=confirm]'); pg.mouse.move(5, 5); snap('C7', zoom='right')
        pg.select_option('[data-testid=sample]', index=1); pg.mouse.move(5, 5)
        snap('C8')
        pg.hover(cell('dropoff')); snap('C9', spot=[cell('dropoff'), '.doc'], cursor_on=[cell('dropoff')])
        pg.click('[data-testid=choose-dropoff-1]'); snap('C10', spot=[cell('dropoff')], cursor_on=[cell('dropoff')])
        for f in ['pickup', 'pickupDate', 'pickupTime', 'tonnage']:
            pg.click(f'[data-testid=approve-{f}]')
        pg.click('[data-testid=confirm]'); pg.mouse.move(5, 5)
        pg.select_option('[data-testid=sample]', index=4); pg.mouse.move(5, 5)
        snap('C11')
        pg.hover(cell('pickupTime')); snap('C12', spot=[cell('pickupTime')], cursor_on=[cell('pickupTime')])
        pg.fill('[data-testid=in-pickupTime]', '10:00'); snap('C13a', spot=[cell('pickupTime')], cursor_on=['[data-testid=in-pickupTime]'])
        pg.click('[data-testid=manual-pickupTime]'); snap('C13', spot=[cell('pickupTime')], cursor_on=[cell('pickupTime')])
        pg.fill('[data-testid=in-tonnage]', '1'); pg.click('[data-testid=manual-tonnage]')
        for f in ['pickup', 'dropoff', 'pickupDate']:
            pg.click(f'[data-testid=approve-{f}]')
        pg.click('[data-testid=confirm]'); pg.mouse.move(5, 5)
        snap('C14', zoom='right', spot=['[data-testid=export]'], cursor_on=['[data-testid=export]'])
        print('page errors', errs)
        b.close()

if __name__ == '__main__':
    what = sys.argv[1] if len(sys.argv) > 1 else 'all'
    if what in ('all', 'cards'): render_cards()
    if what in ('all', 'app'): render_app()
    print(sorted(os.listdir(OUT)))
