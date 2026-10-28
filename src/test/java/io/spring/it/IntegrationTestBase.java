package io.spring.it;

import static io.restassured.RestAssured.given;

import io.restassured.http.ContentType;
import io.restassured.response.Response;
import io.restassured.specification.RequestSpecification;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.annotation.DirtiesContext.ClassMode;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/**
 * Full-stack base: real embedded server on a random port, real Spring Security filter chain, real
 * MyBatis + Flyway against a file-backed SQLite database.
 *
 * <p>Isolation: {@link DirtiesContext} closes the context after each test class, so every class
 * boots a fresh context and {@link #isolatedDatabase} runs again with a new database file. Tests
 * inside one class share that database and therefore use {@link #unique} names.
 */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@DirtiesContext(classMode = ClassMode.AFTER_CLASS)
public abstract class IntegrationTestBase {

  protected static final String API = "/api";
  protected static final String PASSWORD = "s3cret-Passw0rd";

  @LocalServerPort protected int port;

  @DynamicPropertySource
  static void isolatedDatabase(DynamicPropertyRegistry registry) {
    Path db = Path.of(System.getProperty("java.io.tmpdir"), "it-" + UUID.randomUUID() + ".db");
    db.toFile().deleteOnExit();
    String url = "jdbc:sqlite:" + db.toAbsolutePath();
    registry.add("spring.datasource.url", () -> url);
  }

  /** A registered user together with the JWT the API issued for it. */
  public record TestUser(String username, String email, String password, String token) {
    public String authHeader() {
      return "Token " + token;
    }
  }

  protected static String unique(String prefix) {
    return prefix + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
  }

  /** Request against the REST API (base path /api), anonymous. */
  protected RequestSpecification api() {
    return given().port(port).basePath(API).contentType(ContentType.JSON).accept(ContentType.JSON);
  }

  /** Request against the REST API authenticated as {@code user}. */
  protected RequestSpecification api(TestUser user) {
    return api().header("Authorization", user.authHeader());
  }

  /** Request against the server root (no /api prefix): actuator, springdoc, graphql. */
  protected RequestSpecification root() {
    return given().port(port);
  }

  protected Response register(String username, String email, String password) {
    return api()
        .body(Map.of("user", Map.of("username", username, "email", email, "password", password)))
        .post("/users");
  }

  protected TestUser registerUser(String prefix) {
    String username = unique(prefix);
    String email = username + "@example.com";
    String token =
        register(username, email, PASSWORD).then().statusCode(201).extract().path("user.token");
    return new TestUser(username, email, PASSWORD, token);
  }

  protected Response login(String email, String password) {
    return api()
        .body(Map.of("user", Map.of("email", email, "password", password)))
        .post("/users/login");
  }

  protected Response postArticle(
      TestUser author, String title, String description, String body, List<String> tags) {
    return api(author)
        .body(
            Map.of(
                "article",
                Map.of("title", title, "description", description, "body", body, "tagList", tags)))
        .post("/articles");
  }

  /** Creates an article and returns its slug. */
  protected String createArticle(TestUser author, String title, List<String> tags) {
    return postArticle(author, title, "about " + title, "body of " + title, tags)
        .then()
        .statusCode(200)
        .extract()
        .path("article.slug");
  }

  protected void follow(TestUser follower, TestUser target) {
    api(follower).post("/profiles/{u}/follow", target.username()).then().statusCode(200);
  }
}
