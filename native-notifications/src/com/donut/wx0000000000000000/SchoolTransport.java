package com.donut.wx0000000000000000;

import org.json.*;
import java.net.*;
import java.io.*;
import java.util.*;

/** HTTPS only, school hosts only, no persistent cookie jar, no automatic redirects. */
public final class SchoolTransport {
    public static JSONObject request(JSONObject data) throws Exception {
        URL url=new URL(data.getString("url"));
        if(!"https".equals(url.getProtocol())||url.getUserInfo()!=null||(url.getPort()!=-1&&url.getPort()!=443)||!("sso.bistu.edu.cn".equals(url.getHost())||"jwxt.bistu.edu.cn".equals(url.getHost())))throw new IllegalArgumentException("不支持的学校认证地址");
        String method=data.optString("method","GET");
        if(!method.equals("GET")&&!method.equals("POST"))throw new IllegalArgumentException("不支持的请求方式");
        int timeout=Math.max(1000,Math.min(15000,data.optInt("timeout",15000)));
        javax.net.ssl.HttpsURLConnection connection=(javax.net.ssl.HttpsURLConnection)url.openConnection();
        try{
            connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(timeout);connection.setReadTimeout(timeout);
            connection.setUseCaches(false);connection.setRequestMethod(method);
            JSONObject headers=data.optJSONObject("header");
            if(headers!=null)for(String key:new String[]{"Cookie","Content-Type"}){
                String value=headers.optString(key,"");
                if(value.indexOf('\r')>=0||value.indexOf('\n')>=0)throw new IllegalArgumentException("请求头格式错误");
                connection.setRequestProperty(key,value);
            }
            connection.setRequestProperty("Accept-Encoding","identity");
            if(method.equals("POST")){
                byte[] body=data.optString("body","").getBytes("UTF-8");
                if(body.length>262144)throw new IllegalArgumentException("请求内容过大");
                connection.setDoOutput(true);connection.setFixedLengthStreamingMode(body.length);
                try(OutputStream out=connection.getOutputStream()){out.write(body);}finally{Arrays.fill(body,(byte)0);}
            }
            int status=connection.getResponseCode();JSONObject resultHeaders=new JSONObject();JSONArray cookies=new JSONArray();
            for(Map.Entry<String,List<String>> entry:connection.getHeaderFields().entrySet()){
                if(entry.getKey()==null)continue;
                if("set-cookie".equalsIgnoreCase(entry.getKey()))for(String value:entry.getValue())cookies.put(value);
                else if("location".equalsIgnoreCase(entry.getKey())||"content-type".equalsIgnoreCase(entry.getKey()))resultHeaders.put(entry.getKey().toLowerCase(Locale.ROOT),entry.getValue().get(0));
            }
            InputStream stream=status>=400?connection.getErrorStream():connection.getInputStream();
            ByteArrayOutputStream buffer=new ByteArrayOutputStream();
            if(stream!=null)try(InputStream in=stream){byte[] bytes=new byte[8192];int count;while((count=in.read(bytes))!=-1){if(buffer.size()+count>3*1024*1024)throw new IOException("学校响应过大");buffer.write(bytes,0,count);}}
            return new JSONObject().put("code",0).put("statusCode",status).put("header",resultHeaders).put("cookies",cookies).put("data",buffer.toString("UTF-8"));
        }finally{connection.disconnect();}
    }
}
