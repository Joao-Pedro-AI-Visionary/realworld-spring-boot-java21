package io.spring.api.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** OpenAPI metadata served at /v3/api-docs and rendered by Swagger UI at /swagger-ui.html. */
@Configuration
public class OpenApiConfig {

  static final String SECURITY_SCHEME = "Token";

  @Bean
  public OpenAPI realWorldOpenApi() {
    return new OpenAPI()
        .info(
            new Info()
                .title("RealWorld Conduit API")
                .version("1.0")
                .description(
                    "Spring Boot implementation of the RealWorld (Conduit) API spec. Authenticate"
                        + " with the header 'Authorization: Token <jwt>' returned by /users/login.")
                .license(new License().name("MIT").url("https://opensource.org/licenses/MIT")))
        .components(
            new Components()
                .addSecuritySchemes(
                    SECURITY_SCHEME,
                    new SecurityScheme()
                        .type(SecurityScheme.Type.APIKEY)
                        .in(SecurityScheme.In.HEADER)
                        .name("Authorization")
                        .description("Use the value 'Token <jwt>'")))
        .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME));
  }
}
