package in.rks.academy.security;

import in.rks.academy.config.AppProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * When the API sits on the public internet (e.g. Render), only the web app may call it: every /api request must
 * carry the shared key in X-RKS-Proxy-Key, or it gets a bare 404. The health check stays open for uptime pings.
 * Off when app.proxy-key is empty (local development, or a private network as in the Docker deployment).
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class ProxyKeyFilter extends OncePerRequestFilter {

    static final String HEADER = "X-RKS-Proxy-Key";

    private final byte[] key;

    public ProxyKeyFilter(AppProperties props) {
        String configured = props.proxyKey();
        this.key = configured == null || configured.isBlank() ? null : configured.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return key == null || !request.getRequestURI().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String provided = request.getHeader(HEADER);
        if (provided == null || !MessageDigest.isEqual(key, provided.getBytes(StandardCharsets.UTF_8))) {
            response.setStatus(HttpServletResponse.SC_NOT_FOUND);
            return;
        }
        chain.doFilter(request, response);
    }
}
