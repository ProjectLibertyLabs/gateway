use crate::api::{echo_payload, health_check};
use actix_web::middleware::Logger;
use actix_web::web::Data;
use actix_web::{App, HttpServer};
use api::get_payload;
use apistos::app::{BuildConfig, OpenApiWrapper};
use apistos::info::Info;
use apistos::server::Server;
use apistos::spec::Spec;
use apistos::web::{get, post, resource, scope};
use apistos::{RapidocConfig, RedocConfig, SwaggerUIConfig};
use types::{AppState, SIWFSignup};
use std::error::Error;
use std::net::Ipv4Addr;
use std::sync::Mutex;

mod api;
mod types;

const WEBHOOK_BASE_URL: &str = "/webhooks";
const WEBHOOK_ENDPOINT: &str = "/account-service";

#[actix_web::main]
async fn main() -> Result<(), impl Error> {
    const HOST: Ipv4Addr = Ipv4Addr::new(127, 0, 0, 1);
    const PORT: u16 = 3001;
    env_logger::init();
    println!(
        "Starting Webhook Server on http://{}:{}{}{}",
        HOST, PORT, WEBHOOK_BASE_URL, WEBHOOK_ENDPOINT
    );
    let app_state = Data::new(AppState {
        last_payload: Mutex::new(SIWFSignup {
            reference_id: "123".to_string(),
            account_id: "456".to_string(),
            msa_id: "789".to_string(),
            handle: "initialHandle".to_string(),
            provider_id: "initialProvider".to_string(),
        }),
    });
    HttpServer::new(move || {
        let spec = Spec {
            info: Info {
                title: "Webhook Server".to_string(),
                version: "1.0".to_string(),
                description: Some("A simple webhook server".to_string()),
                ..Default::default()
            },
            servers: vec![Server {
                url: "/".to_string(),
                ..Default::default()
            }],
            ..Default::default()
        };

        App::new()
            .app_data(app_state.clone())
            .document(spec)
            .wrap(Logger::default())
            .service(
                scope(WEBHOOK_BASE_URL)
                    .service(resource("/health").route(get().to(health_check)))
                    .service
                        (resource(WEBHOOK_ENDPOINT)
                        .route(get().to(get_payload))
                        .route(post().to(echo_payload))
                    ),
            )
            .build_with(
                "openapi.json",
                BuildConfig::default()
                    .with(RapidocConfig::new(&"/rapidoc"))
                    .with(RedocConfig::new(&"/redoc"))
                    .with(SwaggerUIConfig::new(&"/swagger")),
            )
    })
    .bind((HOST, PORT))?
    .run()
    .await
}
