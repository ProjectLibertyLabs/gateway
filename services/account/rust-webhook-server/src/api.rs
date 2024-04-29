use actix_web::web::Json;
use actix_web::Error;
use apistos::actix::CreatedJson;
use apistos::{api_operation, ApiComponent };
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[derive(Serialize, JsonSchema, ApiComponent)]
pub struct HealthResponse {
    pub message: String
}

#[derive(Deserialize, Serialize, JsonSchema, ApiComponent)]
#[serde(tag = "transactionType")]
pub enum WebhookCallback {
    #[serde(rename = "SIWF_SIGNUP")]
    SIWFSignup(SIWFSignup),
    #[serde(rename = "CHANGE_HANDLE")]
    HandleChange(HandleChanged),
    #[serde(rename = "CREATE_HANDLE")]
    HandleCreated(HandleCreated),
    #[serde(rename = "ADD_KEY")]
    KeyAdded(KeyAdded),
}

#[derive(Serialize, Deserialize, Debug, JsonSchema, ApiComponent)]
pub struct SIWFSignup {
    #[serde(rename = "referenceId")]
    pub reference_id: String,
    #[serde(rename = "accountId")]
    pub account_id: String,
    #[serde(rename = "msaId")]
    pub msa_id: String,
    pub handle: String,
    #[serde(rename = "providerId")]
    pub provider_id: String,
}

#[derive(Serialize, Deserialize, Debug, JsonSchema, ApiComponent)]
pub struct HandleChanged {
    pub reference_id: String,
    pub address: String,
    pub msa_id: String,
    pub handle: String,
}

#[derive(Serialize, Deserialize, Debug, JsonSchema, ApiComponent)]
pub struct KeyAdded {
    pub reference_id: String,
    pub address: String,
    pub msa_id: String,
    pub new_key: String,
    pub handle: String,
}

#[derive(Serialize, Deserialize, Debug, JsonSchema, ApiComponent)]
pub struct HandleCreated {
    pub reference_id: String,
    pub address: String,
    pub msa_id: String,
    pub handle: String,
}

#[derive(Serialize, JsonSchema, ApiComponent)]
pub struct EchoPayload {
    pub reference_id: String,
    pub address: String,
    pub msa_id: String,
    pub handle: String,
}

#[api_operation(
    tag = "webhook",
    summary = "Echo payload",
    description = "Echoes the payload back to the client",
    error_code = 400,
)]
pub(crate) async fn echo_payload(body: Json<WebhookCallback>) -> Result<CreatedJson<WebhookCallback>, Error> {
    println!("Received payload: {}", serde_json::to_string_pretty(&body).unwrap());
    match body.into_inner() {
        WebhookCallback::SIWFSignup(payload) => {
            println!("SIWFSignup: {:?}", payload);
            Ok(CreatedJson(WebhookCallback::SIWFSignup(payload)))
        }
        WebhookCallback::HandleChange(payload) => {
            println!("HandleChange: {:?}", payload);
            Ok(CreatedJson(WebhookCallback::HandleChange(payload)))
        }
        WebhookCallback::HandleCreated(payload) => {
            println!("HandleCreated: {:?}", payload);
            Ok(CreatedJson(WebhookCallback::HandleCreated(payload)))
        }
        WebhookCallback::KeyAdded(payload) => {
            println!("KeyAdded: {:?}", payload);
            Ok(CreatedJson(WebhookCallback::KeyAdded(payload)))
        }
    }
}

#[api_operation(summary = "Health check")]
pub(crate) async fn health_check() -> Result<Json<HealthResponse>, Error> {
    println!("Health check");
    Ok(Json(HealthResponse {
        message: String::from("Server is healthy")
    }))
}



