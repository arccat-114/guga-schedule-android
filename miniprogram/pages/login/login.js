const calc=require('../../utils/schedule')
const school=require('../../utils/school-client')
const notifications=require('../../utils/local-notifications')
Page({
  data:{username:'',password:'',terms:[],termLabels:[],termIndex:0,busy:false,error:''},
  onLoad(){
    const date=calc.dateString(),year=Number(date.slice(0,4)),month=Number(date.slice(5,7)),start=month>=8?year:year-1
    const terms=[];for(const y of [start,start-1])for(const n of [1,2,3])terms.push(y+'-'+(y+1)+'-'+n)
    const saved=wx.getStorageSync('qingyou-own-schedule')
    this.setData({terms,termLabels:terms.map(t=>t.slice(0,-2)+' '+({'1':'第一学期','2':'第二学期','3':'夏季学期'}[t.slice(-1)])),termIndex:month>=2&&month<8?1:0,username:saved&&/^\d+$/.test(saved.owner)?saved.owner:''})
  },
  input(e){if(!this.data.busy&&['username','password'].includes(e.currentTarget.dataset.key))this.setData({[e.currentTarget.dataset.key]:e.detail.value})},
  pickTerm(e){const index=Number(e.detail.value);if(Number.isInteger(index)&&index>=0&&index<this.data.terms.length)this.setData({termIndex:index})},
  async login(){
    if(this.data.busy)return
    const username=this.data.username.trim(),password=this.data.password
    if(!username||!password){this.setData({error:'请输入本人的学校账号和密码'});return}
    this.setData({busy:true,error:'',password:''})
    try{
      const model=await new school.Session(wx).login(username,password,this.data.terms[this.data.termIndex])
      const options=notifications.read()
      // Cancel the old account's alarms before replacing its personal timetable.
      if(options.summaryEnabled||options.courseEnabled)await notifications.call('cancelAll')
      wx.setStorageSync('qingyou-own-schedule',model)
      wx.removeStorageSync('qingyou-demo-mode');wx.removeStorageSync('qingyou-demo-return-date')
      wx.showToast({title:'课表已同步',icon:'success'})
      wx.navigateBack({delta:1})
    }catch(e){this.setData({error:e.message||'导入失败，请稍后重试'})}finally{this.setData({busy:false})}
  },
  onHide(){this.setData({password:''})},onUnload(){this.setData({password:''})}
})
