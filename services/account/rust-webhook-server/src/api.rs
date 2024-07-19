use crate::types::{AppState, HealthResponse, SIWFSignup, WebhookCallback};
use actix_web::web::{self, Json};
use actix_web::Error;
use apistos::actix::CreatedJson;
use apistos::api_operation;

#[api_operation(
    tag = "webhook",
    summary = "Echo payload",
    description = "Echoes the payload back to the client",
    error_code = 400
)]
pub(crate) async fn echo_payload(
    data: web::Data<AppState>,
    body: web::Json<WebhookCallback>,
) -> Result<CreatedJson<WebhookCallback>, Error> {
    println!(
        "Received payload: {}",
        serde_json::to_string_pretty(&body).unwrap()
    );

    match body.into_inner() {
        WebhookCallback::SIWFSignup(payload) => {
            println!(
                "SIWFSignup: {}",
                WebhookCallback::SIWFSignup(payload.clone())
            );
            let mut last_payload = data.last_payload.lock().unwrap();
            *last_payload = SIWFSignup {
                reference_id: payload.reference_id.clone(),
                account_id: payload.account_id.clone(),
                msa_id: payload.msa_id.clone(),
                handle: payload.handle.clone(),
                provider_id: payload.provider_id.clone(),
            };

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

#[api_operation(
    tag = "webhook",
    summary = "Get payload",
    description = "Get the payload by reference ID",
    error_code = 404
)]
pub(crate) async fn get_payload(
    data: web::Data<AppState>,
) -> Result<CreatedJson<SIWFSignup>, Error> {
    let payload = data.last_payload.lock().unwrap();
    Ok(CreatedJson(SIWFSignup {
        reference_id: payload.reference_id.clone(),
        account_id: payload.account_id.clone(),
        msa_id: payload.msa_id.clone(),
        handle: payload.handle.clone(),
        provider_id: payload.provider_id.clone(),
    }))
}

#[api_operation(summary = "Health check")]
pub(crate) async fn health_check() -> Result<Json<HealthResponse>, Error> {
    println!("Health check");
    Ok(Json(HealthResponse {
        message: String::from("Server is healthy"),
    }))
}
