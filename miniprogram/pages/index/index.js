const calc = require('../../utils/schedule')
const demo = require('../../data/demo')
const avatar = require('../../utils/avatar')
const notifications = require('../../utils/local-notifications')
const COLORS = ['#e6f0df', '#fcebcf', '#e5ebf7', '#f3e4ef']
Page({
  data: {
    pane: 'schedule', date: calc.dateString(), days: [], courses: [], week: 0,
    connected: false, demoMode:false, owner: '', term: '', tomorrow: '', count: 0,
    loginOpen: false, username: '', password: '',
    academicTerm: '', terms: [], busy: false, loginError: '', serviceStatus:'登录服务等待云端验证',
    reminderBusy:false, reminderMessage:'', reminderError:false,
    nightBusy:false, nightMessage:'', nightJob:null, nightLabel:'',
    avatarPath:'', avatarBusy:false, avatarError:'',
    courseMotion:0, loginClosing:false,
    theme:'forest',themes:[{id:'forest',name:'森林绿'},{id:'ocean',name:'晴空蓝'},{id:'amber',name:'暖杏橙'}],
    tabs: [{id:'schedule',icon:'▦',name:'课表'}, {id:'profile',icon:'○',name:'我的'}]
  },
  onLoad(options = {}) {
    const theme=wx.getStorageSync('guga-theme')
    if(['forest','ocean','amber'].includes(theme)) this.setData({theme})
    const year = Number(calc.dateString().slice(0,4))
    const month = Number(calc.dateString().slice(5,7))
    const start = month >= 8 ? year : year - 1
    const terms = [`${start}-${start+1}-1`, `${start}-${start+1}-2`, `${start}-${start+1}-3`, `${start-1}-${start}-1`, `${start-1}-${start}-2`, `${start-1}-${start}-3`]
    this.setData({terms, academicTerm:terms[month>=2 && month<8 ? 1 : 0]})
    if(wx.getStorageSync('qingyou-demo-mode')) this.setData({date:demo.demoDate})
    if(options.date && ['own','demo'].includes(options.source)) {
      try {
        calc.shift(options.date,0)
        if(options.source==='demo') {
          if(!wx.getStorageSync('qingyou-demo-mode')) wx.setStorageSync('qingyou-demo-return-date',this.data.date)
          wx.setStorageSync('qingyou-demo-mode',true)
        } else {
          wx.removeStorageSync('qingyou-demo-mode');wx.removeStorageSync('qingyou-demo-return-date')
        }
        this.setData({date:options.date})
      } catch (_) {}
    }
    this.refresh()
  },
  onShow() { this.refresh(); this.syncReminders() },
  syncReminders() {
    notifications.reconcile().then(()=>this.setData({reminderMessage:''})).catch(e=>this.setData({reminderMessage:'提醒计划未更新：'+e.message}))
  },
  openNotifications() { wx.navigateTo({url:'/pages/notifications/notifications'}) },
  refresh() {
    let model = null
    try { const saved=wx.getStorageSync('qingyou-own-schedule'); if(saved) model=calc.validate(saved) } catch (_) {}
    const demoMode=!!wx.getStorageSync('qingyou-demo-mode')
    if(demoMode) model=calc.validate(demo)
    this.model = model
    const date = this.data.date
    const today = calc.dateString()
    const day = new Date(date+'T00:00:00Z').getUTCDay() || 7
    const monday = calc.shift(date, 1-day)
    const courses = model ? calc.coursesOn(model,date).map((c,i)=>Object.assign({},c,{color:COLORS[i%4]})) : []
    const tomorrow = model ? calc.coursesOn(model,calc.shift(date,1)) : []
    // 仅课程内容或查看日期改变时重播，不让状态查询、返回前台反复闪动。
    const motionKey=JSON.stringify([date,demoMode,model && model.owner,courses])
    if(this._courseMotionKey!==motionKey) {
      this._courseMotionKey=motionKey
      this.setData({courseMotion:this.data.courseMotion ? 0 : 1})
    }
    this.setData({connected:!!model,demoMode,owner:model ? model.owner || '当前用户' : '',term:model ? model.term : '',week:model ? calc.weekOf(model,date) : 0,
      days:Array.from({length:7},(_,i)=>{const d=calc.shift(monday,i);return {date:d,number:Number(d.slice(8)),label:['一','二','三','四','五','六','日'][i],selected:d===date,today:d===today}}),
      courses,count:courses.length,tomorrow:model ? `明天有 ${tomorrow.length} 次上课，共 ${tomorrow.reduce((n,c)=>n+c.endSection-c.startSection+1,0)} 个课时` : '尚未连接课表'})
    const avatar=wx.getStorageSync(this.avatarKey())
    this.setData({avatarPath:typeof avatar==='string'?avatar:''})
  },
  avatarKey() { return `guga-avatar:${this.data.demoMode?'demo':'own'}:${this.data.connected?this.data.owner:'guest'}` },
  chooseAvatar() {
    if(this.data.avatarBusy) return
    const key=this.avatarKey()
    const finish=()=>this.setData({avatarBusy:false})
    const fail=error=>{
      finish()
      const message=error && (error.errMsg || error.message) || '未取得图片，请重新选择'
      if(/cancel/i.test(message)) return
      this.setData({avatarError:message.slice(0,220)})
      wx.showToast({title:'头像导入失败，详情见页面',icon:'none'})
    }
    this.setData({avatarBusy:true,avatarError:''})
    try {
      wx.chooseImage({count:1,sizeType:['original','compressed'],sourceType:['album'],
        success:async res=>{
          const file=res.tempFiles && res.tempFiles[0]
          const path=res.tempFilePaths && res.tempFilePaths[0] || file && (file.path || file.tempFilePath)
          if(!path) {fail();return}
          try {
            const saved=await avatar.importImage(wx,this,path,key)
            if(this.avatarKey()===key) this.setData({avatarPath:saved})
            finish();wx.showToast({title:'头像已更换',icon:'success'})
          } catch(error) {
            fail(error)
          }
        },fail
      })
    } catch(error) { fail(error) }
  },
  avatarLoadError() { this.setData({avatarPath:'',avatarError:'头像文件无法显示，请重新选择图片。'}) },
  switchPane(e) { this.setData({pane:e.currentTarget.dataset.pane}) },
  changeTheme(e) {
    const theme=e.currentTarget.dataset.theme
    if(!['forest','ocean','amber'].includes(theme)) return
    wx.setStorageSync('guga-theme',theme)
    this.setData({theme})
  },
  pickDay(e) { this.setData({date:e.currentTarget.dataset.date}); this.refresh() },
  returnToday() { this.setData({date:calc.dateString()}); this.refresh() },
  changeDate(e) { this.setData({date:e.detail.value}); this.refresh() },
  shiftWeek(e) { this.setData({date:calc.shift(this.data.date,Number(e.currentTarget.dataset.delta))}); this.refresh() },
  openLogin() {
    if(typeof wx.navigateTo==='function') {
      wx.navigateTo({url:'/pages/login/login',fail:()=>wx.showToast({title:'登录页面打开失败，请重新预览',icon:'none'})})
      return
    }
    clearTimeout(this._loginCloseTimer)
    this.setData({loginOpen:true,loginClosing:false,loginError:'',password:''})
  },
  closeLogin() {
    if(this.data.busy || this.data.loginClosing) return
    this.setData({loginClosing:true,password:''})
    this._loginCloseTimer=setTimeout(()=>{
      this._loginCloseTimer=null
      this.setData({loginOpen:false,loginClosing:false})
    },180)
  },
  stop() {},
  importDemo() {
    if(this.data.busy) return
    wx.showModal({title:'导入演示课表',content:'载入演示用户的本地课表样例，不连接学校，不覆盖已同步的个人课表。',success:r=>{
      if(!r.confirm) return
      this.loadDemo()
    }})
  },
  loadDemo() {
    if(this.data.busy || this.data.demoMode) return
    wx.setStorageSync('qingyou-demo-return-date',this.data.date)
    wx.setStorageSync('qingyou-demo-mode',true)
    this.setData({pane:'schedule',date:demo.demoDate,loginOpen:false,password:'',loginError:''});this.refresh()
    wx.showToast({title:'演示课表已载入',icon:'none'})
  },
  exitDemo() {
    const date=wx.getStorageSync('qingyou-demo-return-date') || calc.dateString()
    wx.removeStorageSync('qingyou-demo-mode');wx.removeStorageSync('qingyou-demo-return-date')
    this.setData({date});this.refresh()
  },
  input(e) { this.setData({[e.currentTarget.dataset.key]:e.detail.value}) },
  pickTerm(e) { this.setData({academicTerm:this.data.terms[Number(e.detail.value)]}) },
  logout() { if(this.data.demoMode){this.exitDemo();return} wx.showModal({title:'退出当前课表？',content:'将清除本机当前用户的课表和提醒计划，下一位同学需要使用自己的账号重新连接。',success:async r=>{if(r.confirm){
    const options=notifications.read()
    if(options.summaryEnabled||options.courseEnabled){try{await notifications.call('cancelAll')}catch(e){wx.showToast({title:'未能取消提醒，请先在提醒设置中处理',icon:'none'});return}}
    wx.removeStorageSync('qingyou-own-schedule');this.setData({username:'',password:''});this.refresh()
  }}}) },
  onHide() {
    clearTimeout(this._loginCloseTimer)
    this.setData({password:'',...(this.data.loginClosing ? {loginOpen:false,loginClosing:false} : {})})
  },
  onUnload() { clearTimeout(this._loginCloseTimer); this.setData({password:''}) }
})
