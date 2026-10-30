// 独立 App 直接连接学校；不使用微信身份、共享云函数或持久化登录凭据。
const base64=require('base64-js')
const {sm2}=require('sm-crypto')
const {SecureRandom}=require('jsbn')
const calc=require('./schedule')
const native=require('./local-notifications')
const SSO='https://sso.bistu.edu.cn'
const JW='https://jwxt.bistu.edu.cn'
const SERVICE=JW+'/jwapp/sys/yjsrzfwapp/bistuLogin/casLogin.do'
function address(value){
  const match=/^https:\/\/(sso\.bistu\.edu\.cn|jwxt\.bistu\.edu\.cn)(?::443)?([/?#].*)?$/i.exec(value)
  if(!match)throw new Error('学校返回了未支持的认证地址')
  return {host:match[1].toLowerCase(),path:(match[2]||'/').split(/[?#]/)[0]||'/'}
}
function hex(bytes){return Array.from(bytes,b=>('0'+b.toString(16)).slice(-2)).join('')}
function bytes(value){return Uint8Array.from(value.match(/.{2}/g)||[],v=>parseInt(v,16))}
function form(data){return Object.keys(data).map(k=>encodeURIComponent(k)+'='+encodeURIComponent(data[k])).join('&')}
async function encryptPassword(api,password,key){
  if(typeof api.getRandomValues!=='function')throw new Error('当前运行环境缺少安全随机数接口，未提交学校密码')
  const random=await new Promise((resolve,reject)=>api.getRandomValues({length:1024,success:r=>resolve(new Uint8Array(r.randomValues)),fail:()=>reject(new Error('安全随机数获取失败，未提交学校密码'))}))
  if(random.length!==1024)throw new Error('安全随机数返回长度异常')
  let offset=0
  const original=SecureRandom.prototype.nextBytes
  SecureRandom.prototype.nextBytes=function(target){
    if(offset+target.length>random.length)throw new Error('安全随机数不足')
    for(let i=0;i<target.length;i++)target[i]=random[offset++]
  }
  try{return base64.fromByteArray(bytes(sm2.doEncrypt(password,key,1)))}finally{SecureRandom.prototype.nextBytes=original;random.fill(0)}
}
class Session{
  constructor(api){this.api=api;this.cookies=[];this.deadline=Date.now()+45000;this.useNative=false}
  remember(url,values){
    const origin=address(url)
    for(const value of values){
      const parts=value.split(';'),pair=parts.shift(),at=pair.indexOf('=')
      if(at<1)continue
      const cookie={name:pair.slice(0,at).trim(),value:pair.slice(at+1),host:origin.host,path:'/',domain:false}
      for(const part of parts){
        const key=part.trim().split('=')[0].toLowerCase(),v=part.trim().slice(key.length+1)
        if(key==='path')cookie.path=v||'/'
        if(key==='domain'){
          const domain=v.toLowerCase().replace(/^\./,'')
          if(domain==='bistu.edu.cn'||domain===origin.host){cookie.host=domain;cookie.domain=true}
        }
      }
      this.cookies=this.cookies.filter(c=>!(c.name===cookie.name&&c.host===cookie.host&&c.path===cookie.path))
      this.cookies.push(cookie)
    }
  }
  cookie(url){const a=address(url);return this.cookies.filter(c=>(c.host===a.host||c.domain&&a.host.endsWith('.'+c.host))&&(a.path===c.path||a.path.startsWith(c.path.endsWith('/')?c.path:c.path+'/'))).map(c=>c.name+'='+c.value).join('; ')}
  async request(url,method='GET',data,redirects=0){
    const a=address(url)
    if(redirects>8)throw new Error('学校认证跳转过多')
    const timeout=Math.min(15000,this.deadline-Date.now())
    if(timeout<=0)throw new Error('学校连接超时，请稍后重试')
    const header={Cookie:this.cookie(url)}
    if(data!==undefined)header['Content-Type']=typeof data==='string'?'application/x-www-form-urlencoded':'application/json'
    const result=this.useNative?await native.call('schoolRequest',{url,method,body:data===undefined?'':typeof data==='string'?data:JSON.stringify(data),header,timeout}):await new Promise((resolve,reject)=>this.api.request({url,method,data,header,timeout,dataType:'text',success:resolve,fail:e=>reject(new Error('学校连接失败：'+(e.errMsg||'请检查网络')))}))
    const headers={};Object.keys(result.header||{}).forEach(k=>headers[k.toLowerCase()]=result.header[k])
    let values=Array.isArray(result.cookies)?result.cookies:[]
    if(!values.length&&headers['set-cookie'])values=Array.isArray(headers['set-cookie'])?headers['set-cookie']:String(headers['set-cookie']).split(/,(?=\s*[^;,\s]+=)/)
    this.remember(url,values)
    if([301,302,303,307,308].includes(result.statusCode)&&headers.location){
      const target=String(headers.location)
      const next=target.startsWith('https://')?target:target.startsWith('/')?'https://'+a.host+target:'https://'+a.host+a.path.slice(0,a.path.lastIndexOf('/')+1)+target
      const preserve=[307,308].includes(result.statusCode)
      return this.request(next,preserve?method:'GET',preserve?data:undefined,redirects+1)
    }
    if(result.statusCode<200||result.statusCode>=300)throw new Error('学校服务返回 HTTP '+result.statusCode)
    return result.data
  }
  async json(url,method,data){const result=await this.request(url,method,data);if(result&&typeof result==='object')return result;try{return JSON.parse(result)}catch(_){throw new Error('学校返回了登录页面，当前认证会话未建立')}}
  async login(username,password,term){
    if(!/^\d{6,20}$/.test(username)||!password||password.length>200||!/^\d{4}-\d{4}-[123]$/.test(term))throw new Error('请检查学号、密码和学期')
    try{
      const platform=typeof this.api.getSystemInfoSync==='function'?this.api.getSystemInfoSync().platform:''
      this.useNative=platform==='android'
      await this.request(SSO+'/login?service='+encodeURIComponent(SERVICE))
      const info=this.cookies.find(c=>c.name==='COOKIE_INFO'&&(c.host==='sso.bistu.edu.cn'||c.host==='bistu.edu.cn'))
      if(!info)throw new Error('学校登录会话未建立，当前网络组件未返回认证 Cookie')
      let details;try{details=JSON.parse(decodeURIComponent(info.value))}catch(_){throw new Error('学校认证会话格式已变化')}
      const flowKey=details.data&&details.data.flowKey
      if(!flowKey)throw new Error('学校未返回认证流程标识')
      const rules=await this.json(SSO+'/info-query','POST',{username:'',flowKey})
      if(rules.code!==160004||!rules.data)throw new Error('未能读取学校认证要求')
      if(rules.data.captcha||rules.data.mfa||rules.data.mfa2)throw new Error('学校要求验证码或二次认证，当前尚未支持')
      const encryption=await this.json(SSO+'/api/reset/rules')
      const key=hex(base64.toByteArray(encryption.data.encrypt.publicKey))
      if(!/^04[\da-f]{128}$/i.test(key))throw new Error('学校加密公钥无效')
      const half=password.replace(/[\uff01-\uff5e]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xfee0)).replace(/\u3000/g,' ')
      const encrypted=await encryptPassword(this.api,half,key)
      const result=await this.json(SSO+'/username-password/login','POST',{flowKey,username,password:encrypted})
      if(Number(result.code)===170002)throw new Error('学校提示学号或密码错误，请核对统一认证账号')
      if([170003,160002].includes(Number(result.code)))throw new Error('学校要求验证码，当前尚未支持')
      if(Number(result.code)!==666666||!result.data||!result.data.service)throw new Error('学校未完成登录（认证码 '+result.code+'）')
      const service=result.data.service.startsWith('/')?SSO+result.data.service:result.data.service
      await this.request(service)
      const detail=await this.json(JW+'/jwapp/sys/kbapp/api/wdkbcx/getMyScheduleDetail.do','POST',form({XNXQDM:term,XQDM:'10'}))
      const calendar=await this.json(JW+'/jwapp/sys/kbbpapp/api/schoolCalendar/getTermWeeks.do','POST',form({XNXQDM:term}))
      if(String(detail.code)!=='0'||String(calendar.code)!=='0')throw new Error('学校未返回指定学期的课表或校历')
      const arranged=detail.datas&&detail.datas.getMyScheduleDetail
      const weeks=calendar.datas&&calendar.datas.getTermWeeks
      const first=Array.isArray(weeks)&&weeks.find(w=>Number(w.serialNumber)===1)
      if(!arranged||!Array.isArray(arranged.arrangedList)||!first||!first.startDate)throw new Error('学校课表或校历格式需核对')
      return calc.validate({owner:username,term,firstMonday:String(first.startDate).slice(0,10),syncedAt:new Date().toISOString(),source:'school-account',courses:arranged.arrangedList.map(r=>({name:r.courseName,code:r.courseCode||'',weeks:String(r.week||''),day:Number(r.dayOfWeek),start:r.beginTime,end:r.endTime,startSection:Number(r.beginSection),endSection:Number(r.endSection),room:r.placeName||''}))})
    }finally{this.cookies=[]}
  }
}
module.exports={Session,form,encryptPassword}
