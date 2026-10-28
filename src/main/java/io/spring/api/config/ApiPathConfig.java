package io.spring.api.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.HandlerTypePredicate;
import org.springframework.web.servlet.config.annotation.PathMatchConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Serves the REST controllers under {@value #API_PREFIX}, as the RealWorld API spec expects.
 * GraphQL, Actuator and the OpenAPI endpoints keep their default paths.
 */
@Configuration
public class ApiPathConfig implements WebMvcConfigurer {

  public static final String API_PREFIX = "/api";

  @Override
  public void configurePathMatch(PathMatchConfigurer configurer) {
    configurer.addPathPrefix(API_PREFIX, HandlerTypePredicate.forBasePackage("io.spring.api"));
  }
}
