/** Attached to request after JWT validation; safe to share in request context. */
export interface AuthenticatedUser {
  id: string;
  username: string;
  status: string;
  roles: string[]; // role_code array, e.g. ['SUPER_ADMIN']
}

export interface UserInfo {
  id: string;
  username: string;
  realName: string | null;
  status: string;
}

export interface LoginResponseDto {
  accessToken: string;
  userInfo: UserInfo;
  permissions: string[];
}

export interface ProfileResponseDto {
  userInfo: UserInfo;
  roles: string[];
  permissions: string[];
}

export interface JwtPayload {
  sub: string;     // user.id
  username: string;
  iat?: number;
  exp?: number;
}
