package in.rks.academy;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.test.context.DynamicPropertyRegistry;

/**
 * A dedicated integration-test database on the local PostgreSQL server: never the dev database.
 * It is created if missing and wiped before every run, so tests always start from the seed.
 * Override with RKS_TEST_DB_HOST / RKS_TEST_DB_NAME / RKS_TEST_DB_USER / RKS_TEST_DB_PASSWORD.
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestDatabase {

    static final String HOST = env("RKS_TEST_DB_HOST", "localhost:5432");
    static final String NAME = env("RKS_TEST_DB_NAME", "rks_db_test");
    static final String USER = env("RKS_TEST_DB_USER", "postgres");
    static final String PASSWORD = env("RKS_TEST_DB_PASSWORD", "root");

    static void register(DynamicPropertyRegistry registry) {
        if (!NAME.matches("[a-z0-9_]+") || !NAME.endsWith("_test")) {
            throw new IllegalStateException("Refusing to use '" + NAME + "': test database names must end in _test");
        }
        createIfMissing();
        registry.add("spring.datasource.url", () -> "jdbc:postgresql://" + HOST + "/" + NAME);
        registry.add("spring.datasource.username", () -> USER);
        registry.add("spring.datasource.password", () -> PASSWORD);
        registry.add("spring.flyway.clean-disabled", () -> "false");
    }

    /** Wipe, then migrate: every run starts from exactly the seeded state. */
    @Bean
    FlywayMigrationStrategy cleanThenMigrate() {
        return flyway -> {
            flyway.clean();
            flyway.migrate();
        };
    }

    private static void createIfMissing() {
        try (Connection c = DriverManager.getConnection("jdbc:postgresql://" + HOST + "/postgres", USER, PASSWORD);
             var check = c.prepareStatement("select 1 from pg_database where datname = ?")) {
            check.setString(1, NAME);
            if (!check.executeQuery().next()) {
                try (var create = c.createStatement()) {
                    create.execute("CREATE DATABASE " + NAME);
                }
            }
        } catch (SQLException e) {
            throw new IllegalStateException("Integration tests need local PostgreSQL at " + HOST
                    + " (user " + USER + "). " + e.getMessage(), e);
        }
    }

    private static String env(String key, String fallback) {
        String v = System.getenv(key);
        return v == null || v.isBlank() ? fallback : v;
    }
}
