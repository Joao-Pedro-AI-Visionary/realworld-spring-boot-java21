package io.spring.it;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.endsWith;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

/** Actuator, springdoc and CORS: unauthenticated infrastructure endpoints outside /api. */
class OpsEndpointsIT extends IntegrationTestBase {

  @Test
  void health_is_up_without_authentication() {
    root()
        .get("/actuator/health")
        .then()
        .statusCode(200)
        .contentType(containsString("json"))
        .body("status", equalTo("UP"));

    root().get("/actuator/health/liveness").then().statusCode(200).body("status", equalTo("UP"));
    root().get("/actuator/health/readiness").then().statusCode(200).body("status", equalTo("UP"));
  }

  @Test
  void api_docs_describe_the_prefixed_rest_paths_and_token_security_scheme() {
    root()
        .accept(ContentType.JSON)
        .get("/v3/api-docs")
        .then()
        .statusCode(200)
        .contentType(containsString("json"))
        .body("info.title", equalTo("RealWorld Conduit API"))
        .body("paths.'/api/articles'", notNullValue())
        .body("paths.'/api/articles/{slug}'", notNullValue())
        .body("paths.'/api/users/login'", notNullValue())
        .body("paths.'/api/tags'", notNullValue())
        .body("paths.'/articles'", nullValue())
        .body("components.securitySchemes.Token.type", equalTo("apiKey"))
        .body("components.securitySchemes.Token.in", equalTo("header"))
        .body("components.securitySchemes.Token.name", equalTo("Authorization"))
        .body("security[0].Token", notNullValue());
  }

  @Test
  void swagger_ui_html_redirects_to_the_served_swagger_ui() {
    String location =
        root()
            .redirects()
            .follow(false)
            .get("/swagger-ui.html")
            .then()
            .statusCode(302)
            .header("Location", endsWith("/swagger-ui/index.html"))
            .extract()
            .header("Location");

    root()
        .get(location.replaceFirst("^https?://[^/]+", ""))
        .then()
        .statusCode(200)
        .contentType(containsString("html"))
        .body(containsString("Swagger UI"));
  }

  @Test
  void cors_preflight_is_allowed_for_any_origin_on_the_api() {
    root()
        .header("Origin", "https://conduit.example")
        .header("Access-Control-Request-Method", "POST")
        .header("Access-Control-Request-Headers", "Authorization, Content-Type")
        .options(API + "/articles")
        .then()
        .statusCode(200)
        .header("Access-Control-Allow-Origin", equalTo("*"))
        .header("Access-Control-Allow-Methods", containsString("POST"));
  }
}
