const assert=require('node:assert/strict')
const calc=require('../miniprogram/utils/schedule')
const storage={}
global.wx={getStorageSync:k=>storage[k],setStorageSync:(k,v)=>storage[k]=v}
const bridge=require('../miniprogram/utils/local-notifications')
const settings={summaryEnabled:true,courseEnabled:true,summaryTime:'21:00',leadMinutes:30}
async function main(){
  await assert.rejects(bridge.call('getStatus'),/安卓安装包/)
  await assert.rejects(bridge.save(settings),/个人课表/)
  let last,fail=false,cancels=0,testKind=''
  wx.miniapp={loadNativePlugin({success}){success({
    getStatus(_,cb){cb('{"code":0,"pending":0}')},
    replacePlan(plan,cb){last=plan;cb(fail?{code:-1,message:'权限未开启'}:{code:0,pending:plan.jobs.length})},
    cancelAll(_,cb){cancels++;cb({code:0,pending:0})},
    testNow(data,cb){testKind='immediate';assert.equal(data.kind,'generic');cb({code:0})},
    scheduleTest(data,cb){testKind='alarm';assert.equal(data.kind,'summary');cb({code:0})}
  })}}
  assert.equal((await bridge.call('getStatus')).code,0)
  const today=calc.dateString(),weekday=new Date(today+'T00:00:00Z').getUTCDay()||7
  storage['qingyou-own-schedule']={owner:'test',term:'2026-2027-1',firstMonday:calc.shift(today,1-weekday),courses:[]}
  storage['qingyou-demo-mode']=true
  await bridge.save(settings)
  assert.equal(last.zone,'Asia/Shanghai');assert.ok(last.jobs.length>0)
  assert.equal(storage['guga-local-notification-settings'].leadMinutes,30)
  await bridge.test('generic');assert.equal(testKind,'immediate')
  await bridge.test('summary');assert.equal(testKind,'alarm')
  fail=true
  await assert.rejects(bridge.save({...settings,leadMinutes:50}),/权限未开启/)
  assert.equal(storage['guga-local-notification-settings'].leadMinutes,30)
  delete storage['qingyou-own-schedule']
  await bridge.reconcile();assert.equal(cancels,1)
  await bridge.save({...settings,summaryEnabled:false,courseEnabled:false});assert.equal(cancels,2)
  await assert.rejects(bridge.save({...settings,leadMinutes:-1}),/整数/)
  console.log('PASS: notification bridge retries, missing plugin/account errors, native result parsing, failed-save rollback, personal-only plans, logout cancellation; mocked native bridge only')
}
main().catch(e=>{console.error(e);process.exitCode=1})
