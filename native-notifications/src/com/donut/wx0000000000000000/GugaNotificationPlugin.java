package com.donut.wx0000000000000000;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import org.json.JSONObject;
import kotlin.Unit;
import kotlin.jvm.functions.Function1;
import com.tencent.luggage.wxa.SaaA.plugin.*;
import com.tencent.luggage.util.LuggageActivityHelper;

public final class GugaNotificationPlugin extends NativePluginBase {
    @AsyncJsApi(methodName="schoolRequest")
    public void schoolRequest(final JSONObject data,final Function1<Object,Unit> cb,final Activity activity){
        new Thread(new Runnable(){public void run(){
            JSONObject response;
            try{response=SchoolTransport.request(data);}catch(Exception e){response=new JSONObject();try{response.put("code",-1).put("message","学校HTTPS请求失败（"+e.getClass().getSimpleName()+"）");}catch(Exception ignored){}}
            final JSONObject value=response;
            activity.runOnUiThread(new Runnable(){public void run(){cb.invoke(value);}});
        }},"guga-school-https").start();
    }
    public String getPluginID(){return "wx0000000000000000";}
    private void error(Function1<Object,Unit> cb,Exception e){try{cb.invoke(new JSONObject().put("code",-1).put("message",e.getMessage()==null?"系统提醒操作失败":e.getMessage()));}catch(Exception ignored){}}
    @AsyncJsApi(methodName="getStatus")
    public void getStatus(JSONObject data,Function1<Object,Unit> cb,Activity activity){try{cb.invoke(ReminderProvider.dispatch(activity,"getStatus",data));}catch(Exception e){error(cb,e);}}
    @AsyncJsApi(methodName="replacePlan")
    public void replacePlan(JSONObject data,Function1<Object,Unit> cb,Activity activity){try{cb.invoke(ReminderProvider.dispatch(activity,"replacePlan",data));}catch(Exception e){error(cb,e);}}
    @AsyncJsApi(methodName="cancelAll")
    public void cancelAll(JSONObject data,Function1<Object,Unit> cb,Activity activity){try{cb.invoke(ReminderProvider.dispatch(activity,"cancelAll",data));}catch(Exception e){error(cb,e);}}
    @AsyncJsApi(methodName="testNow")
    public void testNow(JSONObject data,Function1<Object,Unit> cb,Activity activity){try{cb.invoke(ReminderProvider.dispatch(activity,"testNow",data));}catch(Exception e){error(cb,e);}}
    @AsyncJsApi(methodName="scheduleTest")
    public void scheduleTest(JSONObject data,Function1<Object,Unit> cb,Activity activity){try{cb.invoke(ReminderProvider.dispatch(activity,"scheduleTest",data));}catch(Exception e){error(cb,e);}}
    @AsyncJsApi(methodName="requestPermissions")
    public void requestPermissions(JSONObject data,final Function1<Object,Unit> cb,final Activity activity){
        activity.runOnUiThread(new Runnable(){public void run(){try{
            if(Build.VERSION.SDK_INT>=33 && activity.checkSelfPermission("android.permission.POST_NOTIFICATIONS")!=android.content.pm.PackageManager.PERMISSION_GRANTED){
                requestPermission(activity,new String[]{"android.permission.POST_NOTIFICATIONS"},new LuggageActivityHelper.PermissionResultCallback(){public void onResult(String[] permissions,int[] results){getStatus(null,cb,activity);}});
            }else if(!ReminderEngine.notificationAllowed(activity)){
                Intent i=Build.VERSION.SDK_INT>=26?new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,activity.getPackageName()):new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,Uri.parse("package:"+activity.getPackageName()));activity.startActivity(i);getStatus(null,cb,activity);
            }else if(!ReminderEngine.exactAllowed(activity) && Build.VERSION.SDK_INT>=31){
                activity.startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,Uri.parse("package:"+activity.getPackageName())));getStatus(null,cb,activity);
            }else getStatus(null,cb,activity);
        }catch(Exception e){error(cb,e);}}});
    }
}
