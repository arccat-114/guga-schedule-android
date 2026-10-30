const calc=require('./schedule')
function settings(input){
  const summaryTime=String(input.summaryTime||'')
  const value=String(input.leadMinutes)
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(summaryTime))throw new Error('汇总时间请选择00:00至23:59')
  if(!/^\d{1,4}$/.test(value)||Number(value)>1440)throw new Error('提前分钟数请输入0至1440的整数')
  return {summaryEnabled:input.summaryEnabled===true,courseEnabled:input.courseEnabled===true,summaryTime,leadMinutes:Number(value)}
}
function summaryJob(model,date,at){
  const next=calc.shift(date,1),summary=calc.dailySummary(model,next)
  return {id:'summary:'+date,at,title:'明天的课程',body:summary.count?'明天有'+summary.count+'次上课，共'+summary.sections+'课时，首课'+summary.firstStart:'明天没有排课',date:next,kind:'summary'}
}
function courseJob(c,date,index,at){return {id:'course:'+date+':'+index,at,title:c.name,body:c.start+' 上课 · '+(c.room||'教室待定'),date,kind:'course'}}
function preview(model,kind,now=Date.now()){
  calc.validate(model)
  const today=calc.dateString(now)
  if(kind==='summary')return summaryJob(model,today,now)
  if(kind!=='course')throw new Error('未支持的提醒类型')
  for(let offset=0;offset<=420;offset++){
    const date=calc.shift(today,offset),courses=calc.coursesOn(model,date)
    for(let i=0;i<courses.length;i++)if(calc.timestamp(date,courses[i].start)>now)return courseJob(courses[i],date,i,now)
  }
  throw new Error('当前课表没有未来课程，无法测试课前提醒')
}
function buildPlan(model,input,now=Date.now()){
  calc.validate(model)
  const options=settings(input)
  const today=calc.dateString(now)
  const weeks=Math.max(0,...model.courses.map(c=>c.weeks.lastIndexOf('1')+1))
  if(weeks>60)throw new Error('课表周次超出60周，请核对数据后再开启提醒')
  const end=weeks?calc.shift(model.firstMonday,weeks*7-1):calc.shift(today,29)
  const jobs=[]
  for(let date=today;date<=end;date=calc.shift(date,1)){
    if(options.summaryEnabled){
      const at=calc.timestamp(date,options.summaryTime)
      if(at>now)jobs.push(summaryJob(model,date,at))
    }
    // 提前通知可能跨天：检查未来一天的课程，按课程日期生成稳定ID。
    if(options.courseEnabled){
      for(const courseDate of [date,calc.shift(date,1)]){
        calc.coursesOn(model,courseDate).forEach((c,index)=>{
          const at=calc.timestamp(courseDate,c.start)-options.leadMinutes*60000
          if(at>now&&calc.dateString(at)===date)jobs.push(courseJob(c,courseDate,index,at))
        })
      }
    }
    if(jobs.length>10000)throw new Error('提醒数量过多，请核对课表')
  }
  return {version:1,zone:'Asia/Shanghai',settings:options,jobs:jobs.sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id))}
}
module.exports={settings,buildPlan,preview}
