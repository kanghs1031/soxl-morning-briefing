import json
import unittest
from datetime import datetime, timezone
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from generate_briefing import build, yahoo_prices, cboe_vix


class FeedTests(unittest.TestCase):
    def test_yahoo_parser(self):
        def getter(url):
            return json.dumps({'chart': {'result': [{'timestamp': [1761868800, 1761955200], 'indicators': {'quote': [{'close': [10, 11]}]}}]}})
        self.assertEqual(yahoo_prices('SOXL', getter)['changePct'], 10)

    def test_vix_parser(self):
        def getter(url):
            return 'Some header\nDATE,OPEN,HIGH,LOW,CLOSE\n10/30/2026,18,19,17,18.25\n10/29/2026,19,20,18,19.10\n'
        self.assertEqual(cboe_vix(getter), {'date': '2026-10-30', 'close': 18.25})

    def test_existing_pwa_schema(self):
        out = build(datetime(2026, 11, 2, tzinfo=timezone.utc), {'SOXL': {'date': '2026-10-30', 'close': 100, 'changePct': -2, 'provider': 'test'}}, {'date': '2026-10-30', 'close': 20})
        self.assertEqual(out['date'], '2026-11-02')
        self.assertIsNone(out['fear'])
        self.assertIn('SOXL:', out['text'])
        self.assertEqual(out['vix'], 20)
        self.assertIn('checkedAt', out)


if __name__ == '__main__':
    unittest.main()
