/// Summary module - handles all meeting summary generation functionality
///
/// This module contains:
/// - LLM client for communicating with various AI providers (OpenAI, Claude, Groq, Ollama, OpenRouter, CustomOpenAI)
/// - Processor for chunking transcripts and generating summaries
/// - Service layer for orchestrating summary generation
/// - Templates for structured meeting summary generation
/// - Tauri commands for frontend integration

use serde::{Deserialize, Serialize};

/// Custom OpenAI-compatible endpoint configuration
/// Stored as JSON in the database and used for connecting to any OpenAI-compatible API server
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomOpenAIConfig {
    /// Base URL of the OpenAI-compatible API endpoint (e.g., "http://localhost:8000/v1")
    pub endpoint: String,
    /// API key for authentication (optional if server doesn't require it)
    #[serde(rename = "apiKey")]
    pub api_key: Option<String>,
    /// Model identifier to use (e.g., "gpt-4", "llama-3-70b", "mistral-7b")
    pub model: String,
    /// Maximum tokens for completion (optional)
    #[serde(rename = "maxTokens")]
    pub max_tokens: Option<i32>,
    /// Temperature parameter (0.0-2.0, optional)
    pub temperature: Option<f32>,
    /// Top-P sampling parameter (0.0-1.0, optional)
    #[serde(rename = "topP")]
    pub top_p: Option<f32>,
}

pub mod commands;
pub mod llm_client;
pub mod processor;
pub mod service;
pub mod summary_engine;
pub mod template_commands;
pub mod templates;

// Re-export Tauri commands (with their generated __cmd__ variants)
pub use commands::{
    __cmd__api_cancel_summary, __cmd__api_get_summary, __cmd__api_process_transcript,
    __cmd__api_get_structured_summary, __cmd__api_save_meeting_summary, api_cancel_summary,
    api_get_structured_summary, api_get_summary, api_process_transcript, api_save_meeting_summary,
};

// Re-export template commands
pub use template_commands::{
    __cmd__api_delete_template, __cmd__api_get_template_details, __cmd__api_list_templates,
    __cmd__api_save_template, __cmd__api_validate_template, api_delete_template,
    api_get_template_details, api_list_templates, api_save_template, api_validate_template,
};

// Re-export commonly used items
pub use llm_client::{LLMProvider, StructuredResponseFormat};
pub use processor::{
    best_effort_parse, chunk_text, clean_llm_markdown_output, clean_llm_response,
    extract_meeting_name_from_markdown, generate_meeting_summary,
    get_json_format_instruction, get_structured_summary_json_schema, parse_structured_summary,
    rough_token_count, StructuredSummary,
};
pub use service::SummaryService;
