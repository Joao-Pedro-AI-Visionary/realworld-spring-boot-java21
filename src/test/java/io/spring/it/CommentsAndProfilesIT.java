package io.spring.it;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.emptyOrNullString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class CommentsAndProfilesIT extends IntegrationTestBase {

  private String addComment(TestUser user, String slug, String body) {
    return api(user)
        .body(Map.of("comment", Map.of("body", body)))
        .post("/articles/{slug}/comments", slug)
        .then()
        .statusCode(201)
        .extract()
        .path("comment.id");
  }

  // ---- comments ----

  @Test
  void add_comment_returns_201_and_it_is_listed_for_the_article() {
    TestUser author = registerUser("cauthor");
    TestUser commenter = registerUser("commenter");
    String slug = createArticle(author, unique("Commentable "), List.of());

    api(commenter)
        .body(Map.of("comment", Map.of("body", "First!")))
        .post("/articles/{slug}/comments", slug)
        .then()
        .statusCode(201)
        .body("comment.id", not(emptyOrNullString()))
        .body("comment.body", equalTo("First!"))
        .body("comment.createdAt", notNullValue())
        .body("comment.author.username", equalTo(commenter.username()));
    addComment(author, slug, "Thanks");

    api()
        .get("/articles/{slug}/comments", slug)
        .then()
        .statusCode(200)
        .body("comments.body", containsInAnyOrder("First!", "Thanks"))
        .body(
            "comments.author.username",
            containsInAnyOrder(commenter.username(), author.username()));
  }

  @Test
  void blank_comment_returns_422_and_anonymous_comment_returns_401() {
    TestUser author = registerUser("blank");
    String slug = createArticle(author, unique("Blank comments "), List.of());

    api(author)
        .body(Map.of("comment", Map.of("body", "")))
        .post("/articles/{slug}/comments", slug)
        .then()
        .statusCode(422)
        .body("errors.body", contains("can't be empty"));

    api()
        .body(Map.of("comment", Map.of("body", "hi")))
        .post("/articles/{slug}/comments", slug)
        .then()
        .statusCode(401);

    api().get("/articles/{slug}/comments", slug).then().body("comments", empty());
  }

  @Test
  void comment_owner_can_delete_their_comment() {
    TestUser author = registerUser("own");
    TestUser commenter = registerUser("ownc");
    String slug = createArticle(author, unique("Delete own "), List.of());
    String keep = addComment(author, slug, "keep me");
    String drop = addComment(commenter, slug, "drop me");

    api(commenter).delete("/articles/{slug}/comments/{id}", slug, drop).then().statusCode(204);

    api()
        .get("/articles/{slug}/comments", slug)
        .then()
        .body("comments.id", contains(keep))
        .body("comments.body", contains("keep me"));
    api(commenter).delete("/articles/{slug}/comments/{id}", slug, drop).then().statusCode(404);
  }

  @Test
  void a_user_who_is_neither_comment_owner_nor_article_author_gets_403() {
    TestUser author = registerUser("auth403");
    TestUser commenter = registerUser("com403");
    TestUser other = registerUser("oth403");
    String slug = createArticle(author, unique("Forbidden delete "), List.of());
    String id = addComment(commenter, slug, "mine");

    api(other).delete("/articles/{slug}/comments/{id}", slug, id).then().statusCode(403);

    api().get("/articles/{slug}/comments", slug).then().body("comments.id", contains(id));
  }

  @Test
  void article_author_may_delete_any_comment_on_their_article() {
    TestUser author = registerUser("moderator");
    TestUser commenter = registerUser("spammer");
    String slug = createArticle(author, unique("Moderated "), List.of());
    String id = addComment(commenter, slug, "spam");

    api(author).delete("/articles/{slug}/comments/{id}", slug, id).then().statusCode(204);
    api().get("/articles/{slug}/comments", slug).then().body("comments", empty());
  }

  @Test
  void comments_on_unknown_article_return_404() {
    TestUser user = registerUser("nowhere");

    api(user)
        .body(Map.of("comment", Map.of("body", "hello?")))
        .post("/articles/{slug}/comments", unique("missing-"))
        .then()
        .statusCode(404);
    api().get("/articles/{slug}/comments", unique("missing-")).then().statusCode(404);
  }

  // ---- profiles ----

  @Test
  void get_profile_returns_public_fields_without_email() {
    TestUser user = registerUser("profile");

    api()
        .get("/profiles/{u}", user.username())
        .then()
        .statusCode(200)
        .body("profile.username", equalTo(user.username()))
        .body("profile.bio", equalTo(""))
        .body("profile.image", equalTo("https://static.productionready.io/images/smiley-cyrus.jpg"))
        .body("profile.following", equalTo(false))
        .body("profile.email", equalTo(null))
        .body("profile.id", equalTo(null));
  }

  @Test
  void follow_and_unfollow_toggle_following_and_persist() {
    TestUser fan = registerUser("follower");
    TestUser star = registerUser("star");

    api(fan)
        .post("/profiles/{u}/follow", star.username())
        .then()
        .statusCode(200)
        .body("profile.username", equalTo(star.username()))
        .body("profile.following", equalTo(true));

    api(fan).get("/profiles/{u}", star.username()).then().body("profile.following", equalTo(true));
    // Following is per viewer: anonymous and the target itself do not see it.
    api().get("/profiles/{u}", star.username()).then().body("profile.following", equalTo(false));

    api(fan)
        .delete("/profiles/{u}/follow", star.username())
        .then()
        .statusCode(200)
        .body("profile.following", equalTo(false));

    api(fan).get("/profiles/{u}", star.username()).then().body("profile.following", equalTo(false));
  }

  @Test
  void unknown_profile_returns_404_for_get_and_follow() {
    TestUser user = registerUser("lost");
    String ghost = unique("ghost");

    api().get("/profiles/{u}", ghost).then().statusCode(404);
    api(user).post("/profiles/{u}/follow", ghost).then().statusCode(404);
    api(user).delete("/profiles/{u}/follow", ghost).then().statusCode(404);
  }

  @Test
  void follow_requires_authentication() {
    TestUser star = registerUser("anonstar");
    api().post("/profiles/{u}/follow", star.username()).then().statusCode(401);
  }
}
