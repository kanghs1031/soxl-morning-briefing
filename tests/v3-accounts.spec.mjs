import {test,expect} from '@playwright/test';
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('soxl-paper-v3.1')));
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
for(let id=1;id<=7;id++) {
 for(const [kind,label] of [['example','익절 매도'],['stop','손절 매도']]) {
  test(`account ${id}: ${kind} via selected example, persistence and isolation`,async({page})=>{
   await page.goto('/');page.on('dialog',d=>d.accept());
   await page.getByLabel('예제 계좌',{exact:true}).selectOption(String(id));
   await page.getByLabel('예제 유형',{exact:true}).selectOption(kind);
   await page.getByRole('button',{name:'예제 매매 실행',exact:true}).click();
   await expect(page.getByRole('status')).toContainText(`계좌 ${id}`);
   await page.getByRole('tab',{name:'7계좌',exact:true}).click();
   const card=page.getByTestId('account-card').nth(id-1);
   await expect(card).toContainText('매수 체결');await expect(card).toContainText(label);
   await expect(card.getByTestId('quantity')).toHaveText('0주');await expect(card).toContainText('미체결 0건');
   const snapshot=await saved(page),a=snapshot.state.accounts[id-1];
   expect(a.log.filter(l=>l.type==='SELL')).toHaveLength(1);
   expect(kind==='example'?a.realized>0:a.realized<0).toBe(true);
   for(const other of snapshot.state.accounts.filter(a=>a.id!==id)){expect(other.cash).toBe(10000);expect(other.qty).toBe(0);expect(other.log).toHaveLength(0);}
   await page.reload();await page.getByRole('tab',{name:'7계좌',exact:true}).click();await expect(card).toContainText(label);
   await page.getByRole('tab',{name:'홈',exact:true}).click();await expect(page.getByRole('button',{name:'다음 캔들',exact:false})).toBeDisabled();
  });
 }
 test(`account ${id}: manual ladder, weighted average display and cancellation`,async({page})=>{
  await page.goto('/');await page.getByRole('tab',{name:'7계좌',exact:true}).click();
  const card=page.getByTestId('account-card').nth(id-1),stages=7+(id-1)%4;
  await card.locator('summary').first().click();
  await page.getByLabel(`계좌 ${id} 지지선`,{exact:true}).fill('102');
  await page.getByLabel(`계좌 ${id} 단계 간격`,{exact:true}).fill('1');
  await page.getByLabel(`계좌 ${id} 매수 단계`,{exact:true}).selectOption(String(stages));
  await card.getByRole('button',{name:'분할 주문 배치',exact:true}).click();
  await expect(card).toContainText(`미체결 ${stages}건`);await expect(card.getByTestId('quantity')).toHaveText('0주');
  await page.getByRole('tab',{name:'홈',exact:true}).click();
  for(let i=0;i<13;i++)await page.getByRole('button',{name:'다음 캔들',exact:false}).click();
  const before=await saved(page),a=before.state.accounts[id-1],buys=a.log.filter(l=>l.type==='BUY');
  expect(new Set(buys.map(l=>l.price)).size).toBeGreaterThan(1);
  const fee=before.state.config.feeBps/10000,cost=buys.reduce((n,l)=>n+l.qty*l.price*(1+fee),0),qty=buys.reduce((n,l)=>n+l.qty,0);
  expect(a.cost/a.qty).toBeCloseTo(cost/qty,8);expect(a.orders.length).toBeGreaterThan(0);
  await page.getByRole('tab',{name:'7계좌',exact:true}).click();
  await expect(card.locator('.metric').filter({has:page.locator('small',{hasText:'수수료 포함 평단'})}).locator('strong')).toHaveText(money(cost/qty));
  await card.locator('summary').nth(1).click();await card.getByRole('button',{name:`계좌 ${id} 주문 취소`,exact:true}).click();
  await expect(card).toContainText('미체결 0건');
  await page.getByRole('tab',{name:'홈',exact:true}).click();await page.getByRole('button',{name:'다음 캔들',exact:false}).click();
  const after=(await saved(page)).state.accounts[id-1];expect(after.qty).toBe(a.qty);expect(after.log).toHaveLength(a.log.length);
  for(const other of (await saved(page)).state.accounts.filter(a=>a.id!==id)){expect(other.cash).toBe(10000);expect(other.log).toHaveLength(0);}
 });
}
test('declining a reset example preserves existing paper records',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'다음 캔들',exact:false}).click();const before=await saved(page);
 page.on('dialog',d=>d.dismiss());await page.getByLabel('예제 계좌',{exact:true}).selectOption('7');await page.getByLabel('예제 유형',{exact:true}).selectOption('stop');
 await page.getByRole('button',{name:'예제 매매 실행',exact:true}).click();expect(await saved(page)).toEqual(before);
});
