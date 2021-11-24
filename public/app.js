// sections
const gallery = document.getElementById('gallery');
const controls = document.getElementById('controls');
const externalVideo = document.getElementById('externalVideo');

// inputs
const identityInput = document.getElementById('identity');
const videoInput = document.getElementById('videoInput');

// buttons
const joinRoomButton = document.getElementById('button-join');
const leaveRoomButton = document.getElementById('button-leave');
const shareVideoButton = document.getElementById('button-share');
const unshareVideoButton = document.getElementById('button-unshare');

// other variables
const ROOM_NAME = 'my-video-room';
let videoRoom;
let localVideoDiv;
let myAudioTrack;
let myVideoTrack;
let uploadedVideo;


const handleVideoUpload = (event) => {
  const files = event.target.files;
  if (files && files[0]) {
    const reader = new FileReader();

    reader.onload = (e) => {
      uploadedVideo = document.createElement('video');
      uploadedVideo.src = e.target.result;
      uploadedVideo.id = 'uploadedVideo';
      uploadedVideo.controls = true;

      externalVideo.appendChild(uploadedVideo);
      uploadedVideo.load();
    }

    reader.readAsDataURL(event.target.files[0]);
  }
}

const joinRoom = async (event) => {
  event.preventDefault();

  const identity = identityInput.value;

  try {
    const response = await fetch('/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        'identity': identity,
        'room': ROOM_NAME
      })
    });

    const data = await response.json();

    // Create the local audio track
    const localAudioTrack = await Twilio.Video.createLocalAudioTrack();

    videoRoom = await Twilio.Video.connect(data.token, {
      name: ROOM_NAME,
      tracks: [localAudioTrack]
    });

    console.log(`You are now connected to Room ${videoRoom.name}`);

    localVideoDiv = document.createElement('div');
    localVideoDiv.setAttribute('id', 'localParticipant');

    const identityDiv = document.createElement('div');
    identityDiv.setAttribute('class', 'identity');
    identityDiv.innerHTML = identity;
    localVideoDiv.appendChild(identityDiv);
    gallery.appendChild(localVideoDiv);

    videoRoom.participants.forEach(participantConnected);
    videoRoom.on('participantConnected', participantConnected);
    videoRoom.on('participantDisconnected', participantDisconnected);

    joinRoomButton.disabled = true;
    leaveRoomButton.disabled = false;
    identityInput.disabled = true;
    shareVideoButton.disabled = false;
  } catch (error) {
    console.log(error);
  }
}

const leaveRoom = (event) => {
  event.preventDefault();
  videoRoom.disconnect();
  console.log(`You are now disconnected from Room ${videoRoom.name}`);

  let removeParticipants = gallery.getElementsByClassName('participant');

  while (removeParticipants[0]) {
    gallery.removeChild(removeParticipants[0]);
  }

  localVideoDiv.remove();
  uploadedVideo.remove();
  videoInput.value = null;

  joinRoomButton.disabled = false;
  leaveRoomButton.disabled = true;
  identityInput.disabled = false;
  shareVideoButton.disabled = true;
  unshareVideoButton.disabled = true;
}

const participantConnected = (participant) => {
  console.log(`${participant.identity} has joined the call.`);

  const participantDiv = document.createElement('div');
  participantDiv.setAttribute('id', participant.sid);
  participantDiv.setAttribute('class', 'participant');

  const tracksDiv = document.createElement('div');
  participantDiv.appendChild(tracksDiv);

  const identityDiv = document.createElement('div');
  identityDiv.setAttribute('class', 'identity');
  identityDiv.innerHTML = participant.identity;
  participantDiv.appendChild(identityDiv);

  gallery.appendChild(participantDiv);

  participant.tracks.forEach(publication => {
    if (publication.isSubscribed) {
      tracksDiv.appendChild(publication.track.attach());
    }
  });

  participant.on('trackSubscribed', track => {
    // Attach the video and audio tracks to the DOM
    tracksDiv.appendChild(track.attach());
  });

  participant.on('trackUnsubscribed', track => {
    // Remove audio and video elements from the DOM
    track.detach().forEach(element => element.remove());
  });
};

const participantDisconnected = (participant) => {
  console.log(`${participant.identity} has left the call.`);
  document.getElementById(participant.sid).remove();
};

const shareVideo = async () => {
  let stream;
  console.log(uploadedVideo)

  if (uploadedVideo.captureStream) {
    stream = uploadedVideo.captureStream();
  } else if (uploadedVideo.mozCaptureStream) {
    stream = uploadedVideo.mozCaptureStream();
  } else {
    console.error('Stream capture is not supported');
    stream = null;
  }

  console.log(stream)
  const tracks = stream.getTracks();
  console.log(tracks)
  var myVideoTrack = new Twilio.Video.LocalVideoTrack(tracks[1]);
  var myAudioTrack = new Twilio.Video.LocalAudioTrack(tracks[0]);
  myVideoTrack.name = 'uploadedVideo';
  myAudioTrack.name = 'uploadedAudio';

  console.log(videoRoom.localParticipant)

  // Publish the video's tracks
  videoRoom.localParticipant.publishTrack(myVideoTrack);
  videoRoom.localParticipant.publishTrack(myAudioTrack);

  shareVideoButton.disabled = true;
  unshareVideoButton.disabled = false;
}

const unshareVideo = async () => {
  console.log("in unshare video")
  console.log(videoRoom.localParticipant.tracks)
  uploadedVideo.remove();
  videoInput.value = null;
  unshareVideoButton.disabled = true;
  shareVideoButton.disabled = false;
}

// Event listeners
joinRoomButton.addEventListener('click', joinRoom);
leaveRoomButton.addEventListener('click', leaveRoom);
shareVideoButton.addEventListener('click', shareVideo);
unshareVideoButton.addEventListener('click', unshareVideo);
videoInput.addEventListener('change', handleVideoUpload);