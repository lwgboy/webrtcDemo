var config={
    room:"room1",
    audio:true,
    video:true,
    iceServers: [
        {
            urls: "turn:turnserver:3478",
            username: "username",
            credential: "password"
        },
        {
            urls: ["stun:turnserver:3478"]
        }
    ]

}



var mediaCfg={
    audio: config.audio,
    video: config.video
}
var peerCfg = null;
if(config.iceServers){
    var peerCfg={
        iceServers:config.iceServers
    }
}


var prefix = config.room;
$("#roomLable").text(prefix);
var localVideo = document.querySelector("#localVideo");
var remoteVideo = document.querySelector("#remoteVideo");
function set(key, value, result) {
    var str = encodeURI(JSON.stringify(value));
    $.post("/kv/" + prefix + "_" + key, { value: str }, result);
}

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

var localStream;
var pc;
var remoteStream;

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