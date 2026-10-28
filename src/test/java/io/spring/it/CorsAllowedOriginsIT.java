package io.spring.it;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.nullValue;

import org.junit.jupiter.api.Test;
import org.springframework.test.context.TestPropertySource;

/**
 * CORS restricted by the {@code cors.allowed-origins} property (env {@code CORS_ALLOWED_ORIGINS}):
 * exact origins and wildcard patterns such as {@code https://*.vercel.app} are echoed back, any
 * other origin is rejected.
 */
@TestPropertySource(
    properties = "cors.allowed-origins=https://conduit.example.com, https://*.preview.example.com")
class CorsAllowedOriginsIT extends IntegrationTestBase {

  private void preflight(String origin, int expectedStatus, org.hamcrest.Matcher<?> allowOrigin) {
    root()
        .header("Origin", origin)
        .header("Access-Control-Request-Method", "POST")
        .header("Access-Control-Request-Headers", "Authorization, Content-Type")
        .options(API + "/articles")
        .then()
        .statusCode(expectedStatus)
        .header("Access-Control-Allow-Origin", allowOrigin);
  }

  @Test
  void preflight_from_an_exact_allowed_origin_echoes_that_origin() {
    root()
        .header("Origin", "https://conduit.example.com")
        .header("Access-Control-Request-Method", "PUT")
        .header("Access-Control-Request-Headers", "Authorization, Content-Type")
        .options(API + "/user")
        .then()
        .statusCode(200)
        .header("Access-Control-Allow-Origin", equalTo("https://conduit.example.com"))
        .header("Access-Control-Allow-Methods", containsString("PUT"))
        .header("Access-Control-Allow-Headers", containsString("Authorization"));
  }

  @Test
  void preflight_from_an_origin_matching_a_wildcard_pattern_echoes_that_origin() {
    preflight(
        "https://pr-42.preview.example.com", 200, equalTo("https://pr-42.preview.example.com"));
  }

  @Test
  void preflight_from_an_origin_outside_the_list_is_rejected_without_cors_headers() {
    preflight("https://evil.example.org", 403, nullValue());
    preflight("https://preview.example.com.evil.org", 403, nullValue());
  }
}
