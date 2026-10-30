package com.donut.wx0000000000000000;
import android.content.*;
public final class ReminderReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        try { ReminderEngine.receive(context,ReminderEngine.isAlarm(intent)); }
        catch(Exception e){android.util.Log.e("GugaReminder","Unable to restore local reminder",e);}
    }
}
