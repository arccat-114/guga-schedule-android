const notifications=require('../../utils/local-notifications')
Page({
  data:{theme:'forest',busy:false,message:'',error:false},
  onLoad(){this.setData({theme:wx.getStorageSync('guga-theme')||'forest'})},
  async test(e){
    if(this.data.busy)return
    const kind=e.currentTarget.dataset.kind
    if(!['generic','summary','course'].includes(kind))return
    this.setData({busy:true,message:'',error:false})
    try{await notifications.test(kind);this.setData({message:kind==='generic'?'已请求系统立即显示通知，请查看通知栏':'已安排约2秒后发送，请查看通知栏。测试不修改你的正式提醒设置。'})}
    catch(e){this.setData({error:true,message:e.message})}finally{this.setData({busy:false})}
  }
})
