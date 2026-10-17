#!/usr/bin/env python3
"""영상 조립: 문장 음성(edge-tts Hyunsu) + 화면 PNG → mp4 + 자막(ass/srt) + timeline.json.
규격은 _system/video_spec.py(V4~V12)가 잰다. 자막은 한 줄·18자 이하·12cps 이하, 컷은 문장 시작 0.3초 전(J-cut), 쉼 0.3~0.65초(값 섞음), 배경음 없음, −16 LUFS.
  python3 build.py [--audio audio/v2] [--out build/final.mp4] [--mute]
"""
import argparse, json, os, re, subprocess, sys, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SYS = '/Users/ryugi62/jarvis/_system'
sys.path.insert(0, SYS)
from video_kit.narr_fill import spoken  # noqa
import video_spec  # noqa

FPS, SR = 30, 48000
JCUT = 0.3
LEAD = 0.9                       # 첫 문장 시작 전 여유
GAPS = [0.34, 0.47, 0.40, 0.56, 0.36, 0.51, 0.44, 0.60, 0.38, 0.53, 0.42, 0.58]
SCENE_GAP = 0.62                 # 장면이 바뀌는 문장 앞
FFMPEG = os.path.expanduser('~/.local/bin/ffmpeg')

FRAMES = {  # 문장 id → [(화면, 문장 안 시작 비율)] — 첫 화면은 문장 시작 0.3초 전에 바뀐다(J-cut)
 'a1': [('A1', 0)], 'a2': [('A2', 0)], 'a3': [('A3', 0)], 'a5': [('A5', 0)],
 'b1': [('B1', 0)], 'b2': [('B2', 0)], 'b3': [('B3', 0)], 'b4': [('B4', 0)], 'b5': [('B5', 0)], 'b6': [('B6', 0)],
 'c1': [('C1', 0)], 'c2': [('C2', 0)], 'c3': [('C3', 0)], 'c4': [('C4', 0)], 'c5': [('C5', 0)],
 'c6': [('C6_0', 0), ('C6_1', .2), ('C6_2', .4), ('C6_3', .6), ('C6_4', .8)],
 'c7': [('C6_5', 0), ('C7', .35)],
 'c8': [('C8', 0)], 'c9': [('C9', 0)], 'c10': [('C10', 0)], 'c11': [('C11', 0)], 'c12': [('C12', 0)],
 'c13': [('C13a', 0), ('C13', .45)], 'c14': [('C14', 0)], 'c15': [('C15', 0)],
 'd1': [('D1', 0)], 'd2': [('D2', 0)], 'd3': [('D3', 0)], 'd4': [('D4', 0)], 'd5': [('D5', 0)], 'd6': [('D6', 0)],
 'e1': [('E1', 0)], 'e2': [('E2', 0)], 'e3': [('E3', 0)],
 'f1': [('F1', 0)], 'f2': [('F2', 0)], 'f3': [('F3', 0)], 'f4': [('F4', 0)], 'f5': [('F5', 0)], 'f6': [('F6', 0)], 'f7': [('F7', 0)],
 'h1': [('H1', 0)], 'h2': [('H2', 0)], 'h3': [('H3', 0)], 'h4': [('H4', 0)],
 'g1': [('G1', 0)], 'g2': [('G2', 0)], 'g3': [('G3', 0)], 'g4': [('G4', 0)], 'g5': [('G5', 0)],
}


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        raise SystemExit(f"실패: {' '.join(cmd[:4])}…\n{r.stderr[-1500:]}")
    return r


def decode(mp3):
    r = subprocess.run([FFMPEG, '-v', 'error', '-i', mp3, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True)
    return np.frombuffer(r.stdout, dtype=np.float32)


def real_onset(x, db=-41.0):
    win = int(0.010 * SR)
    for j in range(0, len(x) - win, int(0.001 * SR)):
        if 20 * np.log10(np.sqrt(np.mean(np.square(x[j:j + win], dtype=np.float64))) + 1e-12) > db:
            return j / SR
    return 0.0


def chars(s):
    return len(re.sub(r'\s', '', s))


def split_cues(words):
    """words=[(text,start,end)] → 최소 큐 수로, 큐당 18자 이하·0.9초 이상, 쉼표 뒤 끊기를 선호."""
    n = len(words)
    best = {}
    def go(i):
        if i == n:
            return (0, [])
        if i in best:
            return best[i]
        res = None
        for j in range(i + 1, n + 1):
            seg = words[i:j]
            txt = ' '.join(w[0] for w in seg)
            if chars(txt) > 18 or len(txt) > 20:
                break
            dur = seg[-1][2] - seg[0][1]
            if dur < 0.9 and j < n + 1 and not (j == n and i == 0):
                continue
            sub = go(j)
            if sub is None:
                continue
            bonus = -3 if (j < n and re.search(r'[,.]$', seg[-1][0])) else 0
            cost = 10 + bonus + sub[0]
            if res is None or cost < res[0]:
                res = (cost, [seg] + sub[1])
        best[i] = res
        return res
    r = go(0)
    if r is None:
        raise SystemExit('큐 분할 실패: ' + ' '.join(w[0] for w in words))
    return r[1]


def ass_time(t):
    cs = int(round(t * 100))
    return f"{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}"


def srt_time(t):
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--audio', default='audio/v2')
    ap.add_argument('--out', default='build/final.mp4')
    ap.add_argument('--mute', action='store_true')
    a = ap.parse_args()
    adir = os.path.join(HERE, a.audio)
    out = os.path.join(HERE, a.out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    lines = json.load(open(os.path.join(HERE, 'narration.json'), encoding='utf-8'))['lines']
    # 1) 문장 배치
    t = LEAD
    sents, placed = [], []
    prev_scene = None
    for k, l in enumerate(lines):
        w = json.load(open(os.path.join(adir, f"{l['id']}.words.json"), encoding='utf-8'))
        subs = l['sub'].split()
        assert len(subs) == len(w), (l['id'], len(subs), len(w))
        if k == 0:
            start = t
        else:
            gap = SCENE_GAP if l['scene'] != prev_scene else GAPS[k % len(GAPS)]
            start = sents[-1]['end'] + gap
        x0 = decode(os.path.join(adir, f"{l['id']}.mp3"))
        onset = real_onset(x0)                        # 실제 소리 시작(단어 경계 시각은 0.1~0.3초 앞선다)
        delta = onset - w[0]['start']
        place = start - onset                         # mp3 시작 시각
        s_end = place + w[-1]['end'] + delta
        words = [(subs[i], place + w[i]['start'] + delta, place + w[i]['end'] + delta) for i in range(len(w))]
        sents.append({'id': l['id'], 'start': round(start, 3), 'end': round(s_end, 3), 'text': l['sub'], 'pause_before': 0.0, 'scene': l['scene']})
        placed.append({'id': l['id'], 'place': place, 'words': words, 'mp3': os.path.join(adir, f"{l['id']}.mp3")})
        prev_scene = l['scene']
    total = sents[-1]['end'] + 1.2
    # 2) 큐
    cues = []
    cut_at = {}
    for i, s in enumerate(sents):
        cut_at[s['id']] = s['start'] - JCUT
    for i, (s, p) in enumerate(zip(sents, placed)):
        groups = split_cues(p['words'])
        nxt_cut = cut_at[sents[i + 1]['id']] if i + 1 < len(sents) else total
        for gi, g in enumerate(groups):
            st = g[0][1] if gi else s['start']
            en = g[-1][2]
            if gi + 1 < len(groups):
                en = min(en, groups[gi + 1][0][1] - 0.07)
            cues.append({'start': round(st, 3), 'end': round(en, 3), 'lines': [' '.join(w[0] for w in g)], 'sid': s['id']})
    # 큐 길이 보정(0.83초 미만이면 다음 컷 직전까지 늘림)
    for i, c in enumerate(cues):
        if c['end'] - c['start'] < 0.85:
            limit = (cues[i + 1]['start'] - 0.07) if i + 1 < len(cues) and cues[i + 1]['sid'] == c['sid'] else cut_at.get(sents[[x['id'] for x in sents].index(c['sid']) + 1]['id'], total) - 0.02 if c['sid'] != sents[-1]['id'] else total
            c['end'] = round(min(c['start'] + 0.9, limit), 3)
    # 3) 화면 구간
    segs = []   # (start, end, frame)
    first_frame = FRAMES[sents[0]['id']][0][0]
    events = [(0.0, first_frame)]
    cuts = []
    for i, s in enumerate(sents):
        fl = FRAMES[s['id']]
        for j, (fr, frac) in enumerate(fl):
            tt = (s['start'] - JCUT) if j == 0 else s['start'] + frac * (s['end'] - s['start'])
            if i == 0 and j == 0:
                continue
            events.append((round(tt, 3), fr))
            if j == 0:
                cuts.append({'t': round(tt, 3), 'lead_into': s['id']})
    events.sort()
    for k, (tt, fr) in enumerate(events):
        end = events[k + 1][0] if k + 1 < len(events) else total
        segs.append((tt, end, fr))
    # 4) 음성
    n = int(total * SR) + SR
    mix = np.zeros(n, dtype=np.float32)
    for p in placed:
        x = decode(p['mp3'])
        f = int(0.010 * SR)
        x = x.copy()
        x[:f] *= np.linspace(0, 1, f)
        x[-f:] *= np.linspace(1, 0, f)
        i0 = int(round(p['place'] * SR))
        mix[i0:i0 + len(x)] += x[: n - i0]
    if a.mute:
        mix[:] = 0
    wav = os.path.join(os.path.dirname(out), 'voice.wav')
    def write_wav(m):
        with wave.open(wav, 'wb') as wf:
            wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(SR)
            wf.writeframes((np.clip(m, -1, 1) * 32767).astype('<i2').tobytes())
    gain_db = 0.0
    if not a.mute:
        write_wav(mix)
        r = subprocess.run([FFMPEG, '-hide_banner', '-nostats', '-i', wav, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True)
        m = re.findall(r'I:\s+(-?[\d.]+) LUFS', r.stderr)
        cur = float(m[-1])
        gain_db = -16.0 - cur
        pk = float(np.max(np.abs(mix))) + 1e-9
        peak_db = 20 * np.log10(pk) + gain_db
        if peak_db > -1.5:
            gain_db -= (peak_db + 1.5)
        mix = mix * (10 ** (gain_db / 20))
        write_wav(mix)
    # 5) 화면 → 무음 영상
    lst = os.path.join(os.path.dirname(out), 'frames.txt')
    with open(lst, 'w') as f:
        for (st, en, fr) in segs:
            f.write(f"file '{os.path.join(HERE, 'frames', fr + '.png')}'\nduration {en - st:.4f}\n")
        f.write(f"file '{os.path.join(HERE, 'frames', segs[-1][2] + '.png')}'\n")
    silent = os.path.join(os.path.dirname(out), 'silent.mp4')
    run([FFMPEG, '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-vf', f'fps={FPS},format=yuv420p', '-c:v', 'libx264', '-crf', '20', '-preset', 'medium', silent])
    # 6) 자막 ass + srt
    ass = os.path.join(os.path.dirname(out), 'subs.ass')
    font = 'Pretendard'
    with open(ass, 'w', encoding='utf-8') as f:
        f.write("[Script Info]\nScriptType: v4.00+\nPlayResX: 1920\nPlayResY: 1080\nWrapStyle: 2\n\n[V4+ Styles]\n"
                "Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding\n"
                f"Style: Default,{font},56,&H00FFFFFF,&H00FFFFFF,&H00201810,&HB0201810,-1,0,0,0,100,100,0,0,3,10,0,2,40,40,64,1\n\n[Events]\n"
                "Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text\n")
        for c in cues:
            f.write(f"Dialogue: 0,{ass_time(c['start'])},{ass_time(c['end'])},Default,,0,0,0,,{c['lines'][0]}\n")
    srt = os.path.join(os.path.dirname(out), 'subs.srt')
    with open(srt, 'w', encoding='utf-8') as f:
        for i, c in enumerate(cues, 1):
            f.write(f"{i}\n{srt_time(c['start'])} --> {srt_time(c['end'])}\n{c['lines'][0]}\n\n")
    # 7) 합치기
    fontsdir = os.path.expanduser('~/Library/Fonts')
    cmd = [FFMPEG, '-y', '-v', 'error', '-i', silent, '-i', wav, '-vf', f"ass={ass}:fontsdir={fontsdir}", '-c:v', 'libx264', '-crf', '20', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', out]
    run(cmd)
    # 8) timeline.json
    texts = []
    cards = json.load(open(os.path.join(HERE, '_cache', 'screen_text.json'), encoding='utf-8')) if os.path.exists(os.path.join(HERE, '_cache', 'screen_text.json')) else []
    tl = {'fps': FPS, 'lang': 'ko', 'sentences': [{k: v for k, v in s.items() if k != 'scene'} for s in sents],
          'cues': [{k: v for k, v in c.items() if k != 'sid'} for c in cues], 'cuts': cuts, 'screen_text': cards}
    tlp = os.path.splitext(out)[0] + '_timeline.json'
    json.dump(tl, open(tlp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    # 9) 자체 규격 검사(소리 시작·정지 화면은 완성 영상 실측 뒤)
    fails = [f for f in video_spec.check(tl, lang='ko', banned=[]) if not f.startswith(('V9 speech_onsets', 'V12 static_spans'))]
    print(f"문장 {len(sents)} · 큐 {len(cues)} · 컷 {len(cuts)} · 길이 {total:.1f}s · 이득 {gain_db:.1f}dB")
    print('규격 위반', len(fails))
    for f in fails:
        print(' ', f)
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main())
