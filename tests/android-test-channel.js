const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm')
let page
const calls=[]
const notifications={async test(kind){calls.push(kind);return {code:0}}}
vm.runInNewContext(fs.readFileSync(require.resolve('../miniprogram/pages/notification-tests/notification-tests.js'),'utf8'),{
  Page:p=>page=p,wx:{getStorageSync:()=> 'amber'},require:()=>notifications
})
page.setData=data=>Object.assign(page.data,data)
async function main(){
  page.onLoad();assert.equal(page.data.theme,'amber')
  for(const kind of ['generic','summary','course']){await page.test({currentTarget:{dataset:{kind}}});assert.equal(page.data.busy,false);assert.equal(page.data.error,false)}
  assert.deepEqual(calls,['generic','summary','course'])
  notifications.test=async()=>{throw new Error('权限未开启')}
  await page.test({currentTarget:{dataset:{kind:'summary'}}});assert.equal(page.data.message,'权限未开启');assert.equal(page.data.error,true)
  const template=fs.readFileSync(require.resolve('../miniprogram/pages/notification-tests/notification-tests.wxml'),'utf8')
  assert.equal((template.match(/<button /g)||[]).length,3)
  const parent=fs.readFileSync(require.resolve('../miniprogram/pages/notifications/notifications.wxml'),'utf8')
  assert.match(parent,/class="test-link"/);assert.doesNotMatch(parent,/刷新提醒状态|testSummary|testCourse/)
  assert.doesNotMatch(fs.readFileSync(require.resolve('../miniprogram/pages/notification-tests/notification-tests.js'),'utf8'),/setTimeout/)
  console.log('PASS: compact entry, separate three-button test page, generic/summary/course routing, busy/error handling; no fake foreground timer')
}
main().catch(e=>{console.error(e);process.exitCode=1})
