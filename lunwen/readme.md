# 基于WebRTC实现音视频对讲

## 摘要

随着互联网时代的到来, 音视频应用已经渐渐普及, 人民已经习惯于使用各类社交APP进行音视频通话, 互联网上也承载着巨大的音视频流量, 而传统的音视频解决方案是一种集中式的解决方案, 如果两个用户需要进行音视频通话,则他们都需要与某一个中心服务器连接, 然后将各自的音视频流量发送给中心服务器, 通过中心服务器来转发音视频流量,如果用户数量较少,这种方式问题不大, 但在当今中国,有数以亿计的互联网用户, 如果这些音视频流量都通过中心服务器转发, 因为通常音视频流量都非常巨大, 所以中心服务器会因为无法承受如此巨大的压力而导致宕机。目前带宽费用也是非常昂贵的, 为中心服务器升级带宽需要给运营商支付天价的带宽费用,这得不偿失,因此人们迫切的需要一种能工作在互联网上的点对点的音视频传输方案,而WebRTC正好提供这种解决方案,WebRTC是一个免费的开放式项目，通过简单的API为浏览器和移动应用程序提供实时通信（RTC）功能。 WebRTC组件已经过优化，可以最好地满足此目的。


## 绪论
因为IP资源有限,所以在国内的互联网环境中, 绝大部分网民上网的方式是通过共享IP上网, 各个设备使用的都是私有网络内的内网IP, 然后通过网关的NAT将内部私有IP转换为共享的公网IP进行通讯, 使用这种网络架构的好处是极大的缓解了IP资源枯竭的问题, 但带来的副作用就是处于不同私有网络的设备无法直接通讯,只能通过某个拥有公网IP的服务器进行中转, 而音视频流量通常都非常巨大, 如果这些流量都通过中心服务器来中转, 势必会导致中心服务器堵塞, 因此,需要研究一种点对点的方案来解决这种问题.

## 目前NAT网络架构下的点对点传输问题

本节介绍本文中使用的基本NAT术语，然后概述了同样适用于TCP和UDP的一般NAT遍历技术。

### NAT技术

特别重要的是会话的概念。 TCP或UDP的会话端点是（IP地址，端口号）对，并且特定会话由其两个会话端点唯一标识。从所涉及的一个主机的角度来看，会话由4元组（本地IP，本地端口，远程IP，远程端口）有效地识别。会话的方向通常是启动会话的数据包的流向：TCP的初始SYN数据包或UDP的第一个用户数据报。

在NAT的各种风格中，最常见的类型是传统或出站NAT，它在专用网络和公共网络之间提供非对称网桥。默认情况下，出站NAT仅允许出站会话遍历NAT：除非NAT将其识别为从专用网络内发起的现有会话的一部分，否则将丢弃传入的数据包。出站NAT与对等协议冲突，因为当希望通信的两个对等体都在两个不同的NAT的“后面”（在专用网络侧）时，无论哪个对等体尝试发起会话，另一个对等体的NAT拒绝它。 NAT遍历需要使P2P会话看起来像两个NAT的“出站”会话。

出站NAT有两个子类型：基本NAT（仅转换IP地址）和网络地址/端口转换（NAPT），它转换整个会话端点。 NAPT，更一般的变种，也变得最常见，因为它使私有网络上的主机能够共享单个公共IP地址的使用。在本文中，我们假设NAPT，尽管我们讨论的原理和技术同样适用于基本NAT（如果有时很简单）。

### 中继


跨NAT的P2P通信最可靠但效率最低的方法就是通过中继使通信看起来像标准客户端/服务器通信一样。假设两个客户端主机A和B各自启动到知名服务器S的TCP或UDP连接，S的全局IP地址18.181.0.31和端口号1234，客户端驻留在单独的专用网络上，并且它们各自的NAT阻止任一客户端直接启动与另一个客户端的连接。两个客户端可以简单地使用服务器S在它们之间中继消息，而不是尝试直接连接。例如，要向客户端B发送消息，客户端A只是将消息沿其已建立的客户端/服务器连接发送到服务器S，服务器S将消息转发给客户端B,使用现有的客户端/服务器连接B。


只要两个客户端都可以连接到服务器，中继始终有效。它的缺点是它消耗了服务器的处理能力和网络带宽，即使服务器连接良好，对等客户端之间的通信延迟也可能增加。然而，由于没有更有效的技术可以在所有现有NAT上可靠地工作，如果需要最大健壮性，中继是一种有用的后退策略。 TURN协议定义了以相对安全的方式实现中继的方法。

### 连接反转

一些P2P应用程序使用简单但有限的技术（称为连接反转）来实现通信，当两个主机都连接到一个众所周知的集合点服务器S并且只有一个对等体在NAT后面时，如图3所示。 如果A想要发起与B的连接，那么直接连接尝试会自动运行，因为B不在NAT后面，A的NAT将连接解释为传出会话。 但是，如果B想要发起与A的连接，则任何直接连接尝试A都会被A的NAT阻止。 B可以通过一个着名的服务器S中继连接请求到A，要求A尝试“反向”连接回B。 尽管这种技术存在明显的局限性，但使用众所周知的会合服务器作为中介来帮助建立直接的点对点连接的核心思想是下一步描述的更通用的打孔技术的基础。


### 位于同一NAT下的通讯

首先考虑两个客户端（可能在不知不觉中）碰巧位于同一NAT后面的简单场景，因此位于同一个私有IP地址域中，如图4所示。客户端A已建立UDP会话 服务器S，公共NAT已为其分配了自己的公共端口号62000.客户端B类似地建立了一个具有S的会话，NAT已为其分配了公共端口号62005。

假设客户端A使用上面概述的打孔技术与B建立UDP会话，使用服务器S作为介绍人。客户A发送S请求连接到B的消息。 S用B的公共和私人端点响应A，并将A的公共和私人端点转发到B。然后，两个客户端都尝试直接在每个端点上相互发送UDP数据报。指向公共端点的消息可能会也可能不会到达目的地，具体取决于NAT是否支持发夹转换，如第3.5节所述。然而，针对私有端点的消息确实到达其目的地，并且由于通过专用网络的这种直接路由可能比通过NAT的间接路由更快，因此客户端最有可能为后续常规选择私有端点。通讯。

通过假设NAT支持发夹转换，应用程序可以省去尝试私有和公共端点的复杂性，代价是使公共NAT后面的本地通信不必要地通过NAT。然而，正如我们在第6节中的结果所示，发夹转换在现有NAT中仍然比其他“P2P友好”NAT行为少得多。因此，就目前而言，应用程序可以通过使用公共和私有端点而大大受益。

### 位于不同NAT下的通讯

假设客户端A和B在不同的NAT后面有私有IP地址，如图5所示。A和B每个都从服务器S的本地端口4321到端口1234发起UDP通信会话。 在处理这些出站会话时，NAT A已在其自己的公共IP地址155.99.25.11处分配端口62000，以使用A与S的会话，并且NAT B已在此处分配端口31000 它的IP地址，138.76.29.7，到B的S会话。

在A的S注册消息中，A将其私有端点报告为S 10.0.0.1:4321，其中10.0.0.1是其自己专用网络上的A IP地址。 S记录A报告的私有端点，以及S本身观察到的A公共端点。在这种情况下，A的公共端点是155.99.25.11:62000，NAT由分配给会话的临时端点。类似地，当客户端B注册时，S将B的私有端点记录为10.1.1.3:4321，将B的公共端点记录为138.76.29.7:31000。

现在客户端A遵循上述的打孔程序，直接与B建立UDP通信会话。首先，A向S发送请求消息，要求帮助连接B。作为回应，S将B的公共和私人终端点发送到A，并将A的公共和私人终端点发送到B。 A和B各自开始尝试将UDP数据报直接发送到每个端点。

由于A和B位于不同的专用网络上，并且它们各自的私有IP地址不可全局路由，因此发送到这些端点的消息将到达错误的主机或根本没有主机。因为许多NAT也充当DHCP服务器，从默认情况下通常由NAT供应商确定的私有地址池以相当确定的方式分发IP地址，实际上很可能是A的消息针对B的私有端点将到达A私有网络上的某个（不正确的）主机，该私有网络恰好具有与B相同的私有IP地址。因此，应用程序必须以某种方式验证所有消息，以便有效地过滤掉这些杂散流量。例如，消息可能包括特定于应用程序的名称或加密令牌，或者至少是通过S预先安排的随机nonce。

现在考虑将A的第一条消息发送到B的公共端点，如图5所示。当此出站消息通过A的NAT时，此NAT注意到这是第一个UDP数据包。新的传出会话。新会话的源端点（10.0.0.1:4321）与A和S之间的现有会话的端点相同，但其目标端点不同。如果NAT A表现良好，它会保留A私有端点的标识，始终将所有出站会话从私有源端点10.0.0.1:4321转换为相应的公共源端点155.99.25.11:62000。 A首先向B的公共端点发送消息，实际上，在A的NAT中为端点识别的新UDP会话“打了一个洞”（10.0.0.1：4341,138.76） .29.7：31000）在A的私人网络上，以及主要互联网上的端点（155.99.25.11:62000,138.76.29.7:31000）。

如果B的B的公共端点的消息在B的$ $ $的第一条消息已超过B自己的NAT之前达到B的NAT，那么B's NAT可能将A的入站消息解释为未经请求的传入流量并将其丢弃。然而，B向A的公共地址发送的第一条消息同样在B的NAT中打开了一个漏洞，用于端点识别的新UDP会话（10.1.1.3:4321,155.99.25.11： 62000）在B的私人网络上，以及在互联网上的端点（138.76.29.7：31000,155.99.25.11:62000）。一旦来自A和B的第一条消息越过各自的NAT，每个方向的漏洞都会打开，UDP通信可以正常进行。一旦客户端验证了公共端点的工作，他们就可以停止向备用私有端点发送消息。

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
