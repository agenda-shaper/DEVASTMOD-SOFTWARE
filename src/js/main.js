const { invoke } = window.__TAURI__.tauri;

async function init() {
  //var form = document.getElementById("activating_id");
  //console.log(form);

  //console.log(installing_label);
  //form.style.display = "flex";
  let data = await invoke("check_activation_code");
  auth_key(data);

  //console.log("invoked");
}

async function activateSoftware() {
  // Get the input field that holds the activation key.
  let inputField = document.querySelector("#activation-key");
  let errorMessage = document.querySelector("#errorMessage");

  // Get the activation key.
  let activationKey = inputField.value;
  auth_key(activationKey);
}

async function auth_key(activationKey) {
  //let ss = await invoke("send_prompt_tauri");
  //console.log(ss);
  // Send the activation key to the server.
  let response = await fetch(
    "https://crypto-ai-page-vercel.vercel.app/auth_software",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ activation_key: activationKey }),
    }
  );

  // Get the server's response.
  let data = await response.json();

  // Log the server's response to the console.
  console.log(data);
  errorMessage.innerHTML = data;
  if (data == "success") {
    // show gif loading and say please dont close we are installing
    var installing_label = document.getElementById("installing");
    //var form = document.getElementById("activating_id");
    //console.log(form);

    console.log(installing_label);
    installing_label.style.display = "flex";
    await invoke("write_activation_code", { activationCode: activationKey });
    await invoke("init_app", { event: {} });
    //form.style.display = "flex";
    console.log("invoked");
    installing_label.style.display = "none";
    //window.location.href = "/load_video.html";
  }
}
init();
