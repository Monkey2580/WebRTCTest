/**
 * Socket.io socket
 */
let socket;
let ssSocket;
let ssSocketId;
/**
 * The stream object used to send media
 */
let localStream = null;
let ssStream = null;
/**
 * All peer connections
 */
let peers = {}

// redirect if not https
if(location.href.substr(0,5) !== 'https') 
    location.href = 'https' + location.href.substr(4, location.href.length - 4)


//////////// CONFIGURATION //////////////////

/**
 * RTCPeerConnection configuration 
 */
const configuration = {
    "iceServers": [{
            "urls": "stun:stun.l.google.com:19302"
        },
        // public turn server from https://gist.github.com/sagivo/3a4b2f2c7ac6e1b5267c2f1f59ac6c6b
        // set your own servers here
        {
            url: 'turn:newturn.mooo.com',
            credential: 'keren',
            username: 'sulianto'
        }
    ]
}

/**
 * UserMedia constraints
 */
let constraints = {
    audio: true,
    video: true
    /*{
        width: {
            max: 300
        },
        height: {
            max: 300
        }
    }*/
}

/////////////////////////////////////////////////////////

constraints.video.facingMode = {
    ideal: "user"
}

// enabling the camera at startup
navigator.mediaDevices.getUserMedia(constraints).then(stream => {
    console.log('Received local stream');

    localVideo.srcObject = stream;
    localStream = stream;

    init()

}).catch(e => alert(`getusermedia error ${e.name}`))

/**
 * initialize the socket connections
 */
function init() {
    socket = io()

    socket.on('initReceive', socket_id => {
        console.log('INIT RECEIVE ' + socket_id)
        addPeer(socket_id, false)

        socket.emit('initSend', socket_id)
    })

    socket.on('initSend', socket_id => {
        console.log('INIT SEND ' + socket_id)
        addPeer(socket_id, true)
    })

    socket.on('removePeer', socket_id => {
        console.log('removing peer ' + socket_id)
        removePeer(socket_id)
    })

    socket.on('disconnect', () => {
        console.log('GOT DISCONNECTED')
        for (let socket_id in peers) {
            removePeer(socket_id)
        }
    })

    socket.on('signal', data => {
        peers[data.socket_id].signal(data.signal)
    })
}

/**
 * Remove a peer with given socket_id. 
 * Removes the video element and deletes the connection
 * @param {String} socket_id 
 */
function removePeer(socket_id) {

    let videoEl;
    if(ssSocketId===socket_id)
        videoEl = document.getElementById('sharescreen')
    else
        videoEl = document.getElementById(socket_id)

    if (videoEl) {

        const tracks = videoEl.srcObject.getTracks();

        tracks.forEach(function (track) {
            track.stop()
        })

        videoEl.srcObject = null
        if(ssSocketId!==socket_id && ssSocketId!==null)
        {
            videoEl.parentNode.removeChild(videoEl)
            ssButton.style.display = "block";
            shareOn.style.display = "none";
            shareOff.style.display = "block";
        }
        else
            ssStream = null;
    }
    if (peers[socket_id]) peers[socket_id].destroy()
    delete peers[socket_id]
}

/**
 * Creates a new peer connection and sets the event listeners
 * @param {String} socket_id 
 *                 ID of the peer
 * @param {Boolean} am_initiator 
 *                  Set to true if the peer initiates the connection process.
 *                  Set to false if the peer receives the connection. 
 */
function addPeer(socket_id, am_initiator) {
    if(ssStream!==null && am_initiator===true) 
        ssSocketId=socket_id;

    peers[socket_id] = new SimplePeer({
        initiator: am_initiator,
        stream: (ssStream !== null ? ssStream : localStream),
        config: configuration
    })

    peers[socket_id].on('signal', data => {
        socket.emit('signal', {
            signal: data,
            socket_id: socket_id
        })
    })

    peers[socket_id].on('stream', stream => {
        //console.log('newvid stream');
        //console.log(stream.getTracks());
        let ss = false;
        let hitung = 0;
        //console(stream.getTracks().length);
        for (let index in stream.getTracks()) hitung = hitung+1;
        if(hitung === 1) ss = true;

        //console.log(hitung);
        //console.log(ss);

        if(ss===false)
        {
            let newVid = document.createElement('video')
            newVid.srcObject = stream
            newVid.id = socket_id
            newVid.playsinline = false
            newVid.autoplay = true
            newVid.className = "vid"
            newVid.onclick = () => openPictureMode(newVid)
            newVid.ontouchstart = (e) => openPictureMode(newVid)
            videos.appendChild(newVid)
        }
        else if(am_initiator===false)
        {
            sharescreen.srcObject = stream
            sharescreen.playsinline = false
            sharescreen.autoplay = true
            ssSocketId = socket_id
            ssStream = stream
            ssButton.style.display = "none";
            shareOn.style.display = "none";
            shareOff.style.display = "none";
        }
    })
}

/**
 * Opens an element in Picture-in-Picture mode
 * @param {HTMLVideoElement} el video element to put in pip mode
 */
function openPictureMode(el) {
    console.log('opening pip')
    el.requestPictureInPicture()
}

/**
 * Switches the camera between user and environment. It will just enable the camera 2 cameras not supported.
 */
/*function switchMedia() {
    if (constraints.video.facingMode.ideal === 'user') {
        constraints.video.facingMode.ideal = 'environment'
    } else {
        constraints.video.facingMode.ideal = 'user'
    }

    const tracks = localStream.getTracks();

    tracks.forEach(function (track) {
        track.stop()
    })

    localVideo.srcObject = null
    navigator.mediaDevices.getUserMedia(constraints).then(stream => {

        for (let socket_id in peers) {
            for (let index in peers[socket_id].streams[0].getTracks()) {
                for (let index2 in stream.getTracks()) {
                    if (peers[socket_id].streams[0].getTracks()[index].kind === stream.getTracks()[index2].kind) {
                        peers[socket_id].replaceTrack(
                            peers[socket_id].streams[0].getTracks()[index], 
                            stream.getTracks()[index2], 
                            peers[socket_id].streams[0]
                        )
                        break;
                    }
                }
            }
        }

        localStream = stream
        localVideo.srcObject = stream

        updateButtons()
    })
}*/

/**
 * Enable screen share
 */
function setScreen() {
    navigator.mediaDevices.getDisplayMedia().then(stream => {        
        ssStream = stream;
        sharescreen.srcObject = ssStream
        sharescreen.playsinline = false
        sharescreen.autoplay = true
        init();
        shareOn.style.display = "block";
        shareOff.style.display = "none";
    })
}

function stopShare(){
    sharescreen.srcObject = null;
    
    const tracks = ssStream.getTracks();

    tracks.forEach(function (track) {
        track.stop()
    })

    ssStream = null;
    shareOn.style.display = "none";
    shareOff.style.display = "block";
}

/**
 * Disables and removes the local stream and all the connections to other peers.
 */
function removeLocalStream() {
    if (localStream) {
        const tracks = localStream.getTracks();

        tracks.forEach(function (track) {
            track.stop()
        })

        localVideo.srcObject = null
    }

    for (let socket_id in peers) {
        removePeer(socket_id)
    }
}

/**
 * Enable/disable microphone
 */
 function toggleMute() {
    for (let index in localStream.getAudioTracks()) {
        localStream.getAudioTracks()[index].enabled = !localStream.getAudioTracks()[index].enabled
        //muteButton.innerText = localStream.getAudioTracks()[index].enabled ? "Unmuted" : "Muted"
        if(localStream.getAudioTracks()[index].enabled)
        {
            document.getElementById('micOn').style.display = "block";
            document.getElementById('micOff').style.display = "none";
        }
        else
        {
            document.getElementById('micOn').style.display = "none";
            document.getElementById('micOff').style.display = "block";
        }
    }
}
/**
 * Enable/disable video
 */
function toggleVid() {
    for (let index in localStream.getVideoTracks()) {
        localStream.getVideoTracks()[index].enabled = !localStream.getVideoTracks()[index].enabled
        //vidButton.innerText = localStream.getVideoTracks()[index].enabled ? "Video Enabled" : "Video Disabled"
        if(localStream.getVideoTracks()[index].enabled)
        {
            document.getElementById('vidOn').style.display = "block";
            document.getElementById('vidOff').style.display = "none";
        }
        else
        {
            document.getElementById('vidOn').style.display = "none";
            document.getElementById('vidOff').style.display = "block";
        }
    }
}

/**
 * updating text of buttons
 */
 function updateButtons() {
    for (let index in localStream.getVideoTracks()) {
        //vidButton.innerText = localStream.getVideoTracks()[index].enabled ? "Video Enabled" : "Video Disabled"
        if(localStream.getVideoTracks()[index].enabled)
        {
            document.getElementById('vidOn').style.display = "block";
            document.getElementById('vidOff').style.display = "none";
        }
        else
        {
            document.getElementById('vidOn').style.display = "none";
            document.getElementById('vidOff').style.display = "block";
        }
    }
    for (let index in localStream.getAudioTracks()) {
        //muteButton.innerText = localStream.getAudioTracks()[index].enabled ? "Unmuted" : "Muted"
        if(localStream.getAudioTracks()[index].enabled)
        {
            document.getElementById('micOn').style.display = "block";
            document.getElementById('micOff').style.display = "none";
        }
        else
        {
            document.getElementById('micOn').style.display = "none";
            document.getElementById('micOff').style.display = "block";
        }
    }
}
