package com.BCSTech.SmartBill.user.service;

import com.BCSTech.SmartBill.common.exception.AppException;
import com.BCSTech.SmartBill.user.model.User;
import com.BCSTech.SmartBill.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public User getById(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> AppException.notFound("User not found"));
    }

    public User getByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> AppException.notFound("User not found"));
    }
}