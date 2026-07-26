package com.BCSTech.SmartBill.config;


import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import java.util.List;

@Data
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private Jwt jwt = new Jwt();
    private Otp otp = new Otp();
    private Google google = new Google();
    private Cors cors = new Cors();

    @Data
    public static class Jwt {
        private String secret;
        private long expirationMs;
        private long refreshExpirationMs;
    }

    @Data
    public static class Otp {
        private int expiryMinutes;
        private int length;
    }

    @Data
    public static class Google {
        private String clientId;
    }

    @Data
    public static class Cors {
        private List<String> allowedOrigins;
    }
}
