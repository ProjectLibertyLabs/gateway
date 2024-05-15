use crate::api::{echo_payload, health_check};
use actix_web::middleware::Logger;
use actix_web::{App, HttpServer};
use apistos::app::{BuildConfig, OpenApiWrapper};
use apistos::info::Info;
use apistos::server::Server;
use apistos::spec::Spec;
use apistos::web::{get, post, resource, scope};
use apistos::{RapidocConfig, RedocConfig, SwaggerUIConfig};
use std::error::Error;
use std::net::Ipv4Addr;

mod api;

#[actix_web::main]
async fn main() -> Result<(), impl Error> {
    const HOST: Ipv4Addr = Ipv4Addr::new(127, 0, 0, 1);
    const PORT: u16 = 5555;
    println!("Starting Webhook Server on http://{}:{}/api/v3/webhook", HOST, PORT);
    HttpServer::new(|| {
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
            .document(spec)
            .wrap(Logger::default())
            .service(
                scope("/api/v3")
                    .service(resource("/health").route(get().to(health_check)))
                    .service(resource("/webhook").route(post().to(echo_payload))),
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
