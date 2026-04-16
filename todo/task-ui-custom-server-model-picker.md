# Task: Custom Server Model Picker

status: pending

## What

When the user selects `Custom Server (OpenAI)` as the summarization provider, instead of typing a model name into a plain text field, they should be able to fetch the available models from the configured endpoint and pick one from selectable model cards — matching the visual style of `BuiltInModelManager`.

This applies in two places:
- `ModelSettingsModal` — when provider is `custom-openai`
- `SummaryModelSettings` / Settings → Summary → Model Settings — same provider view

## Where

- `frontend/src/components/CustomServerModelPicker.tsx` — new reusable component
- `frontend/src/components/ModelSettingsModal.tsx` — replace the "Model Name *" `<Input>` for `custom-openai` with `CustomServerModelPicker`
- `frontend/src-tauri/src/` — new `api_fetch_custom_openai_models` Tauri command
- `frontend/src-tauri/src/main.rs` (or wherever commands are registered) — register the command

## Reference: Existing Model Card Style

`BuiltInModelManager.tsx` renders selectable cards with:
- `ring-2 ring-primary border-primary` when selected
- `border-border hover:border-muted-foreground/30` when unselected
- Header: bold model name + small status/badge chips
- Body: description text, size/tokens metadata line in `text-xs text-muted-foreground/70`

Match this pattern for custom server model cards.

## Steps

### 1. Tauri command: `api_fetch_custom_openai_models`

Add to the backend (Rust):

```rust
#[tauri::command]
async fn api_fetch_custom_openai_models(
    endpoint: String,
    api_key: Option<String>,
) -> Result<Vec<String>, String> {
    // Normalise: strip trailing slash, append /models
    let url = format!("{}/models", endpoint.trim_end_matches('/'));

    let client = reqwest::Client::new();
    let mut req = client.get(&url);
    if let Some(key) = api_key.as_deref().filter(|k| !k.is_empty()) {
        req = req.bearer_auth(key);
    }

    let resp = req.send().await.map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("Server returned {}", resp.status()));
    }

    // OpenAI /v1/models shape: { "data": [{ "id": "...", ... }] }
    let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let ids = body["data"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .filter_map(|m| m["id"].as_str().map(|s| s.to_string()))
        .collect();
    Ok(ids)
}
```

Register in `main.rs` alongside the other `api_*` commands.

### 2. `CustomServerModelPicker` component

`frontend/src/components/CustomServerModelPicker.tsx`:

```tsx
interface CustomServerModelPickerProps {
  endpoint: string;
  apiKey?: string;
  selectedModel: string;
  onModelSelect: (model: string) => void;
}
```

State:
- `models: string[]` — fetched from server
- `isLoading: boolean`
- `error: string | null`
- `hasFetched: boolean`

Behaviour:
- Renders a "Fetch Models" button (`RefreshCw` icon). When endpoint is empty, the button is disabled.
- On click, calls `invoke<string[]>('api_fetch_custom_openai_models', { endpoint, apiKey })`.
- On success, renders a `<div className="grid gap-3 mt-3">` of model cards. Each card:
  - Click → calls `onModelSelect(modelId)`
  - Selected state: `ring-2 ring-primary border-primary`
  - Unselected: `border-border hover:border-muted-foreground/30 cursor-pointer`
  - Card body: bold model id on top; no description needed (server doesn't provide one)
- While loading: spinner replacing button label.
- On error: `<Alert>` with error message and a Retry button.
- If `hasFetched && models.length === 0`: "No models returned by server."

The existing plain `<Input>` for the model name should remain as a **manual fallback** below the picker. Pre-populate it with `selectedModel` so the user can still type if the server doesn't expose `/models`. Label it "Or enter model name manually".

### 3. Wire into `ModelSettingsModal`

In `ModelSettingsModal.tsx`, inside the `modelConfig.provider === 'custom-openai'` block, replace:

```tsx
<div>
  <Label htmlFor="custom-model">Model Name *</Label>
  <Input
    id="custom-model"
    value={customOpenAIModel}
    ...
  />
  ...
</div>
```

with:

```tsx
<CustomServerModelPicker
  endpoint={customOpenAIEndpoint}
  apiKey={customOpenAIApiKey}
  selectedModel={customOpenAIModel}
  onModelSelect={(m) => setCustomOpenAIModel(m)}
/>
```

Keep the manual input inside `CustomServerModelPicker` (see step 2).

### 4. Auto-fetch on endpoint change (debounced)

Inside `CustomServerModelPicker`, watch the `endpoint` prop. When it changes to a non-empty, valid URL and `hasFetched` is false for this endpoint, auto-fetch after a 1s debounce. Reset `hasFetched` when `endpoint` changes.

### 5. Validation note

`isCustomOpenAIInvalid` in `ModelSettingsModal` already checks `!customOpenAIModel.trim()` — this continues to work because the manual input stays bound to `customOpenAIModel`.

## Done When

- Clicking "Fetch Models" in the custom server section fetches `GET {endpoint}/models` and renders selectable model cards
- Clicking a card selects it and updates the model name (reflected in the manual input too)
- Manual text input still works as fallback
- Auto-fetch triggers when a valid endpoint is entered
- Same picker appears identically in `ModelSettingsModal` and `SummaryModelSettings` (reused component)
- `cargo check` and `pnpm build` pass
