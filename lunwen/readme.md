# 基于WebRTC实现音视频对讲

## 摘要

随着互联网时代的到来, 音视频应用已经渐渐普及, 人民已经习惯于使用各类社交APP进行音视频通话, 互联网上也承载着巨大的音视频流量, 而传统的音视频解决方案是一种集中式的解决方案, 如果两个用户需要进行音视频通话,则他们都需要与某一个中心服务器连接, 然后将各自的音视频流量发送给中心服务器, 通过中心服务器来转发音视频流量,如果用户数量较少,这种方式问题不大, 但在当今中国,有数以亿计的互联网用户, 如果这些音视频流量都通过中心服务器转发, 因为通常音视频流量都非常巨大, 所以中心服务器会因为无法承受如此巨大的压力而导致宕机。目前带宽费用也是非常昂贵的, 为中心服务器升级带宽需要给运营商支付天价的带宽费用,这得不偿失,因此人们迫切的需要一种能工作在互联网上的点对点的音视频传输方案,而WebRTC正好提供这种解决方案,WebRTC是一个免费的开放式项目，通过简单的API为浏览器和移动应用程序提供实时通信（RTC）功能。 WebRTC组件已经过优化，可以最好地满足此目的。


## 绪论
因为IP资源有限,所以在国内的互联网环境中, 绝大部分网民上网的方式是通过共享IP上网, 各个设备使用的都是私有网络内的内网IP, 然后通过网关的NAT将内部私有IP转换为共享的公网IP进行通讯, 使用这种网络架构的好处是极大的缓解了IP资源枯竭的问题, 但带来的副作用就是处于不同私有网络的设备无法直接通讯,只能通过某个拥有公网IP的服务器进行中转, 而音视频流量通常都非常巨大, 如果这些流量都通过中心服务器来中转, 势必会导致中心服务器堵塞, 因此,需要研究一种点对点的方案来解决这种问题.

## WebRTC架构

网络的最后一个主要挑战是通过语音和视频进行人工通信：实时通信，简称RTC。 RTC在Web应用程序中应该像在文本输入中输入文本一样自然。没有它，我们在创新和开发人们互动的新方式方面的能力有限。

从历史上看，RTC一直是企业和复杂的，需要昂贵的音频和视频技术才能在内部获得许可或开发。将RTC技术与现有内容，数据和服务集成起来非常困难且耗时，尤其是在Web上。

WebRTC实现了实时，无插件视频，音频和数据通信的开放标准。需要是真实的：

许多Web服务使用RTC，但需要下载，本机应用程序或插件。其中包括Skype，Facebook和Google Hangouts。
下载，安装和更新插件很复杂，容易出错并且很烦人。
插件很难部署，调试，故障排除，测试和维护，并且可能需要许可并与复杂，昂贵的技术集成。通常很难说服人们首先安装插件！
WebRTC项目的指导原则是其API应该是开源的，免费的，标准化的，内置于​​Web浏览器中并且比现有技术更有效。

WebRTC为Web应用程序开发人员提供了在Web上编写丰富的实时多媒体应用程序（思考视频聊天）的能力，而无需插件，下载或安装。 它的目的是帮助构建一个强大的RTC平台，该平台可跨多个平台跨多个Web浏览器工作。

* Web API

第三方开发人员用于开发基于Web的视频聊天应用程序的API 

* WebRTC Native C++ API

一个API层，使浏览器制造商能够轻松实现Web API。

* Transport / Session

会话组件是通过重用libjingle中的组件构建的，无需使用或需要xmpp / jingle协议。

* RTP Stack

RTP的网络堆栈，即实时协议。

* STUN/ICE

允许调用使用STUN和ICE机制在各种类型的网络之间建立连接的组件。

* Session Management

抽象的会话层，允许呼叫建立和管理层。 这将协议实现决策留给应用程序开发人员。

## 实现基于WebRTC的基本环境准备

首先需要准备比较现代的浏览器,比如Chrome, 然后需要一个支持HTTPS的网页服务器, 建议使用Nginx反向代理, 接着需要设计一个简单的通讯机制, 可以让用户间传递控制信号, 浏览器使用一个简单的服务端key-value接口来交互数据.

* key-value实现

使用springboot实现一个简单的kv存储即可

```java

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

```

* 浏览器调用key-value接口

浏览器使用js来访问kv存储, 除了读写数据外,还加入了一个wait函数,用于等待特定数据就位

```javascript
//为key添加一个前缀, 可以支持每个房间都有独立的key-value空间
var prefix = config.room;

//设置数据
function set(key, value, result) {
    var str = encodeURI(JSON.stringify(value));
    $.post("/kv/" + prefix + "_" + key, { value: str }, result);
}

//读取数据
function get(key, result) {
    $.get(
        "/kv/" + prefix + "_" + key,
        null,
        r1 => {
            result(JSON.parse(decodeURI(r1)));
        },
        "text"
    );
};

//等待指定数据就位
function wait(key,value,callback){
    var timer = setInterval(()=>{
        get(key,(v)=>{
            if(v == value){
                clearInterval(timer);
                callback();
            }
        })
    },1000);
}

```

## 工作流程

为了避免不必要的复杂度, 这里将通讯双方区分为主机和客机, 主机访问host.html,客机访问guest.html

### 主机工作流程
* 获取本地音视频,在本地显示
* 创建RTCPeerConnection,并监听onicecandidate和onaddstream
* 将本地流加入到RTCPeerConnection中,并createOffer
* createOffer成功后,设置RTCPeerConnection的本地描述符,并将本地描述符提交给kv存储
* onicecandidate 监听到candidates列表后,将该信息提交给kv存储,并报告kv存储主机网络已经就绪,并开始等待客户机网络就绪
* 当确认客户机网络就绪后,从kv存储中去除客户机的描述符和andidates列表,并设置在RTCPeerConnection上
* onaddstream 监听到事件后,表示客户机的流已经到位, 将客户机的流显示在本地

### 客机工作流程
* 获取本地音视频,在本地显示
* 等待主机的网络就位
* 当主机网络就位后,创建RTCPeerConnection,并监听onicecandidate和onaddstream
* 将本地流加入到RTCPeerConnection中
* 从kv存储中获取主机的candidates和流描述符,设置到RTCPeerConnection中
* 调用RTCPeerConnection的createAnswer
* createAnswer成功后,设置RTCPeerConnection的本地描述符,并将本地描述符提交给kv存储
* onicecandidate监听到candidates列表后,将该信息提交给kv存储,并报告kv存储客机网络已经就绪
* onaddstream 监听到事件后,表示主机的流已经到位, 将主机的流显示在本地

### Turn服务
如果主机和客机处于同一个局域网,那么不需要额外的服务即可通讯, 否则的话,就有可能需要服务器来中转


下面是一段启动脚本
```
#!/bin/bash
export MIN_PORT=50000
export MAX_PORT=51000
sudo docker run \
  -d \
  -p 3478:3478 \
  -p 3478:3478/udp \
  -p ${MIN_PORT}-${MAX_PORT}:${MIN_PORT}-${MAX_PORT}/udp \
  -e USERNAME=username \
  -e PASSWORD=password \
  -e MIN_PORT=${MIN_PORT} \
  -e MAX_PORT=${MAX_PORT} \
  --restart=always \
  --name coturn \
  --volume /etc/pki/nginx/cert.pem:/etc/ssl/turn_server_cert.pem \
  --volume /etc/pki/nginx/key.pem:/etc/ssl/turn_server_pkey.pem \
  coturn

```

### 视频主机和客户机
用户通过分别访问主机页面和客户机页面来建立连接, 这些页面由两个video标签组成, 分别用于播放本地的视频和对方的音视频.

下面是主机的HTML主要代码:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>对讲主机</title>
</head>
<body>
    <h1>对讲主机:<span id="roomLable"></span></h1>
    <div id="videos">
            <video id="remoteVideo" autoplay ></video>
            <video id="localVideo" autoplay muted></video>
    </div>

    <script src="js/adapter-latest.js"></script>
    <script src="js/jquery.min.js"></script>
    <script src="js/common.js"></script>
    <script src="js/host.js"></script> 
</body>
</html>

```

下面是客户机的HTML主要代码:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>对讲(从机)</title>
</head>
<body>
        <h1>对讲从机:<span id="keylable"></span></h1>
        <div id="videos">
                <video id="remoteVideo" autoplay ></video>
                <video id="localVideo" autoplay muted></video>
        </div>

        <script src="js/adapter-latest.js"></script>
        <script src="js/jquery.min.js"></script>
        <script src="js/common.js"></script>
        <script src="js/guest.js"></script>
</body>
</html>

```


## 结论
  通过WebRTC可以实现点对点的去插件化的音视频通讯, 这不但能避免中心服务器的堵塞, 也能避免巨额的带宽费用, 同时也能大幅增加音视频通讯的实时性,是一个很实用的技术.
  

## 致谢
感谢刘老师

## 参考文献
* WebRTC: https://webrtc.org
