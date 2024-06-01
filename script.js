const PRE = "DELTA";
const SUF = "MEET";
var room_id;
var localStream;
var remoteStream;
var peer = null;
var currentPeer = null;
var mediaRecorder;
var recordedChunks = [];
var dataConnection;

// Function to generate a random session code
function generateSessionCode() {
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var code = '';
    for (var i = 0; i < 5; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
}

// Function to create a new room
function createRoom() {
    let room = generateSessionCode();
    document.getElementById('sessionCode').innerHTML = "Session Code: " + room;
    room_id = PRE + room + SUF;
    peer = new Peer(room_id);
    
    // Establishing a WebRTC connection
    peer.on('open', (id) => {
        console.log("Peer Connected with ID: ", id);
        notify("Waiting for peer to join.");
    });

    // When a call is received, set up the connection and display "CONNECTED"
    peer.on('call', (call) => {
        console.log("Received call from peer");
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
            localStream = stream;
            setLocalStream(localStream);
            call.answer(stream);
            call.on('stream', (remoteStream) => {
                setRemoteStream(remoteStream);
                document.getElementById('sessionCode').innerHTML = "CONNECTED";
            });
            currentPeer = call;
        }).catch((err) => {
            console.log(err);
            alert("Error accessing media devices.");
        });
    });

    peer.on('connection', (conn) => {
        dataConnection = conn;
        dataConnection.on('data', (data) => {
            handleReceivedData(data);
        });
    });

    // Add the provided event listeners for video player interactions here
    // Event listener for double-tap to seek forward/backward
    let lastTapTime = 0;
    const DOUBLE_TAP_THRESHOLD = 300; // in milliseconds
    document.getElementById("video-container").addEventListener("click", function(event) {
        let currentTime = new Date().getTime();
        if (currentTime - lastTapTime < DOUBLE_TAP_THRESHOLD) {
            // Double-tap detected
            let video = document.getElementById("remoteVideo");
            let rect = video.getBoundingClientRect();
            let seekTime = event.clientX < rect.left + rect.width / 2 ? video.currentTime - 10 : video.currentTime + 10;
            video.currentTime = Math.max(0, Math.min(video.duration, seekTime));
        }
        lastTapTime = currentTime;
    });

    // Event listener for single-tap to pause/play
    document.getElementById("remoteVideo").addEventListener("click", function() {
        let video = document.getElementById("remoteVideo");
        video.paused ? video.play() : video.pause();
    });

    // Event listener for triple-tap to perform actions
    let tripleTapCount = 0;
    const TRIPLE_TAP_THRESHOLD = 300; // in milliseconds
    document.getElementById("video-container").addEventListener("click", function(event) {
        let currentTime = new Date().getTime();
        if (currentTime - lastTapTime < TRIPLE_TAP_THRESHOLD) {
            // Triple-tap detected
            tripleTapCount++;
            if (tripleTapCount === 3) {
                let video = document.getElementById("remoteVideo");
                if (event.clientX < window.innerWidth / 3) {
                    // Triple-tap on left side
                    // Show comment section or perform desired action
                    alert("Show comment section");
                } else if (event.clientX > window.innerWidth * 2 / 3) {
                    // Triple-tap on right side
                    // Close the website or perform desired action
                    window.close();
                } else {
                    // Triple-tap in the middle
                    // Move to the next video or perform desired action
                    alert("Move to next video");
                }
                tripleTapCount = 0; // Reset triple-tap count
            }
        } else {
            tripleTapCount = 1; // Reset triple-tap count
        }
        lastTapTime = currentTime;
    });

    // Event listener for single tap on top right corner to show current location and temperature
    document.getElementById("top-right-corner").addEventListener("click", function() {
        // Fetch current location and temperature and display as a popup notification
        alert("Current Location: XYZ, Temperature: 25°C");
    });

    // Event listeners to change playback speed when holding right/left side
    let playbackInterval;
    document.getElementById("video-container").addEventListener("mousedown", function(event) {
        let video = document.getElementById("remoteVideo");
        if (event.clientX > window.innerWidth * 2 / 3) {
            // Right side clicked
            playbackInterval = setInterval(function() {
                video.playbackRate = 2;
            }, 100);
        } else if (event.clientX < window.innerWidth / 3) {
            // Left side clicked
            playbackInterval = setInterval(function() {
                video.playbackRate = 0.5;
            }, 100);
        }
    });

    // Clear playback speed change interval on mouseup
    document.addEventListener("mouseup", function() {
        clearInterval(playbackInterval);
    });
}

// Function to join an existing room
function joinRoom() {
    let sessionCode = prompt('PASTE SESSION CODE HERE');
    if (!sessionCode) {
        alert("Please enter room number");
        return;
    }
    room_id = PRE + sessionCode + SUF;
    peer = new Peer();
    peer.on('open', (id) => {
        console.log("Connected with Id: " + id);
        document.getElementById('sessionCode').innerHTML = "CONNECTED";
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
            localStream = stream;
            setLocalStream(localStream);
            let call = peer.call(room_id, stream);
            call.on('stream', (stream) => {
                setRemoteStream(stream);
            });
            currentPeer = call;
        }).catch((err) => {
            console.log(err);
            alert("Error accessing media devices.");
        });

        dataConnection = peer.connect(room_id);
        dataConnection.on('data', (data) => {
            handleReceivedData(data);
        });
    });
}

// Function to handle received data
function handleReceivedData(data) {
    if (typeof data === 'string' && data.startsWith('YT_LINK:')) {
        var ytLink = data.split('YT_LINK:')[1];
        var videoId = getYouTubeVideoId(ytLink);
        if (videoId) {
            checkYouTubeEmbeddable(videoId);
        } else {
            document.getElementById('youtubeVideo').innerHTML = "Invalid YouTube link.";
        }
    }
}

// Function to set the local video stream
function setLocalStream(stream) {
    let video = document.getElementById("localVideo");
    video.srcObject = stream;
    video.muted = true; // Ensure local video is muted to prevent echo
    video.play();
    enableButtons();
}

// Function to set the remote video stream
function setRemoteStream(stream) {
    remoteStream = stream;
    let video = document.getElementById("remoteVideo");
    video.srcObject = stream;
    video.play();
}

// Function to enable control buttons
function enableButtons() {
    document.getElementById('turnOnVideo').disabled = false;
    document.getElementById('startAudio').disabled = false;
    document.getElementById('recordSession').disabled = false;
}

// Function to show notifications
function notify(msg) {
    let notification = document.getElementById("notification");
    notification.innerHTML = msg;
    notification.hidden = false;
    setTimeout(() => {
        notification.hidden = true;
    }, 3000);
}

// Function to start recording the session
async function startRecording() {
    try {
        // Capture the screen
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });

        // Combine the screen stream with any local audio (e.g., from a microphone)
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const combinedStream = new MediaStream([...screenStream.getTracks(), ...audioStream.getTracks()]);

        mediaRecorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm;codecs=vp8' });

        mediaRecorder.ondataavailable = function(event) {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
                console.log("Data available:", event.data.size); // Debugging statement
            }
        };

        mediaRecorder.onstop = function() {
            console.log("Stopping recording"); // Debugging statement
            let blob = new Blob(recordedChunks, { type: 'video/webm' });
            let url = URL.createObjectURL(blob);

            // Create a download link and click it to download the recorded video
            let downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = 'recorded_session.webm';
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);

            console.log("Blob created and download link clicked"); // Debugging statement
        };

        mediaRecorder.start();
        console.log("Recording started");

        // Stop the recording when the screen stream ends (e.g., when the user stops sharing)
        screenStream.getVideoTracks()[0].onended = () => stopRecording();
    } catch (err) {
        console.error("Error starting screen recording:", err);
        alert("Error starting screen recording: " + err.message);
    }
}

// Function to stop recording the session
function stopRecording() {
    if (mediaRecorder) {
        mediaRecorder.stop();
        console.log("Recording stopped");
    }
}

// Event listener for starting the recording
document.getElementById('recordSession').addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        stopRecording();
        document.getElementById('recordSession').textContent = 'Record Session';
    } else {
        startRecording();
        document.getElementById('recordSession').textContent = 'Stop Recording';
    }
});

// Event listener for creating a room
document.getElementById('createSessionBtn').addEventListener('click', createRoom);

// Event listener for joining a room
document.getElementById('joinSessionBtn').addEventListener('click', joinRoom);

// Event listener for loading a YouTube video
document.getElementById('loadVideoBtn').addEventListener('click', function() {
    var ytLink = document.getElementById('ytLinkInput').value;
    if (ytLink) {
        alert("YouTube Link: " + ytLink);  // Show alert with the YouTube link
        var videoId = getYouTubeVideoId(ytLink);
        if (videoId) {
            checkYouTubeEmbeddable(videoId);
            sendYouTubeLink(ytLink);
        } else {
            document.getElementById('youtubeVideo').innerHTML = "Invalid YouTube link.";
        }
    }
});

// Function to get the YouTube video ID from the URL
function getYouTubeVideoId(url) {
    var videoId = null;
    var urlObj = new URL(url);
    if (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') {
        videoId = urlObj.searchParams.get('v');
    } else if (urlObj.hostname === 'youtu.be') {
        videoId = urlObj.pathname.slice(1);
    }
    return videoId;
}

// Function to check if the YouTube video is embeddable
function checkYouTubeEmbeddable(videoId) {
    var oEmbedUrl = `https://www.youtube.com/oembed?url=http://www.youtube.com/watch?v=${videoId}&format=json`;

    fetch(oEmbedUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data) {
                var embedLink = `https://www.youtube.com/embed/${videoId}`;
                var iframe = document.createElement('iframe');
                iframe.width = "100%";
                iframe.height = "100%";
                iframe.src = embedLink;
                iframe.frameBorder = "0";
                iframe.allowFullscreen = true;
                document.getElementById('youtubeVideo').innerHTML = '';
                document.getElementById('youtubeVideo').appendChild(iframe);
            } else {
                document.getElementById('youtubeVideo').innerHTML = "Video unavailable. Please check the link or video settings.";
            }
        })
        .catch(error => {
            document.getElementById('youtubeVideo').innerHTML = "Error: Failed to fetch video data. Please try again later.";
            console.error('There has been a problem with your fetch operation:', error);
        });
}

// Function to send YouTube link to the peer
function sendYouTubeLink(ytLink) {
    if (dataConnection && dataConnection.open) {
        dataConnection.send('YT_LINK:' + ytLink);
    } else {
        console.error("Data connection not available.");
    }
}
// Event listener for double-tap to seek forward/backward
document.getElementById("video-container").addEventListener("click", function(event) {
    // Double-tap logic here
});

// Event listener for single-tap to pause/play
document.getElementById("remoteVideo").addEventListener("click", function() {
    // Single-tap logic here
});

// Event listener for triple-tap to perform actions
document.getElementById("video-container").addEventListener("click", function(event) {
    // Triple-tap logic here
});

// Event listener for single tap on top right corner to show current location and temperature
document.getElementById("top-right-corner").addEventListener("click", function() {
    // Single tap logic here
});

// Event listeners to change playback speed when holding right/left side
document.getElementById("video-container").addEventListener("mousedown", function(event) {
    // Playback speed change logic here
});
// Event listener for double-tap to seek forward/backward
document.getElementById("video-container").addEventListener("click", function(event) {
    // Double-tap logic here
});

// Event listener for triple-tap to perform actions
document.getElementById("video-container").addEventListener("click", function(event) {
    // Triple-tap logic here
});
// Event listener for double-tap to seek forward/backward
document.getElementById("video-container").addEventListener("click", function(event) {
    let currentTime = new Date().getTime();
    if (currentTime - lastTapTime < DOUBLE_TAP_THRESHOLD) {
        // Double-tap detected
        let video = document.getElementById("remoteVideo");
        let rect = video.getBoundingClientRect();
        let seekTime = event.clientX < rect.left + rect.width / 2 ? video.currentTime - 10 : video.currentTime + 10;
        video.currentTime = Math.max(0, Math.min(video.duration, seekTime));
    }
    lastTapTime = currentTime;
});

// Event listener for single-tap to pause/play
document.getElementById("remoteVideo").addEventListener("click", function() {
    let video = document.getElementById("remoteVideo");
    video.paused ? video.play() : video.pause();
});

// Event listener for triple-tap to perform actions
let tripleTapCount = 0;
const TRIPLE_TAP_THRESHOLD = 300; // in milliseconds
document.getElementById("video-container").addEventListener("click", function(event) {
    let currentTime = new Date().getTime();
    if (currentTime - lastTapTime < TRIPLE_TAP_THRESHOLD) {
        // Triple-tap detected
        tripleTapCount++;
        if (tripleTapCount === 3) {
            let video = document.getElementById("remoteVideo");
            if (event.clientX < window.innerWidth / 3) {
                // Triple-tap on left side
                // Show comment section or perform desired action
                alert("Show comment section");
            } else if (event.clientX > window.innerWidth * 2 / 3) {
                // Triple-tap on right side
                // Close the website or perform desired action
                window.close();
            } else {
                // Triple-tap in the middle
                // Move to the next video or perform desired action
                alert("Move to next video");
            }
            tripleTapCount = 0; // Reset triple-tap count
        }
    } else {
        tripleTapCount = 1; // Reset triple-tap count
    }
    lastTapTime = currentTime;
});

// Event listener for single tap on top right corner to show current location and temperature
document.getElementById("top-right-corner").addEventListener("click", function() {
    // Fetch current location and temperature and display as a popup notification
    alert("Current Location: XYZ, Temperature: 25°C");
});

// Event listeners to change playback speed when holding right/left side
let playbackInterval;
document.getElementById("video-container").addEventListener("mousedown", function(event) {
    let video = document.getElementById("remoteVideo");
    if (event.clientX > window.innerWidth * 2 / 3) {
        // Right side clicked
        playbackInterval = setInterval(function() {
            video.playbackRate = 2;
        }, 100);
    } else if (event.clientX < window.innerWidth / 3) {
        // Left side clicked
        playbackInterval = setInterval(function() {
            video.playbackRate = 0.5;
        }, 100);
    }
});

// Clear playback speed change interval on mouseup
document.addEventListener("mouseup", function() {
    clearInterval(playbackInterval);
});
