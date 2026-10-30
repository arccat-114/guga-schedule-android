const DAY = 86400000
const OFFSET = 8 * 3600000
function dayStamp(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('日期需为 YYYY-MM-DD')
  const [y,m,d] = date.split('-').map(Number)
  const result = Date.UTC(y,m-1,d)
  if (new Date(result).toISOString().slice(0,10) !== date) throw new Error('日期无效')
  return result
}
function dateString(now = Date.now()) { return new Date(now + OFFSET).toISOString().slice(0,10) }
function shift(date, days) { return new Date(dayStamp(date) + days * DAY).toISOString().slice(0,10) }
function weekOf(model, date) { return Math.floor((dayStamp(date)-dayStamp(model.firstMonday))/(7*DAY))+1 }
function timestamp(date, time) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('时间需为 HH:mm')
  const [h,m] = time.split(':').map(Number)
  return dayStamp(date) + (h*60+m)*60000 - OFFSET
}
function formatTime(stamp) { return new Date(stamp+OFFSET).toISOString().replace('T',' ').slice(0,16) }
function coursesOn(model, date, minutes = 30) {
  const week = weekOf(model,date)
  const day = new Date(dayStamp(date)).getUTCDay() || 7
  return model.courses.filter(c => c.day === day && c.weeks[week-1] === '1')
    .sort((a,b)=>a.start.localeCompare(b.start))
    .map((c,i)=>Object.assign({},c,{id:i,remindAt:formatTime(timestamp(date,c.start)-minutes*60000)}))
}
function validate(model) {
  if (!model || !Array.isArray(model.courses) || model.courses.length > 500) throw new Error('最多允许500条课程记录')
  dayStamp(model.firstMonday)
  if (new Date(dayStamp(model.firstMonday)).getUTCDay()!==1) throw new Error('学期首日必须为星期一')
  model.courses.forEach(c=> {
    if (!c.name || !/^[01]+$/.test(c.weeks) || !Number.isInteger(c.day) || c.day<1 || c.day>7) throw new Error('课程名称、周次或星期格式无效')
    if (!Number.isInteger(c.startSection) || !Number.isInteger(c.endSection) || c.startSection<1 || c.endSection<c.startSection) throw new Error('节次格式无效')
    if (timestamp(model.firstMonday,c.end)<=timestamp(model.firstMonday,c.start)) throw new Error('课程结束时间需晚于开始时间')
  })
  return model
}
function nextNight(now = Date.now()) {
  let date = dateString(now)
  let dueAt = timestamp(date, '21:00')
  if (now >= dueAt) { date = shift(date, 1); dueAt = timestamp(date, '21:00') }
  return {dueAt, sendDate:date, courseDate:shift(date,1), label:formatTime(dueAt)}
}
function nightSummary(model, now = Date.now()) {
  const slot = nextNight(now)
  return Object.assign(slot, dailySummary(model,slot.courseDate))
}
function dailySummary(model,date) {
  const courses=coursesOn(validate(model),date)
  return {courseDate:date,count:courses.length,sections:courses.reduce((n,c)=>n+c.endSection-c.startSection+1,0),firstStart:courses.length?courses[0].start:''}
}
module.exports = {dateString,shift,weekOf,timestamp,formatTime,coursesOn,validate,nextNight,nightSummary,dailySummary}
