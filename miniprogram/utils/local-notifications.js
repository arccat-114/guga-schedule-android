const planner=require('./notification-plan')
const KEY='guga-local-notification-settings'
let loading=null
function load(){
  if(loading)return loading
  loading=new Promise((resolve,reject)=>{
    if(!wx.miniapp||typeof wx.miniapp.loadNativePlugin!=='function'){reject(new Error('请在包含本地通知插件的安卓安装包中使用'));return}
    const timer=setTimeout(()=>reject(new Error('通知插件加载超时，请确认安装包已集成插件')),12000)
    wx.miniapp.loadNativePlugin({pluginId:'wx0000000000000000',success:p=>{clearTimeout(timer);resolve(p)},fail:()=>{clearTimeout(timer);reject(new Error('安装包尚未集成本地通知插件，请更新安装包'))}})
  }).catch(e=>{loading=null;throw e})
  return loading
}
async function call(method,data={}){
  const plugin=await load()
  if(typeof plugin[method]!=='function')throw new Error('通知插件版本不匹配，请更新安装包')
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('系统操作未返回，请刷新提醒状态确认')),45000)
    try{plugin[method](data,result=>{
      clearTimeout(timer)
      try{const value=typeof result==='string'?JSON.parse(result):result;if(!value||value.code!==0)throw new Error(value&&value.message||'系统提醒操作失败');resolve(value)}catch(e){reject(e)}
    })}catch(e){clearTimeout(timer);reject(e)}
  })
}
function read(){try{return planner.settings(wx.getStorageSync(KEY)||{summaryEnabled:false,courseEnabled:false,summaryTime:'21:00',leadMinutes:30})}catch(_){return {summaryEnabled:false,courseEnabled:false,summaryTime:'21:00',leadMinutes:30}}}
async function save(input){
  const options=planner.settings(input)
  const model=wx.getStorageSync('qingyou-own-schedule')
  if((options.summaryEnabled||options.courseEnabled)&&!model)throw new Error('请先连接个人课表，再开启提醒；演示数据不发送提醒')
  const result=options.summaryEnabled||options.courseEnabled?await call('replacePlan',planner.buildPlan(model,options)):await call('cancelAll')
  wx.setStorageSync(KEY,options)
  return result
}
// Reconcile on import/logout; always use the personal timetable, never demo data.
async function reconcile(){
  const options=read()
  if(!options.summaryEnabled&&!options.courseEnabled)return
  if(!wx.getStorageSync('qingyou-own-schedule'))return call('cancelAll')
  return call('replacePlan',planner.buildPlan(wx.getStorageSync('qingyou-own-schedule'),options))
}
async function test(kind){
  if(kind==='generic')return call('testNow',{kind:'generic',title:'咕嘎课程表',body:'测试通知已送达。'})
  const model=wx.getStorageSync('qingyou-own-schedule')
  if(!model)throw new Error('请先连接个人课表，再测试真实课程提醒')
  return call('scheduleTest',planner.preview(model,kind))
}
module.exports={read,save,reconcile,call,test}
