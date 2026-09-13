# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Python imports
import os

# Module imports
from plane.authentication.adapter.credential import CredentialAdapter
from plane.authentication.adapter.error import (
    AUTHENTICATION_ERROR_CODES,
    AuthenticationException,
)
from plane.db.models import User
from plane.license.utils.instance_value import get_configuration_value


class EmailProvider(CredentialAdapter):
    provider = "email"

    def __init__(self, request, key=None, code=None, is_signup=False, callback=None):
        super().__init__(request=request, provider=self.provider, callback=callback)
        self.key = key
        self.code = code
        self.is_signup = is_signup

        (ENABLE_EMAIL_PASSWORD,) = get_configuration_value([
            {
                "key": "ENABLE_EMAIL_PASSWORD",
                "default": os.environ.get("ENABLE_EMAIL_PASSWORD"),
            }
        ])

        if ENABLE_EMAIL_PASSWORD == "0":
            raise AuthenticationException(
                error_code=AUTHENTICATION_ERROR_CODES["EMAIL_PASSWORD_AUTHENTICATION_DISABLED"],
                error_message="EMAIL_PASSWORD_AUTHENTICATION_DISABLED",
            )

    def set_user_data(self):
        if self.is_signup:
            # Check if the user already exists
            if User.objects.filter(email=self.key).exists():
                self.logger.warning("User already exists")
                raise AuthenticationException(
                    error_message="USER_ALREADY_EXIST",
                    error_code=AUTHENTICATION_ERROR_CODES["USER_ALREADY_EXIST"],
                )

            super().set_user_data({
                "email": self.key,
                "user": {
                    "avatar": "",
                    "first_name": "",
                    "last_name": "",
                    "provider_id": "",
                    "is_password_autoset": False,
                },
            })
            return
        else:
            if "@" in str(self.key):
                user = User.objects.filter(email__iexact=self.key).first()
            else:
                user = User.objects.filter(username__iexact=self.key).first()

            # User does not exist
            if not user:
                self.logger.warning("User does not exist")
                raise AuthenticationException(
                    error_message="USER_DOES_NOT_EXIST",
                    error_code=AUTHENTICATION_ERROR_CODES["USER_DOES_NOT_EXIST"],
                    payload={"email": self.key},
                )

            # Check user password
            if not user.check_password(self.code):
                self.logger.warning("Authentication failed - invalid credentials")
                raise AuthenticationException(
                    error_message=(
                        "AUTHENTICATION_FAILED_SIGN_UP" if self.is_signup else "AUTHENTICATION_FAILED_SIGN_IN"
                    ),
                    error_code=AUTHENTICATION_ERROR_CODES[
                        ("AUTHENTICATION_FAILED_SIGN_UP" if self.is_signup else "AUTHENTICATION_FAILED_SIGN_IN")
                    ],
                    payload={"email": self.key},
                )

            self.authenticated_user = user
            effective_email = user.email or f"{user.username}@local"

            super().set_user_data({
                "email": effective_email,
                "user": {
                    "avatar": "",
                    "first_name": "",
                    "last_name": "",
                    "provider_id": "",
                    "is_password_autoset": False,
                },
            })
            return

    def complete_login_or_signup(self):
        if self.is_signup:
            return super().complete_login_or_signup()

        user = getattr(self, "authenticated_user", None)
        if not user:
            return super().complete_login_or_signup()

        # Reject explicitly-deactivated accounts (GHSA-rmmf-rj2q-3rrg).
        if not user.is_active and user.last_logout_time is not None:
            raise AuthenticationException(
                error_code=AUTHENTICATION_ERROR_CODES["USER_ACCOUNT_DEACTIVATED"],
                error_message="USER_ACCOUNT_DEACTIVATED",
                payload={"email": self.key},
            )

        # Reject bot service accounts (BOT_USER_LOGIN_FORBIDDEN).
        if user.is_bot:
            raise AuthenticationException(
                error_code=AUTHENTICATION_ERROR_CODES["BOT_USER_LOGIN_FORBIDDEN"],
                error_message="BOT_USER_LOGIN_FORBIDDEN",
                payload={"email": self.key},
            )

        is_signup = False

        if self.check_sync_enabled() and not is_signup:
            user = self.sync_user_data(user=user)

        user = self.save_user_data(user=user)

        if self.callback:
            self.callback(user, is_signup, self.request)

        if self.token_data:
            self.create_update_account(user=user)

        return user
