# ![RealWorld Example App using Spring Boot](example-logo.png)

[![CI](https://github.com/Joao-Pedro-AI-Visionary/realworld-spring-boot-java21/actions/workflows/gradle.yml/badge.svg)](https://github.com/Joao-Pedro-AI-Visionary/realworld-spring-boot-java21/actions/workflows/gradle.yml)

> This is a fork of [gothinkster/spring-boot-realworld-example-app](https://github.com/gothinkster/spring-boot-realworld-example-app), modernized to Java 21 and Spring Boot 3.5. All credit for the original design and code goes to the upstream authors. The original MIT license is kept unchanged in [LICENSE](LICENSE).

## What I improved in this fork

- **Java 21 + Spring Boot 3.5.** Upgraded from Java 11 / Spring Boot 2.6: `javax.*` to `jakarta.*`, Gradle wrapper 8.14, Netflix DGS 10 on top of Spring for GraphQL, DGS codegen 8, MyBatis starter 3, SQLite JDBC 3.50.
- **Spring Security 6.** `WebSecurityConfigurerAdapter` replaced by a `SecurityFilterChain` bean with explicit public/authenticated routes.
- **JWT with jjwt 0.12.** New builder/parser API; the signing key comes from the `JWT_SECRET` environment variable instead of a value committed in `application.properties`.
- **Java records** for immutable value types (error responses, token payloads).
- **Virtual threads** enabled for request handling (`spring.threads.virtual.enabled=true`).
- **REST API under `/api`**, as the RealWorld spec and frontends expect (GraphQL, Actuator and Swagger keep their own paths).
- **Bug fixes found by the new tests:**
  - updating a user's password stored it in plain text, so the user could not log in again; it is now encoded;
  - anonymous reads of a single article returned `favoritesCount: 0`; the real count is now returned;
  - GraphQL mutations without a token failed with a generic error; they now return `UNAUTHENTICATED` with a message;
  - the GraphQL endpoint rejected plain `{"query": ...}` bodies because of the REST `UNWRAP_ROOT_VALUE` setting; it now has its own JSON converter.
- **Integration tests.** 54 new tests that boot the whole application on a random port with a throwaway SQLite database and call it over HTTP with RestAssured: users and auth, articles (CRUD, feed, filters, pagination, favorites), comments, profiles and follow, GraphQL queries and mutations, Actuator and OpenAPI. Total suite: **122 tests, 0 failures** (25 test classes).
- **OpenAPI / Swagger UI** via springdoc, with a `Token` auth scheme: `/swagger-ui.html`, spec at `/v3/api-docs`.
- **Actuator health** with liveness/readiness probes at `/actuator/health`.
- **Spotless** with google-java-format, checked in CI.
- **Docker.** Multi-stage `Dockerfile` (eclipse-temurin 21 JDK to build, 21 JRE alpine to run, non-root user, healthcheck) and `docker-compose.yml` with a persistent volume.
- **GitHub Actions CI** on Java 21: spotless check, build, tests and Docker image build.

## About the original project

> ### Spring boot + MyBatis codebase containing real world examples (CRUD, auth, advanced patterns, etc) that adheres to the [RealWorld](https://github.com/gothinkster/realworld-example-apps) spec and API.

This codebase was created to demonstrate a fully fledged full-stack application built with Spring boot + Mybatis including CRUD operations, authentication, routing, pagination, and more.

For more information on how to this works with other frontends/backends, head over to the [RealWorld](https://github.com/gothinkster/realworld) repo.

# *NEW* GraphQL Support  

Following some DDD principles. REST or GraphQL is just a kind of adapter. And the domain layer will be consistent all the time. So this repository implement GraphQL and REST at the same time.

The GraphQL schema is https://github.com/gothinkster/spring-boot-realworld-example-app/blob/master/src/main/resources/schema/schema.graphqls and the visualization looks like below.

![](graphql-schema.png)

And this implementation is using [dgs-framework](https://github.com/Netflix/dgs-framework) which is a quite new java graphql server framework.
# How it works

The application uses Spring Boot (Web, Mybatis).

* Use the idea of Domain Driven Design to separate the business term and infrastructure term.
* Use MyBatis to implement the [Data Mapper](https://martinfowler.com/eaaCatalog/dataMapper.html) pattern for persistence.
* Use [CQRS](https://martinfowler.com/bliki/CQRS.html) pattern to separate the read model and write model.

And the code is organized as this:

1. `api` is the web layer implemented by Spring MVC
2. `core` is the business model including entities and services
3. `application` is the high-level services for querying the data transfer objects
4. `infrastructure`  contains all the implementation classes as the technique details

# Security

Integration with Spring Security and add other filter for jwt token process.

The JWT signing key is read from the `JWT_SECRET` environment variable (see `.env.example`). Never commit a real value.

# Database

It uses a ~~H2 in-memory database~~ sqlite database (for easy local test without losing test data after every restart), can be changed easily in the `application.properties` for any other database.

# Getting started

You'll need Java 21 installed.

    export JWT_SECRET=$(openssl rand -base64 64 | tr -d '
')
    ./gradlew bootRun

To test that it works, open a browser tab at http://localhost:8080/api/tags .
Alternatively, you can run

    curl http://localhost:8080/api/tags
    curl http://localhost:8080/actuator/health

The API documentation is at http://localhost:8080/swagger-ui.html .

# Try it out with [Docker](https://www.docker.com/)

You'll need Docker installed.

    cp .env.example .env   # then fill in JWT_SECRET
    docker compose up --build

The app listens on http://localhost:8080 (override with `APP_PORT`), and the SQLite file lives in the `app-data` volume.

# Try it out with a RealWorld frontend

The entry point address of the backend API is http://localhost:8080/api, as the RealWorld frontends expect. GraphQL is served at http://localhost:8080/graphql .

# Run test

The repository contains unit tests for the API and repository layers, plus integration tests (`src/test/java/io/spring/it`, `GraphQlHttpIT`) that start the full application.

    ./gradlew test

Without a local Java 21:

    docker run --rm -v "$PWD":/app -w /app eclipse-temurin:21-jdk ./gradlew clean build

# Code format

Use spotless for code format.

    ./gradlew spotlessJavaApply

# Help

Please fork and PR to improve the project.
