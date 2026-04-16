//! Qwen3-ASR speech recognition engine module.
//!
//! This module provides multilingual speech-to-text transcription using the
//! Qwen3-ASR models (1.7B / 0.6B) via GGML (qwen3-asr.cpp). It supports both
//! batch and streaming inference modes.
//!
//! # Features
//!
//! - **Multilingual**: Supports 15+ languages natively
//! - **GGUF Format**: Single-file models, easy to manage
//! - **GPU Acceleration**: Metal (macOS), CUDA (NVIDIA)
//! - **Streaming**: Token-by-token output during decoding
//!
//! # Module Structure
//!
//! - `qwen_asr_engine`: Main engine implementation (model management, download, transcription)
//! - `model`: Safe FFI wrapper around qwen3-asr-sys
//! - `commands`: Tauri command interface for frontend integration

use std::ffi::OsStr;
use std::sync::LazyLock;

pub mod qwen_asr_engine;
pub mod model;
pub mod commands;

pub use qwen_asr_engine::{QwenAsrEngine, QwenAsrEngineError, ModelInfo, ModelStatus, QuantizationType, DownloadProgress};
pub use model::QwenAsrModel;
pub use commands::*;

static QWEN_PROMPT_LOGGING_ENABLED: LazyLock<bool> = LazyLock::new(|| {
	std::env::args_os().any(|arg| {
		arg == OsStr::new("--qwen-log-prompt") || arg == OsStr::new("--qwen3-log-prompt")
	}) || std::env::var("MEETILY_QWEN_LOG_PROMPT")
		.map(|value| matches!(value.trim().to_ascii_lowercase().as_str(), "1" | "true" | "yes" | "on"))
		.unwrap_or(false)
});

static QWEN_DEBUG_LOGGING_ENABLED: LazyLock<bool> = LazyLock::new(|| {
	std::env::args_os().any(|arg| {
		arg == OsStr::new("--qwen-debug") || arg == OsStr::new("--qwen3-debug")
	}) || std::env::var("MEETILY_QWEN_DEBUG")
		.map(|value| matches!(value.trim().to_ascii_lowercase().as_str(), "1" | "true" | "yes" | "on"))
		.unwrap_or(false)
});

pub fn qwen_prompt_logging_enabled() -> bool {
	*QWEN_PROMPT_LOGGING_ENABLED
}

pub fn qwen_debug_logging_enabled() -> bool {
	*QWEN_DEBUG_LOGGING_ENABLED
}

pub fn format_qwen_prompt_preview(language: Option<&str>, audio_samples: usize) -> String {
	let mut preview = String::from("<|im_start|>system\n");
	if let Some(language) = language.filter(|value| !value.trim().is_empty()) {
		preview.push_str("Transcribe the audio in ");
		preview.push_str(language);
		preview.push_str(".\n");
	}
	preview.push_str("<|im_end|>\n<|im_start|>user\n");
	preview.push_str(&format!("<audio: {} samples injected by encoder>\n", audio_samples));
	preview.push_str("<|im_end|>\n<|im_start|>assistant\n");
	preview
}

pub fn normalize_language_hint(language: Option<&str>) -> Option<String> {
	let trimmed = language?.trim();
	if trimmed.is_empty() {
		return None;
	}

	let normalized = match trimmed.to_ascii_lowercase().as_str() {
		"auto" | "auto-translate" | "auto_detect" | "auto-detect" => return None,
		"en" | "eng" | "english" => "English",
		"zh" | "cmn" | "chinese" | "mandarin" => "Chinese",
		"ja" | "jpn" | "japanese" => "Japanese",
		"ko" | "kor" | "korean" => "Korean",
		"fr" | "fra" | "fre" | "french" => "French",
		"de" | "deu" | "ger" | "german" => "German",
		"es" | "spa" | "spanish" => "Spanish",
		"pt" | "por" | "portuguese" => "Portuguese",
		"ru" | "rus" | "russian" => "Russian",
		"it" | "ita" | "italian" => "Italian",
		"nl" | "nld" | "dut" | "dutch" => "Dutch",
		"tr" | "tur" | "turkish" => "Turkish",
		"ar" | "ara" | "arabic" => "Arabic",
		"pl" | "pol" | "polish" => "Polish",
		"sv" | "swe" | "swedish" => "Swedish",
		"no" | "nor" | "norwegian" => "Norwegian",
		"da" | "dan" | "danish" => "Danish",
		"fi" | "fin" | "finnish" => "Finnish",
		"hu" | "hun" | "hungarian" => "Hungarian",
		"cs" | "ces" | "cze" | "czech" => "Czech",
		"ro" | "ron" | "rum" | "romanian" => "Romanian",
		"bg" | "bul" | "bulgarian" => "Bulgarian",
		"el" | "gre" | "ell" | "greek" => "Greek",
		"sr" | "srp" | "serbian" => "Serbian",
		"hr" | "hrv" | "croatian" => "Croatian",
		"sk" | "slk" | "slo" | "slovak" => "Slovak",
		"sl" | "slv" | "slovenian" => "Slovenian",
		"uk" | "ukr" | "ukrainian" => "Ukrainian",
		"ca" | "cat" | "catalan" => "Catalan",
		"vi" | "vie" | "vietnamese" => "Vietnamese",
		"th" | "tha" | "thai" => "Thai",
		"id" | "ind" | "indonesian" => "Indonesian",
		"ms" | "msa" | "may" | "malay" => "Malay",
		"hi" | "hin" | "hindi" => "Hindi",
		"ta" | "tam" | "tamil" => "Tamil",
		"te" | "tel" | "telugu" => "Telugu",
		"bn" | "ben" | "bengali" => "Bengali",
		"ur" | "urd" | "urdu" => "Urdu",
		"fa" | "fas" | "per" | "persian" | "farsi" => "Persian",
		"he" | "heb" | "hebrew" => "Hebrew",
		"yue" | "cantonese" => "Cantonese",
		other => {
			let mut chars = other.chars();
			match chars.next() {
				Some(first) => {
					let mut value = first.to_uppercase().collect::<String>();
					value.push_str(chars.as_str());
					return Some(value);
				}
				None => return None,
			}
		}
	};

	Some(normalized.to_string())
}
