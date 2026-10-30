const assert=require('node:assert/strict')
const crypto=require('node:crypto')
const {Session,encryptPassword}=require('../miniprogram/utils/school-client')
const {sm2}=require('../miniprogram/node_modules/sm-crypto')
const base64=require('../miniprogram/node_modules/base64-js')
const pair=sm2.generateKeyPairHex()
const key=base64.fromByteArray(Uint8Array.from(pair.publicKey.match(/../g),h=>parseInt(h,16)))
const requests=[]
const api={getRandomValues(o){const a=Uint8Array.from(crypto.randomBytes(o.length));o.success({randomValues:a.buffer})},request(o){
  requests.push(o)
  let data={},cookies=[]
  if(o.url.includes('/login?service=')){data='school';cookies=['COOKIE_INFO='+encodeURIComponent(JSON.stringify({data:{flowKey:'test-flow'}}))+'; Path=/; Secure','PRIVATE_SSO=value; Path=/']}
  else if(o.url.endsWith('/info-query'))data={code:160004,data:{captcha:null,mfa:null}}
  else if(o.url.endsWith('/api/reset/rules'))data={data:{encrypt:{publicKey:key}}}
  else if(o.url.endsWith('/username-password/login')){
    assert.equal(sm2.doDecrypt(Buffer.from(o.data.password,'base64').toString('hex'),pair.privateKey,1),'DummyPassword123!')
    data={code:666666,data:{service:'https://jwxt.bistu.edu.cn/cas'}}
  }else if(o.url.endsWith('/cas')){assert.doesNotMatch(o.header.Cookie,/PRIVATE_SSO/);cookies=['JW_SESSION=ok; Path=/'];data='ok'}
  else if(o.url.endsWith('/getMyScheduleDetail.do')){
    assert.match(o.header.Cookie,/JW_SESSION=ok/);assert.match(o.data,/XNXQDM=2025-2026-3/)
    data={code:0,datas:{getMyScheduleDetail:{arrangedList:[{courseName:'夏季课程',week:'11',dayOfWeek:1,beginTime:'08:00',endTime:'09:35',beginSection:1,endSection:2,placeName:'测试教室'}]}}}
  }else if(o.url.endsWith('/getTermWeeks.do'))data={code:0,datas:{getTermWeeks:[{serialNumber:1,startDate:'2026-07-06'}]}}
  else throw new Error('unexpected URL')
  o.success({statusCode:200,data:typeof data==='string'?data:JSON.stringify(data),cookies})
}}
;(async()=>{
  const session=new Session(api)
  const model=await session.login('9999999999','DummyPassword123!','2025-2026-3')
  assert.equal(model.courses.length,1);assert.equal(model.firstMonday,'2026-07-06');assert.equal(model.term,'2025-2026-3')
  assert.equal(session.cookies.length,0,'凭据会话不保留')
  assert.equal(requests.length,7)
  const count=requests.length
  await assert.rejects(new Session(api).request('https://example.com'),/未支持/)
  await assert.rejects(new Session(api).request('http://sso.bistu.edu.cn'),/未支持/)
  await assert.rejects(new Session(api).login('9999999999','dummy','2025-2026-4'),/检查/)
  assert.equal(requests.length,count)
  await assert.rejects(encryptPassword({},'dummy',pair.publicKey),/安全随机数/)
  const denied={...api,request:o=>o.success({statusCode:403,data:''})}
  await assert.rejects(new Session(denied).login('9999999999','dummy','2025-2026-3'),/HTTP 403/)
  const failed=new Session({...api,request:o=>o.success({statusCode:200,data:'login page'})})
  await assert.rejects(failed.login('9999999999','dummy','2025-2026-3'),/Cookie/)
  assert.equal(failed.cookies.length,0)
  let rootRedirects=0
  const redirectApi={...api,request(o){
    if(o.url.includes('/login?service='))return api.request({...o,success:r=>o.success({...r,statusCode:302,header:{Location:'https://sso.bistu.edu.cn?continue=1'}})})
    if(o.url==='https://sso.bistu.edu.cn?continue=1'){rootRedirects++;assert.match(o.header.Cookie,/COOKIE_INFO=/);return o.success({statusCode:200,data:'school',cookies:[]})}
    return api.request(o)
  }}
  assert.equal((await new Session(redirectApi).login('9999999999','DummyPassword123!','2025-2026-3')).courses.length,1)
  assert.equal(rootRedirects,1,'root-domain query redirect accepted')
  for(const bad of ['https://sso.bistu.edu.cn.evil.test/','https://sso.bistu.edu.cn@evil.test/','https://sso.bistu.edu.cn:444/'])await assert.rejects(new Session(api).request(bad),/未支持/)
  let nativeCalls=0
  global.wx={miniapp:{loadNativePlugin({success}){success({schoolRequest(data,callback){
    nativeCalls++
    api.request({...data,data:data.method==='POST'&&data.header['Content-Type']==='application/json'?JSON.parse(data.body):data.body||undefined,success:r=>callback({...r,code:0})})
  }})}}}
  const androidApi={getSystemInfoSync:()=>({platform:'android'}),getRandomValues:api.getRandomValues,request(){throw new Error('Android must not use wx.request')}}
  const androidSession=new Session(androidApi)
  const androidModel=await androidSession.login('9999999999','DummyPassword123!','2025-2026-3')
  assert.equal(androidModel.courses.length,1);assert.equal(nativeCalls,7);assert.equal(androidSession.cookies.length,0)
  console.log('PASS: Android school client mock authentication, SM2 interoperability, cookie host isolation, summer calendar, unsafe-host rejection, credential cleanup, no shared cloud calls; not real-account verification')
})().catch(e=>{console.error(e);process.exitCode=1})
