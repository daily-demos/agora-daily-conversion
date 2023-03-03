/*
 *  These procedures use Daily's Client SDK for JavaScript to enable local and remote
 *  users to join and leave a video call room managed by Daily.
 */

/*
 *  Create an {@link https://docs.agora.io/en/Video/API%20Reference/web_ng/interfaces/iagorartcclient.html|AgoraRTCClient} instance.
 *
 * @param {string} mode - The {@link https://docs.agora.io/en/Voice/API%20Reference/web_ng/interfaces/clientconfig.html#mode| streaming algorithm} used by Agora SDK.
 * @param  {string} codec - The {@link https://docs.agora.io/en/Voice/API%20Reference/web_ng/interfaces/clientconfig.html#codec| client codec} used by the browser.
 */

var client;

/*
 * Clear the video and audio tracks used by `client` on initiation.
 */
var localTracks = {
  videoTrack: null,
  audioTrack: null
};

/*
 * On initiation. `client` is not attached to any project or channel for any specific user.
 */
var options = {
  appid: null,
  channel: null,
  uid: null,
  token: null
};

// you can find all the agora preset video profiles here https://docs.agora.io/en/Voice/API%20Reference/web_ng/globals.html#videoencoderconfigurationpreset
var videoProfiles = [{
  label: "360p_7",
  detail: "480×360, 15fps, 320Kbps",
  value: { 
    kbs: 320, 
    trackConstraints: { 
      width: 480,
      height: 360,
      frameRate: 15,
    } 
  }
}, {
  label: "360p_8",
  detail: "480×360, 30fps, 490Kbps",
  value: { 
    kbs: 490, 
    trackConstraints: { 
      width: 480,
      height: 360,
      frameRate: 30,
    } 
  }
}, {
  label: "480p_1",
  detail: "640×480, 15fps, 500Kbps",
  value: { 
    kbs: 500, 
    trackConstraints: { 
      width: 480,
      height: 370,
      frameRate: 15,
    } 
  }
}, {
  label: "480p_2",
  detail: "640×480, 30fps, 1000Kbps",
  value: { 
    kbs: 1000, 
    trackConstraints: { 
      width: 640,
      height: 480,
      frameRate: 30,
    } 
  }
}, {
  label: "720p_1",
  detail: "1280×720, 15fps, 1130Kbps",
  value: { 
    kbs: 1130, 
    trackConstraints: { 
      width: 1280,
      height: 720,
      frameRate: 15,
    } 
  }
}, {
  label: "720p_2",
  detail: "1280×720, 30fps, 2000Kbps",
  value: { 
    kbs: 2000, 
    trackConstraints: { 
      width: 1280,
      height: 720,
      frameRate: 30,
    } 
  }
}, {
  label: "1080p_1",
  detail: "1920×1080, 15fps, 2080Kbps",
  value: { 
    kbs: 2080, 
    trackConstraints: { 
      width: 1920,
      height: 1080,
      frameRate: 15,
    } 
  }
}, {
  label: "1080p_2",
  detail: "1920×1080, 30fps, 3000Kbps",
  value: { 
    kbs: 3000, 
    trackConstraints: { 
      width: 1920,
      height: 1080,
      frameRate: 30,
    } 
  }
}];

var curVideoProfile;

let mics = []
let cams = []


async function initDevices() {
  const meetingState = client.meetingState();
  if (meetingState !== "joined-meeting" && meetingState !== "joining-meeting") {
    client.preAuth();
    client.startCamera();
  }
  
  // Get mics
  client.enumerateDevices().then(devices => {
    updateDeviceSelection(devices);
  })

  // Set up device change listener
  navigator.mediaDevices.addEventListener('devicechange', () => {
    client.enumerateDevices().then(devices => {
      updateDeviceSelection(devices);
    })
  });
}

function updateDeviceSelection(devices) {
  const d = devices.devices;

  // Reset device list
  mics = [];
  cams = [];
  for (let i = 0; i < d.length; i += 1){
    const device = d[i];
    const kind = device.kind;
    if (kind === "audioinput") {
      mics.push(device);
    } else if (kind === "videoinput") {
      cams.push(device);
    }
  }
  $(".mic-list").empty();
  mics.forEach(mic => {
    $(".mic-list").append(`<a class="dropdown-item" href="#">${mic.label}</a>`);
  });

  // get cameras
  $(".cam-list").empty();
  cams.forEach(cam => {
    $(".cam-list").append(`<a class="dropdown-item" href="#">${cam.label}</a>`);
  });
}
async function switchCamera(label) {
  currentCam = cams.find(cam => cam.label === label);
  $(".cam-input").val(currentCam.label);
  // switch device of local video track.
  client.setInputDevicesAsync({
    videoSource: currentCam.deviceId,  
  });
}
async function switchMicrophone(label) {
  currentMic = mics.find(mic => mic.label === label);
  $(".mic-input").val(currentMic.label);
  // switch device of local audio track.
  client.setInputDevicesAsync({
    audioSource: currentMic.deviceId,  
  });
}
function initVideoProfiles() {
  videoProfiles.forEach(profile => {
    $(".profile-list").append(`<a class="dropdown-item" label="${profile.label}" href="#">${profile.label}: ${profile.detail}</a>`);
  });
  curVideoProfile = videoProfiles.find(item => item.label == '480p_1');
  $(".profile-input").val(`${curVideoProfile.detail}`);
}
async function changeVideoProfile(label) {
  curVideoProfile = videoProfiles.find(profile => profile.label === label);
  $(".profile-input").val(`${curVideoProfile.detail}`);
  // change the local video track`s encoder configuration
  client.setBandwidth(curVideoProfile.value);
}

/*
 * When this page is called with parameters in the URL, this procedure
 * attempts to join a Video Call channel using those parameters.
 */
$(() => {
  if (!client) {
    client = DailyIframe.createCallObject( {
      subscribeToTracksAutomatically: false,
    });
      // Add an event listener to play remote tracks when remote user publishes.
    client
      .on("joined-meeting", () => {
        client.setBandwidth(curVideoProfile.value);
      })
      .on("participant-joined", (ev) => {
        handleUserPublished(ev.participant.session_id);
      })
      .on("participant-left", (ev) => {
        handleUserUnpublished(ev.participant.session_id);
      })
      .on("track-stopped", (ev) => {
        const p = ev.participant;
        if (!p) return;
        const track = ev.track;
        if (track.kind === "video") {
          removeVideoTrack(p.session_id, track, p.local);
        }
      })
      .on("track-started", (ev) => {
        const meetingState = client.meetingState();
        const p = ev.participant;
        const track = ev.track;
        const kind = track.kind;
        const label = track.label;
        if (kind === "audio") {
          $(".mic-input").val(label);
        } else if (kind === "video") {
          $(".cam-input").val(label);
        }

        // Only show media if already in the call
        if (meetingState === "joined-meeting" || meetingState === "joining-meeting") {
          updateMedia(p.session_id, track, p.local);
        }
      });
  }

  initVideoProfiles();
  $(".profile-list").delegate("a", "click", function (e) {
    changeVideoProfile(this.getAttribute("label"));
  });
  var urlParams = new URL(location.href).searchParams;
  options.roomurl = urlParams.get("roomurl");
  options.channel = urlParams.get("channel");
  options.token = urlParams.get("token");
  options.uname = urlParams.get("uname");
  if (options.roomurl) {
    $("#uname").val(options.uname);
    $("#roomurl").val(options.roomurl);
    $("#token").val(options.token);
    $("#join-form").submit();
  }
});

/*
 * When a user clicks Join or Leave in the HTML form, this procedure gathers the information
 * entered in the form and calls join asynchronously. The UI is updated to match the options entered
 * by the user.
 */
$("#join-form").submit(async function (e) {
  e.preventDefault();
  $("#join").attr("disabled", true);
  try {
    options.uname = $("#uname").val();
    options.roomurl = $("#roomurl").val();
    options.token = $("#token").val();

    await join();
    if (options.token) {
      $("#success-alert-with-token").css("display", "block");
    } else {
      $("#success-alert a").attr("href", `index.html?roomurl=${options.roomurl}`);
      $("#success-alert").css("display", "block");
    }
  } catch (error) {
    console.error(error);
  } finally {
    $("#leave").attr("disabled", false);
  }
});

/*
 * Called when a user clicks Leave in order to exit a channel.
 */
$("#leave").click(function (e) {
  leave();
});
$('#agora-collapse').on('show.bs.collapse	', function () {
  initDevices();
});
$(".cam-list").delegate("a", "click", function (e) {
  switchCamera(this.text);
});
$(".mic-list").delegate("a", "click", function (e) {
  switchMicrophone(this.text);
});

/*
 * Join a channel, then create local video and audio tracks and publish them to the channel.
 */
async function join() {
  const hook = getModifySdpHook(getCodec());
  const joinOptions = {
    url: options.roomurl,
    startAudioOff: false,
    startVideoOff: false,
    userName: "No name",
    dailyConfig: {
      modifyLocalSdpHook: hook,
    }
  }

  const userName = options.uname;
  if (userName) {
    joinOptions.userName = userName;
  }
  const token = options.token;
  if (token) {
    joinOptions.token = token;
  }
  
  // Join the channel.
  client.join(joinOptions);
  /*if (!localTracks.audioTrack) {
    localTracks.audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
      encoderConfig: "music_standard"
    });
  }
  if (!localTracks.videoTrack) {
    localTracks.videoTrack = await AgoraRTC.createCameraVideoTrack({
      encoderConfig: curVideoProfile.value
    });
  }

  // Play the local video track to the local browser and update the UI with the user ID.
  localTracks.videoTrack.play("local-player"); */
  $("#local-player-name").text(`localVideo(${options.uname})`); 
  $("#joined-setup").css("display", "flex");
}

/*
 * Stop all local and remote tracks then leave the channel.
 */
async function leave() {
  /* for (trackName in localTracks) {
    var track = localTracks[trackName];
    if (track) {
      track.stop();
      track.close();
      localTracks[trackName] = undefined;
    }
  } */

  // Remove remote users and player views.
  $("#remote-playerlist").html("");

  // leave the channel
  await client.leave();
  const container = getPlayerContainer(-1, true);
  const mediaEle = getMediaEle(container, "video");
  mediaEle.srcObject = null;

  $("#local-player-name").text("");
  $("#join").attr("disabled", false);
  $("#leave").attr("disabled", true);
  $("#joined-setup").css("display", "none");
  console.log("client leaves channel success");
}

/*
 * Add the local use to a remote channel.
 *
 * @param  {IAgoraRTCRemoteUser} user - The {@link  https://docs.agora.io/en/Voice/API%20Reference/web_ng/interfaces/iagorartcremoteuser.html| remote user} to add.
 * @param {trackMediaType - The {@link https://docs.agora.io/en/Voice/API%20Reference/web_ng/interfaces/itrack.html#trackmediatype | media type} to add.
 */
async function subscribe(uid) {
  // Set up user's player
  createPlayerWrapper(uid);

  // subscribe to a remote user
  client.updateParticipant(uid, {
    setSubscribedTracks: { audio: true, video: true }
  });
}

function createPlayerWrapper(uid) {
  if (!uid) console.trace();
  const player = $(`
      <div id="player-wrapper-${uid}">
        <p class="player-name">remoteUser(${uid})</p>
        <div id="${getPlayerContainerID(uid)}" class="player">
          <video playsinline="true" autoplay="true"></video>
          <audio autoplay="true"></audio>
        </div>
      </div>
    `);
    $("#remote-playerlist").append(player);
}

function getPlayerContainer(uid, isLocal) {
  let id = "local-player"
  if (!isLocal) {
    id = getPlayerContainerID(uid)
  }
  return document.getElementById(id)
}

function getMediaEle(container, tagName) {
  const allEles = container.getElementsByTagName(tagName);
  if (allEles.length === 0) return;
  return allEles[0];
}
 
function getPlayerContainerID(uid) {
  return `player-${uid}`;
}

function updateMedia(uid, track, isLocal) {
  const tagName = track.kind;
  if (tagName !== "video") {
    if (isLocal || tagName !== "audio") {
      return;
    }
  }
  
  let playerContainer = getPlayerContainer(uid, isLocal);
  if (!playerContainer) {
    createPlayerWrapper(uid);
    playerContainer = getPlayerContainer(uid);
  }

  const ele = getMediaEle(playerContainer, tagName);
  updateTracksIfNeeded(ele, track)
}

function removeVideoTrack(uid, videoTrack) {
  let playerContainer = getPlayerContainer(uid);
  if (!playerContainer) {
    createPlayerWrapper(uid);
    playerContainer = getPlayerContainer(uid);
  }
  const videoEle = getMediaEle(playerContainer, "video");
  const src = videoEle.srcObject;
  if (!src) return;
  src.removeTrack(videoTrack);
}

function updateTracksIfNeeded(mediaEle, newTrack) {
  let src = mediaEle.srcObject;
  if (!src) {
    mediaEle.srcObject = new MediaStream([newTrack]);
    src = mediaEle.srcObject;
    return;
  }
  const allTracks = src.getTracks();
  const l = allTracks.length;
  if (l === 0) {
    src.addTrack(newTrack);
    return;
  }
  if (l > 1) {
    console.warn(`Expected 1 track, got ${l}. Only working with the first.`)
  }
  const existingTrack = allTracks[0];
  if (existingTrack.id !== newTrack.id) {
    src.removeTrack(existingTrack);
    src.addTrack(newTrack);
  }
}

/*
 * Add a user who has subscribed to the live channel to the local interface.
 *
 * @param  {IAgoraRTCRemoteUser} user - The {@link  https://docs.agora.io/en/Voice/API%20Reference/web_ng/interfaces/iagorartcremoteuser.html| remote user} to add.
 * @param {trackMediaType - The {@link https://docs.agora.io/en/Voice/API%20Reference/web_ng/interfaces/itrack.html#trackmediatype | media type} to add.
 */
function handleUserPublished(user) {
  subscribe(user);
}

/*
 * Remove the user specified from the channel in the local interface.
 *
 * @param  {string} user - The {@link  https://docs.agora.io/en/Voice/API%20Reference/web_ng/interfaces/iagorartcremoteuser.html| remote user} to remove.
 */
function handleUserUnpublished(id) {
  $(`#player-wrapper-${id}`).remove();
}

function getCodec() {
  var radios = document.getElementsByName("radios");
  var value;
  for (var i = 0; i < radios.length; i++) {
    if (radios[i].checked) {
      value = radios[i].value;
    }
  }
  return value;
}


// getModifySdpHook takes a desired codec and returns the given hook to pass
// to Daily to prefer that codec.
function getModifySdpHook(wantedCodec) {
  if (wantedCodec === '') {
    return null;
  }
  const valid = ['VP8', 'VP9', 'H264'];
  const codecName = wantedCodec.toUpperCase();
  if (!valid.includes(codecName)) {
    throw new Error(
      `invalid codec name supplied: ${wantedCodec}; valid options are: ${valid.join(
        ' '
      )}`
    );
  }
  const hook = (rtcSDP) => {
    try {
      const camIdx = 0;
      const parsed = sdpTransform.parse(rtcSDP.sdp);
      const camMedia = parsed.media[camIdx];
      const preferredCodec = camMedia.rtp.filter(
        (r) => r.codec === codecName
      );
      const notPreferredCodec = camMedia.rtp.filter(
        (r) => r.codec !== codecName
      );
      const newPayloads = [...preferredCodec, ...notPreferredCodec]
        .map((r) => r.payload)
        .join(' ');
      parsed.media[camIdx].payloads = newPayloads;
      const newSdp = sdpTransform.write(parsed);
      return newSdp;
    } catch (e) {
      console.error(`failed to set codec preference: ${e}`);
    }
    return rtcSDP;
  };
  return hook;
}