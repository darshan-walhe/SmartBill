package com.BCSTech.SmartBill.common.ratelimit;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;

/**
 * Per-IP rate limiting on the auth endpoints most attractive to bots:
 *   - register  — each hit creates a full account + a brand-new company,
 *                 so unrestricted bot signups are cheap for an attacker
 *                 and expensive for us (real infrastructure cost, not just spam rows)
 *   - otp/send  — no cost today, but becomes an SMS-bombing vector against
 *                 real phone numbers the moment a real SMS gateway is wired in
 *   - login     — no failed-attempt lockout exists on the password check,
 *                 so this is the only thing standing between a normal user
 *                 and an unlimited online password-guessing attack
 *
 * Runs as a Servlet Filter — before Spring Security's own filter chain and
 * before the controller — so a blocked request never even reaches the DB.
 */
@Component
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimiter rateLimiter;

    private record Rule(String keyPrefix, int maxRequests, Duration window) {}

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        Rule rule = ruleFor(request.getRequestURI());

        if (rule != null) {
            String ip = clientIp(request);
            String key = rule.keyPrefix() + ":" + ip;

            if (!rateLimiter.allow(key, rule.maxRequests(), rule.window())) {
                respondTooManyRequests(response);
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private Rule ruleFor(String path) {
        return switch (path) {
            case "/api/auth/register" -> new Rule("register", 5, Duration.ofHours(1));
            case "/api/auth/otp/send" -> new Rule("otp-send", 5, Duration.ofMinutes(10));
            case "/api/auth/login" -> new Rule("login", 10, Duration.ofMinutes(15));
            default -> null;
        };
    }

    // Behind a reverse proxy / load balancer, the real client IP arrives via
    // X-Forwarded-For — fall back to the socket address for direct connections.
    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(forwarded)) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    // Matches ApiResponse.error(message)'s exact JSON shape by hand — avoids
    // depending on jackson-databind's ObjectMapper for one fixed, trivial
    // response body. (ApiResponse itself only needs jackson-annotations for
    // @JsonInclude, which is a much lighter dependency than databind.)
    private void respondTooManyRequests(HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType("application/json");
        String json = "{\"success\":false,\"error\":\"Too many requests. Please try again later.\"}";
        response.getWriter().write(json);
    }
}