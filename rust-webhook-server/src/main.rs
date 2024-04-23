use actix_web::{web, App, HttpServer, Responder, HttpResponse};

async fn echo_payload(info: web::Json<serde_json::Value>) -> impl Responder {
    println!("Received payload: {}", info);
    HttpResponse::Ok().json("Payload received")
}

async fn health_check() -> impl Responder {
    HttpResponse::Ok().json("Server is healthy")
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("Starting Webhook Server...");
    HttpServer::new(|| {
        App::new()
            .route("/webhook", web::post().to(echo_payload))
            .route("/health", web::get().to(health_check))
    })
    .bind("0.0.0.0:5555")?
    .run()
    .await
}
