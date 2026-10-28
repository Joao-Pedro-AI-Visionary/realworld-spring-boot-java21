package io.spring.it;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** Articles, favorites and tags through the real HTTP stack and database. */
class ArticlesIT extends IntegrationTestBase {

  @Test
  void create_article_returns_article_with_slug_tags_and_author() {
    TestUser author = registerUser("writer");
    String suffix = unique("");
    String title = "How To Train Your Dragon " + suffix;

    // Note: the controller answers 200 (not 201) for article creation; asserted as-is.
    postArticle(
            author,
            title,
            "Ever wonder how?",
            "You have to believe",
            List.of("dragons", "training"))
        .then()
        .statusCode(200)
        .body("article.slug", equalTo("how-to-train-your-dragon-" + suffix.toLowerCase()))
        .body("article.title", equalTo(title))
        .body("article.description", equalTo("Ever wonder how?"))
        .body("article.body", equalTo("You have to believe"))
        .body("article.tagList", containsInAnyOrder("dragons", "training"))
        .body("article.favorited", equalTo(false))
        .body("article.favoritesCount", equalTo(0))
        .body("article.createdAt", notNullValue())
        .body("article.author.username", equalTo(author.username()))
        .body("article.author.following", equalTo(false));
  }

  @Test
  void create_article_without_token_returns_401_and_persists_nothing() {
    String title = unique("Anonymous ");
    api()
        .body(
            Map.of(
                "article",
                Map.of("title", title, "description", "d", "body", "b", "tagList", List.of())))
        .post("/articles")
        .then()
        .statusCode(401);

    api().get("/articles/{slug}", title.toLowerCase().replace(' ', '-')).then().statusCode(404);
  }

  @Test
  void create_article_with_duplicate_title_or_blank_fields_returns_422() {
    TestUser author = registerUser("dup");
    String title = unique("Same Title ");
    createArticle(author, title, List.of());

    postArticle(author, title, "d", "b", List.of())
        .then()
        .statusCode(422)
        .body("errors.title", contains("article name exists"));

    postArticle(author, unique("t"), "", "", List.of())
        .then()
        .statusCode(422)
        .body("errors.description", contains("can't be empty"))
        .body("errors.body", contains("can't be empty"));
  }

  @Test
  void get_article_by_slug_anonymously_and_unknown_slug_returns_404() {
    TestUser author = registerUser("reader");
    String slug = createArticle(author, unique("Readable "), List.of("read"));

    api()
        .get("/articles/{slug}", slug)
        .then()
        .statusCode(200)
        .body("article.slug", equalTo(slug))
        .body("article.tagList", contains("read"))
        .body("article.author.username", equalTo(author.username()));

    api().get("/articles/{slug}", "no-such-" + slug).then().statusCode(404);
  }

  @Test
  void list_articles_filtered_by_tag_returns_only_tagged_articles() {
    TestUser author = registerUser("tagger");
    String tag = unique("tag");
    String tagged1 = createArticle(author, unique("Tagged one "), List.of(tag, "common"));
    String tagged2 = createArticle(author, unique("Tagged two "), List.of(tag));
    createArticle(author, unique("Untagged "), List.of("common"));

    api()
        .queryParam("tag", tag)
        .get("/articles")
        .then()
        .statusCode(200)
        .body("articlesCount", equalTo(2))
        .body("articles.slug", containsInAnyOrder(tagged1, tagged2))
        .body("articles.tagList", everyItem(hasItem(tag)));
  }

  @Test
  void list_articles_filtered_by_author_returns_only_that_authors_articles() {
    TestUser alice = registerUser("alice");
    TestUser bob = registerUser("bob");
    String a1 = createArticle(alice, unique("Alice one "), List.of());
    createArticle(bob, unique("Bob one "), List.of());

    api()
        .queryParam("author", alice.username())
        .get("/articles")
        .then()
        .statusCode(200)
        .body("articlesCount", equalTo(1))
        .body("articles.slug", contains(a1))
        .body("articles.author.username", everyItem(equalTo(alice.username())));
  }

  @Test
  void list_articles_filtered_by_favorited_returns_only_articles_that_user_favorited() {
    TestUser author = registerUser("favauthor");
    TestUser fan = registerUser("fan");
    String liked = createArticle(author, unique("Liked "), List.of());
    createArticle(author, unique("Ignored "), List.of());

    api(fan).post("/articles/{slug}/favorite", liked).then().statusCode(200);

    api()
        .queryParam("favorited", fan.username())
        .get("/articles")
        .then()
        .statusCode(200)
        .body("articlesCount", equalTo(1))
        .body("articles.slug", contains(liked))
        .body("articles[0].favoritesCount", equalTo(1));
  }

  @Test
  void list_articles_paginates_with_limit_and_offset_newest_first() throws Exception {
    TestUser author = registerUser("pager");
    String first = createArticle(author, unique("Page first "), List.of());
    Thread.sleep(20); // distinct created_at so the ordering is deterministic
    String second = createArticle(author, unique("Page second "), List.of());
    Thread.sleep(20);
    String third = createArticle(author, unique("Page third "), List.of());

    api()
        .queryParam("author", author.username())
        .queryParam("limit", 2)
        .get("/articles")
        .then()
        .statusCode(200)
        .body("articlesCount", equalTo(3))
        .body("articles.slug", contains(third, second));

    api()
        .queryParam("author", author.username())
        .queryParam("limit", 2)
        .queryParam("offset", 2)
        .get("/articles")
        .then()
        .statusCode(200)
        .body("articlesCount", equalTo(3))
        .body("articles.slug", contains(first));
  }

  @Test
  void feed_only_contains_articles_of_followed_authors() {
    TestUser reader = registerUser("feedreader");
    TestUser followed = registerUser("followed");
    TestUser stranger = registerUser("stranger");
    String fromFollowed = createArticle(followed, unique("Followed post "), List.of());
    String fromStranger = createArticle(stranger, unique("Stranger post "), List.of());

    api(reader).get("/articles/feed").then().statusCode(200).body("articlesCount", equalTo(0));

    follow(reader, followed);

    api(reader)
        .get("/articles/feed")
        .then()
        .statusCode(200)
        .body("articlesCount", equalTo(1))
        .body("articles.slug", contains(fromFollowed))
        .body("articles.slug", not(hasItem(fromStranger)))
        .body("articles[0].author.following", equalTo(true));

    api().get("/articles/feed").then().statusCode(401);
  }

  @Test
  void author_can_update_article_and_title_change_moves_the_slug() {
    TestUser author = registerUser("editor");
    String oldTitle = unique("Before Edit ");
    String oldSlug = createArticle(author, oldTitle, List.of());
    String newTitle = unique("After Edit ");

    String newSlug =
        api(author)
            .body(Map.of("article", Map.of("title", newTitle, "body", "edited body")))
            .put("/articles/{slug}", oldSlug)
            .then()
            .statusCode(200)
            .body("article.title", equalTo(newTitle))
            .body("article.body", equalTo("edited body"))
            .body("article.description", equalTo("about " + oldTitle))
            .extract()
            .path("article.slug");

    assertThat(newSlug).isNotEqualTo(oldSlug).startsWith("after-edit-");
    api()
        .get("/articles/{slug}", newSlug)
        .then()
        .statusCode(200)
        .body("article.body", equalTo("edited body"));
    api().get("/articles/{slug}", oldSlug).then().statusCode(404);
  }

  @Test
  void non_author_cannot_update_or_delete_article() {
    TestUser author = registerUser("owner");
    TestUser intruder = registerUser("intruder");
    String title = unique("Protected ");
    String slug = createArticle(author, title, List.of());

    api(intruder)
        .body(Map.of("article", Map.of("body", "hijacked")))
        .put("/articles/{slug}", slug)
        .then()
        .statusCode(403);

    api(intruder).delete("/articles/{slug}", slug).then().statusCode(403);

    api()
        .get("/articles/{slug}", slug)
        .then()
        .statusCode(200)
        .body("article.body", equalTo("body of " + title));
  }

  @Test
  void author_delete_returns_204_then_article_is_gone() {
    TestUser author = registerUser("deleter");
    String slug = createArticle(author, unique("Doomed "), List.of());

    api(author).delete("/articles/{slug}", slug).then().statusCode(204);

    api().get("/articles/{slug}", slug).then().statusCode(404);
    api()
        .queryParam("author", author.username())
        .get("/articles")
        .then()
        .statusCode(200)
        .body("articlesCount", equalTo(0));
    api(author).delete("/articles/{slug}", slug).then().statusCode(404);
  }

  @Test
  void favorite_and_unfavorite_update_favorited_and_favorites_count() {
    TestUser author = registerUser("favw");
    TestUser fan1 = registerUser("fan1");
    TestUser fan2 = registerUser("fan2");
    String slug = createArticle(author, unique("Lovable "), List.of());

    api(fan1)
        .post("/articles/{slug}/favorite", slug)
        .then()
        .statusCode(200)
        .body("article.favorited", equalTo(true))
        .body("article.favoritesCount", equalTo(1));

    // Favoriting twice is idempotent (composite primary key).
    api(fan1)
        .post("/articles/{slug}/favorite", slug)
        .then()
        .statusCode(200)
        .body("article.favoritesCount", equalTo(1));

    api(fan2)
        .post("/articles/{slug}/favorite", slug)
        .then()
        .statusCode(200)
        .body("article.favoritesCount", equalTo(2));

    api(fan1)
        .delete("/articles/{slug}/favorite", slug)
        .then()
        .statusCode(200)
        .body("article.favorited", equalTo(false))
        .body("article.favoritesCount", equalTo(1));

    // Persisted, seen from each viewer.
    api(fan1).get("/articles/{slug}", slug).then().body("article.favorited", equalTo(false));
    api(fan2)
        .get("/articles/{slug}", slug)
        .then()
        .body("article.favorited", equalTo(true))
        .body("article.favoritesCount", equalTo(1));

    api(fan1).post("/articles/{slug}/favorite", "missing-" + slug).then().statusCode(404);
    api().post("/articles/{slug}/favorite", slug).then().statusCode(401);
  }

  @Test
  void anonymous_single_article_view_reports_the_real_favorites_count() {
    TestUser author = registerUser("anonfav");
    TestUser fan = registerUser("anonfan");
    String slug = createArticle(author, unique("Counted "), List.of());
    api(fan).post("/articles/{slug}/favorite", slug).then().statusCode(200);

    api()
        .queryParam("author", author.username())
        .get("/articles")
        .then()
        .body("articles[0].favoritesCount", equalTo(1));
    api()
        .get("/articles/{slug}", slug)
        .then()
        .statusCode(200)
        .body("article.favorited", equalTo(false))
        .body("article.favoritesCount", equalTo(1));
  }

  @Test
  void tags_endpoint_lists_tags_used_by_articles_without_duplicates() {
    TestUser author = registerUser("tags");
    String t1 = unique("alpha");
    String t2 = unique("beta");
    createArticle(author, unique("Tags one "), List.of(t1, t2));
    createArticle(author, unique("Tags two "), List.of(t1));

    List<String> tags = api().get("/tags").then().statusCode(200).extract().path("tags");

    assertThat(tags).contains(t1, t2);
    assertThat(tags.stream().filter(t1::equals)).hasSize(1);
    api().get("/tags").then().body("tags", hasItems(t1, t2));
  }
}
