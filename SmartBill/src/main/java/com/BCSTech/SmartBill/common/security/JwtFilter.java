package com.BCSTech.SmartBill.common.security;

import com.BCSTech.SmartBill.company.model.Company;
import com.BCSTech.SmartBill.company.repository.CompanyRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserDetailsServiceImpl userDetailsService;
    private final CompanyRepository companyRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String token = extractToken(request);

        if (StringUtils.hasText(token) && jwtUtil.isTokenValid(token)) {
            String userId    = jwtUtil.extractUserId(token);
            String companyId = jwtUtil.extractCompanyId(token);

            try {
                UserDetails userDetails = userDetailsService.loadUserByUsername(userId);

                // userDetails.isEnabled() reflects user.isActive() (see
                // UserDetailsServiceImpl) — checked here because this filter
                // builds the SecurityContext by hand and never goes through
                // an AuthenticationProvider, so nothing else in the chain
                // would otherwise reject a still-valid token belonging to a
                // user deactivated *after* the token was issued.
                if (!userDetails.isEnabled()) {
                    log.info("JWT belongs to a deactivated user, rejecting: {}", userId);
                    filterChain.doFilter(request, response);
                    return;
                }

                // Same reasoning, one level up: a SUPER_ADMIN deactivating a
                // whole company must take effect immediately, not only once
                // every existing member's token happens to expire.
                // SUPER_ADMIN users have no companyId and skip this check.
                if (StringUtils.hasText(companyId) && !isCompanyActive(companyId)) {
                    log.info("JWT belongs to a deactivated company, rejecting: user={} company={}",
                            userId, companyId);
                    filterChain.doFilter(request, response);
                    return;
                }

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                userDetails, null, userDetails.getAuthorities());
                authentication.setDetails(
                        new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);

                // Store as request attributes — accessible in any controller.
                // Role comes from userDetails' authorities (fresh from the DB
                // this request, same source @PreAuthorize checks against) —
                // NOT from the JWT's own role claim, so a role change takes
                // effect immediately rather than only after the token expires.
                String role = userDetails.getAuthorities().stream()
                        .findFirst()
                        .map(a -> a.getAuthority().replaceFirst("^ROLE_", ""))
                        .orElse(null);

                request.setAttribute("userId",    userId);
                request.setAttribute("companyId", companyId);
                request.setAttribute("role",      role);
            } catch (UsernameNotFoundException e) {
                // Token is validly signed and not expired, but the user it points
                // to no longer exists (e.g. deleted after the token was issued,
                // any time within its lifetime). This runs inside a Servlet
                // Filter — before Spring's dispatcher, so @RestControllerAdvice
                // can never see an exception thrown here. Fail safe: leave the
                // request unauthenticated and let Spring Security's normal
                // 401/403 handling take it from here, instead of letting an
                // uncaught exception fall through to the container's default
                // error handling.
                log.warn("JWT referenced a user that no longer exists: {}", userId);
            }
        }

        filterChain.doFilter(request, response);
    }

    private boolean isCompanyActive(String companyId) {
        return companyRepository.findById(companyId)
                .map(Company::isActive)
                .orElse(false); // company row missing entirely — fail closed
    }

    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (StringUtils.hasText(header) && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return null;
    }
}