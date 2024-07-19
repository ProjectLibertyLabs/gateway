
use std::fmt::{self, Display, Formatter};
use serde::{Deserialize, Serialize};
use schemars::JsonSchema;
use apistos::ApiComponent;
use std::sync::Mutex;

pub struct AppState {
    pub last_payload: Mutex<SIWFSignup>,
}

#[derive(Serialize, JsonSchema, ApiComponent)]
pub struct HealthResponse {
    pub message: String,
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

/// Implements the `Display` trait for the `WebhookCallback` enum.
///
/// This allows instances of `WebhookCallback` to be formatted as strings using the `fmt` method.
impl Display for WebhookCallback {
    fn fmt(&self, f: &mut Formatter) -> fmt::Result {
        match self {
            WebhookCallback::SIWFSignup(payload) => {
                write!(f, "\nreference_id: {}\n", payload.reference_id)?;
                write!(f, "account_id: {}\n", payload.account_id)?;
                write!(f, "msa_id: {}\n", payload.msa_id)?;
                write!(f, "handle: {}\n", payload.handle)?;
                write!(f, "provider_id: {}\n", payload.provider_id)?;
                Ok(())
            }
            WebhookCallback::HandleChange(payload) => {
                write!(f, "HandleChange: {:?}", payload)
            }
            WebhookCallback::HandleCreated(payload) => {
                write!(f, "HandleCreated: {:?}", payload)
            }
            WebhookCallback::KeyAdded(payload) => {
                write!(f, "KeyAdded: {:?}", payload)
            }
        }
    }
}
#[derive(Serialize, Deserialize, Clone, Debug, JsonSchema, ApiComponent)]
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
    #[serde(rename = "referenceId")]
    pub reference_id: String,
    #[serde(rename = "msaId")]
    pub msa_id: String,
    pub handle: String,
    #[serde(rename = "providerId")]
    pub provider_id: String,
}

#[derive(Serialize, Deserialize, Debug, JsonSchema, ApiComponent)]
pub struct KeyAdded {
    #[serde(rename = "referenceId")]
    pub reference_id: String,
    #[serde(rename = "msaId")]
    pub msa_id: String,
    #[serde(rename = "newPublicKey")]
    pub new_public_key: String,
}

#[derive(Serialize, Deserialize, Debug, JsonSchema, ApiComponent)]
pub struct HandleCreated {
    #[serde(rename = "referenceId")]
    pub reference_id: String,
    #[serde(rename = "msaId")]
    pub msa_id: String,
    pub handle: String,
    #[serde(rename = "providerId")]
    pub provider_id: String,
}
