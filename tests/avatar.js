const assert=require('node:assert/strict')
const fs=require('node:fs')
const vm=require('node:vm')
const path=require('node:path')
const calc=require('../miniprogram/utils/schedule')
const config=require('../miniprogram/config')
const demo=require('../miniprogram/data/demo')
const avatar=require('../miniprogram/utils/avatar')
let page,choose,toast='',canvasFails=false,compressionFails=false,copyFails=false,storageFails=false,deferCopy=false,pendingCopy
const storage={},removed=[],copies=[]
const fileSystem={
  copyFile:o=>{copies.push(o);if(deferCopy){pendingCopy=o;return}if(copyFails)o.fail({errMsg:'permission denied'});else o.success({})},
  unlink:o=>removed.push(o.filePath)
}
const wx={env:{USER_DATA_PATH:'wxfile://usr'},getFileSystemManager:()=>fileSystem,
  getStorageSync:key=>storage[key],setStorageSync:(key,value)=>{if(storageFails)throw new Error('storage full');storage[key]=value},
  removeStorageSync:key=>delete storage[key],chooseImage:o=>choose=o,
  getImageInfo:o=>o.src.includes('bad')?o.fail({errMsg:'unsupported format'}):o.success({type:'png'}),
  compressImage:o=>compressionFails?o.fail({errMsg:'unsupported'}):o.success({tempFilePath:'tmp/compressed.png'}),
  removeSavedFile:o=>removed.push(o.filePath),showToast:o=>toast=o.title,
  canvasToTempFilePath:o=>o.success({tempFilePath:'tmp/converted.jpg'}),
  createSelectorQuery:()=>({in(){return this},select(){return this},fields(){return this},exec(callback){
    callback(canvasFails?[{}]:[{node:{getContext:()=>({fillRect(){},drawImage(){}}),createImage:()=>({width:4000,height:3000,set src(value){if(value.includes('bad'))this.onerror(new Error('bad image'));else this.onload()}})}}])
  }})
}
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../miniprogram/pages/index/index.js'),'utf8'),{require:id=>id.endsWith('/config')?config:id.endsWith('/demo')?demo:id.endsWith('/avatar')?avatar:calc,wx,Page:o=>page=o})
page.setData=function(update){Object.assign(this.data,update)}
const chosen={tempFilePaths:['tmp/photo.tiff'],tempFiles:[{size:40*1024*1024}]}
async function select(res=chosen) {page.chooseAvatar();await choose.success(res)}
async function run(){
  page.onLoad();assert.equal(page.data.avatarPath,'')
  page.chooseAvatar();assert.equal(choose.count,1);assert.equal(choose.sourceType[0],'album')
  const first=choose;page.chooseAvatar();assert.equal(choose,first)
  choose.fail({errMsg:'chooseImage:fail cancel'});assert.equal(page.data.avatarBusy,false);assert.equal(toast,'')
  await select();const firstPath=page.data.avatarPath
  assert.match(firstPath,/wxfile:\/\/usr\/guga-avatar-.*\.jpg$/)
  assert.equal(copies[0].srcPath,'tmp/converted.jpg','大图先转换，取消2MB限制')
  page.setData({avatarPath:''});page.onLoad();assert.equal(page.data.avatarPath,firstPath)
  copyFails=true;await select();assert.equal(page.data.avatarPath,firstPath);assert.match(page.data.avatarError,/头像保存失败/);copyFails=false
  storageFails=true;await select();storageFails=false;assert.equal(page.data.avatarPath,firstPath);assert.match(page.data.avatarError,/storage full/)
  await select({tempFiles:[{path:'tmp/image.webp'}]});assert.notEqual(page.data.avatarPath,firstPath);assert.ok(removed.includes(firstPath))
  canvasFails=true;await select();assert.equal(copies.at(-1).srcPath,'tmp/compressed.png')
  compressionFails=true;await select();assert.equal(copies.at(-1).srcPath,'tmp/photo.tiff')
  const before=page.data.avatarPath;await select({tempFilePaths:['tmp/bad.avif']});assert.equal(page.data.avatarPath,before);assert.match(page.data.avatarError,/格式可能不受微信支持/)
  canvasFails=false;compressionFails=false
  storage['qingyou-own-schedule']={...demo,owner:'用户甲'};page.refresh();assert.equal(page.data.avatarPath,'')
  deferCopy=true;page.chooseAvatar();const selecting=choose.success(chosen)
  while(!pendingCopy)await new Promise(resolve=>setImmediate(resolve))
  storage['qingyou-own-schedule']={...demo,owner:'用户乙'};page.refresh()
  pendingCopy.success({});await selecting;deferCopy=false
  assert.equal(page.data.avatarPath,'','选图时换账号，不显示上一人的头像')
  storage['qingyou-own-schedule']={...demo,owner:'用户甲'};page.refresh();assert.ok(page.data.avatarPath)
  const personal=page.data.avatarPath;page.loadDemo();assert.equal(page.data.avatarPath,'');page.exitDemo();assert.equal(page.data.avatarPath,personal)
  page.avatarLoadError();assert.equal(page.data.avatarPath,'')
  console.log('PASS: large-image conversion, path variants, canvas/native/original fallbacks, cancel and busy lock, detailed errors, failed-save rollback, persistence and account/demo isolation')
}
run().catch(e=>{console.error(e);process.exitCode=1})
