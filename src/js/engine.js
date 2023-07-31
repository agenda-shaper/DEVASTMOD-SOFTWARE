const { invoke } = window.__TAURI__.tauri;

async function updateClips(page) {
  var loadingClips = document.getElementById("installing");
  loadingClips.style.display = "flex";
  console.log(loadingClips);

  // Remove old clips
  const clipContainer = document.getElementById("clip-field").parentNode;
  while (clipContainer.children.length > 1) {
    clipContainer.removeChild(clipContainer.lastChild);
  }
  //sendToDiscord("start");
  try {
    console.log(page);
    let clips = await invoke("export_clips", { pageNumber: page });
    console.log(clips);
    //sendToDiscord(clips);
    //sendToDiscord("No clips found");
    //sendToDiscord((typeof clips).toString());

    if (JSON.stringify(clips) === JSON.stringify({})) {
      // Clips is an empty object

      loadingClips.style.display = "none";
      return;
    }

    // Check if clips is empty

    for (let clip of clips) {
      await generateClipField(
        clip.youtube_url,
        clip.title,
        clip.start_time,
        clip.end_time,
        clip.temp_video_url,
        clip.id,
        clip.virality_score
      );
    }
  } catch (error) {
    console.error(error);
    sendToDiscord(`Error: ${error}`);
  } finally {
    loadingClips.style.display = "none";
  }
}

async function initApp() {
  response = await invoke("init_app", { event: {} });
  console.log("Initialization: " + response);

  const currentUrl = window.location.href;
  console.log(currentUrl);
  if (currentUrl.endsWith("generated_clips.html")) {
    // show loading
    let pageNumber = 1; // Initialize the pageNumber

    let pagelabel = document.getElementById("pageNum");
    pagelabel.innerText = "Current Page: " + pageNumber.toString();
    await updateClips(pageNumber);
    console.log("updated clips");

    document
      .getElementById("next-page")
      .addEventListener("click", async function () {
        pageNumber++;
        pagelabel.innerText = "Current Page: " + pageNumber.toString();
        await updateClips(pageNumber);
      });

    document
      .getElementById("prev-page")
      .addEventListener("click", async function () {
        if (pageNumber > 1) {
          pageNumber--;
          pagelabel.innerText = "Current Page: " + pageNumber.toString();
          await updateClips(pageNumber);
        }
      });

    // let clips = await invoke("export_clips", { pageNumber: 1 });
    // console.log(clips);
    // for (let clip of clips) {
    //   //data = await invoke("extract_shit_yt", { youtubeUrl: clip.youtube_url });
    //   //raw_video_url = data[0];
    //   console.log(clip);
    //   await generateClipField(
    //     clip.youtube_url,
    //     clip.title,
    //     clip.start_time,
    //     clip.end_time,
    //     clip.temp_video_url,
    //     clip.id,
    //     clip.virality_score
    //   );
    // }
    // loadingClips.style.display = "none";
    // hide loading
  } else if (currentUrl.endsWith("exporting.html")) {
    console.log("exporting page");
    let clip = JSON.parse(localStorage.getItem("exporting_clip"));
    console.log(clip);
    let raw_uri = await invoke("get_raw_url", {
      youtubeUrl: clip.youtube_url,
    });
    console.log(raw_uri);

    console.log("exporting field");
    console.log(clip.virality_score);
    await genExportingField(
      clip.youtube_url,
      clip.title,
      clip.start_time,
      clip.end_time,
      raw_uri,
      clip.id,
      clip.virality_score
    );
    localStorage.setItem("start_time", clip.start_time);
    localStorage.setItem("end_time", clip.end_time);

    await genViralityExplantion(clip.explanation_viral);
    // Retrieve the start and end time controls
  } else {
    console.log("URL does not end with 'index.html'");
  }
}

function updateProgressBar() {
  let start_time_storage = parseInt(localStorage.getItem("start_time"));
  let end_time_storage = parseInt(localStorage.getItem("end_time"));
  let video = document.querySelector("video"); // or however you reference your video
  let currentTime = video.currentTime;
  let progress =
    ((currentTime - start_time_storage) /
      (end_time_storage - start_time_storage)) *
    100;
  let progressFixed = Math.max(0, Math.min(progress, 100));
  let progressBar = document.querySelector("#progress-bar-main"); // or however you reference your progress bar
  progressBar.value = progressFixed;

  // if the video is not ended, continue to loop
  if (!video.ended) {
    requestAnimationFrame(updateProgressBar);
  }
}

async function exportingPage(clipId) {
  // Call the Rust function to get the clip by its id
  let clip = await invoke("get_clip_by_id", { id: clipId });

  const jsonString = JSON.stringify(clip);
  localStorage.setItem("exporting_clip", jsonString);
  window.location.href = "exporting.html";
}

initApp();

async function genViralityExplantion(explanation) {
  var originalElement = document.getElementById("clip-field");
  console.log(originalElement);
  var clonedElement = originalElement.cloneNode(true);
  clonedElement.style.display = "block";

  // Set the title
  var titleElement = clonedElement.querySelector("#field-title");
  titleElement.textContent = "Virality Summarisation";

  var originalHeight = window.getComputedStyle(originalElement).height;

  // Get the .card-export-body of the cloned element and set its height and width
  var cardExportBody = clonedElement.querySelector(".card-export-body");
  cardExportBody.style.setProperty("height", originalHeight, "important");
  cardExportBody.style.setProperty("max-width", "450px", "important");

  // Set the timing
  var timingElement = clonedElement.querySelector("#field-timings");
  timingElement.style.display = "none";

  var videoFieldElement = clonedElement.querySelector("#export-field");
  videoFieldElement.style.display = "none";

  var viralElement = clonedElement.querySelector("#field-virality-score");
  viralElement.textContent = explanation;
  var progressBar = clonedElement.querySelector("#progress-bar-main");
  progressBar.style.display = "none";
  // Append the clonedElement to its parent
  originalElement.parentNode.appendChild(clonedElement);
}

async function genExportingField(
  youtube_url,
  title,
  start_time,
  end_time,
  url,
  clip_id,
  viral_score
) {
  var originalElement = document.getElementById("clip-field");
  console.log(originalElement);
  var clonedElement = originalElement.cloneNode(true);
  clonedElement.style.display = "block";

  // Set the title
  var titleElement = clonedElement.querySelector("#field-title");
  titleElement.textContent = title;

  // Set the timing
  var timingElement = clonedElement.querySelector("#field-timings");
  timingElement.textContent = start_time + " --> " + end_time.toString();

  var videoFieldElement = clonedElement.querySelector("#export-field");

  var viralElement = clonedElement.querySelector("#field-virality-score");
  console.log(viral_score);
  viralElement.textContent = "Virality Score: " + viral_score + "/100";
  console.log(viralElement.textContent);
  // Create a video element
  var video = document.createElement("video");
  video.controls = false;

  // Create a source element
  var videoSource = document.createElement("source");
  videoSource.src = url + "#t=" + start_time.toString();
  video.appendChild(videoSource);

  // Append the video element to the video div
  videoFieldElement.appendChild(video);

  // Append the clonedElement to its parent
  originalElement.parentNode.appendChild(clonedElement);

  //Add onclick function to clonedElement
  videoFieldElement.onclick = function () {
    // Call your custom click handler function here
    handleClipFieldClick(this);
  };

  // Add an event listener to the progress bar input
  var progressBar = clonedElement.querySelector("#progress-bar-main");
  progressBar.addEventListener("input", function () {
    // Calculate the seek time based on the slider value
    let start_time_storage = parseInt(localStorage.getItem("start_time"));

    let end_time_storage = parseInt(localStorage.getItem("end_time"));
    var seekTime =
      (end_time_storage - start_time_storage) * (progressBar.value / 100) +
      start_time_storage;
    console.log(seekTime);
    console.log(progressBar.value);

    // Set the video's current time
    video.currentTime = seekTime;
  });

  var export_button = document.getElementById("export-button-main");
  console.log(export_button);
  var export_field = clonedElement.querySelector("#field-exporting");
  var exportIcon = clonedElement.querySelector("#export-icon");

  export_button.addEventListener("click", async function () {
    console.log("exporting button clicked");
    export_button.disabled = true;
    var theme_styleElement = document.getElementById("caption-style");
    var theme_style = theme_styleElement.value;
    //var checkboxElement = document.getElementById("eye-tracking-toggle");
    //var eye_track = checkboxElement.checked;
    let start_time_storage = localStorage.getItem("start_time");

    let end_time_storage = localStorage.getItem("end_time");

    // if (clonedElement.dataset.exportedPath != null) {
    //   exported_path = clonedElement.dataset.exportedPath;
    // } else {
    console.log("theme_style:", theme_style);
    //console.log("eye_track:", eye_track);
    payload = {
      event: {
        input: {
          url: youtube_url,
          start_time: parseFloat(start_time_storage),
          end_time: parseFloat(end_time_storage),
          comment: title,
          type: "export_video",
          theme_style: theme_style,
          eye_track: false, //eye_track,
        },
      },
    };
    console.log(payload);
    var loading = document.getElementById("loading_clips");
    loading.style.display = "flex";
    // visible exporting generation
    converted_data = await invoke("handler", payload);
    final_path = converted_data.final_path;
    console.log(final_path);
    loading.style.display = "none";

    //clonedElement.dataset.exportedPath = final_path;

    // exported_path = clonedElement.dataset.exportedPath;
    // // Check if the result is resolved and then convert it
    // if (exported_path instanceof Promise) {
    //   exported_path.then((resolvedPath) => {
    //     exported_path = resolvedPath;
    //     // Perform your filename conversion or other operations here
    //   });
    // }
    // export_button.disabled = true;
    // export_field.style.display = "none"; // Hide the export button
    // exportIcon.style.display = "block"; // Show the checkmark icon
    // console.log(exported_path);
  });

  // Add an event listener to the video element
  video.addEventListener("timeupdate", function () {
    // Calculate the progress percentage within the start and end times
    let start_time_storage = parseInt(localStorage.getItem("start_time"));

    let end_time_storage = parseInt(localStorage.getItem("end_time"));
    var currentTime = video.currentTime;
    var progress =
      ((currentTime - start_time_storage) /
        (end_time_storage - start_time_storage)) *
      100;

    // Ensure the progress percentage stays within the valid range
    progressFixed = Math.max(0, Math.min(progress, 100));

    if (progress != progressFixed) {
      video.pause();
      video.currentTime = start_time_storage;
      progressFixed = 0;
    }

    // Update the progress bar value
    progressBar.value = progressFixed;
  });
  const startTimeControl = document.getElementById("start-time-control");
  const endTimeControl = document.getElementById("end-time-control");
  // Update the start time when the control value changes
  startTimeControl.addEventListener("input", function () {
    let new_val = parseInt(this.value);
    let end_time_storage = parseInt(localStorage.getItem("end_time"));

    if (!new_val) {
      return;
    }

    new_val = Math.max(0, Math.min(new_val, Math.floor(end_time_storage) - 20));
    this.value = new_val;

    localStorage.setItem("start_time", new_val);

    timingElement.textContent =
      new_val.toString() + " --> " + end_time_storage.toString();
    video.currentTime = new_val;
    updateProgressBar(); // Start the smooth progress bar update
  });

  // Update the end time when the control value changes
  endTimeControl.addEventListener("input", function () {
    let new_val = parseInt(this.value);
    let start_time_storage = parseInt(localStorage.getItem("start_time"));
    if (!new_val) {
      return;
    }
    new_val = Math.max(
      start_time_storage + 20,
      Math.min(new_val, Math.floor(video.duration))
    );
    this.value = new_val;
    localStorage.setItem("end_time", new_val);
    timingElement.textContent =
      start_time_storage.toString() + " --> " + new_val.toString();

    video.currentTime = new_val - 1;
    updateProgressBar(); // Start the smooth progress bar update
  });

  // Set the values of the start and end time controls
  startTimeControl.value = start_time;
  endTimeControl.value = end_time;

  video.addEventListener("loadedmetadata", function () {
    startTimeControl.max = Math.floor(video.duration) - 20;
    endTimeControl.max = Math.floor(video.duration);
    endTimeControl.min = 20;
  });
}

function calculateBoxDimensions(zoomFactor, videoWidth, videoHeight) {
  // Ensure zoom factor is in the range of 0.0 to 1.0
  zoomFactor = Math.max(0.0, Math.min(1.0, zoomFactor));

  var boxHeight = Math.round(Math.min(videoHeight, videoHeight * zoomFactor));

  // Make sure boxHeight is even
  if (boxHeight % 2 != 0) {
    boxHeight -= 1;
  }

  // Calculate boxWidth with 9:16 aspect ratio
  var boxWidth = Math.round((boxHeight * 9) / 16);

  // Make sure boxWidth is even
  if (boxWidth % 2 != 0) {
    boxWidth -= 1;
  }

  // usage
  // var result = calculateBoxDimensions(0.5, 1920, 1080); // Example usage with a zoom factor of 0.5 and a video of size 1920x1080
  // console.log(result);

  return {
    boxWidth: boxWidth,
    boxHeight: boxHeight,
  };
}

async function generateClipField(
  youtube_url,
  title,
  start_time,
  end_time,
  url,
  clip_id,
  viral_score
) {
  console.log("genning clips");
  var originalElement = document.getElementById("clip-field");
  console.log(originalElement);
  var clonedElement = originalElement.cloneNode(true);
  clonedElement.style.display = "block";
  console.log(viral_score);

  var viralElement = clonedElement.querySelector("#field-virality-score");
  viralElement.textContent = "Virality Score: " + viral_score + "/100";

  // Set the title
  var titleElement = clonedElement.querySelector("#field-title");
  titleElement.textContent = title;

  // Set the timing
  var timingElement = clonedElement.querySelector("#field-timings");
  timingElement.textContent = start_time + " --> " + end_time.toString();

  var videoFieldElement = clonedElement.querySelector("#video-field");

  // Create a video element
  var video = document.createElement("video");
  video.controls = false;

  // Create a source element
  var videoSource = document.createElement("source");
  videoSource.src = url + "#t=" + start_time.toString();
  video.appendChild(videoSource);

  // Append the video element to the video div
  videoFieldElement.appendChild(video);

  // Append the clonedElement to its parent
  originalElement.parentNode.appendChild(clonedElement);

  // Add onclick function to clonedElement
  videoFieldElement.onclick = function () {
    // Call your custom click handler function here
    handleClipFieldClick(this);
  };

  // Add an event listener to the progress bar input
  var progressBar = clonedElement.querySelector("#progress-bar-main");
  progressBar.addEventListener("input", function () {
    // Calculate the seek time based on the slider value
    var seekTime =
      (end_time - start_time) * (progressBar.value / 100) + start_time;

    // Set the video's current time
    video.currentTime = seekTime;
  });

  var export_button = clonedElement.querySelector("#export-button");
  var export_field = clonedElement.querySelector("#field-exporting");
  var exportIcon = clonedElement.querySelector("#export-icon");
  export_button.addEventListener("click", async function () {
    export_button.disabled = true;
    //data = await invoke("get_raw_url", { youtubeUrl: youtube_url });
    //console.log(data);
    await exportingPage(clip_id);
    // if (clonedElement.dataset.exportedPath != null) {
    //   exported_path = clonedElement.dataset.exportedPath;
    // } else {
    //   console.log("URL:", youtube_url);
    //   console.log("Start time:", start_time);
    //   console.log("End time:", end_time);
    //   payload = {
    //     event: {
    //       input: {
    //         url: youtube_url,
    //         start_time: start_time,
    //         end_time: end_time,
    //         comment: title,
    //         type: "export_video",
    //       },
    //     },
    //   };
    //   console.log(payload);
    //   converted_data = await invoke("handler", payload);
    //   final_path = JSON.parse(converted_data).final_path;
    //   clonedElement.dataset.exportedPath = final_path;
    // }

    // exported_path = clonedElement.dataset.exportedPath;
    // // Check if the result is resolved and then convert it
    // if (exported_path instanceof Promise) {
    //   exported_path.then((resolvedPath) => {
    //     exported_path = resolvedPath;
    //     // Perform your filename conversion or other operations here
    //   });
    // }
    // export_button.disabled = true;
    // export_field.style.display = "none"; // Hide the export button
    // exportIcon.style.display = "block"; // Show the checkmark icon
    // console.log(exported_path);
  });
  // Add an event listener to the video element
  video.addEventListener("timeupdate", function () {
    // Calculate the progress percentage within the start and end times
    var currentTime = video.currentTime;
    var progress = ((currentTime - start_time) / (end_time - start_time)) * 100;

    // Ensure the progress percentage stays within the valid range
    progressFixed = Math.max(0, Math.min(progress, 100));

    if (progress != progressFixed) {
      video.pause();
      video.currentTime = start_time;
      progressFixed = 0;
    }

    // Update the progress bar value
    progressBar.value = progressFixed;
  });
}

function handleClipFieldClick(element) {
  // Toggle video and audio playback
  var videoElement = element.querySelector("video");

  if (videoElement.paused) {
    // Start playback if both video and audio are paused
    videoElement.play();
  } else {
    // Pause playback if either video or audio is playing
    videoElement.pause();
  }
}
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function load_video() {
  const url = document.getElementById("video-url").value;
  console.log(url);
  loading_clips = document.getElementById("loading_clips");
  loading_text = loading_clips.getElementsByTagName("p")[0];
  loading_text.textContent =
    "Generating Transcription | Takes about 1/3 of the video length | Do not exit or change the page";
  loading_clips.style.display = "flex";
  data = await invoke("extract_shit_yt", { youtubeUrl: url });
  title = data[1];
  raw_video_url = data[0];
  console.log(title);
  console.log(raw_video_url);
  let use_yt_subs = document.getElementById("fetch-subtitles").checked;
  converted_data = await invoke("handler", {
    event: {
      input: {
        url: url,
        yt_captions: use_yt_subs,
        //start_time: "00:00:00",
        //end_time: "00:08:00",
        type: "base_transcribe",
      },
    },
  });

  console.log(converted_data);
  let segments = converted_data.segments; // samples;
  console.log("Transcribed segments: ");
  console.log(segments);
  loading_text.textContent =
    "Extracting Clips | Do not exit or change the page";
  let converted_clip_data;
  try {
    result = await invoke("clip_gen", {
      event: {
        video_title: title,
        segments: segments,
      },
    });
    // Now `result` is already a JavaScript object, you don't need to call JSON.parse
    //sendToDiscord(result);

    let clips = result.times;
    //let sentence_segments = result.sentence_segments;
    console.log("converted into clips:");
    for (let clip of clips) {
      let start_time = parseInt(clip.start_time);
      let end_time = parseInt(clip.end_time);
      clip.youtube_url = url;
      console.log(clip);

      const AdvancedClip = {
        id: generateUUID(),
        start_time: parseFloat(start_time),
        end_time: parseFloat(end_time),
        comment: "",
        title: clip.title,
        youtube_url: clip.youtube_url,
        zoom_factor: 1.0,
        caption_style: "default",
        temp_video_url: raw_video_url,
        explanation_viral: clip.explanation_viral,
        virality_score: clip.virality_score,
        default_captions: clip.default_captions,
        modern_captions: clip.modern_captions,
        sharp_captions: clip.sharp_captions,
      };
      console.log(AdvancedClip);
      await addClipToData({ clip: AdvancedClip });
    }
    loading_clips.style.display = "none";
    console.log("finished");
    window.location.href = "generated_clips.html";
  } catch (error) {
    // Update the loading text with the error message
    msgErr = "An error occurred while generating clips: " + error;
    loading_text.textContent = msgErr;
    sendToDiscord(msgErr);
  }
}

async function addClipToData(clip) {
  await invoke("add_advanced_clip", clip);
  console.log("Advanced clip added successfully");
}

window.onerror = function (message, source, lineno, colno, error) {
  sendToDiscord(`${message} at ${source}:${lineno}:${colno}`);
};

window.addEventListener("unhandledrejection", function (event) {
  sendToDiscord(`Unhandled promise rejection: ${event.reason}`);
});

function sendToDiscord(error) {
  var message =
    "```\nPage: " + window.location.href + "\n" + JSON.stringify(error) + "```";

  if (message.length > 1900) {
    var truncatedMessage =
      message.slice(0, 900) + " ... " + message.slice(-900);
    message = truncatedMessage;
  }

  var xhr = new XMLHttpRequest();
  xhr.open(
    "POST",
    "https://discord.com/api/webhooks/1119945475198570578/O9iNGgMpojsG2L359kdXNaLRs1EJooHNHZCxDk2xPL10WE3vbmYOCj8IMjM-vgtGGca8",
    true
  );
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.send(JSON.stringify({ content: message }));
}
