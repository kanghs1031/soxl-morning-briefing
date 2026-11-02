#!/usr/bin/env python3
"""Free, best-effort end-of-day briefing feed for the existing SOXL PWA v1.3.
No paid APIs, secrets, brokerage integration, or trading signals.
"""
import csv
import io
import json
import os
import sys
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

TICKERS = {"SOXL": "SOXL", "SOXX": "SOXX", "QQQ": "QQQ", "NVDA": "NVDA", "AMD": "AMD", "AVGO": "AVGO", "MU": "MU", "TSM": "TSM", "ASML": "ASML", "LRCX": "LRCX"}
VIX_URL = 'https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv'


def get_text(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 SOXL-Personal-Briefing/1.0', 'Accept': 'application/json,text/csv,*/*'})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return resp.read(2_000_000).decode('utf-8-sig')


def yahoo_prices(symbol, getter=get_text):
    from urllib.parse import quote
    url = f'https://query1.finance.yahoo.com/v8/finance/chart/{quote(symbol)}?range=10d&interval=1d'
    raw = json.loads(getter(url))
    result = raw['chart']['result'][0]
    stamps = result['timestamp']
    closes = result['indicators']['quote'][0]['close']
    points = [(datetime.fromtimestamp(ts, timezone.utc).strftime('%Y-%m-%d'), float(close)) for ts, close in zip(stamps, closes) if close is not None and float(close) > 0]
    if len(points) < 2:
        raise ValueError('최근 유효 종가가 2개 미만')
    points.sort()
    date, close = points[-1]
    prev = points[-2][1]
    return {'date': date, 'close': round(close, 4), 'changePct': round((close / prev - 1) * 100, 2), 'provider': 'Yahoo Finance chart (비공식 공개 엔드포인트)'}


def cboe_vix(getter=get_text):
    raw = getter(VIX_URL)
    lines = raw.splitlines()
    start = next(i for i, line in enumerate(lines) if line.strip().upper().startswith('DATE,'))
    rows = list(csv.DictReader(io.StringIO('\n'.join(lines[start:]))))
    valid = []
    for row in rows:
        try:
            dt = datetime.strptime(row['DATE'].strip(), '%m/%d/%Y').date().isoformat()
            value = float(row['CLOSE'].strip())
            if value > 0:
                valid.append((dt, value))
        except (ValueError, KeyError):
            continue
    if not valid:
        raise ValueError('VIX 유효 데이터 없음')
    date, value = max(valid)
    return {'date': date, 'close': round(value, 2)}


def build(now, prices, vix=None, errors=None):
    errors = errors or []
    kst = now.astimezone(ZoneInfo('Asia/Seoul'))
    date = kst.date().isoformat()
    lines = [f'[{date} 오전 시장 데이터 브리핑 · 무료 자동 생성]',
             '※ 미국 정규장 종가 기반 자료입니다. 실시간 시세·프리마켓·매매 신호가 아닙니다.',
             '※ ChatGPT 오전 8시 예약 브리핑과 별개이며, 뉴스 해석이나 경제일정은 자동 생성하지 않습니다.', '',
             '■ 미국 시장 및 반도체 ETF (최근 확인된 거래일 종가)']
    for ticker in ['SOXL', 'SOXX', 'QQQ']:
        p = prices.get(ticker)
        if p:
            lines.append(f"{ticker}: ${p['close']:.2f} ({p['changePct']:+.2f}%) · 미국 거래일 {p['date']}")
        else:
            lines.append(f'{ticker}: 데이터 미확인')
    lines += ['', '■ 반도체 주요 종목 (최근 확인된 거래일 종가)']
    for ticker in ['NVDA', 'AMD', 'AVGO', 'MU', 'TSM', 'ASML', 'LRCX']:
        p = prices.get(ticker)
        lines.append(f"{ticker}: ${p['close']:.2f} ({p['changePct']:+.2f}%) · {p['date']}" if p else f'{ticker}: 데이터 미확인')
    lines += ['', '■ 변동성 지수']
    lines.append(f"VIX: {vix['close']:.2f} · 미국 거래일 {vix['date']} (Cboe 공식 일별 종가)" if vix else 'VIX: 데이터 미확인')
    lines.append('CNN 공포·탐욕 지수: 무료·안정적 자동 수집 경로를 확인하지 못해 표시하지 않습니다.')
    dates = sorted({p['date'] for p in prices.values()})
    if vix:
        dates.append(vix['date'])
    if len(set(dates)) > 1:
        lines += ['', '⚠ 항목별 데이터 기준일이 다릅니다. 동일 시점 비교에 유의하세요.']
    if dates:
        newest = max(dates)
        if (kst.date() - datetime.fromisoformat(newest).date()).days >= 4:
            lines += ['', '⚠ 최신 관측일이 4일 이상 지났습니다. 휴장·데이터 지연 여부를 확인하세요.']
    if errors:
        lines += ['', '■ 수집 실패/제한', *[f'- {e}' for e in errors]]
    lines += ['', '출처: Yahoo Finance 공개 차트 데이터(비공식, 접근 제한 가능), Cboe VIX 공식 CSV',
              '이 자료는 참고용이며 거래·손절·익절 주문을 자동 실행하지 않습니다. SOXL은 일간 3배 레버리지 상품으로 손실 위험이 큽니다.']
    return {'date': date, 'title': f'{date} SOXL 무료 자동 시장 브리핑', 'text': '\n'.join(lines),
            'fear': None, 'vix': vix['close'] if vix else None,
            'checkedAt': kst.strftime('%Y-%m-%d %H:%M KST') + ' · 종가 데이터, 각 항목의 미국 거래일은 본문 참고',
            'source': 'https://www.cboe.com/tradable_products/vix/vix_historical_data',
            'generatedAt': now.isoformat(), 'quotes': prices, 'vixDate': vix['date'] if vix else None,
            'errors': errors}


def main():
    now = datetime.now(timezone.utc)
    prices, errors = {}, []
    for name, symbol in TICKERS.items():
        try:
            prices[name] = yahoo_prices(symbol)
            print(f'{name}: {prices[name]["date"]} {prices[name]["close"]}')
        except Exception as exc:
            errors.append(f'{name} 종가 수집 실패 ({type(exc).__name__})')
            print(errors[-1], file=sys.stderr)
    try:
        vix = cboe_vix()
    except Exception as exc:
        vix = None
        errors.append(f'VIX 수집 실패 ({type(exc).__name__})')
    if not prices and not vix:
        print('모든 원천 데이터 수집 실패: 기존 게시 파일 유지', file=sys.stderr)
        return 1
    out = build(now, prices, vix, errors)
    dest = Path(os.environ.get('OUTPUT_DIR', 'public'))
    dest.mkdir(parents=True, exist_ok=True)
    (dest / 'briefing-latest.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    (dest / 'index.html').write_text('<!doctype html><html lang="ko"><meta charset="utf-8"><title>SOXL 브리핑 피드</title><p>SOXL 앱 v1.3의 브리핑 JSON 주소에 <code>briefing-latest.json</code>을 입력하세요.</p></html>', encoding='utf-8')
    (dest / '.nojekyll').write_text('', encoding='utf-8')
    print('Generated:', dest / 'briefing-latest.json')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
