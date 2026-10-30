package com.donut.wx0000000000000000;

import android.app.*;
import android.content.*;
import android.os.Build;
import org.json.*;
import java.util.*;

/** All timetable state stays in app-private storage. One alarm at a time. */
public final class ReminderEngine {
    private static final String CHANNEL = "guga_courses_v1";
    private static final String ACTION = "com.donut.wx0000000000000000.ALARM";
    private static android.content.SharedPreferences prefs(Context c) {
        return c.getSharedPreferences("guga_notifications_v1", Context.MODE_PRIVATE);
    }
    private static AlarmManager alarms(Context c) { return (AlarmManager)c.getSystemService(Context.ALARM_SERVICE); }
    private static NotificationManager notifications(Context c) { return (NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE); }
    private static PendingIntent alarmIntent(Context c) {
        return PendingIntent.getBroadcast(c, 27831, new Intent(c, ReminderReceiver.class).setAction(ACTION), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
    static void channel(Context c) {
        if (Build.VERSION.SDK_INT >= 26) notifications(c).createNotificationChannel(new NotificationChannel(CHANNEL, "课程提醒", NotificationManager.IMPORTANCE_DEFAULT));
    }
    static boolean notificationAllowed(Context c) {
        channel(c);
        if (Build.VERSION.SDK_INT >= 33 && c.checkSelfPermission("android.permission.POST_NOTIFICATIONS") != android.content.pm.PackageManager.PERMISSION_GRANTED) return false;
        if (Build.VERSION.SDK_INT >= 24 && !notifications(c).areNotificationsEnabled()) return false;
        return Build.VERSION.SDK_INT < 26 || notifications(c).getNotificationChannel(CHANNEL).getImportance() != NotificationManager.IMPORTANCE_NONE;
    }
    static boolean exactAllowed(Context c) { return Build.VERSION.SDK_INT < 31 || alarms(c).canScheduleExactAlarms(); }
    static JSONArray read(Context c) throws JSONException { return new JSONArray(prefs(c).getString("jobs", "[]")); }
    public static synchronized JSONObject status(Context c) throws JSONException {
        JSONArray jobs = read(c);
        long next = 0;
        for (int i=0; i<jobs.length(); i++) { long at=jobs.getJSONObject(i).getLong("at"); if(at>System.currentTimeMillis() && (next==0||at<next))next=at; }
        return new JSONObject().put("code",0).put("notificationAllowed",notificationAllowed(c)).put("exactAllowed",exactAllowed(c)).put("pending",jobs.length()).put("nextAt",next);
    }
    public static synchronized JSONObject replace(Context c, JSONObject plan) throws Exception {
        if (plan == null || plan.optInt("version") != 1 || !"Asia/Shanghai".equals(plan.optString("zone"))) throw new IllegalArgumentException("提醒计划格式不正确");
        JSONArray source=plan.getJSONArray("jobs"), jobs=new JSONArray();
        if(source.length()>10000)throw new IllegalArgumentException("提醒数量过多");
        Set<String> ids=new HashSet<>();
        long now=System.currentTimeMillis();
        long previous=0;
        for(int i=0;i<source.length();i++){
            JSONObject job=source.getJSONObject(i);
            String id=job.getString("id"),title=job.getString("title"),body=job.getString("body");
            long at=job.getLong("at");
            if(id.length()>200||id.isEmpty()||!ids.add(id)||title.isEmpty()||title.length()>300||body.length()>1000||at<previous||at>now+430L*86400000)throw new IllegalArgumentException("提醒内容或时间不合法");
            previous=at;
            if(at>now)jobs.put(new JSONObject().put("id",id).put("at",at).put("title",title).put("body",body));
        }
        if(jobs.length()>0 && (!notificationAllowed(c)||!exactAllowed(c)))throw new IllegalStateException("请先允许通知和闹钟提醒权限");
        String old=prefs(c).getString("jobs","[]");
        JSONArray previousJobs=new JSONArray(old);
        for(int i=0;i<previousJobs.length();i++){
            JSONObject job=previousJobs.getJSONObject(i);
            if(job.getString("id").startsWith("test:")&&job.getLong("at")>now&&ids.add(job.getString("id")))jobs.put(job);
        }
        jobs=sorted(jobs);
        if(!prefs(c).edit().putString("jobs",jobs.toString()).commit())throw new IllegalStateException("提醒计划保存失败");
        try { schedule(c,jobs); }
        catch(Exception e){prefs(c).edit().putString("jobs",old).commit();try{schedule(c,new JSONArray(old));}catch(Exception ignored){}throw e;}
        return status(c);
    }
    private static JSONArray sorted(JSONArray source) throws JSONException {
        List<JSONObject> list=new ArrayList<>();for(int i=0;i<source.length();i++)list.add(source.getJSONObject(i));
        Collections.sort(list,new Comparator<JSONObject>(){public int compare(JSONObject a,JSONObject b){return Long.compare(a.optLong("at"),b.optLong("at"));}});
        JSONArray result=new JSONArray();for(JSONObject item:list)result.put(item);return result;
    }
    public static synchronized JSONObject scheduleTest(Context c,JSONObject data) throws Exception {
        String kind=data.optString("kind");
        if(!"summary".equals(kind)&&!"course".equals(kind))throw new IllegalArgumentException("测试类型无效");
        JSONArray jobs=read(c);
        JSONObject job=new JSONObject().put("id","test:"+kind+":"+System.currentTimeMillis()).put("at",System.currentTimeMillis()+2000).put("title",data.getString("title")+"（测试）").put("body",data.getString("body"));
        jobs.put(job);
        return replace(c,new JSONObject().put("version",1).put("zone","Asia/Shanghai").put("jobs",sorted(jobs)));
    }
    private static void schedule(Context c, JSONArray jobs) throws JSONException {
        AlarmManager am=alarms(c); PendingIntent pi=alarmIntent(c); am.cancel(pi);
        long now=System.currentTimeMillis(), next=Long.MAX_VALUE;
        for(int i=0;i<jobs.length();i++)next=Math.min(next,DeliveryPolicy.next(jobs.getJSONObject(i).getLong("at"),now));
        if(next==Long.MAX_VALUE)return;
        if(!notificationAllowed(c)||!exactAllowed(c))return;
        if(Build.VERSION.SDK_INT>=23)am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,next,pi);
        else am.setExact(AlarmManager.RTC_WAKEUP,next,pi);
    }
    public static synchronized void cancel(Context c) {
        if(!prefs(c).edit().remove("jobs").commit())throw new IllegalStateException("取消计划失败");
        alarms(c).cancel(alarmIntent(c)); notifications(c).cancelAll();
    }
    static void post(Context c,String id,String title,String body) {
        if(!notificationAllowed(c))throw new IllegalStateException("系统通知权限尚未开启");
        Intent launch=c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
        Notification.Builder b=Build.VERSION.SDK_INT>=26?new Notification.Builder(c,CHANNEL):new Notification.Builder(c);
        b.setSmallIcon(android.R.drawable.ic_dialog_info).setContentTitle(title).setContentText(body).setStyle(new Notification.BigTextStyle().bigText(body)).setAutoCancel(true);
        if(launch!=null)b.setContentIntent(PendingIntent.getActivity(c,0,launch,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));
        notifications(c).notify(id.hashCode(),b.build());
    }
    public static synchronized void receive(Context c, boolean deliver) throws Exception {
        JSONArray saved=read(c), remaining=new JSONArray();long now=System.currentTimeMillis();
        for(int i=0;i<saved.length();i++){
            JSONObject job=saved.getJSONObject(i);long at=job.getLong("at");
            if(DeliveryPolicy.keep(at,now,deliver))remaining.put(job);
            else if(deliver && DeliveryPolicy.fresh(at,now) && notificationAllowed(c))post(c,job.getString("id"),job.getString("title"),job.getString("body"));
        }
        if(!prefs(c).edit().putString("jobs",remaining.toString()).commit())throw new IllegalStateException("提醒状态保存失败");
        schedule(c,remaining);
        android.util.Log.i("GugaReminder","pid="+android.os.Process.myPid()+" alarm="+deliver+" before="+saved.length()+" remaining="+remaining.length());
    }
    static boolean isAlarm(Intent i){return i!=null&&ACTION.equals(i.getAction());}
}
