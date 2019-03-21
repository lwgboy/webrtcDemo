## 基于WebRTC的音视频对讲Demo

### 环境准备
* 浏览器:较新版本的Chrome
* 支持HTTPS的网页服务器,建议使用Nginx反向代理


### 工作流程
为了避免不必要的复杂度, 这里将通讯双方区分为主机和客机, 主机访问host.html,客机访问guest.html

#### 主机工作流程
* 获取本地音视频,在本地显示
* 创建RTCPeerConnection,并监听onicecandidate和onaddstream
* 将本地流加入到RTCPeerConnection中,并createOffer
* createOffer成功后,设置RTCPeerConnection的本地描述符,并将本地描述符提交给kv存储
* onicecandidate 监听到candidates列表后,将该信息提交给kv存储,并报告kv存储主机网络已经就绪,并开始等待客户机网络就绪
* 当确认客户机网络就绪后,从kv存储中去除客户机的描述符和andidates列表,并设置在RTCPeerConnection上
* onaddstream 监听到事件后,表示客户机的流已经到位, 将客户机的流显示在本地

#### 客机工作流程
* 获取本地音视频,在本地显示
* 等待主机的网络就位
* 当主机网络就位后,创建RTCPeerConnection,并监听onicecandidate和onaddstream
* 将本地流加入到RTCPeerConnection中
* 从kv存储中获取主机的candidates和流描述符,设置到RTCPeerConnection中
* 调用RTCPeerConnection的createAnswer
* createAnswer成功后,设置RTCPeerConnection的本地描述符,并将本地描述符提交给kv存储
* onicecandidate监听到candidates列表后,将该信息提交给kv存储,并报告kv存储客机网络已经就绪
* onaddstream 监听到事件后,表示主机的流已经到位, 将主机的流显示在本地


