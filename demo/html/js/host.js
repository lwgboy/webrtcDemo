set("state","0")
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
    
    pc = new RTCPeerConnection(peerCfg);
    pc.onicecandidate = handleIceCandidate;
    pc.onaddstream = handleRemoteStreamAdded;
    pc.oniceconnectionstatechange = function() {
      console.log(pc.iceConnectionState);
      if(pc.iceConnectionState == "connected" ){
        console.log("connected");
      }
      if (pc.iceConnectionState == "disconnected") {
        console.log("Disconnected");
        location.reload();
      }
    };
    pc.addStream(localStream);
    pc.createOffer(setLocal, () => {});
  }

  function setLocal(sessionDescription) {
    pc.setLocalDescription(sessionDescription);
    console.log(sessionDescription);
    set("sessionDescription", sessionDescription, v => {
      console.log("post /kv/candidates:" + v);
    });
     
  }

  var candidates = [];
  function handleIceCandidate(event) {
    if (event.candidate) {
      candidates.push({
        type: "candidate",
        label: event.candidate.sdpMLineIndex,
        id: event.candidate.sdpMid,
        candidate: event.candidate.candidate
      });
    } else {
      set("candidates", candidates, v => {
        console.log("post /kv/candidates:" + v);
      });
      set("state","1");
      wait("state","2",setRemote);
    }
  }

  function setRemote() {
    get("sessionDescription2", message2 => {
      pc.setRemoteDescription(new RTCSessionDescription(message2));
      get("candidates2", candidates => {
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

  function handleRemoteStreamAdded(event) {
    console.log("Remote stream added.");
    remoteStream = event.stream;
    remoteVideo.srcObject = remoteStream;
  }