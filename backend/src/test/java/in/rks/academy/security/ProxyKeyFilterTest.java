package in.rks.academy.security;

import static org.assertj.core.api.Assertions.assertThat;

import in.rks.academy.config.AppProperties;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class ProxyKeyFilterTest {

    private static ProxyKeyFilter filter(String key) {
        return new ProxyKeyFilter(new AppProperties(null, "http://localhost", "910000000000", key, null, null, null));
    }

    /** True when the request reached the application; false when the filter answered 404. */
    private static boolean passes(ProxyKeyFilter filter, String uri, String key) throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", uri);
        if (key != null) {
            req.addHeader(ProxyKeyFilter.HEADER, key);
        }
        MockHttpServletResponse res = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();
        filter.doFilter(req, res, chain);
        boolean passed = chain.getRequest() != null;
        if (!passed) {
            assertThat(res.getStatus()).isEqualTo(404);
        }
        return passed;
    }

    @Test
    void withoutAConfiguredKeyEverythingPasses() throws Exception {
        assertThat(passes(filter(""), "/api/v1/players", null)).isTrue();
    }

    @Test
    void apiCallsNeedTheExactKey() throws Exception {
        ProxyKeyFilter f = filter("s3cret-key");
        assertThat(passes(f, "/api/v1/players", null)).isFalse();
        assertThat(passes(f, "/api/v1/players", "wrong")).isFalse();
        assertThat(passes(f, "/api/v1/players", "s3cret-key")).isTrue();
    }

    @Test
    void theHealthCheckStaysOpen() throws Exception {
        assertThat(passes(filter("s3cret-key"), "/actuator/health", null)).isTrue();
    }
}
