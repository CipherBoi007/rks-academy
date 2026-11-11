package in.rks.academy.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import in.rks.academy.common.ApiError;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, JwtAuthFilter jwtAuthFilter, ObjectMapper mapper)
            throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/v1/auth/login", "/api/v1/config/public").permitAll()
                        .requestMatchers("/api/v1/family/auth/**").permitAll()
                        .requestMatchers("/api/v1/family/**").hasAuthority(JwtAuthFilter.FAMILY_ROLE)
                        .requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        .requestMatchers("/actuator/health").permitAll()
                        .requestMatchers("/api/v1/auth/me", "/api/v1/auth/change-pin")
                        .hasAnyAuthority("ROLE_OWNER", "ROLE_COACH", JwtAuthFilter.PIN_CHANGE_AUTHORITY)
                        .requestMatchers("/api/v1/**").hasAnyRole("OWNER", "COACH")
                        .anyRequest().denyAll())
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((req, res, e) ->
                                write(res, mapper, ApiError.of(401, "UNAUTHENTICATED", "Please sign in",
                                        req.getRequestURI())))
                        .accessDeniedHandler((req, res, e) -> {
                            var auth = org.springframework.security.core.context.SecurityContextHolder
                                    .getContext().getAuthentication();
                            boolean pinPending = auth != null && auth.getAuthorities().stream()
                                    .anyMatch(a -> JwtAuthFilter.PIN_CHANGE_AUTHORITY.equals(a.getAuthority()));
                            write(res, mapper, pinPending
                                    ? ApiError.of(403, "PIN_CHANGE_REQUIRED", "Set a new PIN to continue",
                                    req.getRequestURI())
                                    : ApiError.of(403, "FORBIDDEN", "You don't have access to this",
                                    req.getRequestURI()));
                        }))
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    /** The filter runs inside the security chain only; stop Spring Boot registering it a second time. */
    @Bean
    FilterRegistrationBean<JwtAuthFilter> jwtFilterRegistration(JwtAuthFilter filter) {
        FilterRegistrationBean<JwtAuthFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    private static void write(HttpServletResponse res, ObjectMapper mapper, ApiError error) throws IOException {
        res.setStatus(error.status());
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        mapper.writeValue(res.getOutputStream(), error);
    }
}
