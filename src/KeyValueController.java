package io.xuqi.webrtc;

import org.springframework.web.bind.annotation.*;

import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping(value = "/kv")
public class KeyValueController {
    ConcurrentHashMap<String,String> map = new ConcurrentHashMap<>();

    @GetMapping(value = "/{key}")
    String get(@PathVariable String key){
        return map.get(key);
    }
    @RequestMapping(value = "/{key}", method = RequestMethod.POST)
    public String put(@PathVariable String key,
                              @RequestParam(value = "value") String value) throws UnsupportedEncodingException {

        System.out.println(key + ":" +  URLDecoder.decode(value,"utf-8"));
        map.put(key,value);
        return value;
    }

}
