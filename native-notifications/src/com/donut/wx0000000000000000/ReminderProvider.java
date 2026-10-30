package com.donut.wx0000000000000000;
import android.content.*;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import org.json.JSONObject;

/** Same-UID IPC: all persisted reminder operations execute in the main process. */
public final class ReminderProvider extends ContentProvider {
    public boolean onCreate(){try{ReminderEngine.receive(getContext(),false);}catch(Exception e){android.util.Log.e("GugaReminder","Restore failed",e);}return true;}
    public Bundle call(String method,String arg,Bundle extras){
        JSONObject result;
        try{
            JSONObject data=arg==null?new JSONObject():new JSONObject(arg);
            if("replacePlan".equals(method))result=ReminderEngine.replace(getContext(),data);
            else if("scheduleTest".equals(method))result=ReminderEngine.scheduleTest(getContext(),data);
            else if("cancelAll".equals(method)){ReminderEngine.cancel(getContext());result=ReminderEngine.status(getContext());}
            else if("getStatus".equals(method))result=ReminderEngine.status(getContext());
            else if("testNow".equals(method)){
                String title=data.optString("title","咕嘎课程表"),body=data.optString("body","测试通知已送达");
                if(title.isEmpty()||title.length()>300||body.length()>1000)throw new IllegalArgumentException("测试提醒内容无效");
                ReminderEngine.post(getContext(),"test:"+data.optString("kind","generic"),title,body);
                result=ReminderEngine.status(getContext());
            }else throw new IllegalArgumentException("不支持的提醒操作");
        }catch(Exception e){result=new JSONObject();try{result.put("code",-1).put("message",e.getMessage()==null?"提醒操作失败":e.getMessage());}catch(Exception ignored){}}
        Bundle out=new Bundle();out.putString("result",result.toString());return out;
    }
    static JSONObject dispatch(Context c,String method,JSONObject data) throws Exception {
        Bundle out=c.getContentResolver().call(Uri.parse("content://"+c.getPackageName()+".guga.reminders"),method,data==null?null:data.toString(),null);
        if(out==null||out.getString("result")==null)throw new IllegalStateException("提醒服务未响应");
        return new JSONObject(out.getString("result"));
    }
    public Cursor query(Uri u,String[] p,String s,String[] a,String o){throw new UnsupportedOperationException();}
    public String getType(Uri u){return null;}
    public Uri insert(Uri u,ContentValues v){throw new UnsupportedOperationException();}
    public int update(Uri u,ContentValues v,String s,String[] a){throw new UnsupportedOperationException();}
    public int delete(Uri u,String s,String[] a){throw new UnsupportedOperationException();}
}
