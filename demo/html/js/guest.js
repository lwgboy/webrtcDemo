navigator.mediaDevices
  .getUserMedia(mediaCfg)
  .then(gotStream)
  .catch(function(e) {
    alert("getUserMedia() error: " + e.name);
  });

  function gotStream(stream) {
    console.log("Adding local stream.");   
    localStream = stream;
    localVideo.srcObject = stream;
    wait("state","1",answer);
    
    
  }

  function answer(){
    pc = new RTCPeerConnection(peerCfg);
    pc.onicecandidate = handleIceCandidate;
    pc.onaddstream = handleRemoteStreamAdded;
    pc.addStream(localStream);
    get("sessionDescription", message2 => {
        pc.setRemoteDescription(new RTCSessionDescription(message2));
        pc.createAnswer().then(setLocal, () => {});
        get("candidates", candidates => {
          candidates.forEach(c => {
            var candidate = new RTCIceCandidate({
              sdpMLineIndex: c.label,
              candidate: c.candidate
            });
            pc.addIceCandidate(candidate);
          });
        });
      });
  }

  function setLocal(sessionDescription) {
    pc.setLocalDescription(sessionDescription);
    console.log(sessionDescription);
    set("sessionDescription2", sessionDescription, v => {
      console.log("post /kv/candidates:" + v);
    });
  }

  function handleRemoteStreamAdded(event) {
    console.log("Remote stream added.");
    remoteStream = event.stream;
    remoteVideo.srcObject = remoteStream;
  }

  var candidates = [];
  function handleIceCandidate(event) {
    if (event.candidate) {
      candidates.push({
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate
          });
  
    } else {
        
      set("candidates2",candidates,(v)=>{
          console.log("post /kv/candidates2:" + v);
          set("state","2");
      });
  
   
    }
  }