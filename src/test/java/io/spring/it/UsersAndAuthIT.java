package io.spring.it;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.emptyOrNullString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.not;

import java.util.Map;
import org.junit.jupiter.api.Test;

class UsersAndAuthIT extends IntegrationTestBase {

  @Test
  void register_returns_201_with_a_token_that_authenticates_get_current_user() {
    String username = unique("reg");
    String email = username + "@example.com";

    String token =
        register(username, email, PASSWORD)
            .then()
            .statusCode(201)
            .body("user.username", equalTo(username))
            .body("user.email", equalTo(email))
            .body("user.bio", equalTo(""))
            .body(
                "user.image", equalTo("https://static.productionready.io/images/smiley-cyrus.jpg"))
            .body("user.token", not(emptyOrNullString()))
            .body("user", not(hasKey("password")))
            .extract()
            .path("user.token");

    api()
        .header("Authorization", "Token " + token)
        .get("/user")
        .then()
        .statusCode(200)
        .body("user.username", equalTo(username))
        .body("user.email", equalTo(email))
        .body("user.token", equalTo(token));
  }

  @Test
  void register_with_duplicated_email_returns_422_with_email_error() {
    TestUser existing = registerUser("dupe");

    register(unique("other"), existing.email(), PASSWORD)
        .then()
        .statusCode(422)
        .body("errors.email", contains("duplicated email"));
  }

  @Test
  void register_with_duplicated_username_returns_422_with_username_error() {
    TestUser existing = registerUser("dupu");

    register(existing.username(), unique("x") + "@example.com", PASSWORD)
        .then()
        .statusCode(422)
        .body("errors.username", contains("duplicated username"));
  }

  @Test
  void register_with_invalid_email_and_blank_password_returns_422_per_field() {
    register(unique("bad"), "not-an-email", "")
        .then()
        .statusCode(422)
        .body("errors.email", contains("should be an email"))
        .body("errors.password", contains("can't be empty"));
  }

  @Test
  void login_with_correct_credentials_returns_a_working_token() {
    TestUser user = registerUser("login");

    String token =
        login(user.email(), user.password())
            .then()
            .statusCode(200)
            .body("user.username", equalTo(user.username()))
            .body("user.email", equalTo(user.email()))
            .extract()
            .path("user.token");

    api()
        .header("Authorization", "Token " + token)
        .get("/user")
        .then()
        .statusCode(200)
        .body("user.username", equalTo(user.username()));
  }

  @Test
  void login_with_wrong_password_or_unknown_email_returns_422() {
    TestUser user = registerUser("wrongpw");

    login(user.email(), "not-the-password")
        .then()
        .statusCode(422)
        .body("message", equalTo("invalid email or password"))
        .body("user", equalTo(null));

    login(unique("ghost") + "@example.com", PASSWORD)
        .then()
        .statusCode(422)
        .body("message", equalTo("invalid email or password"));
  }

  @Test
  void get_current_user_without_token_returns_401() {
    api().get("/user").then().statusCode(401);
  }

  @Test
  void get_current_user_with_invalid_or_tampered_token_returns_401() {
    TestUser user = registerUser("tamper");

    api().header("Authorization", "Token not.a.jwt").get("/user").then().statusCode(401);

    // Flip a character in the middle of the signature (the last base64url char can carry only
    // unused padding bits, so changing it may not change the decoded signature at all).
    String token = user.token();
    int i = token.lastIndexOf('.') + 10;
    char c = token.charAt(i);
    String tampered = token.substring(0, i) + (c == 'x' ? 'y' : 'x') + token.substring(i + 1);
    api().header("Authorization", "Token " + tampered).get("/user").then().statusCode(401);

    // Payload swapped for another user's payload with the original signature.
    TestUser other = registerUser("victim");
    String[] mine = token.split("\\.");
    String[] theirs = other.token().split("\\.");
    String forged = mine[0] + "." + theirs[1] + "." + mine[2];
    api().header("Authorization", "Token " + forged).get("/user").then().statusCode(401);
  }

  @Test
  void update_user_persists_profile_fields() {
    TestUser user = registerUser("upd");

    api(user)
        .body(
            Map.of(
                "user",
                Map.of("bio", "I like integration tests", "image", "https://example.com/me.png")))
        .put("/user")
        .then()
        .statusCode(200)
        .body("user.bio", equalTo("I like integration tests"))
        .body("user.image", equalTo("https://example.com/me.png"))
        .body("user.username", equalTo(user.username()))
        .body("user.email", equalTo(user.email()));

    // Persisted: a fresh read sees the change, and the public profile too.
    api(user)
        .get("/user")
        .then()
        .statusCode(200)
        .body("user.bio", equalTo("I like integration tests"));
    api()
        .get("/profiles/{u}", user.username())
        .then()
        .statusCode(200)
        .body("profile.bio", equalTo("I like integration tests"))
        .body("profile.image", equalTo("https://example.com/me.png"));
    // Untouched credentials keep working.
    login(user.email(), user.password()).then().statusCode(200);
  }

  @Test
  void update_user_password_is_hashed_and_new_password_can_log_in() {
    TestUser user = registerUser("updpw");
    String newPassword = "brand-new-Passw0rd";

    api(user)
        .body(Map.of("user", Map.of("password", newPassword)))
        .put("/user")
        .then()
        .statusCode(200);

    login(user.email(), user.password()).then().statusCode(422);
    login(user.email(), newPassword).then().statusCode(200);
  }

  @Test
  void update_user_to_an_email_owned_by_someone_else_returns_422_and_changes_nothing() {
    TestUser alice = registerUser("alice");
    TestUser bob = registerUser("bob");

    api(bob)
        .body(Map.of("user", Map.of("email", alice.email())))
        .put("/user")
        .then()
        .statusCode(422)
        .body("errors.email", hasItem("email already exist"));

    api(bob).get("/user").then().statusCode(200).body("user.email", equalTo(bob.email()));
  }
}
