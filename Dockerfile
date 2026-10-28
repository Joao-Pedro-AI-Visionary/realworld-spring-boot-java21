# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace

# Gradle wrapper and build scripts first for better layer caching.
# settings.gradle* is optional; build.gradle always matches so COPY never fails.
COPY gradlew ./
COPY gradle ./gradle
COPY build.gradle settings.gradle* ./
RUN sed -i 's/\r$//' gradlew && chmod +x gradlew \
    && ./gradlew --no-daemon dependencies > /dev/null 2>&1 || true

# Sources (includes src/main/resources/schema used by DGS codegen).
COPY src ./src
RUN ./gradlew bootJar -x test --no-daemon \
    && cp build/libs/*.jar /workspace/app.jar

# ---- Runtime stage ----
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S app && adduser -S -G app app \
    && mkdir -p /app/data && chown -R app:app /app

COPY --from=build --chown=app:app /workspace/app.jar /app/app.jar

ENV SPRING_DATASOURCE_URL=jdbc:sqlite:/app/data/dev.db \
    JAVA_OPTS=""

VOLUME /app/data
USER app
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD wget -qO- http://localhost:8080/actuator/health || exit 1

# JWT_SECRET (HS512, at least 64 chars) must be provided at runtime.
ENTRYPOINT ["sh", "-c", "exec java -XX:MaxRAMPercentage=75 $JAVA_OPTS -jar /app/app.jar"]
