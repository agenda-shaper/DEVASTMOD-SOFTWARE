
use std::fs::File;
use std::io::Read;
use std::io::Write;
use base64::decode;
use std::str;
use aes::Aes128;
use block_modes::{BlockMode, Cbc};
use block_modes::block_padding::Pkcs7;

// Create an alias for the type of the block cipher we're going to use
pub type Aes128Cbc = Cbc<Aes128, Pkcs7>;
use std::fs::OpenOptions;
use std::error::Error as StdError;

pub fn decrypt_file(input: &str, output: &str, key: &str) -> Result<(), Box<dyn StdError>> {
    // Convert the encrypted string and key to bytes
    let key_bytes = key.as_bytes();

    // Check key length 
    if key_bytes.len() != 16 {
        return Err("Key length must be 16 bytes at least".into());
    }

    // Create a new Aes object
    let cipher = Aes128Cbc::new_from_slices(key_bytes, &vec![0; 16])?;

    let mut reader = File::open(input)?;
    let mut buffer = Vec::new();
    reader.read_to_end(&mut buffer)?;
    let encrypted_bytes = decode(&buffer)?;
    
    // Decrypt the bytes
    let decrypted_bytes = cipher.decrypt_vec(&encrypted_bytes)?;

    let mut writer = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open(output)?;

    writer.write_all(&decrypted_bytes)?;

    Ok(())
}
