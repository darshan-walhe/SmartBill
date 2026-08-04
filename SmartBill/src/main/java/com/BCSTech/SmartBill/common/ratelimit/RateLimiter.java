package com.BCSTech.SmartBill.common.ratelimit;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Simple fixed-window rate limiter — in-memory, per-JVM.
 *
 * NOTE: this only works correctly for a single running app instance. Each
 * instance keeps its own counters, so behind a load balancer with multiple
 * instances, a caller could get up to (limit x instance count) requests
 * through. Fine for now (single-instance deployment) — when Redis is added,
 * swap the in-memory Map for a Redis-backed counter (e.g. Bucket4j with a
 * Redis backend) so every instance shares the same count. Everything calling
 * allow() below stays the same either way — only this class's internals
 * would need to change.
 */
@Slf4j
@Component
public class RateLimiter {

    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    /**
     * @param key       identifies what's being limited, e.g. "register:203.0.113.4"
     *                  or "otp-send:9876543210" — caller decides the granularity
     *                  (per IP, per mobile number, per email, etc).
     * @param maxRequests how many calls are allowed within the window
     * @param window      the fixed window duration
     * @return true if this call is allowed, false if the limit has been hit
     */
    public boolean allow(String key, int maxRequests, Duration window) {
        long now = System.currentTimeMillis();
        long windowMillis = window.toMillis();

        Window w = windows.compute(key, (k, existing) -> {
            if (existing == null || now - existing.windowStart > windowMillis) {
                return new Window(now, new AtomicInteger(1));
            }
            existing.count.incrementAndGet();
            return existing;
        });

        boolean allowed = w.count.get() <= maxRequests;
        if (!allowed) {
            log.warn("Rate limit exceeded for key: {}", key);
        }
        return allowed;
    }

    // Evict expired windows so the map doesn't grow unbounded over time.
    // A generous 2-hour grace period is safe since every real window used
    // in this app is well under an hour.
    @Scheduled(fixedRate = 600_000) // every 10 minutes
    public void cleanup() {
        long cutoff = System.currentTimeMillis() - TimeUnit.HOURS.toMillis(2);
        windows.entrySet().removeIf(e -> e.getValue().windowStart < cutoff);
    }

    private static class Window {
        final long windowStart;
        final AtomicInteger count;

        Window(long windowStart, AtomicInteger count) {
            this.windowStart = windowStart;
            this.count = count;
        }
    }
}