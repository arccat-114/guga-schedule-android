import com.donut.wx0000000000000000.SchoolTransport;
import org.json.*;
public final class SchoolTransportProbe {
  public static void main(String[] args) throws Exception {
    for(String url:new String[]{"http://sso.bistu.edu.cn/login","https://example.com/","https://sso.bistu.edu.cn:444/"}){
      try{SchoolTransport.request(new JSONObject().put("url",url));throw new AssertionError("Unsafe URL accepted");}catch(IllegalArgumentException expected){}
    }
    JSONObject result=SchoolTransport.request(new JSONObject().put("url","https://sso.bistu.edu.cn/login?service=https%3A%2F%2Fjwxt.bistu.edu.cn%2Fjwapp%2Fsys%2Fyjsrzfwapp%2FbistuLogin%2FcasLogin.do").put("timeout",10000));
    JSONArray cookies=result.getJSONArray("cookies");boolean info=false;
    for(int i=0;i<cookies.length();i++)if(cookies.getString(i).startsWith("COOKIE_INFO="))info=true;
    System.out.println("School HTTPS status="+result.getInt("statusCode")+", cookies="+cookies.length()+", COOKIE_INFO="+info);
    if(!info)throw new AssertionError("Authentication cookie was not returned");
    System.out.println("PASS: native Java HTTPS school entry and host restrictions; desktop JVM only, not Android account login");
  }
}
