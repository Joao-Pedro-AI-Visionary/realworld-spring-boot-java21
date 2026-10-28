package io.spring.api.security;

import static java.util.Arrays.asList;

import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
public class WebSecurityConfig {

  @Bean
  public JwtTokenFilter jwtTokenFilter() {
    return new JwtTokenFilter();
  }

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http.csrf(AbstractHttpConfigurer::disable)
        .cors(Customizer.withDefaults())
        .exceptionHandling(
            exceptions ->
                exceptions.authenticationEntryPoint(
                    new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
        .sessionManagement(
            session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(
            auth ->
                auth.requestMatchers(HttpMethod.OPTIONS)
                    .permitAll()
                    .requestMatchers("/graphiql", "/graphql")
                    .permitAll()
                    .requestMatchers("/actuator/health", "/actuator/health/**", "/actuator/info")
                    .permitAll()
                    .requestMatchers(
                        "/v3/api-docs", "/v3/api-docs/**", "/swagger-ui.html", "/swagger-ui/**")
                    .permitAll()
                    .requestMatchers("/error")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/articles/feed")
                    .authenticated()
                    .requestMatchers(HttpMethod.POST, "/api/users", "/api/users/login")
                    .permitAll()
                    .requestMatchers(
                        HttpMethod.GET, "/api/articles/**", "/api/profiles/**", "/api/tags")
                    .permitAll()
                    .anyRequest()
                    .authenticated())
        .addFilterBefore(jwtTokenFilter(), UsernamePasswordAuthenticationFilter.class);
    return http.build();
  }

  /**
   * Origins come from {@code cors.allowed-origins} (env {@code CORS_ALLOWED_ORIGINS}), a
   * comma-separated list of exact origins or patterns such as {@code https://*.vercel.app}. A lone
   * {@code *} keeps the permissive local-dev behaviour and answers with a literal wildcard.
   */
  @Bean
  public CorsConfigurationSource corsConfigurationSource(
      @Value("${cors.allowed-origins:*}") String allowedOrigins) {
    final CorsConfiguration configuration = new CorsConfiguration();
    List<String> origins = parseOrigins(allowedOrigins);
    if (origins.isEmpty() || origins.contains("*")) {
      configuration.setAllowedOrigins(List.of("*"));
    } else {
      // Patterns echo the matching request origin back, which also supports subdomain wildcards.
      configuration.setAllowedOriginPatterns(origins);
    }
    configuration.setAllowedMethods(
        asList("HEAD", "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
    // Auth uses the Authorization header, not cookies, so credentials stay disabled. This also
    // keeps a literal '*' origin legal (it is rejected when credentials are allowed).
    configuration.setAllowCredentials(false);
    // setAllowedHeaders is important! Without it, OPTIONS preflight request
    // will fail with 403 Invalid CORS request
    configuration.setAllowedHeaders(asList("Authorization", "Cache-Control", "Content-Type"));
    final UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);
    return source;
  }

  static List<String> parseOrigins(String value) {
    if (value == null) {
      return List.of();
    }
    return Arrays.stream(value.split(","))
        .map(String::trim)
        .filter(origin -> !origin.isEmpty())
        .map(origin -> origin.endsWith("/") ? origin.substring(0, origin.length() - 1) : origin)
        .toList();
  }
}
