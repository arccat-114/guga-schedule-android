import com.donut.wx0000000000000000.DeliveryPolicy;
public final class DeliveryPolicyTest {
    static void check(boolean value){if(!value)throw new AssertionError();}
    public static void main(String[] args){
        long now=1000000;
        check(DeliveryPolicy.keep(now,now,false));
        check(!DeliveryPolicy.keep(now,now,true));
        check(DeliveryPolicy.fresh(now-599999,now));
        check(!DeliveryPolicy.keep(now-600000,now,false));
        check(DeliveryPolicy.keep(now+2000,now,true));
        check(DeliveryPolicy.next(now,now)==now+1000);
        check(DeliveryPolicy.next(now+2000,now)==now+2000);
        check(DeliveryPolicy.next(now-600000,now)==Long.MAX_VALUE);
        System.out.println("PASS: startup preserves due jobs; alarm consumes due jobs; expired jobs excluded; due jobs rescheduled rather than dropped. Policy only, not Android IPC delivery.");
    }
}
