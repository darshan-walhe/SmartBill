package com.BCSTech.SmartBill.invoice.model;

import lombok.*;
import org.springframework.data.annotation.Id;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Embedded inside Invoice — tracks each payment received.
 * An invoice can have multiple partial payments.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Payment {

    @Id
    private String id;

    private BigDecimal amount;

    private String currencyCode;

    // Amount converted to INR (for accounting)
    private BigDecimal amountInr;

    private PaymentMethod paymentMethod;

    // UPI reference, bank transaction ID, etc.
    private String transactionReference;

    private LocalDate paymentDate;

    private String notes;

    private String recordedBy;

    public enum PaymentMethod {
        CASH,
        UPI,
        CARD,
        BANK_TRANSFER,
        INTERNATIONAL,
        CHEQUE
    }
}