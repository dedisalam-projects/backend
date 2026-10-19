# Stage 1: Build Java Runner
FROM eclipse-temurin:17-jdk-alpine AS builder
WORKDIR /build

COPY libs/pdf-engine/bin/openpdf/openpdf-1.3.30.jar ./openpdf-1.3.30.jar
COPY libs/pdf-engine/bin/openpdf/json-20240303.jar ./json-20240303.jar
COPY libs/pdf-engine/bin/openpdf/TravelokaPdfRunner.java ./TravelokaPdfRunner.java

RUN javac -cp "openpdf-1.3.30.jar:json-20240303.jar" TravelokaPdfRunner.java -d .

# Stage 2: Minimal Production JRE Runtime
FROM eclipse-temurin:17-jre-alpine AS runner
WORKDIR /app

# Add curl and fontconfig for healthchecks and font rendering
RUN apk add --no-cache curl fontconfig

# Copy compiled classes and dependencies
COPY --from=builder /build/openpdf-1.3.30.jar ./openpdf-1.3.30.jar
COPY --from=builder /build/json-20240303.jar ./json-20240303.jar
COPY --from=builder /build/com ./com

# Copy static assets (fonts and images)
COPY libs/pdf-engine/fonts ./fonts
COPY libs/pdf-engine/img ./img
COPY libs/pdf-engine/assets ./assets

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 8081

HEALTHCHECK --interval=15s --timeout=3s --retries=3 CMD curl -f http://localhost:8081/health || exit 1

ENTRYPOINT ["java", "-Xms128m", "-Xmx512m", "-cp", "openpdf-1.3.30.jar:json-20240303.jar:.", "com.blipstudio.pdf.TravelokaPdfRunner", "--daemon", "8081"]
