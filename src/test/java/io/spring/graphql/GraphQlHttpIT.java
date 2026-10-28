package io.spring.graphql;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.emptyOrNullString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

import io.restassured.http.ContentType;
import io.restassured.response.Response;
import io.restassured.specification.RequestSpecification;
import io.spring.it.IntegrationTestBase;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/**
 * GraphQL over real HTTP (POST /graphql) so the JWT filter, Spring Security context and DGS data
 * fetchers run exactly as in production.
 */
class GraphQlHttpIT extends IntegrationTestBase {

  private static final String CREATE_USER =
      """
      mutation CreateUser($input: CreateUserInput) {
        createUser(input: $input) {
          __typename
          ... on UserPayload { user { email username token profile { username following } } }
          ... on Error { message errors { key value } }
        }
      }
      """;

  private static final String LOGIN =
      """
      mutation Login($email: String!, $password: String!) {
        login(email: $email, password: $password) { user { username email token } }
      }
      """;

  private static final String CREATE_ARTICLE =
      """
      mutation CreateArticle($input: CreateArticleInput!) {
        createArticle(input: $input) {
          article { slug title description body tagList favorited favoritesCount author { username } }
        }
      }
      """;

  private static final String ARTICLES_BY_TAG =
      """
      query Articles($tag: String, $after: String) {
        articles(first: 2, after: $after, withTag: $tag) {
          edges { cursor node { slug } }
          pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
        }
      }
      """;

  private RequestSpecification graphql() {
    return root().contentType(ContentType.JSON).accept(ContentType.JSON);
  }

  private Response gql(String query, Map<String, ?> variables) {
    return graphql().body(Map.of("query", query, "variables", variables)).post("/graphql");
  }

  private Response gql(TestUser user, String query, Map<String, ?> variables) {
    return graphql()
        .header("Authorization", user.authHeader())
        .body(Map.of("query", query, "variables", variables))
        .post("/graphql");
  }

  private String gqlCreateArticle(TestUser user, String title, List<String> tags) {
    return gql(
            user,
            CREATE_ARTICLE,
            Map.of(
                "input",
                Map.of("title", title, "description", "desc", "body", "body", "tagList", tags)))
        .then()
        .statusCode(200)
        .body("errors", nullValue())
        .extract()
        .path("data.createArticle.article.slug");
  }

  /** Regression: the plain HTTP body must be readable (no root-value unwrapping on /graphql). */
  @Test
  void plain_post_of_tags_query_returns_200_and_data() {
    TestUser user = registerUser("gqltags");
    String tag = unique("gqltag");
    createArticle(user, unique("Gql tags "), List.of(tag));

    root()
        .contentType(ContentType.JSON)
        .body("{\"query\":\"{ tags }\"}")
        .post("/graphql")
        .then()
        .statusCode(200)
        .body("errors", nullValue())
        .body("data.tags", hasItem(tag));
  }

  @Test
  void create_user_mutation_returns_a_token_usable_on_the_rest_api() {
    String username = unique("gqlnew");
    String email = username + "@example.com";

    String token =
        gql(
                CREATE_USER,
                Map.of("input", Map.of("email", email, "username", username, "password", PASSWORD)))
            .then()
            .statusCode(200)
            .body("errors", nullValue())
            .body("data.createUser.__typename", equalTo("UserPayload"))
            .body("data.createUser.user.username", equalTo(username))
            .body("data.createUser.user.email", equalTo(email))
            .body("data.createUser.user.profile.username", equalTo(username))
            .body("data.createUser.user.token", not(emptyOrNullString()))
            .extract()
            .path("data.createUser.user.token");

    api()
        .header("Authorization", "Token " + token)
        .get("/user")
        .then()
        .statusCode(200)
        .body("user.username", equalTo(username));
  }

  @Test
  void create_user_with_invalid_input_returns_error_union_with_field_errors() {
    TestUser taken = registerUser("gqltaken");

    gql(
            CREATE_USER,
            Map.of(
                "input",
                Map.of("email", "not-an-email", "username", taken.username(), "password", "x")))
        .then()
        .statusCode(200)
        .body("data.createUser.__typename", equalTo("Error"))
        .body("data.createUser.message", equalTo("BAD_REQUEST"))
        .body("data.createUser.errors.key", containsInAnyOrder("email", "username"))
        .body(
            "data.createUser.errors.find { it.key == 'email' }.value",
            contains("should be an email"))
        .body(
            "data.createUser.errors.find { it.key == 'username' }.value",
            contains("duplicated username"));
  }

  @Test
  void login_mutation_returns_user_with_token() {
    TestUser user = registerUser("gqllogin");

    gql(LOGIN, Map.of("email", user.email(), "password", user.password()))
        .then()
        .statusCode(200)
        .body("errors", nullValue())
        .body("data.login.user.username", equalTo(user.username()))
        .body("data.login.user.email", equalTo(user.email()))
        .body("data.login.user.token", not(emptyOrNullString()));
  }

  @Test
  void login_with_wrong_password_returns_unauthenticated_error() {
    TestUser user = registerUser("gqlbadpw");

    gql(LOGIN, Map.of("email", user.email(), "password", "wrong"))
        .then()
        .statusCode(200)
        .body("data.login", nullValue())
        .body("errors", hasSize(1))
        .body("errors[0].message", equalTo("invalid email or password"))
        .body("errors[0].path", contains("login"))
        .body("errors[0].extensions.errorType", equalTo("UNAUTHENTICATED"))
        .body("errors[0].message", equalTo("authentication required"));
  }

  @Test
  void me_query_uses_the_authorization_header() {
    TestUser user = registerUser("gqlme");

    gql(user, "query { me { username email token profile { username following } } }", Map.of())
        .then()
        .statusCode(200)
        .body("errors", nullValue())
        .body("data.me.username", equalTo(user.username()))
        .body("data.me.email", equalTo(user.email()))
        .body("data.me.token", equalTo(user.token()))
        .body("data.me.profile.username", equalTo(user.username()));
  }

  @Test
  void create_article_mutation_then_article_query_returns_persisted_article() {
    TestUser user = registerUser("gqlwriter");
    String tag = unique("gqlart");
    String title = unique("Graph Article ");

    gql(
            user,
            CREATE_ARTICLE,
            Map.of(
                "input",
                Map.of(
                    "title",
                    title,
                    "description",
                    "desc",
                    "body",
                    "hello graphql",
                    "tagList",
                    List.of(tag))))
        .then()
        .statusCode(200)
        .body("errors", nullValue())
        .body("data.createArticle.article.slug", equalTo(title.toLowerCase().replace(' ', '-')))
        .body("data.createArticle.article.tagList", contains(tag))
        .body("data.createArticle.article.favorited", equalTo(false))
        .body("data.createArticle.article.favoritesCount", equalTo(0))
        .body("data.createArticle.article.author.username", equalTo(user.username()));

    String slug = title.toLowerCase().replace(' ', '-');
    gql(
            """
            query Article($slug: String!) {
              article(slug: $slug) { slug title body tagList author { username following } }
            }
            """,
            Map.of("slug", slug))
        .then()
        .statusCode(200)
        .body("errors", nullValue())
        .body("data.article.title", equalTo(title))
        .body("data.article.body", equalTo("hello graphql"))
        .body("data.article.author.username", equalTo(user.username()))
        .body("data.article.author.following", equalTo(false));

    // Same row is visible through REST.
    api()
        .get("/articles/{slug}", slug)
        .then()
        .statusCode(200)
        .body("article.tagList", contains(tag));
  }

  @Test
  void articles_connection_paginates_with_page_info() throws Exception {
    TestUser user = registerUser("gqlpager");
    String tag = unique("page");
    String oldest = gqlCreateArticle(user, unique("Conn one "), List.of(tag));
    Thread.sleep(20); // distinct timestamps: the cursor is updated_at
    String middle = gqlCreateArticle(user, unique("Conn two "), List.of(tag));
    Thread.sleep(20);
    String newest = gqlCreateArticle(user, unique("Conn three "), List.of(tag));

    Response page1 = gql(ARTICLES_BY_TAG, Map.of("tag", tag));
    page1
        .then()
        .statusCode(200)
        .body("errors", nullValue())
        .body("data.articles.edges.node.slug", contains(newest, middle))
        .body("data.articles.pageInfo.hasNextPage", equalTo(true))
        .body("data.articles.pageInfo.endCursor", notNullValue());
    String endCursor = page1.path("data.articles.pageInfo.endCursor");
    assertThat(endCursor).isEqualTo(page1.<String>path("data.articles.edges[1].cursor"));

    gql(ARTICLES_BY_TAG, Map.of("tag", tag, "after", endCursor))
        .then()
        .statusCode(200)
        .body("errors", nullValue())
        .body("data.articles.edges.node.slug", contains(oldest))
        .body("data.articles.pageInfo.hasNextPage", equalTo(false));
  }

  @Test
  void tags_query_returns_tags_of_created_articles() {
    TestUser user = registerUser("gqltagq");
    String t1 = unique("tq");
    String t2 = unique("tq");
    gqlCreateArticle(user, unique("Tagged gql "), List.of(t1, t2));

    gql("query { tags }", Map.of())
        .then()
        .statusCode(200)
        .body("errors", nullValue())
        .body("data.tags", hasItems(t1, t2));
  }

  @Test
  void create_article_without_token_is_rejected_and_persists_nothing() {
    String title = unique("Anon Graph ");

    Response response =
        gql(
            CREATE_ARTICLE,
            Map.of("input", Map.of("title", title, "description", "d", "body", "b")));
    response
        .then()
        .statusCode(200)
        .body("data.createArticle", nullValue())
        .body("errors", hasSize(1))
        .body("errors[0].path", contains("createArticle"));

    api().get("/articles/{slug}", title.toLowerCase().replace(' ', '-')).then().statusCode(404);
  }

  @Test
  void create_article_without_token_reports_unauthenticated_error_type() {
    gql(
            CREATE_ARTICLE,
            Map.of("input", Map.of("title", unique("Anon type "), "description", "d", "body", "b")))
        .then()
        .statusCode(200)
        .body("errors[0].extensions.errorType", equalTo("UNAUTHENTICATED"));
  }

  @Test
  void create_article_with_blank_title_returns_bad_request_error() {
    TestUser user = registerUser("gqlblank");

    gql(user, CREATE_ARTICLE, Map.of("input", Map.of("title", "", "description", "d", "body", "b")))
        .then()
        .statusCode(200)
        .body("data.createArticle", nullValue())
        .body("errors[0].extensions.errorType", equalTo("BAD_REQUEST"))
        .body("errors[0].extensions.title", hasItem("can't be empty"));
  }

  @Test
  void add_comment_and_read_it_through_article_comments_connection() {
    TestUser author = registerUser("gqlca");
    TestUser commenter = registerUser("gqlcc");
    String slug = gqlCreateArticle(author, unique("Gql comments "), List.of());

    gql(
            commenter,
            """
            mutation AddComment($slug: String!, $body: String!) {
              addComment(slug: $slug, body: $body) { comment { id body author { username } } }
            }
            """,
            Map.of("slug", slug, "body", "nice post"))
        .then()
        .statusCode(200)
        .body("errors", nullValue())
        .body("data.addComment.comment.id", not(emptyOrNullString()))
        .body("data.addComment.comment.body", equalTo("nice post"))
        .body("data.addComment.comment.author.username", equalTo(commenter.username()));

    gql(
            """
            query Comments($slug: String!) {
              article(slug: $slug) {
                comments(first: 10) {
                  edges { node { body author { username } } }
                  pageInfo { hasNextPage }
                }
              }
            }
            """,
            Map.of("slug", slug))
        .then()
        .statusCode(200)
        .body("errors", nullValue())
        .body("data.article.comments.edges.node.body", contains("nice post"))
        .body("data.article.comments.edges.node.author.username", contains(commenter.username()))
        .body("data.article.comments.pageInfo.hasNextPage", equalTo(false));
  }

  @Test
  void favorite_mutation_and_non_author_delete_is_refused() {
    TestUser author = registerUser("gqlfa");
    TestUser fan = registerUser("gqlff");
    String slug = gqlCreateArticle(author, unique("Gql fav "), List.of());

    gql(
            fan,
            """
            mutation Fav($slug: String!) {
              favoriteArticle(slug: $slug) { article { slug favorited favoritesCount } }
            }
            """,
            Map.of("slug", slug))
        .then()
        .statusCode(200)
        .body("errors", nullValue())
        .body("data.favoriteArticle.article.favorited", equalTo(true))
        .body("data.favoriteArticle.article.favoritesCount", equalTo(1));

    gql(
            fan,
            "mutation Del($slug: String!) { deleteArticle(slug: $slug) { success } }",
            Map.of("slug", slug))
        .then()
        .statusCode(200)
        .body("data.deleteArticle", nullValue())
        .body("errors", hasSize(1));

    // Anonymous read: favoritesCount is visible without a token (see ArticlesIT).
    api()
        .get("/articles/{slug}", slug)
        .then()
        .statusCode(200)
        .body("article.favoritesCount", equalTo(1));
  }
}
