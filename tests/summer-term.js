const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm')
const calc=require('../miniprogram/utils/schedule')
let page
const wx={getStorageSync(){},setStorageSync(){},removeStorageSync(){}}
vm.runInNewContext(fs.readFileSync(require.resolve('../miniprogram/pages/index/index'),'utf8'),{
  require:id=>id.endsWith('/schedule')?{...calc,dateString:()=> '2026-10-08'}:id.endsWith('/demo')?require('../miniprogram/data/demo'):{},
  wx,Page:value=>page=value,Date,Array,Number,Object
})
page.setData=update=>Object.assign(page.data,update)
page.onLoad()
assert.equal(page.data.academicTerm,'2026-2027-1')
assert.ok(page.data.terms.includes('2025-2026-3'))
assert.ok(page.data.terms.includes('2026-2027-3'))
page.pickTerm({detail:{value:5}})
assert.equal(page.data.academicTerm,'2025-2026-3')
console.log('PASS: Android summer term selection and unchanged default; network authentication mocked separately')
