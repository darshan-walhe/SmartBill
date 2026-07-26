package com.BCSTech.SmartBill.common.security;

import jakarta.servlet.http.HttpServletRequest;
import lombok.Data;
import org.springframework.core.MethodParameter;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.lang.annotation.*;

/**
 * Usage in any controller:
 *
 *   public ResponseEntity<?> myEndpoint(@CurrentUser AuthUser user) {
 *       user.getUserId()    // logged-in user's id
 *       user.getCompanyId() // their company id
 *   }
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface CurrentUser {

    @Data
    class AuthUser {
        private final String userId;
        private final String companyId;
    }

    @Component
    class Resolver implements HandlerMethodArgumentResolver {

        @Override
        public boolean supportsParameter(MethodParameter parameter) {
            return parameter.hasParameterAnnotation(CurrentUser.class)
                    && parameter.getParameterType().equals(AuthUser.class);
        }

        @Override
        public AuthUser resolveArgument(MethodParameter parameter,
                                        ModelAndViewContainer mavContainer,
                                        NativeWebRequest webRequest,
                                        WebDataBinderFactory binderFactory) {

            HttpServletRequest request = webRequest.getNativeRequest(HttpServletRequest.class);
            if (request == null) return new AuthUser(null, null);

            String userId    = (String) request.getAttribute("userId");
            String companyId = (String) request.getAttribute("companyId");
            return new AuthUser(userId, companyId);
        }
    }
}