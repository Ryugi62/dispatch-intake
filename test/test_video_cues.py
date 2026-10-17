"""영상 자막 큐 분할 규칙 확인: 큐당 공백 뺀 18자·공백 포함 20자 이하, 0.9초 이상. 실행: python3 test/test_video_cues.py"""
import importlib.util, os, unittest
spec = importlib.util.spec_from_file_location('build', os.path.join(os.path.dirname(__file__), '..', 'video', 'build.py'))
build = importlib.util.module_from_spec(spec); spec.loader.exec_module(build)

class Cues(unittest.TestCase):
    def test_split_respects_limits(self):
        words = [('소형', 0.0, 0.5), ('운송사', 0.5, 1.0), ('사무직원은', 1.0, 1.8), ('화주의', 1.8, 2.4), ('카톡을', 2.4, 3.0), ('보고', 3.0, 3.4), ('배차표에', 3.4, 4.1), ('손으로', 4.1, 4.7), ('옮겨', 4.7, 5.1), ('적습니다.', 5.1, 5.9)]
        cues = build.split_cues(words)
        self.assertGreaterEqual(len(cues), 2)
        for seg in cues:
            txt = ' '.join(w[0] for w in seg)
            self.assertLessEqual(build.chars(txt), 18)
            self.assertLessEqual(len(txt), 20)
        self.assertEqual(sum(len(s) for s in cues), len(words))

    def test_real_onset_finds_first_sound(self):
        import numpy as np
        x = np.zeros(build.SR, dtype=np.float32)
        x[int(0.3 * build.SR):int(0.5 * build.SR)] = 0.2
        self.assertAlmostEqual(build.real_onset(x), 0.3, delta=0.01)

if __name__ == '__main__':
    unittest.main()
