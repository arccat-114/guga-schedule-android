package com.donut.wx0000000000000000;
import android.app.Application;
import com.tencent.luggage.wxa.SaaA.plugin.NativePluginApplicationInterface;
public final class GugaNotificationApplication implements NativePluginApplicationInterface {
    public String getPluginID(){return "wx0000000000000000";}
    public void onCreate(Application app){} // Provider initializes the single main-process reminder store.
}
