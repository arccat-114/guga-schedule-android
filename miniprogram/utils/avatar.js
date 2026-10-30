function call(fn,args,stage) {
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error(stage+'超时，请重试')),15000)
    const finish=(callback,value)=>{clearTimeout(timer);callback(value)}
    try { fn(Object.assign({},args,{success:r=>finish(resolve,r),fail:e=>finish(reject,new Error(stage+'失败：'+(e.errMsg || '未知错误')))})) }
    catch(e) { finish(reject,new Error(stage+'失败：'+e.message)) }
  })
}
function render(wx,page,path) {
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('图片转换超时')),15000)
    const fail=error=>{clearTimeout(timer);reject(error instanceof Error?error:new Error('当前设备无法解码这张图片'))}
    try {
      wx.createSelectorQuery().in(page).select('#avatarCanvas').fields({node:true}).exec(res=>{
        try {
          const canvas=res[0] && res[0].node
          if(!canvas) {fail(new Error('图片转换画布不可用'));return}
          canvas.width=512;canvas.height=512
          const context=canvas.getContext('2d')
          const image=canvas.createImage()
          image.onerror=fail
          image.onload=()=>{
            try {
              if(!image.width || !image.height) throw new Error('图片尺寸无法读取')
              context.fillStyle='#ffffff';context.fillRect(0,0,512,512)
              const scale=Math.max(512/image.width,512/image.height)
              const width=image.width*scale,height=image.height*scale
              context.drawImage(image,(512-width)/2,(512-height)/2,width,height)
              wx.canvasToTempFilePath({canvas,fileType:'jpg',quality:0.75,width:512,height:512,destWidth:512,destHeight:512,
                success:r=>{clearTimeout(timer);resolve({path:r.tempFilePath,extension:'jpg'})},fail},page)
            } catch(e) {fail(e)}
          }
          image.src=path
        } catch(e) {fail(e)}
      })
    } catch(e) {fail(e)}
  })
}
async function prepare(wx,page,path) {
  try {return await render(wx,page,path)} catch (_) {}
  // 某些设备不支持 Canvas 解码，继续尝试原生压缩和原图。
  try {
    const compressed=await call(wx.compressImage,{src:path,quality:70,compressedWidth:512},'图片压缩')
    const info=await call(wx.getImageInfo,{src:compressed.tempFilePath},'图片读取')
    return {path:compressed.tempFilePath,extension:extension(info.type)}
  } catch (_) {}
  const info=await call(wx.getImageInfo,{src:path},'图片读取（格式可能不受微信支持）')
  return {path,extension:extension(info.type)}
}
function extension(type) {
  const value=String(type || '').toLowerCase().replace('jpeg','jpg')
  return ['jpg','png','gif','webp','bmp','heic','heif','tiff'].includes(value)?value:'png'
}
function remove(wx,path) {
  if(!path) return
  const prefix=wx.env.USER_DATA_PATH+'/guga-avatar-'
  if(path.startsWith(prefix)) wx.getFileSystemManager().unlink({filePath:path,fail(){}})
  else if(typeof wx.removeSavedFile==='function') wx.removeSavedFile({filePath:path,fail(){}})
}
async function importImage(wx,page,path,key) {
  const image=await prepare(wx,page,path)
  const destination=wx.env.USER_DATA_PATH+'/guga-avatar-'+Date.now()+'-'+Math.random().toString(36).slice(2,10)+'.'+image.extension
  const fs=wx.getFileSystemManager()
  const previous=wx.getStorageSync(key)
  try {
    await call(fs.copyFile.bind(fs),{srcPath:image.path,destPath:destination},'头像保存')
    // 先确认持久文件可读取，再替换旧头像。
    await call(wx.getImageInfo,{src:destination},'已保存图片验证')
    wx.setStorageSync(key,destination)
  } catch(error) { remove(wx,destination);throw error }
  remove(wx,previous)
  return destination
}
module.exports={importImage}
