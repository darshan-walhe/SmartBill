package com.BCSTech.SmartBill.company.model;

public enum SubscriptionPlan {
    FREE,        // limited invoices, 1 user
    BASIC,       // upto 500 invoices/month, 3 users
    PRO,         // unlimited invoices, 10 users, GST reports
    ENTERPRISE   // unlimited everything, priority support
}