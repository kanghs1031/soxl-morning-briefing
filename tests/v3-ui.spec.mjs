import { test, expect } from '@playwright/test';
import {readFile} from 'node:fs/promises';

test('example trade completes deterministic buy and target sell with seven isolated accounts', async ({ page }) => {
  await page.goto('/');
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: '예제 매매 실행' }).click();
  await expect(page.getByRole('status')).toContainText('예제 매매 완료');
  await page.getByRole('tab', { name: '7계좌', exact: true }).click();
  const account = page.getByTestId('account-card').first();
  await expect(account).toContainText('매수 체결');
  await expect(account).toContainText('익절 매도');
  await expect(account.getByTestId('quantity')).toHaveText('0주');
  await expect(page.getByTestId('account-card').nth(1).getByTestId('quantity')).toHaveText('0주');
  await page.reload();
  await page.getByRole('tab', { name: '7계좌', exact: true }).click();
  await expect(page.getByTestId('account-card').first()).toContainText('익절 매도');
});

test('mobile shell exposes four safe demo tabs without overflow', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('banner')).toContainText('실제 주문 없음');
  await expect(page.getByRole('heading', { name: '포트폴리오' })).toBeVisible();
  for (const name of ['홈', '7계좌', '시장', '설정']) {
    await page.getByRole('tab', { name, exact: true }).click();
    await expect(page.getByRole('tab', { name, exact: true })).toHaveAttribute('aria-selected', 'true');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole('tab', { name: '7계좌', exact: true }).click();
  await expect(page.getByTestId('account-card')).toHaveCount(7);
  await page.screenshot({ path: `test-results/accounts-${test.info().project.name}.png`, fullPage: true });
});

test('account controls place and cancel limits, save risk and export backups', async ({page})=>{
 await page.goto('/');
 await page.getByRole('tab',{name:'7계좌',exact:true}).click();
 const first=page.getByTestId('account-card').first();
 await first.locator('summary').first().click();
 await page.getByLabel('계좌 1 시작 자본',{exact:true}).fill('5000');
 await page.getByLabel('계좌 1 매수 단계',{exact:true}).selectOption('10');
 await first.locator('button[type=submit]').click();
 await expect(page.getByRole('status')).toContainText('분할 주문');
 await expect(first).toContainText('미체결 10건');
 await first.locator('summary').nth(1).click();
 await first.locator('[data-cancel]').click();
 await expect(first).toContainText('미체결 0건');
 await page.getByRole('tab',{name:'설정',exact:true}).click();
 await page.getByLabel('매매 수수료 (bp)',{exact:true}).fill('3');
 await page.getByRole('button',{name:'리스크 설정 저장'}).click();
 await expect(page.getByRole('status')).toContainText('리스크 설정을 저장');
 for(const name of ['JSON 백업','체결 CSV']) {
  const download=page.waitForEvent('download');await page.getByRole('button',{name,exact:true}).click();
  expect((await download).suggestedFilename()).toContain('soxl-paper-v3');
 }
 await page.reload();await page.getByRole('tab',{name:'설정',exact:true}).click();
 await expect(page.getByLabel('매매 수수료 (bp)',{exact:true})).toHaveValue('3');
});

test('selected account can demonstrate a stop and restore its scenario',async({page})=>{
 await page.goto('/');page.on('dialog',d=>d.accept());
 await page.getByLabel('예제 계좌',{exact:true}).selectOption('7');
 await page.getByLabel('예제 유형',{exact:true}).selectOption('stop');
 await page.getByRole('button',{name:'예제 매매 실행'}).click();
 await expect(page.getByRole('status')).toContainText('계좌 7');
 await page.getByRole('tab',{name:'7계좌',exact:true}).click();
 const account=page.getByTestId('account-card').nth(6);
 await expect(account).toContainText('손절 매도');await expect(account).toContainText('미체결 0건');
 await expect(account.getByTestId('quantity')).toHaveText('0주');
 await expect(page.getByTestId('account-card').first()).toContainText('체결 기록 0건');
 await page.reload();await page.getByRole('tab',{name:'7계좌',exact:true}).click();
 await expect(account).toContainText('손절 매도');
 await page.getByRole('tab',{name:'시장',exact:true}).click();await expect(page.getByText('2개 합성 캔들 · KST')).toBeVisible();
});

test('offline installed shell loads and retains complete paper trade',async({page,context})=>{
 await page.goto('/');page.on('dialog',d=>d.accept());
 await page.getByRole('button',{name:'예제 매매 실행'}).click();
 await page.evaluate(()=>navigator.serviceWorker.ready);
 await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 await context.setOffline(true);await page.reload();
 await expect(page.getByRole('heading',{name:'포트폴리오'})).toBeVisible();
 await page.getByRole('tab',{name:'7계좌',exact:true}).click();
 await expect(page.getByTestId('account-card').first()).toContainText('익절 매도');
 await context.setOffline(false);
});

test('saved cursor must match its scenario candle instead of skipping or rewinding',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'다음 캔들',exact:false}).click();
 await page.evaluate(()=>{const key='soxl-paper-v3.1',s=JSON.parse(localStorage.getItem(key));s.cursor=0;localStorage.setItem(key,JSON.stringify(s));});
 await page.reload();await expect(page.getByRole('alert')).toContainText('원본은 덮어쓰지 않았습니다');
});

test('storage access denied still permits memory-state JSON backup',async({page})=>{
 await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new DOMException('Storage disabled','SecurityError');};});
 await page.goto('/');await expect(page.getByRole('alert')).toContainText('원본');
 await page.getByRole('button',{name:'다음 캔들',exact:false}).click();
 await page.getByRole('tab',{name:'설정',exact:true}).click();
 const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'JSON 백업',exact:true}).click();
 const file=await downloaded,payload=JSON.parse(await readFile(await file.path(),'utf8'));
 expect(payload.state.mode).toBe('DEMO');expect(payload.cursor).toBe(1);expect(payload.state.accounts).toHaveLength(7);
});

test('corrupt saved data is quarantined instead of silently overwritten',async({page})=>{
 await page.goto('/');await page.evaluate(()=>localStorage.setItem('soxl-paper-v3.1','{"version":"broken"}'));
 await page.reload();await expect(page.getByRole('alert')).toContainText('원본은 덮어쓰지 않았습니다');
 await page.getByRole('button',{name:'다음 캔들',exact:false}).click();
 expect(await page.evaluate(()=>localStorage.getItem('soxl-paper-v3.1'))).toBe('{"version":"broken"}');
});
