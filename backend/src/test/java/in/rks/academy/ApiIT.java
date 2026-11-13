package in.rks.academy;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import in.rks.academy.admin.AdminUser;
import in.rks.academy.admin.AdminUserRepository;
import in.rks.academy.setup.OwnerSetupRunner;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.util.LinkedMultiValueMap;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/**
 * Boots the real app against a throwaway local PostgreSQL database (see {@link TestDatabase}) with every
 * migration and the dev demo seed, pinned to 2026-11-05. Tests are ordered because later ones record payments
 * that change the totals the early ones assert.
 */
@ActiveProfiles("dev")
@Import(TestDatabase.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "APP_DEMO_DATE=2026-11-05")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class ApiIT {

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        TestDatabase.register(registry);
    }

    @Autowired TestRestTemplate http;
    @Autowired ObjectMapper json;
    @Autowired AdminUserRepository users;
    @Autowired PasswordEncoder encoder;
    @Autowired OwnerSetupRunner setup;

    String owner;
    String coach;

    @BeforeAll
    void signIn() throws Exception {
        owner = login("9000000000", "123456").get("token").asText();
        coach = login("9000000001", "123456").get("token").asText();
    }

    @Test
    @Order(1)
    void dashboardMatchesTheDesignScreenshots() throws Exception {
        JsonNode s = get(owner, "/dashboard/summary");
        assertThat(s.get("activePlayers").asInt()).isEqualTo(30);
        assertThat(s.get("newThisMonth").asInt()).isEqualTo(3);
        assertThat(s.get("collectedThisMonth").decimalValue()).isEqualByComparingTo("66900");
        assertThat(s.get("paymentsThisMonth").asInt()).isEqualTo(12);
        assertThat(s.get("duePlayers").asInt()).isEqualTo(9);

        JsonNode fees = get(owner, "/payments/summary");
        assertThat(fees.get("upiPct").asInt()).isEqualTo(79);

        JsonNode recent = get(owner, "/payments?size=2").get("content");
        assertThat(recent.get(0).get("receiptNo").asText()).isEqualTo("RKS/26/1126");
        assertThat(recent.get(1).get("receiptNo").asText()).isEqualTo("RKS/26/1000");
    }

    @Test
    @Order(2)
    void playersFilterByFeeStatusAndSearch() throws Exception {
        JsonNode due = get(owner, "/players?feeStatus=DUE");
        assertThat(due.get("totalElements").asInt()).isEqualTo(9);
        JsonNode byCode = get(owner, "/players?q=RKS105").get("content");
        assertThat(byCode).hasSize(1);
        assertThat(byCode.get(0).get("name").asText()).isEqualTo("Karthik Raja");
        assertThat(get(owner, "/players?courtId=4").get("totalElements").asInt()).isEqualTo(8);
    }

    @Test
    @Order(2)
    void monthStartRemindersGoToUnpaidNewPeriodsOnce() throws Exception {
        // 9 players are due, but Meenakshi's quarterly period began in October, so 8 get a November reminder.
        JsonNode first = json.readTree(call(owner, HttpMethod.POST, "/notifications/fee-reminders", null).getBody());
        assertThat(first.get("eligible").asInt()).isEqualTo(8);
        assertThat(first.get("sent").asInt()).isEqualTo(8);

        JsonNode again = json.readTree(call(owner, HttpMethod.POST, "/notifications/fee-reminders", null).getBody());
        assertThat(again.get("sent").asInt()).isZero();
        assertThat(again.get("alreadySent").asInt()).isEqualTo(8);

        JsonNode log = get(owner, "/notifications/fee-reminders?month=2026-11");
        assertThat(log.get("totalElements").asInt()).isEqualTo(8);
        assertThat(log.get("content").get(0).get("toMobile").asText()).startsWith("91");
        assertThat(call(coach, HttpMethod.POST, "/notifications/fee-reminders", null).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @Order(3)
    void coachesNeverSeeFeeAmounts() throws Exception {
        JsonNode s = get(coach, "/dashboard/summary");
        assertThat(s.get("collectedThisMonth").isNull()).isTrue();
        assertThat(s.get("pendingDues").isNull()).isTrue();
        assertThat(get(coach, "/fee-plans").get(0).get("price").isNull()).isTrue();
        assertThat(call(coach, HttpMethod.GET, "/dues", null).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(call(coach, HttpMethod.GET, "/players/1/payments", null).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(call(coach, HttpMethod.GET, "/fee-policy", null).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(call(coach, HttpMethod.POST, "/payments", Map.of("playerId", 3, "mode", "UPI"))
                .getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        // Players still carry the PAID/DUE chip for coaches.
        assertThat(get(coach, "/players/3").get("feeStatus").asText()).isEqualTo("DUE");
    }

    @Test
    @Order(4)
    void unauthenticatedAndBadCredentialsAreRejected() throws Exception {
        assertThat(call(null, HttpMethod.GET, "/players", null).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        ResponseEntity<String> bad = call(null, HttpMethod.POST, "/auth/login",
                Map.of("mobile", "9000000000", "pin", "9999"));
        assertThat(bad.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(json.readTree(bad.getBody()).get("code").asText()).isEqualTo("INVALID_CREDENTIALS");
    }

    @Test
    @Order(5)
    void recordingAPaymentClearsTheDueAndIssuesTheNextReceipt() throws Exception {
        JsonNode quote = json.readTree(call(owner, HttpMethod.POST, "/payments/quote",
                Map.of("playerId", 3)).getBody());
        assertThat(quote.get("periodFrom").asText()).isEqualTo("2026-11-01");
        assertThat(quote.get("total").decimalValue()).isEqualByComparingTo("1500");

        ResponseEntity<String> saved = call(owner, HttpMethod.POST, "/payments",
                Map.of("playerId", 3, "mode", "UPI"));
        assertThat(saved.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(json.readTree(saved.getBody()).get("receiptNo").asText()).isEqualTo("RKS/26/1197");

        assertThat(get(owner, "/players/3").get("feeStatus").asText()).isEqualTo("PAID");
        JsonNode receipt = get(owner, "/receipts/26/1197");
        assertThat(receipt.get("totalInWords").asText()).isEqualTo("Rupees One Thousand Five Hundred Only");
    }

    @Test
    @Order(6)
    void siblingDiscountAndLateFeeAreApplied() throws Exception {
        // Pranav (RKS107) is the 2nd sibling: 10% off. He's paid to December, so this quotes January.
        JsonNode pranav = json.readTree(call(owner, HttpMethod.POST, "/payments/quote",
                Map.of("playerId", 7)).getBody());
        assertThat(pranav.get("siblingRank").asInt()).isEqualTo(2);
        assertThat(pranav.get("total").decimalValue()).isEqualByComparingTo("3780");

        // Meenakshi's quarterly period began 1 Oct, so by 5 Nov the late fee is at its cap.
        JsonNode meenakshi = json.readTree(call(owner, HttpMethod.POST, "/payments/quote",
                Map.of("playerId", 10)).getBody());
        assertThat(meenakshi.get("lateFee").decimalValue()).isEqualByComparingTo("300");
    }

    @Test
    @Order(7)
    void overriddenAmountNeedsAReason() throws Exception {
        ResponseEntity<String> noReason = call(owner, HttpMethod.POST, "/payments",
                Map.of("playerId", 10, "mode", "CASH", "amount", 4200));
        assertThat(noReason.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);

        ResponseEntity<String> withReason = call(owner, HttpMethod.POST, "/payments",
                Map.of("playerId", 10, "mode", "CASH", "amount", 4200, "note", "Late fee waived"));
        JsonNode body = json.readTree(withReason.getBody());
        assertThat(body.get("adjustment").decimalValue()).isEqualByComparingTo("-300");
        assertThat(body.get("amount").decimalValue()).isEqualByComparingTo("4200");
    }

    @Test
    @Order(8)
    void attendanceSavesAndValidates() throws Exception {
        Map<String, Object> req = Map.of("date", "2026-11-05", "batchId", 1, "entries",
                java.util.List.of(Map.of("playerId", 1, "status", "PRESENT")));
        JsonNode sheet = json.readTree(call(coach, HttpMethod.POST, "/attendance", req).getBody());
        assertThat(sheet.get("present").asInt()).isEqualTo(1);
        assertThat(sheet.get("unmarked").asInt()).isEqualTo(3);

        Map<String, Object> future = Map.of("date", "2026-11-06", "batchId", 1, "entries",
                java.util.List.of(Map.of("playerId", 1, "status", "PRESENT")));
        assertThat(call(coach, HttpMethod.POST, "/attendance", future).getStatusCode())
                .isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
    }

    @Test
    @Order(9)
    void storeAdsAndRelatedProducts() throws Exception {
        JsonNode related = json.readTree(call(owner, HttpMethod.GET, "/products/1/related", null).getBody());
        assertThat(related.get(0).get("name").asText()).isEqualTo("Windstorm 72");
        assertThat(get(owner, "/products/1").get("savings").decimalValue()).isEqualByComparingTo("2500");
    }

    @Test
    @Order(10)
    void forcedPinChangeLocksEverythingElse() throws Exception {
        AdminUser fresh = new AdminUser();
        fresh.setName("New Owner");
        fresh.setMobile("9111111111");
        fresh.setRole(AdminUser.Role.OWNER);
        fresh.setPinHash(encoder.encode("482913"));
        fresh.setMustChangePin(true);
        users.save(fresh);

        JsonNode first = login("9111111111", "482913");
        assertThat(first.get("mustChangePin").asBoolean()).isTrue();
        String temp = first.get("token").asText();

        ResponseEntity<String> blocked = call(temp, HttpMethod.GET, "/players", null);
        assertThat(blocked.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(json.readTree(blocked.getBody()).get("code").asText()).isEqualTo("PIN_CHANGE_REQUIRED");

        assertThat(call(temp, HttpMethod.POST, "/auth/change-pin",
                Map.of("currentPin", "482913", "newPin", "123456")).getStatusCode())
                .isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY); // weak
        assertThat(call(temp, HttpMethod.POST, "/auth/change-pin",
                Map.of("currentPin", "482913", "newPin", "73051")).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST); // shorter than 6 digits
        assertThat(call(temp, HttpMethod.POST, "/auth/change-pin",
                Map.of("currentPin", "482913", "newPin", "7305190462813")).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST); // longer than 12 digits

        JsonNode changed = json.readTree(call(temp, HttpMethod.POST, "/auth/change-pin",
                Map.of("currentPin", "482913", "newPin", "730519")).getBody());
        assertThat(changed.get("mustChangePin").asBoolean()).isFalse();
        assertThat(call(changed.get("token").asText(), HttpMethod.GET, "/players", null).getStatusCode())
                .isEqualTo(HttpStatus.OK);

        // A PIN set before the 6-digit minimum still signs in once, but must be replaced before anything else works.
        AdminUser legacy = new AdminUser();
        legacy.setName("Legacy Login");
        legacy.setMobile("9111111112");
        legacy.setRole(AdminUser.Role.OWNER);
        legacy.setPinHash(encoder.encode("4826"));
        users.save(legacy);
        JsonNode old = login("9111111112", "4826");
        assertThat(old.get("mustChangePin").asBoolean()).isTrue();
        assertThat(call(old.get("token").asText(), HttpMethod.GET, "/players", null).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @Order(11)
    void ownerSetupIsOneTimeOnly() {
        // The dev seed already has an owner, so setup must refuse and change nothing.
        long before = users.count();
        assertThat(setup.setUp("Someone", "9222222222")).isEqualTo(1);
        assertThat(users.count()).isEqualTo(before);
    }

    @Test
    @Order(12)
    void apiNeverSaysStudent() {
        String spec = http.getForObject("/v3/api-docs", String.class);
        assertThat(spec).isNotBlank().doesNotContainIgnoringCase("student");
    }

    @Test
    @Order(13)
    void ownerCreatesACoachLoginThatMustChangeItsPin() throws Exception {
        ResponseEntity<String> created = call(owner, HttpMethod.POST, "/staff",
                Map.of("name", "K. Priya", "mobile", "9333333333", "role", "COACH", "coachId", 1));
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(created.getHeaders().getCacheControl()).contains("no-store");
        JsonNode body = json.readTree(created.getBody());
        String tempPin = body.get("temporaryPin").asText();
        long id = body.get("staff").get("id").asLong();
        assertThat(tempPin).matches("\\d{6}");

        assertThat(call(owner, HttpMethod.POST, "/staff",
                Map.of("name", "Dup", "mobile", "9333333333", "role", "COACH")).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);

        String first = login("9333333333", tempPin).get("token").asText();
        assertThat(call(first, HttpMethod.GET, "/players", null).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        String coachToken = json.readTree(call(first, HttpMethod.POST, "/auth/change-pin",
                Map.of("currentPin", tempPin, "newPin", "582039")).getBody()).get("token").asText();
        assertThat(call(coachToken, HttpMethod.GET, "/players", null).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(call(coachToken, HttpMethod.GET, "/dues", null).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        // A PIN reset signs the coach out everywhere at once.
        call(owner, HttpMethod.POST, "/staff/" + id + "/reset-pin", null);
        assertThat(call(coachToken, HttpMethod.GET, "/players", null).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);

        // Turning a login off works; turning off your own login is refused.
        call(owner, HttpMethod.PUT, "/staff/" + id, Map.of("name", "K. Priya", "role", "COACH", "active", false));
        assertThat(call(owner, HttpMethod.GET, "/staff", null).getBody()).contains("\"active\":false");
        long ownerId = get(owner, "/auth/me").get("id").asLong();
        ResponseEntity<String> self = call(owner, HttpMethod.PUT, "/staff/" + ownerId,
                Map.of("name", "R. Sethupathi", "role", "OWNER", "active", false));
        assertThat(json.readTree(self.getBody()).get("code").asText()).isEqualTo("CANNOT_CHANGE_SELF");
        assertThat(call(coach, HttpMethod.GET, "/staff", null).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @Order(14)
    void aVoidedPaymentStopsCountingAndThePeriodCanBePaidAgain() throws Exception {
        JsonNode payment = get(owner, "/payments?playerId=3&size=1").get("content").get(0);
        long id = payment.get("id").asLong();
        long countBefore = get(owner, "/payments/summary").get("paymentCount").asLong();

        assertThat(call(owner, HttpMethod.POST, "/payments/" + id + "/void", Map.of("reason", ""))
                .getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        JsonNode voided = json.readTree(call(owner, HttpMethod.POST, "/payments/" + id + "/void",
                Map.of("reason", "Recorded against the wrong player")).getBody());
        assertThat(voided.get("voided").asBoolean()).isTrue();
        assertThat(call(owner, HttpMethod.POST, "/payments/" + id + "/void", Map.of("reason", "again"))
                .getStatusCode()).isEqualTo(HttpStatus.CONFLICT);

        assertThat(get(owner, "/players/3").get("feeStatus").asText()).isEqualTo("DUE");
        assertThat(get(owner, "/payments/summary").get("paymentCount").asLong()).isEqualTo(countBefore - 1);
        String receiptPath = payment.get("receiptNo").asText().substring("RKS/".length());
        assertThat(get(owner, "/receipts/" + receiptPath).get("voided").asBoolean()).isTrue();

        assertThat(call(owner, HttpMethod.POST, "/payments", Map.of("playerId", 3, "mode", "UPI"))
                .getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(get(owner, "/players/3").get("feeStatus").asText()).isEqualTo("PAID");
    }

    @Test
    @Order(15)
    void courtsCoachesAndBatchesAreManagedSafely() throws Exception {
        JsonNode court = json.readTree(call(owner, HttpMethod.POST, "/courts",
                Map.of("name", "Court 5", "surfaceType", "Wooden synthetic", "active", true)).getBody());
        assertThat(call(owner, HttpMethod.POST, "/courts",
                Map.of("name", "court 5", "surfaceType", "x", "active", true)).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);

        // Court 1 is booked 06:00-07:00 on weekdays by Morning Beginners.
        ResponseEntity<String> clash = call(owner, HttpMethod.POST, "/batches", Map.of("name", "Early Birds",
                "courtId", 1, "coachId", 1, "startTime", "06:30", "endTime", "07:30", "days", List.of("MONDAY"),
                "active", true));
        assertThat(json.readTree(clash.getBody()).get("code").asText()).isEqualTo("COURT_BOOKED");
        assertThat(call(owner, HttpMethod.POST, "/batches", Map.of("name", "Early Birds",
                "courtId", court.get("id").asLong(), "coachId", 1, "startTime", "06:30", "endTime", "07:30",
                "days", List.of("MONDAY", "WEDNESDAY"), "active", true)).getStatusCode())
                .isEqualTo(HttpStatus.CREATED);

        ResponseEntity<String> busyBatch = call(owner, HttpMethod.PUT, "/batches/1", Map.of("name", "Morning Beginners",
                "courtId", 1, "coachId", 1, "startTime", "06:00", "endTime", "07:00",
                "days", List.of("MONDAY"), "active", false));
        assertThat(json.readTree(busyBatch.getBody()).get("code").asText()).isEqualTo("BATCH_IN_USE");
        ResponseEntity<String> busyCoach = call(owner, HttpMethod.PUT, "/coaches/1",
                Map.of("name", "S. Divya", "title", "Junior Coach", "active", false));
        assertThat(json.readTree(busyCoach.getBody()).get("code").asText()).isEqualTo("COACH_IN_USE");
        assertThat(call(coach, HttpMethod.POST, "/courts", Map.of("name", "X", "surfaceType", "x", "active", true))
                .getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @Order(16)
    void exportsAreOwnerOnlySafeCsv() {
        ResponseEntity<String> csv = call(owner, HttpMethod.GET, "/exports/payments.csv?from=2026-11-01&to=2026-11-30", null);
        assertThat(csv.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(csv.getHeaders().getContentType().toString()).startsWith("text/csv");
        assertThat(csv.getHeaders().getContentDisposition().getFilename())
                .isEqualTo("rks-payments-2026-11-01-to-2026-11-30.csv");
        assertThat(csv.getBody()).startsWith("﻿Receipt,Paid on,Player ID").contains("RKS/26/1126").contains(",VOID,");
        // Meenakshi paid earlier in this suite; Lakshana is still due.
        assertThat(call(owner, HttpMethod.GET, "/exports/dues.csv", null).getBody())
                .contains("Lakshana Venkatesh").doesNotContain("Meenakshi Sundar");
        // A header row plus the 30 seeded players.
        assertThat(call(owner, HttpMethod.GET, "/exports/players.csv", null).getBody().lines().count()).isEqualTo(31);
        assertThat(call(owner, HttpMethod.GET, "/exports/attendance.csv?from=2026-11-02&to=2026-11-05", null).getBody())
                .contains("Morning Intermediate");
        assertThat(call(owner, HttpMethod.GET, "/exports/payments.csv?from=2025-01-01&to=2026-11-30", null)
                .getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(call(coach, HttpMethod.GET, "/exports/players.csv", null).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @Order(17)
    void shopEditorUploadsPhotosAndArchivesProducts() throws Exception {
        String url = json.readTree(upload(owner, "/products/images", PNG).getBody()).get("url").asText();
        assertThat(url).startsWith("/api/v1/files/products/product-");
        assertThat(call(owner, HttpMethod.GET, url.substring("/api/v1".length()), null).getStatusCode())
                .isEqualTo(HttpStatus.OK);
        assertThat(upload(owner, "/products/images", "not an image at all".getBytes()).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        Map<String, Object> product = new HashMap<>(Map.of("brand", "RKS", "category", "BAGS",
                "name", "Kit Bag", "price", 999, "mrp", 1299, "reviewCount", 0, "images", List.of(url),
                "specs", List.of(Map.of("label", "Capacity", "value", "2 rackets")),
                "variants", List.of(), "advertised", false));
        long id = json.readTree(call(owner, HttpMethod.POST, "/products", product).getBody()).get("id").asLong();

        product.put("images", List.of("https://evil.example/x.png"));
        ResponseEntity<String> linked = call(owner, HttpMethod.POST, "/products", product);
        assertThat(linked.getStatusCode()).as(linked.getBody()).isEqualTo(HttpStatus.BAD_REQUEST);

        call(owner, HttpMethod.DELETE, "/products/" + id, null);
        assertThat(get(owner, "/products?q=Kit Bag").get("totalElements").asInt()).isZero();
        assertThat(get(owner, "/products?q=Kit Bag&includeInactive=true").get("totalElements").asInt()).isEqualTo(1);
        assertThat(get(coach, "/products?q=Kit Bag&includeInactive=true").get("totalElements").asInt()).isZero();
        call(owner, HttpMethod.POST, "/products/" + id + "/restore", null);
        assertThat(get(owner, "/products?q=Kit Bag").get("totalElements").asInt()).isEqualTo(1);
    }

    @Test
    @Order(18)
    void whatsAppSetupCanBeChecked() throws Exception {
        JsonNode status = get(owner, "/notifications/whatsapp");
        assertThat(status.get("provider").asText()).isEqualTo("log");
        assertThat(status.get("live").asBoolean()).isFalse();
        JsonNode test = json.readTree(call(owner, HttpMethod.POST, "/notifications/whatsapp/test",
                Map.of("mobile", "9000000000")).getBody());
        assertThat(test.get("ok").asBoolean()).isTrue();
        assertThat(test.get("preview").asText()).startsWith("Vanakkam Parent!");
    }

    // ---- Family portal ----------------------------------------------------------------------------------------

    @Test
    @Order(20)
    void parentsSignInWithTheirMobileNumberAndPin() throws Exception {
        JsonNode session = json.readTree(call(null, HttpMethod.POST, "/family/auth/login",
                Map.of("mobile", "9000000101", "pin", "123456")).getBody());
        assertThat(session.get("mustChangePin").asBoolean()).isFalse();
        String token = session.get("token").asText();

        // A wrong PIN and an unknown number get the same answer, so the form can't reveal who is a member.
        ResponseEntity<String> wrong = call(null, HttpMethod.POST, "/family/auth/login",
                Map.of("mobile", "9000000101", "pin", "654987"));
        ResponseEntity<String> unknown = call(null, HttpMethod.POST, "/family/auth/login",
                Map.of("mobile", "9999999999", "pin", "123456"));
        assertThat(wrong.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(unknown.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(json.readTree(unknown.getBody()).get("message").asText())
                .isEqualTo(json.readTree(wrong.getBody()).get("message").asText());

        JsonNode me = get(token, "/family/me");
        assertThat(me.get("parentName").asText()).isEqualTo("K. Murugan");
        assertThat(me.get("children")).hasSize(1);
        assertThat(me.get("children").get(0).get("code").asText()).isEqualTo("RKS101");

        // The two kinds of session never reach each other's endpoints.
        assertThat(call(token, HttpMethod.GET, "/players", null).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(call(token, HttpMethod.GET, "/dues", null).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(call(owner, HttpMethod.GET, "/family/me", null).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @Order(21)
    void parentsSeeOnlyTheirOwnChildren() throws Exception {
        String token = familyLogin("9000020001"); // Preethi (RKS122) and Pranav (RKS107) share this parent
        JsonNode children = get(token, "/family/me").get("children");
        assertThat(children).extracting(c -> c.get("code").asText()).containsExactly("RKS122", "RKS107");

        long preethi = children.get(0).get("id").asLong();
        long pranav = children.get(1).get("id").asLong();
        assertThat(get(token, "/family/children/" + preethi).get("name").asText()).isEqualTo("Preethi Jayakumar");
        assertThat(get(token, "/family/children/" + preethi + "/payments")).isNotEmpty();
        assertThat(call(token, HttpMethod.GET, "/family/children/" + pranav + "/due", null).getStatusCode())
                .as("Pranav is paid to December").isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(get(token, "/family/receipts/26/1147").get("playerName").asText()).isEqualTo("Preethi Jayakumar");

        // The attendance calendar asks for one month at a time.
        JsonNode october = get(token, "/family/children/" + preethi + "/attendance?month=2026-10");
        assertThat(october.get("from").asText()).isEqualTo("2026-10-01");
        assertThat(october.get("days")).isNotEmpty()
                .allSatisfy(d -> assertThat(d.get("date").asText()).startsWith("2026-10"));
        assertThat(october.get("to").asText()).isEqualTo("2026-10-31");
        assertThat(call(token, HttpMethod.GET, "/family/children/2/attendance?month=2026-10", null)
                .getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

        // Someone else's child or receipt simply doesn't exist for this parent.
        assertThat(call(token, HttpMethod.GET, "/family/children/2", null).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(call(token, HttpMethod.GET, "/family/children/2/payments", null).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(call(token, HttpMethod.GET, "/family/receipts/26/1126", null).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);

        // The shop and its offers live in the family portal.
        assertThat(get(token, "/family/shop/ads?placement=HERO").get("name").asText()).isEqualTo("Astrox 77 Pro");
        assertThat(get(token, "/family/shop/products").get("totalElements").asInt()).isPositive();
        assertThat(call(owner, HttpMethod.GET, "/products/ads?placement=HERO", null).getStatusCode().is2xxSuccessful())
                .as("there is no ad endpoint in the staff API").isFalse();
    }

    @Test
    @Order(22)
    void theOwnerIssuesAOneTimePinThatMustBeReplaced() throws Exception {
        String before = familyLogin("9000000101");
        JsonNode status = get(owner, "/players/1/parent-login");
        assertThat(status.get("mobile").asText()).isEqualTo("9000000101");
        assertThat(status.get("hasPin").asBoolean()).isTrue();
        assertThat(call(coach, HttpMethod.POST, "/players/1/parent-login/pin", null).getStatusCode())
                .as("only the owner issues parent PINs").isEqualTo(HttpStatus.FORBIDDEN);

        JsonNode issued = json.readTree(call(owner, HttpMethod.POST, "/players/1/parent-login/pin", null).getBody());
        String oneTime = issued.get("temporaryPin").asText();
        assertThat(oneTime).matches("\\d{6}");
        assertThat(issued.get("login").get("mustChangePin").asBoolean()).isTrue();

        // The new PIN replaces the old one and signs the parent out everywhere.
        assertThat(call(before, HttpMethod.GET, "/family/me", null).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(call(null, HttpMethod.POST, "/family/auth/login", Map.of("mobile", "9000000101", "pin", "123456"))
                .getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

        // The one-time PIN opens nothing until the parent chooses their own.
        JsonNode first = json.readTree(call(null, HttpMethod.POST, "/family/auth/login",
                Map.of("mobile", "9000000101", "pin", oneTime)).getBody());
        assertThat(first.get("mustChangePin").asBoolean()).isTrue();
        assertThat(first.get("token").isNull()).isTrue();
        assertThat(call(null, HttpMethod.POST, "/family/auth/set-pin",
                Map.of("mobile", "9000000101", "currentPin", oneTime, "newPin", "111111")).getStatusCode())
                .isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        String token = json.readTree(call(null, HttpMethod.POST, "/family/auth/set-pin",
                Map.of("mobile", "9000000101", "currentPin", oneTime, "newPin", "583920")).getBody())
                .get("token").asText();
        assertThat(call(token, HttpMethod.GET, "/family/me", null).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(get(owner, "/players/1/parent-login").get("mustChangePin").asBoolean()).isFalse();
        assertThat(call(null, HttpMethod.POST, "/family/auth/login", Map.of("mobile", "9000000101", "pin", "583920"))
                .getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @Order(22)
    void fiveWrongPinsLockTheNumberForAWhile() throws Exception {
        for (int i = 0; i < 5; i++) {
            call(null, HttpMethod.POST, "/family/auth/login", Map.of("mobile", "9000020002", "pin", "654987"));
        }
        assertThat(call(null, HttpMethod.POST, "/family/auth/login", Map.of("mobile", "9000020002", "pin", "123456"))
                .getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
    }

    @Test
    @Order(23)
    void accessEndsWhenTheChildLeavesTheAcademy() throws Exception {
        String token = familyLogin("9000000105"); // Karthik Raja's parent
        assertThat(call(token, HttpMethod.GET, "/family/me", null).getStatusCode()).isEqualTo(HttpStatus.OK);
        call(owner, HttpMethod.DELETE, "/players/5", null);
        assertThat(call(token, HttpMethod.GET, "/family/me", null).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    /** Demo parents all have PIN 123456 (db/demo/V7_1). */
    String familyLogin(String mobile) throws Exception {
        return json.readTree(call(null, HttpMethod.POST, "/family/auth/login",
                Map.of("mobile", mobile, "pin", "123456")).getBody()).get("token").asText();
    }

    // ---- helpers ----------------------------------------------------------------------------------------------

    /** A valid 1x1 PNG. */
    static final byte[] PNG = Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");

    ResponseEntity<String> upload(String token, String path, byte[] bytes) {
        HttpHeaders partHeaders = new HttpHeaders();
        partHeaders.setContentType(MediaType.IMAGE_PNG);
        ByteArrayResource file = new ByteArrayResource(bytes) {
            @Override
            public String getFilename() {
                return "photo.png";
            }
        };
        LinkedMultiValueMap<String, Object> form = new LinkedMultiValueMap<>();
        form.add("file", new HttpEntity<>(file, partHeaders));
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        headers.setBearerAuth(token);
        return http.exchange("/api/v1" + path, HttpMethod.POST, new HttpEntity<>(form, headers), String.class);
    }

    JsonNode login(String mobile, String pin) throws Exception {
        ResponseEntity<String> res = call(null, HttpMethod.POST, "/auth/login", Map.of("mobile", mobile, "pin", pin));
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        return json.readTree(res.getBody());
    }

    JsonNode get(String token, String path) throws Exception {
        ResponseEntity<String> res = call(token, HttpMethod.GET, path, null);
        assertThat(res.getStatusCode()).as(path).isEqualTo(HttpStatus.OK);
        return json.readTree(res.getBody());
    }

    ResponseEntity<String> call(String token, HttpMethod method, String path, Object body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (token != null) {
            headers.setBearerAuth(token);
        }
        return http.exchange("/api/v1" + path, method, new HttpEntity<>(body, headers), String.class);
    }
}
