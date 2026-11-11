# syntax=docker/dockerfile:1

# ---- Build: compile and package the API (tests run in CI / `mvn verify`, not in the image build) ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B -DskipTests package

# ---- Run: a small JRE image, as an unprivileged user ----
FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S rks && adduser -S rks -G rks
WORKDIR /app
COPY --from=build /src/target/rks-academy.jar app.jar
USER rks

# Sized for small instances (Render free/starter: 512 MB): a modest heap, the low-overhead serial collector and
# smaller thread stacks leave room for metaspace and native memory. Override JAVA_OPTS on bigger machines.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=60 -XX:+UseSerialGC -Xss512k -XX:ReservedCodeCacheSize=64m -XX:+ExitOnOutOfMemoryError -Duser.timezone=Asia/Kolkata"
# Hosts such as Render pass the port in $PORT; 8080 otherwise.
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
    CMD wget -qO- "http://127.0.0.1:${PORT:-8080}/actuator/health" | grep -q '"UP"' || exit 1
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar \"$@\"", "--"]
