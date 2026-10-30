package com.donut.wx0000000000000000;
public final class DeliveryPolicy {
    public static boolean fresh(long at,long now){return now-at<600000;}
    public static boolean keep(long at,long now,boolean deliver){return at>now||(!deliver&&fresh(at,now));}
    public static long next(long at,long now){return fresh(at,now)?Math.max(at,now+1000):Long.MAX_VALUE;}
}
