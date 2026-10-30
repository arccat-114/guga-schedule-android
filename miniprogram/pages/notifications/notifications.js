const notifications=require('../../utils/local-notifications')
Page({
  data:{summaryEnabled:false,courseEnabled:false,summaryTime:'21:00',leadMinutes:30,busy:false,status:'正在读取系统状态…',message:'',error:false,theme:'forest'},
  onLoad(){this.setData(Object.assign({},notifications.read(),{theme:wx.getStorageSync('guga-theme')||'forest'}))},
  onShow(){this.refreshStatus()},
  openTests(){wx.navigateTo({url:'/pages/notification-tests/notification-tests'})},
  toggle(e){if(!this.data.busy&&['summaryEnabled','courseEnabled'].includes(e.currentTarget.dataset.key))this.setData({[e.currentTarget.dataset.key]:e.detail.value})},
  time(e){if(!this.data.busy)this.setData({summaryTime:e.detail.value})},
  minutes(e){if(!this.data.busy)this.setData({leadMinutes:e.detail.value})},
  describe(s){return !s.notificationAllowed?'系统通知未开启':!s.exactAllowed?'通知已开启，还需允许闹钟和提醒':'系统权限已开启 · 待发送 '+s.pending+' 条'},
  async refreshStatus(){try{const s=await notifications.call('getStatus');this.setData({status:this.describe(s)})}catch(e){this.setData({status:e.message})}},
  async action(e){
    if(this.data.busy)return
    const action=e.currentTarget.dataset.action
    if(!['save','requestPermissions'].includes(action))return
    this.setData({busy:true,error:false,message:''})
    try{
      const s=action==='save'?await notifications.save(this.data):await notifications.call(action)
      this.setData({status:this.describe(s),message:action==='save'?'设置已保存，旧提醒计划已替换':'如已跳转设置，请开启权限后返回，再点击保存'})
    }catch(e){this.setData({error:true,message:e.message})}finally{this.setData({busy:false})}
  }
})
