/*
 *  These procedures use Daily's Client SDK for JavaScript to enable local and remote
 *  users to join and leave a video call room managed by Daily.
 */

// Client will be an instance of Daily's call object
// https://docs.daily.co/reference/daily-js/factory-methods/create-call-object
var client;

var options = {
  roomurl: null,
  uname: null,
  token: null
};

let mics = []
let cams = []

// You can find information about setting track constraints with Daily here:
// https://docs.daily.co/reference/daily-js/instance-methods/set-bandwidth#main
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

/**
 * Start the user's camera and microphone and populate
 * the device selection list.
 */
async function initDevices() {
  const meetingState = client.meetingState();
  if (meetingState !== "joined-meeting" && meetingState !== "joining-meeting") {
    client.preAuth();
    client.startCamera();
  }
  
  client.enumerateDevices().then(devices => {
    updateDeviceSelection(devices);
  })

  // Set up device change listener, for handling newly plugged in
  // or removed devices.
  navigator.mediaDevices.addEventListener('devicechange', () => {
    client.enumerateDevices().then(devices => {
      updateDeviceSelection(devices);
    })
  });
}

/**
 * Update the list of available cameras and micrphones.
 * @param {Object} devices - All available devices
 */
function updateDeviceSelection(devices) {
  const d = devices.devices;

  // Reset device list
  mics = [];
  cams = [];

  // Iterate through all devices
  for (let i = 0; i < d.length; i += 1){
    const device = d[i];
    const kind = device.kind;
    if (kind === "audioinput") {
      mics.push(device);
    } else if (kind === "videoinput") {
      cams.push(device);
    }
  }

  // Populate mic list
  $(".mic-list").empty();
  mics.forEach(mic => {
    $(".mic-list").append(`<a class="dropdown-item" href="#">${mic.label}</a>`);
  });

  // Populate cam list
  $(".cam-list").empty();
  cams.forEach(cam => {
    $(".cam-list").append(`<a class="dropdown-item" href="#">${cam.label}</a>`);
  });
}

/**
 * Instruct Daily to use the given camera device.
 * @param {string} label - The label of the chosen camera device
 */
async function switchCamera(label) {
  currentCam = cams.find(cam => cam.label === label);
  $(".cam-input").val(currentCam.label);
  // switch device of local video track.
  client.setInputDevicesAsync({
    videoSource: currentCam.deviceId,  
  });
}

/**
 * Instruct Daily to use the given microphone device.
 * @param {string} label - The label of the chosen microphone device
 */
async function switchMicrophone(label) {
  currentMic = mics.find(mic => mic.label === label);
  $(".mic-input").val(currentMic.label);
  // switch device of local audio track.
  client.setInputDevicesAsync({
    audioSource: currentMic.deviceId,  
  });
}

// initVideoProfiles populates the UI showing 
// user media constraint setting presets.
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
 * attempts to join a video call room using those parameters.
 */
$(() => {
  if (!client) {
    client = DailyIframe.createCallObject({
      subscribeToTracksAutomatically: false,
    });

    // Set up handers for relevant Daily events
    // https://docs.daily.co/reference/daily-js/events
    client
      .on("joined-meeting", (ev) => {
        const p = ev.participants.local;
        $("#local-player-name").text(`localVideo(${p.user_name} - ${p.session_id})`); 

        // As soon as the user joins, set bandwidth
        // to their chosen video profile.
        client.setBandwidth(curVideoProfile.value);
      })
      .on("participant-joined", (ev) => {
        subscribe(ev.participant.session_id);
      })
      .on("participant-left", (ev) => {
        $(`#player-wrapper-${ev.participant.session_id}`).remove();
      })
      .on("track-stopped", (ev) => {
        const p = ev.participant;

        // If there's no participant, they must have left.
        // This will be handled via the "participant-left" event.
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

        // Make sure device selection is populated with
        // currently chosen devices.
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

/**
 * Join a Daily room.
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
  
  // Join the room.
  client.join(joinOptions);
  $("#joined-setup").css("display", "flex");
}

/**
 * Leave the Daily room.
 */
async function leave() {
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

/**
 * Subscribe to a remote user's video and audio tracks.
 * @param {string} uid - The {@link https://docs.daily.co/reference/daily-js/instance-methods/participants#participant-properties | session ID} 
 * of the participant being subscribed to
 */
async function subscribe(uid) {
  // Set up user's media player
  createPlayerWrapper(uid);

  // Subscribe to a remote user
  client.updateParticipant(uid, {
    setSubscribedTracks: { audio: true, video: true }
  });
}

/**
 * Create the DOM elements needed to play a user's media tracks.
 * @param {string} uid - The {@link https://docs.daily.co/reference/daily-js/instance-methods/participants#participant-properties | session ID}
 * of the participant the wrapper is being created for.
 */
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

/**
 * Retrieve the element which contains the user's
 * video and audio elements.
 * @param {string} uid - The {@link https://docs.daily.co/reference/daily-js/instance-methods/participants#participant-properties | session ID}
 * of the participant whose container is being retrieved
 * @param {boolean} isLocal - Whether this is the local participant
*/
function getPlayerContainer(uid, isLocal) {
  let id = "local-player"
  if (!isLocal) {
    id = getPlayerContainerID(uid)
  }
  return document.getElementById(id)
}

/**
 * Retrieve the specified media element
 * from the given container.
 * @param {HTMLElement} container - The DOM element that should contain the
 * requested media element
 * @param {string} tagName - The HTML media tag name to retrieve
*/
function getMediaEle(container, tagName) {
  const allEles = container.getElementsByTagName(tagName);
  if (allEles.length === 0) return;
  return allEles[0];
}
 
function getPlayerContainerID(uid) {
  return `player-${uid}`;
}

/**
 * Update the given user's media players with the provided track.
 * @param {string} uid - The {@link https://docs.daily.co/reference/daily-js/instance-methods/participants#participant-properties | session ID}
 * of the participant whose media is being updated
 * @param {MediaStreamTrack} track - The new track to update
 * the participant's media elements with
 * @param {boolean} isLocal - Whether this is the local participant
*/
function updateMedia(uid, track, isLocal) {
  const tagName = track.kind;
  if (tagName !== "video") {
    // If this is a local user, early out if this
    // isn't a video track (we don't want to play 
    // local audio). If this is a remote user and
    // this is not a video OR audio track, early out
    // as any other track type is unsupported in this demo.
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

/**
 * Remove the given media track from the provided user's
 * video media element.
 * @param {string} uid - The {@link https://docs.daily.co/reference/daily-js/instance-methods/participants#participant-properties | session ID}
 * of the participant whose video track is being removed.
 * @param {MediaStreamTrack} videoTrack - The video track to remove.
*/
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

/**
 * Check whether the provided media element already contains
 * the given track. If not, add the track to the media element.
 * If an old track already exists on the media element, remove it.
 * @param {HTMLMediaElement} mediaEle - The media element which should contain
 * the given media track
 * @param {MediaStreamTrack} newTrack - The media track which the media element
 * should contain
*/
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

/**
 * Retrieve which codec the user chose from the Advanced Settings dropdown.
*/
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


// getModifySdpHook() takes a desired codec and returns 
// the given hook to pass to Daily to prefer that codec.
/**
 * Return a hook which instructs Daily to prefer the specified codec
 * @param {VP8 | VP9 | H264} wantedCodec - Which codec Daily should prefer
*/
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