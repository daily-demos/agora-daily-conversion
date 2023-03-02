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
 * On initiation no users are connected.
 */
var remoteUsers = {};

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
  value: "360p_7"
}, {
  label: "360p_8",
  detail: "480×360, 30fps, 490Kbps",
  value: "360p_8"
}, {
  label: "480p_1",
  detail: "640×480, 15fps, 500Kbps",
  value: "480p_1"
}, {
  label: "480p_2",
  detail: "640×480, 30fps, 1000Kbps",
  value: "480p_2"
}, {
  label: "720p_1",
  detail: "1280×720, 15fps, 1130Kbps",
  value: "720p_1"
}, {
  label: "720p_2",
  detail: "1280×720, 30fps, 2000Kbps",
  value: "720p_2"
}, {
  label: "1080p_1",
  detail: "1920×1080, 15fps, 2080Kbps",
  value: "1080p_1"
}, {
  label: "1080p_2",
  detail: "1920×1080, 30fps, 3000Kbps",
  value: "1080p_2"
}];
var curVideoProfile;

async function initDevices() {
  client.preAuth();
  client.startCamera();
  
  // get mics
  const devices = await client.enumerateDevices();
  console.log("devices:", devices, client.local, client.participants().local);

  let mics = [];
  let cams = [];

  for (let i = 0; i < devices.length; i += 1){
    const device = devices[i];
    console.log("device:", device)
    const kind = device.kind;
    if (kind === "audioinput") {
      mics.push(device);
    } else if (kind === "videoinput") {
      cams.push(device);
    }
  }
  $(".mic-input").val("currentMic");
  $(".mic-list").empty();
  mics.forEach(mic => {
    $(".mic-list").append(`<a class="dropdown-item" href="#">${mic.label}</a>`);
  });

  // get cameras
  $(".cam-input").val("currentCam");
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
    videoSource: currentMic.deviceId,  
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
  localTracks.videoTrack && (await localTracks.videoTrack.setEncoderConfiguration(curVideoProfile.value));
}

/*
 * When this page is called with parameters in the URL, this procedure
 * attempts to join a Video Call channel using those parameters.
 */
$(() => {
  if (!client) {
    client = DailyIframe.createCallObject();
    // Add an event listener to play remote tracks when remote user publishes.
    client.on("participant-joined", (ev) => {
      handleUserPublished(ev.participant.session_id);
    });
    client.on("participant-left", (ev) => {
      handleUserUnpublished(ev.participant.session_id);
    });
    client.on("track-started", (ev) => {
      const p = ev.participant;
      const track = ev.track;
      updateMedia(p.session_id, track, p.local);
    });
    client.on("track-stopped", (ev) => {
      const p = ev.participant;
      const track = ev.track;
      if (track.kind === "video") {
        removeVideoTrack(p.session_id, track, p.local);
      }
    })
  }

  initVideoProfiles();
  $(".profile-list").delegate("a", "click", function (e) {
    changeVideoProfile(this.getAttribute("label"));
  });
  var urlParams = new URL(location.href).searchParams;
  options.appid = urlParams.get("appid");
  options.channel = urlParams.get("channel");
  options.token = urlParams.get("token");
  options.uid = urlParams.get("uid");
  if (options.appid && options.channel) {
    $("#uid").val(options.uid);
    $("#appid").val(options.appid);
    $("#token").val(options.token);
    $("#channel").val(options.channel);
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
    options.channel = $("#channel").val();
    options.uid = Number($("#uid").val());
    options.appid = $("#appid").val();
    options.token = $("#token").val();
    await join();
    if (options.token) {
      $("#success-alert-with-token").css("display", "block");
    } else {
      $("#success-alert a").attr("href", `index.html?appid=${options.appid}&channel=${options.channel}&token=${options.token}`);
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
  // Join the channel.
  options.uid = await client.join({
    url: "https://lizashul.daily.co/christian",
  });
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
  $("#local-player-name").text(`localVideo(${options.uid})`); 
  $("#joined-setup").css("display", "flex");

  // Publish the local video and audio tracks to the channel.
  await client.publish(Object.values(localTracks));
  console.log("publish success");
}

/*
 * Stop all local and remote tracks then leave the channel.
 */
async function leave() {
  for (trackName in localTracks) {
    var track = localTracks[trackName];
    if (track) {
      track.stop();
      track.close();
      localTracks[trackName] = undefined;
    }
  }

  // Remove remote users and player views.
  remoteUsers = {};
  $("#remote-playerlist").html("");

  // leave the channel
  await client.leave();
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
async function subscribe(user) {
  const uid = user.session_id;

  // Set up user's player
  createPlayerWrapper(uid);

  // subscribe to a remote user
  client.updateParticipant(user.session_id, {
    setSubscribedTracks: { audio: true, video: true }
  });
}

function createPlayerWrapper(uid) {
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
    getPlayerContainerID(uid)
  }
  return document.getElementById(id)
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
    console.log("playercontainer:", playerContainer)
    createPlayerWrapper(uid);
    playerContainer = getPlayerContainer(uid);
  }
  console.log("playerContainer.", playerContainer, tagName, isLocal)

  const mediaEles = playerContainer.getElementsByTagName(tagName)
  const ele = mediaEles[0];
  updateTracksIfNeeded(ele, track)
}

function removeVideoTrack(uid, videoTrack) {
  let playerContainer = getPlayerContainer(uid);
  if (!playerContaienr) {
    createPlayerWrapper(uid);
    playerContainer = getPlayerContainer(uid);
  }
  const videoEle = playerContainer.getElementsByTagName("video");
  const src = videoEle.srcObject;
  if (!src) return;
  src.removeTrack(videoTrack);
}

function updateTracksIfNeeded(mediaEle, newTrack) {
  const src = mediaEle.srcObject;
  if (!src) {
    mediaEle.srcObject = new MediaStream([newTrack]);
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
  const id = user.uid;
  remoteUsers[id] = user;
  subscribe(user);
}

/*
 * Remove the user specified from the channel in the local interface.
 *
 * @param  {string} user - The {@link  https://docs.agora.io/en/Voice/API%20Reference/web_ng/interfaces/iagorartcremoteuser.html| remote user} to remove.
 */
function handleUserUnpublished(user) {
  const id = user.session_id;
  delete remoteUsers[id];
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